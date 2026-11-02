// node scripts/license-keygen.js: creates your license signing key, once.
// The private key stays in tools/ (git ignores it). Only the public part goes into the app.
const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");
const root = path.join(__dirname, ".."),
  priv = path.join(root, "tools", "license-private-key.json"),
  app = path.join(root, "src", "js", "shared", "license.js");
if (fs.existsSync(priv)) {
  console.error(
    "A signing key already exists. Replacing it would stop every key you have issued from working."
  );
  process.exit(1);
}
const { privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 65537
});
const jwk = privateKey.export({ format: "jwk" });
fs.mkdirSync(path.dirname(priv), { recursive: true });
fs.writeFileSync(priv, JSON.stringify(jwk));
const t = fs.readFileSync(app, "utf8");
fs.writeFileSync(app, t.replace(/const LIC_N = "[^"]*";/, `const LIC_N = "${jwk.n}";`));
console.log("Signing key created in tools/. Back it up somewhere safe, and never share it.");
