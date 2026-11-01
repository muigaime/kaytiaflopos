import { z } from "zod";
import { Decimal } from "../db.js";

const decimalSchema = (places: number, message: string) =>
  z
    .union([z.number(), z.string()])
    .transform(v => String(v).trim())
    .refine(v => new RegExp(`^\\d+(\\.\\d{1,${places}})?$`).test(v), message)
    .transform(v => new Decimal(v));

/** A non-negative stock quantity with at most 3 decimals, given as a number or a string. */
export const quantitySchema = decimalSchema(3, "Must be a number of 0 or more with at most 3 decimals");

/** A non-negative money amount with at most 2 decimals. */
export const moneySchema = decimalSchema(2, "Must be an amount of 0 or more with at most 2 decimals");

export const ZERO = new Decimal(0);

/** Rounds money to 2 decimals (half up). */
export const money = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** KRA eTIMS tax categories -> VAT %. Prices are VAT-inclusive. */
export const TAX_RATES: Record<string, number> = {
  A: 0, // exempt
  B: 16, // standard VAT
  C: 0, // zero-rated
  D: 0, // non-VAT
  E: 8 // reduced rate
};
