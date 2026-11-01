import "dotenv/config";

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** Server secret for PIN fingerprints. Changing it invalidates every PIN (staff must set new ones). */
  authSecret: process.env.AUTH_SECRET ?? ""
};

export function assertSafeConfig(): void {
  if (!config.databaseUrl) throw new Error("DATABASE_URL is not set (see server/.env.example)");
  if (config.authSecret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters (see server/.env.example)");
}
