// Builds KaytiaFlow.exe: the app, the print and mail routes, and the network sharing, in one program.
//   npm run build:exe              writes to C:\Users\LIAM\Desktop\compiled
//   node desktop/build-exe.js DIR  writes to DIR
// Needs postject once:  npm install --prefix desktop postject
const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  { execFileSync } = require("child_process");
const ROOT = path.dirname(__dirname),
  HERE = __dirname,
  SRV = path.join(ROOT, "server");
const OUT = process.argv[2] || "C:\\Users\\LIAM\\Desktop\\compiled";

(async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "kaytia-exe-"));
  const { buildHtml } = require(path.join(ROOT, "scripts", "build.js"));
  fs.writeFileSync(path.join(work, "app.html"), buildHtml());

  const esbuild = require(path.join(SRV, "node_modules", "esbuild"));
  const r = await esbuild.build({
    entryPoints: [path.join(HERE, "launcher.ts")],
    outfile: path.join(work, "bundle.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node24",
    nodePaths: [path.join(SRV, "node_modules")],
    legalComments: "none",
    minify: true,
    logLevel: "warning",
    metafile: true
  });
  const inputs = Object.keys(r.metafile.inputs);
  const bad = inputs.filter(x =>
    /(^|[\\/])\.env|license-private|prisma|src[\\/]generated/i.test(x)
  );
  if (bad.length) throw new Error("should not be bundled: " + bad.join(", "));

  fs.writeFileSync(
    path.join(work, "sea.json"),
    JSON.stringify({
      main: "bundle.cjs",
      output: "sea.blob",
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
      assets: { "app.html": "app.html" }
    })
  );
  execFileSync(process.execPath, ["--experimental-sea-config", "sea.json"], {
    cwd: work,
    stdio: "inherit"
  });
  const exe = path.join(work, "KaytiaFlow.exe");
  fs.copyFileSync(process.execPath, exe);
  const { inject } = require(path.join(HERE, "node_modules", "postject"));
  await inject(exe, "NODE_SEA_BLOB", fs.readFileSync(path.join(work, "sea.blob")), {
    sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"
  });
  fs.mkdirSync(OUT, { recursive: true });
  fs.copyFileSync(exe, path.join(OUT, "KaytiaFlow.exe"));
  for (const f of ["README.txt", "kaytia.env.example"])
    fs.copyFileSync(path.join(HERE, f), path.join(OUT, f));
  fs.rmSync(work, { recursive: true, force: true });
  console.log(
    "exe",
    (fs.statSync(path.join(OUT, "KaytiaFlow.exe")).size / 1048576).toFixed(0) + " MB ->",
    OUT
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
