// Builds KaytiaLicenseMaker.exe, a program on its own, separate from Kaytia Flow.
//   node license-maker/build.js        writes to C:\Users\LIAM\Desktop\compiled
//   node license-maker/build.js DIR    writes to DIR
// The signing key is never built in: the program reads it from beside itself, or it is chosen on screen.
const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  { execFileSync } = require("child_process");
const ROOT = path.dirname(__dirname),
  HERE = __dirname,
  SRV = path.join(ROOT, "server");
const OUT = process.argv[2] || "C:\\Users\\LIAM\\Desktop\\compiled";

(async () => {
  // Kaytia Flow's public key: the maker refuses any signing key that doesn't match it.
  const lic = fs.readFileSync(path.join(ROOT, "src", "js", "shared", "license.js"), "utf8"),
    m = /const LIC_N =\s*"([A-Za-z0-9_-]+)"/.exec(lic);
  if (!m) throw new Error("Kaytia Flow's public key wasn't found in license.js");
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "kaytia-lm-"));
  fs.copyFileSync(path.join(HERE, "page.html"), path.join(work, "page.html"));
  const esbuild = require(path.join(SRV, "node_modules", "esbuild"));
  const r = await esbuild.build({
    entryPoints: [path.join(HERE, "maker.ts")],
    outfile: path.join(work, "bundle.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node24",
    define: { LIC_N_BUILD: JSON.stringify(m[1]) },
    legalComments: "none",
    minify: true,
    logLevel: "warning",
    metafile: true
  });
  const bad = Object.keys(r.metafile.inputs).filter(x => /license-private|(^|[\\/])\.env/i.test(x));
  if (bad.length) throw new Error("should not be bundled: " + bad.join(", "));
  const text = fs.readFileSync(path.join(work, "bundle.cjs"), "utf8");
  if (/"d"\s*:\s*"[A-Za-z0-9_-]{100,}/.test(text))
    throw new Error("a private key ended up in the program");

  fs.writeFileSync(
    path.join(work, "sea.json"),
    JSON.stringify({
      main: "bundle.cjs",
      output: "sea.blob",
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
      assets: { "page.html": "page.html" }
    })
  );
  execFileSync(process.execPath, ["--experimental-sea-config", "sea.json"], {
    cwd: work,
    stdio: "inherit"
  });
  const exe = path.join(work, "KaytiaLicenseMaker.exe");
  fs.copyFileSync(process.execPath, exe);
  const { inject } = require(path.join(ROOT, "desktop", "node_modules", "postject"));
  await inject(exe, "NODE_SEA_BLOB", fs.readFileSync(path.join(work, "sea.blob")), {
    sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"
  });
  // A windowed program: no black window, just its own app window.
  const buf = fs.readFileSync(exe),
    pe = buf.readUInt32LE(0x3c);
  if (buf.toString("latin1", pe, pe + 4) !== "PE\0\0") throw new Error("not a Windows program");
  buf.writeUInt16LE(2, pe + 24 + 68);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "KaytiaLicenseMaker.exe"), buf);
  fs.rmSync(work, { recursive: true, force: true });
  console.log("license maker", (buf.length / 1048576).toFixed(0) + " MB ->", OUT);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
