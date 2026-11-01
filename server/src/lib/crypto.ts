import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { config } from "../config.js";

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

const scryptAsync = (secret: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(secret, salt, keylen, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)))
  );

/** Hashes a password or PIN: "scrypt$N$r$p$salt$hash" (salt and hash base64). */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(secret, salt, SCRYPT.keylen, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifySecret(stored: string, secret: string): Promise<boolean> {
  const [alg, N, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !N || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scryptAsync(secret, Buffer.from(salt, "base64"), expected.length, { N: +N, r: +r, p: +p });
  return timingSafeEqual(key, expected);
}

/** A hash of a random secret, used to spend the same time when the user does not exist. */
let dummy: Promise<string> | null = null;
export async function burnVerifyTime(secret: string): Promise<void> {
  dummy ??= hashSecret(randomBytes(12).toString("hex"));
  await verifySecret(await dummy, secret);
}

/** Random URL-safe token for sessions and overrides. */
export const randomToken = () => randomBytes(32).toString("base64url");

/** What the database stores for a token: its SHA-256. A leaked table cannot be used to sign in. */
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Keyed PIN fingerprint, so PIN-only login can find the user without storing the PIN. */
export function pinFingerprint(pin: string): string {
  if (config.authSecret.length < 32) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", config.authSecret).update("pin:" + pin).digest("hex");
}
