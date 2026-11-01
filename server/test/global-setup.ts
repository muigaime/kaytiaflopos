// Creates the test database if needed and applies all migrations to it.
import { execSync } from "node:child_process";
import pg from "pg";

export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  const name = url.pathname.slice(1);
  if (!name.endsWith("_test")) throw new Error(`Refusing to set up "${name}": test databases must end in _test`);

  const admin = new URL(url);
  admin.pathname = "/postgres";
  admin.search = "";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (!exists.rowCount) await client.query(`CREATE DATABASE "${name.replace(/"/g, "")}"`);
  await client.end();

  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url.toString() } });
}
