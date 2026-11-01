import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "./generated/prisma/client.js";
import { config } from "./config.js";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.databaseUrl })
});

/** A Prisma client inside an interactive transaction. */
export type Tx = Prisma.TransactionClient;

export { Prisma };
export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;
