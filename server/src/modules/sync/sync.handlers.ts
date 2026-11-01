// Every operation type a terminal may push. Add new ones here (check-in, shift open/close, ...).
import { z } from "zod";
import { quantitySchema } from "../../lib/quantity.js";
import { transferOrderToRoom } from "../room-billing/room-billing.service.js";
import { recordCounts } from "../stock-take/stock-take.service.js";
import { applyPosSale, posSaleSchema } from "./handlers/pos-sale.js";
import type { SyncHandler } from "./sync.types.js";

const handler = <S extends z.ZodType>(h: SyncHandler<S>) => h as unknown as SyncHandler;

export const SYNC_HANDLERS: Record<string, SyncHandler> = {
  "pos.sale": handler({ entity: "Order", schema: posSaleSchema, apply: applyPosSale }),

  "stocktake.count": handler({
    entity: "StockTakeSession",
    schema: z.object({
      stockTakeId: z.uuid(),
      counts: z
        .array(
          z.object({
            departmentId: z.uuid(),
            stockItemId: z.uuid(),
            countedQuantity: quantitySchema.nullable(),
            narration: z.string().trim().max(500).optional()
          })
        )
        .min(1)
        .max(5000)
    }),
    apply: async (tx, p, actor) => ({ result: await recordCounts(p.stockTakeId, p.counts, actor, tx), warnings: [] })
  }),

  "order.transfer_to_room": handler({
    entity: "Order",
    schema: z.object({
      orderId: z.uuid(),
      roomNumber: z.string().trim().min(1).max(20),
      guestName: z.string().trim().min(2).max(120),
      reservationId: z.uuid().optional()
    }),
    apply: async (tx, p, actor) => {
      const { orderId, ...input } = p;
      return { result: await transferOrderToRoom(orderId, input, actor, tx), warnings: [] };
    }
  })
};
