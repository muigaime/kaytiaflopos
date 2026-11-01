import { Decimal, type Tx } from "../../db.js";
import { money } from "../../lib/quantity.js";

/** A reservation's folio in KES: charges (not voided) minus payments made against the folio.
 *  ROOM_FOLIO payments belong to POS orders (they move a bill onto the folio), so they are not
 *  folio payments and are never linked to the reservation. */
export async function folioBalance(tx: Tx, reservationId: string) {
  const [charges, payments] = await Promise.all([
    tx.roomFolioCharge.aggregate({ where: { reservationId, voided: false }, _sum: { amountBase: true } }),
    tx.payment.aggregate({
      where: { reservationId, status: "CONFIRMED", NOT: { method: "ROOM_FOLIO" } },
      _sum: { amountBase: true }
    })
  ]);
  const charged = money(new Decimal(charges._sum.amountBase ?? 0));
  const paid = money(new Decimal(payments._sum.amountBase ?? 0));
  return { charged, paid, balance: charged.minus(paid) };
}
