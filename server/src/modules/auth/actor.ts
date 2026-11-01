import { forbidden } from "../../http/errors.js";

/** The signed-in user performing a request. */
export interface Actor {
  id: string;
  username: string;
  fullName: string;
  permissions: string[];
  /** Super cashiers / managers may authorize restricted actions for others (PIN override). */
  isSuperCashier: boolean;
  /** Session id, or "terminal:<id>" for operations synced from a terminal. */
  sessionId: string;
  sessionKind: "BACK_OFFICE" | "POS";
  /** POS sessions may be locked to one department (sale point). */
  departmentId: string | null;
}

/** Permission keys. A role with "*" has every permission. Also used as override action names. */
export const PERM = {
  stockCount: "stock.count",
  stockApprove: "stock.approve",
  /** Ring up sales at the POS. */
  posSell: "pos.sell",
  /** See the executive dashboard. */
  dashboardView: "dashboard.view",
  /** Register terminals and reset their keys. */
  adminTerminals: "admin.terminals",
  posVoid: "pos.void",
  posDiscount: "pos.discount",
  posPriceOverride: "pos.price_override",
  posSplitBill: "pos.split_bill",
  /** Post an F&B bill to a guest's room folio. */
  posRoomCharge: "pos.room_charge",
  /** Undo a room posting (wrong room). Usually granted by supervisor override. */
  posRoomChargeReverse: "pos.room_charge_reverse"
} as const;

export const can = (actor: Pick<Actor, "permissions">, permission: string) =>
  actor.permissions.includes("*") || actor.permissions.includes(permission);

export function assertCan(actor: Actor, permission: string): void {
  if (!can(actor, permission)) throw forbidden(`Missing permission "${permission}"`);
}
