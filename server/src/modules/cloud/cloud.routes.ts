import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import express, { Router, type NextFunction, type Request, type Response } from "express";

// The cloud copy of each hotel's data. A hotel's Main computer sends its latest data here whenever it
// changes (desktop/cloud.ts). Each hotel is a site with its own key, set on this server:
//   CLOUD_SYNC_KEYS="the-tide:<key>,other-hotel:<key>"   keys of 16 or more characters
//   CLOUD_DATA_DIR="/var/lib/kaytia-cloud"               where copies are kept (the last 30 per site)
// Put this server behind https. Without CLOUD_SYNC_KEYS every request is refused.

const KEEP = 30;
const SITE_OK = /^[a-z0-9][a-z0-9-]{1,39}$/;

function keys(): Map<string, string> {
  const m = new Map<string, string>();
  for (const pair of String(process.env.CLOUD_SYNC_KEYS ?? "").split(",")) {
    const i = pair.indexOf(":");
    if (i < 1) continue;
    const site = pair.slice(0, i).trim().toLowerCase(),
      key = pair.slice(i + 1).trim();
    if (SITE_OK.test(site) && key.length >= 16) m.set(site, key);
  }
  return m;
}
const dir = () => path.resolve(process.env.CLOUD_DATA_DIR ?? "cloud-data");
const same = (a: string, b: string) => {
  const x = crypto.createHash("sha256").update(a).digest(),
    y = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(x, y);
};

/** The site in the header, with the key that belongs to it. */
function siteAccess(req: Request, res: Response, next: NextFunction) {
  const site = String(req.get("x-kaytia-site") ?? "").toLowerCase(),
    auth = String(req.get("authorization") ?? ""),
    given = auth.startsWith("Bearer ") ? auth.slice(7) : "",
    want = keys().get(site);
  if (!SITE_OK.test(site) || !want || !given || !same(given, want))
    return void res.status(401).json({ error: "Wrong site or key." });
  res.locals.site = site;
  next();
}

export const cloudRouter = Router();
cloudRouter.use(siteAccess);
cloudRouter.get("/ping", (_req, res) => void res.json({ ok: true }));

cloudRouter.post("/push", express.json({ limit: "60mb" }), (req, res) => {
  const site = res.locals.site as string,
    b = req.body ?? {},
    rev = Number(b.rev);
  if (
    b.site !== site ||
    !Number.isInteger(rev) ||
    rev < 0 ||
    typeof b.gz !== "string" ||
    !/^[a-f0-9]{64}$/.test(String(b.sha256))
  )
    return void res.status(400).json({ error: "Bad copy." });
  let text: string;
  try {
    text = zlib
      .gunzipSync(Buffer.from(b.gz, "base64"), { maxOutputLength: 256 * 1024 * 1024 })
      .toString("utf8");
    JSON.parse(text);
  } catch {
    return void res.status(400).json({ error: "The copy couldn't be opened." });
  }
  if (crypto.createHash("sha256").update(text).digest("hex") !== b.sha256)
    return void res.status(400).json({ error: "The copy arrived damaged." });
  const d = path.join(dir(), site);
  fs.mkdirSync(d, { recursive: true });
  const name = `${String(rev).padStart(10, "0")}-${Date.now()}.json`;
  const meta = {
    site,
    rev,
    at: String(b.at ?? new Date().toISOString()),
    sha256: b.sha256,
    gz: b.gz
  };
  fs.writeFileSync(path.join(d, name + ".tmp"), JSON.stringify(meta));
  fs.renameSync(path.join(d, name + ".tmp"), path.join(d, name));
  const all = fs
    .readdirSync(d)
    .filter(f => f.endsWith(".json"))
    .sort();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP)))
    fs.rmSync(path.join(d, old), { force: true });
  res.json({ ok: true, rev });
});

cloudRouter.get("/latest", (_req, res) => {
  const d = path.join(dir(), res.locals.site as string);
  const last = fs.existsSync(d)
    ? fs
        .readdirSync(d)
        .filter(f => f.endsWith(".json"))
        .sort()
        .at(-1)
    : undefined;
  if (!last) return void res.status(404).json({ error: "No copy yet." });
  res.type("json").send(fs.readFileSync(path.join(d, last), "utf8"));
});
