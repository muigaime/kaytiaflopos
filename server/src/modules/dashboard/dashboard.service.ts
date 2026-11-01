// Executive dashboard: one call returns sales, rooms, stock, insights and the activity feed.
//
// Definitions
// - F&B revenue: bills SETTLED or TRANSFERRED_TO_ROOM, by settlement time (VAT-inclusive gross).
// - Room revenue: folio charges for rooms, meal plans, extra guests, early/late fees, less discounts and
//   waivers, by service date. F&B bills posted to rooms are NOT counted again here.
// - Payment mix: confirmed payments by method in the period. ROOM_FOLIO is "posted to rooms", not cash in.
// - Days are local business days (BUSINESS_TZ). Money is KES.
import { Decimal, prisma } from "../../db.js";
import { unprocessable } from "../../http/errors.js";
import { money, ZERO } from "../../lib/quantity.js";
import { addDaysYmd, BUSINESS_TZ, dateOnly, daysBetween, localYmd, startOfLocalDay } from "../../lib/time.js";
import { assertCan, PERM, type Actor } from "../auth/actor.js";

const SALE_STATUSES = ["SETTLED", "TRANSFERRED_TO_ROOM"] as const;
const ROOM_REVENUE_TYPES = ["ROOM", "MEAL_PLAN", "EXTRA_GUEST", "EARLY_CHECKIN", "LATE_CHECKOUT", "DISCOUNT", "WAIVER"] as const;
const OTHER_FOLIO_TYPES = ["MINIBAR", "LAUNDRY", "MISC"] as const;
const BREAKFAST_PLANS = ["BB", "HB", "FB", "AI"] as const;
const MAX_DAYS = 92;

const dec = (v: unknown) => new Decimal(String(v ?? 0));
const num = (v: unknown) => Number(v ?? 0);
const iso = (d: Date) => d.toISOString();

export interface DashboardQuery {
  from?: string;
  to?: string;
  /** Day for the room snapshot (arrivals, departures, breakfast). Default today. */
  asOf?: string;
  departmentId?: string;
}

export async function getDashboard(q: DashboardQuery, actor: Actor) {
  assertCan(actor, PERM.dashboardView);
  const today = localYmd();
  const from = q.from ?? today;
  const to = q.to ?? from;
  if (to < from) throw unprocessable("BAD_RANGE", "`to` is before `from`");
  const days = daysBetween(from, to) + 1;
  if (days > MAX_DAYS) throw unprocessable("RANGE_TOO_LONG", `Ask for at most ${MAX_DAYS} days at a time`);

  const period = { from, to, start: startOfLocalDay(from), end: startOfLocalDay(addDaysYmd(to, 1)) };
  const prevFrom = addDaysYmd(from, -days);
  const previous = { from: prevFrom, to: addDaysYmd(from, -1), start: startOfLocalDay(prevFrom), end: period.start };
  const dept = q.departmentId ?? null;

  const [sales, prevSales, rooms, stock, activity] = await Promise.all([
    salesSection(period, dept, days === 1 ? "hour" : "day"),
    revenueTotals(previous, dept),
    roomsSection(q.asOf ?? today, period),
    stockSection(dept),
    activityFeed()
  ]);

  const change = prevSales.revenue.isZero()
    ? null
    : Number(sales.totals.revenue.minus(prevSales.revenue).div(prevSales.revenue).times(100).toFixed(1));
  const insights = await buildInsights({ change, dept, today, stock });

  return {
    range: { from, to, days, timezone: BUSINESS_TZ, departmentId: dept },
    sales: { ...sales, previous: { from: previous.from, to: previous.to, revenue: prevSales.revenue, changePct: change } },
    rooms,
    stock: { lowStock: stock.lowStock, valuation: stock.valuation },
    insights,
    activity
  };
}

// ---------------------------------------------------------------- sales

interface Period {
  from: string;
  to: string;
  start: Date;
  end: Date;
}

/** Room revenue counts only when not filtering by an outlet department. */
async function roomRevenue(p: Period, dept: string | null) {
  if (dept) return { room: null, other: null };
  const inPeriod = {
    voided: false,
    OR: [
      { serviceDate: { gte: dateOnly(p.from), lte: dateOnly(p.to) } },
      { serviceDate: null, createdAt: { gte: p.start, lt: p.end } }
    ]
  };
  const [room, other] = await Promise.all([
    prisma.roomFolioCharge.aggregate({ where: { ...inPeriod, type: { in: [...ROOM_REVENUE_TYPES] } }, _sum: { amountBase: true } }),
    prisma.roomFolioCharge.aggregate({ where: { ...inPeriod, type: { in: [...OTHER_FOLIO_TYPES] } }, _sum: { amountBase: true } })
  ]);
  return { room: money(dec(room._sum.amountBase)), other: money(dec(other._sum.amountBase)) };
}

async function revenueTotals(p: Period, dept: string | null) {
  const [fnb, folio] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: [...SALE_STATUSES] }, settledAt: { gte: p.start, lt: p.end }, ...(dept ? { departmentId: dept } : {}) },
      _sum: { grossTotal: true }
    }),
    roomRevenue(p, dept)
  ]);
  const f = money(dec(fnb._sum.grossTotal));
  return { revenue: f.plus(folio.room ?? ZERO).plus(folio.other ?? ZERO) };
}

async function salesSection(p: Period, dept: string | null, unit: "hour" | "day") {
  const saleWhere = {
    status: { in: [...SALE_STATUSES] },
    settledAt: { gte: p.start, lt: p.end },
    ...(dept ? { departmentId: dept } : {})
  };
  const [fnb, byDept, folio, payments, open, series, topItems] = await Promise.all([
    prisma.order.aggregate({ where: saleWhere, _sum: { grossTotal: true, taxTotal: true, netTotal: true }, _count: true }),
    prisma.order.groupBy({ by: ["departmentId"], where: saleWhere, _sum: { grossTotal: true }, _count: true }),
    roomRevenue(p, dept),
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        status: "CONFIRMED",
        createdAt: { gte: p.start, lt: p.end },
        ...(dept ? { order: { departmentId: dept } } : {})
      },
      _sum: { amountBase: true }
    }),
    prisma.order.aggregate({
      where: { status: { in: ["OPEN", "PROFORMA_PRINTED"] }, ...(dept ? { departmentId: dept } : {}) },
      _sum: { grossTotal: true },
      _count: true
    }),
    salesSeries(p, dept, unit),
    prisma.$queryRaw<{ name: string; quantity: unknown; revenue: unknown }[]>`
      SELECT oi.name, SUM(oi.quantity) AS quantity, SUM(oi."lineTotal") AS revenue
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE oi.status = 'SENT' AND o.status IN ('SETTLED', 'TRANSFERRED_TO_ROOM')
        AND o."settledAt" >= (${iso(p.start)}::timestamptz AT TIME ZONE 'UTC')
        AND o."settledAt" <  (${iso(p.end)}::timestamptz AT TIME ZONE 'UTC')
        AND (${dept}::text IS NULL OR o."departmentId" = ${dept})
      GROUP BY oi.name ORDER BY revenue DESC LIMIT 10`
  ]);

  const deptNames = new Map(
    (await prisma.department.findMany({ where: { id: { in: byDept.map(d => d.departmentId) } }, select: { id: true, name: true } })).map(
      d => [d.id, d.name]
    )
  );
  const fnbGross = money(dec(fnb._sum.grossTotal));
  const room = folio.room ?? ZERO,
    other = folio.other ?? ZERO;
  const methods = ["CASH", "MPESA", "CARD", "DEBTOR", "BANK", "ROOM_FOLIO"] as const;
  const paid = new Map(payments.map(x => [x.method, money(dec(x._sum.amountBase))]));

  return {
    totals: {
      revenue: fnbGross.plus(room).plus(other),
      fnbRevenue: fnbGross,
      roomRevenue: folio.room,
      otherFolioRevenue: folio.other,
      vat: money(dec(fnb._sum.taxTotal)),
      bills: fnb._count,
      averageBill: fnb._count ? money(fnbGross.div(fnb._count)) : ZERO
    },
    paymentMix: Object.fromEntries(methods.map(m => [m, paid.get(m) ?? ZERO])),
    byDepartment: byDept
      .map(d => ({ departmentId: d.departmentId, name: deptNames.get(d.departmentId) ?? "?", revenue: money(dec(d._sum.grossTotal)), bills: d._count }))
      .sort((a, b) => b.revenue.cmp(a.revenue)),
    openBills: { count: open._count, value: money(dec(open._sum.grossTotal)) },
    series: { unit, points: series },
    topItems: topItems.map(t => ({ name: t.name, quantity: dec(t.quantity), revenue: money(dec(t.revenue)) }))
  };
}

/** F&B revenue per local hour (one-day range) or per local day, with empty buckets filled in. */
async function salesSeries(p: Period, dept: string | null, unit: "hour" | "day") {
  const label = unit === "hour" ? `YYYY-MM-DD"T"HH24":00"` : "YYYY-MM-DD";
  const rows = await prisma.$queryRaw<{ bucket: string; revenue: unknown; bills: unknown }[]>`
    SELECT to_char(date_trunc(${unit}, ("settledAt" AT TIME ZONE 'UTC') AT TIME ZONE ${BUSINESS_TZ}), ${label}) AS bucket,
           SUM("grossTotal") AS revenue, COUNT(*) AS bills
    FROM "Order"
    WHERE status IN ('SETTLED', 'TRANSFERRED_TO_ROOM')
      AND "settledAt" >= (${iso(p.start)}::timestamptz AT TIME ZONE 'UTC')
      AND "settledAt" <  (${iso(p.end)}::timestamptz AT TIME ZONE 'UTC')
      AND (${dept}::text IS NULL OR "departmentId" = ${dept})
    GROUP BY 1`;
  const got = new Map(rows.map(r => [r.bucket, r]));
  const keys =
    unit === "hour"
      ? Array.from({ length: 24 }, (_, h) => `${p.from}T${String(h).padStart(2, "0")}:00`)
      : Array.from({ length: daysBetween(p.from, p.to) + 1 }, (_, i) => addDaysYmd(p.from, i));
  return keys.map(k => ({ at: k, revenue: money(dec(got.get(k)?.revenue)), bills: num(got.get(k)?.bills) }));
}

// ---------------------------------------------------------------- rooms

async function roomsSection(asOf: string, p: Period) {
  const day = dateOnly(asOf);
  const [rooms, inHouse, arrivals, departures, breakfast, occupancy] = await Promise.all([
    prisma.room.findMany({ where: { active: true }, select: { id: true, status: true } }),
    prisma.reservation.findMany({ where: { status: "CHECKED_IN" }, select: { roomId: true, adults: true, children: true } }),
    prisma.reservation.findMany({
      where: { status: "RESERVED", arrival: day },
      include: { room: { select: { number: true } }, category: { select: { name: true } }, guests: { where: { isLead: true }, include: { guest: { select: { fullName: true } } } } },
      orderBy: { number: "asc" }
    }),
    prisma.reservation.findMany({
      where: { status: "CHECKED_IN", departure: day },
      include: { room: { select: { number: true } }, guests: { where: { isLead: true }, include: { guest: { select: { fullName: true } } } } },
      orderBy: { number: "asc" }
    }),
    // Breakfast is due for guests on a breakfast plan who slept here last night.
    prisma.reservation.findMany({
      where: { status: "CHECKED_IN", mealPlan: { in: [...BREAKFAST_PLANS] }, arrival: { lt: day } },
      include: { room: { select: { number: true } }, guests: { where: { isLead: true }, include: { guest: { select: { fullName: true } } } } }
    }),
    prisma.$queryRaw<{ day: string; occupied: unknown }[]>`
      SELECT to_char(d, 'YYYY-MM-DD') AS day,
             (SELECT COUNT(DISTINCT r."roomId") FROM "Reservation" r
               WHERE r."roomId" IS NOT NULL AND r.status IN ('CHECKED_IN', 'CHECKED_OUT')
                 AND r.arrival <= d::date AND r.departure > d::date) AS occupied
      FROM generate_series(${p.from}::date, ${p.to}::date, interval '1 day') AS d`
  ]);

  const statusCounts: Record<string, number> = {
    VACANT_CLEAN: 0,
    VACANT_DIRTY: 0,
    OCCUPIED: 0,
    INSPECTED: 0,
    OUT_OF_ORDER: 0,
    OUT_OF_SERVICE: 0
  };
  for (const r of rooms) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  const sellable = rooms.length - statusCounts.OUT_OF_ORDER! - statusCounts.OUT_OF_SERVICE!;
  const occupied = new Set(inHouse.map(r => r.roomId).filter(Boolean)).size;
  const pct = (n: number) => (sellable ? Math.round((n / sellable) * 1000) / 10 : 0);
  const lead = (r: { guests: { guest: { fullName: string } }[] }) => r.guests[0]?.guest.fullName ?? null;

  return {
    asOf,
    totalRooms: rooms.length,
    sellableRooms: sellable,
    statusCounts,
    occupiedRooms: occupied,
    occupancyPct: pct(occupied),
    inHouse: { stays: inHouse.length, guests: inHouse.reduce((a, r) => a + r.adults + r.children, 0) },
    arrivals: arrivals.map(r => ({ reservationId: r.id, number: r.number, room: r.room?.number ?? null, category: r.category.name, guest: lead(r), adults: r.adults, children: r.children })),
    departures: departures.map(r => ({ reservationId: r.id, number: r.number, room: r.room?.number ?? null, guest: lead(r) })),
    breakfast: {
      covers: breakfast.reduce((a, r) => a + r.adults + r.children, 0),
      rooms: breakfast
        .map(r => ({ room: r.room?.number ?? null, guest: lead(r), mealPlan: r.mealPlan, adults: r.adults, children: r.children }))
        .sort((a, b) => (a.room ?? "").localeCompare(b.room ?? "", undefined, { numeric: true }))
    },
    occupancySeries: occupancy.map(o => ({ day: o.day, occupiedRooms: num(o.occupied), occupancyPct: pct(num(o.occupied)) }))
  };
}

// ---------------------------------------------------------------- stock

async function stockSection(dept: string | null) {
  const [low, valuation] = await Promise.all([
    prisma.$queryRaw<
      { departmentId: string; department: string; stockItemId: string; code: string; name: string; baseUnit: string; quantity: unknown; reorderLevel: unknown; criticalLevel: unknown }[]
    >`
      SELECT di."departmentId", d.name AS department, si.id AS "stockItemId", si.code, si.name, si."baseUnit", di.quantity,
             COALESCE(di."reorderLevel", si."reorderLevel") AS "reorderLevel", si."criticalLevel"
      FROM "DepartmentInventory" di
      JOIN "StockItem" si ON si.id = di."stockItemId"
      JOIN "Department" d ON d.id = di."departmentId"
      WHERE si.active AND d.active
        AND (${dept}::text IS NULL OR di."departmentId" = ${dept})
        AND COALESCE(di."reorderLevel", si."reorderLevel") > 0
        AND di.quantity <= COALESCE(di."reorderLevel", si."reorderLevel")
      ORDER BY di.quantity / NULLIF(COALESCE(di."reorderLevel", si."reorderLevel"), 0), si.name
      LIMIT 50`,
    prisma.$queryRaw<{ departmentId: string; department: string; value: unknown }[]>`
      SELECT d.id AS "departmentId", d.name AS department, SUM(GREATEST(di.quantity, 0) * si."unitCost") AS value
      FROM "DepartmentInventory" di
      JOIN "StockItem" si ON si.id = di."stockItemId"
      JOIN "Department" d ON d.id = di."departmentId"
      WHERE (${dept}::text IS NULL OR di."departmentId" = ${dept})
      GROUP BY d.id, d.name ORDER BY value DESC`
  ]);
  const byDept = valuation.map(v => ({ departmentId: v.departmentId, name: v.department, value: money(dec(v.value)) }));
  return {
    lowStock: low.map(l => {
      const q = dec(l.quantity),
        critical = dec(l.criticalLevel);
      return {
        departmentId: l.departmentId,
        department: l.department,
        stockItemId: l.stockItemId,
        code: l.code,
        name: l.name,
        baseUnit: l.baseUnit,
        quantity: q,
        reorderLevel: dec(l.reorderLevel),
        level: q.lte(0) || (critical.gt(0) && q.lte(critical)) ? "CRITICAL" : "LOW"
      };
    }),
    valuation: { total: byDept.reduce((a, d) => a.plus(d.value), ZERO), byDepartment: byDept }
  };
}

// ---------------------------------------------------------------- insights (rule-based)

interface Insight {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
  data?: unknown;
}

async function buildInsights(ctx: {
  change: number | null;
  dept: string | null;
  today: string;
  stock: Awaited<ReturnType<typeof stockSection>>;
}): Promise<{ method: string; items: Insight[] }> {
  const items: Insight[] = [];
  const since14 = new Date(Date.now() - 14 * 86_400_000);
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [usage, losses, oldOpen, failedJobs] = await Promise.all([
    // Days of stock left at the last 14 days' rate of sale.
    prisma.$queryRaw<{ department: string; name: string; baseUnit: string; quantity: unknown; perDay: unknown }[]>`
      SELECT d.name AS department, si.name, si."baseUnit", di.quantity, u.used / 14.0 AS "perDay"
      FROM (SELECT "departmentId", "stockItemId", -SUM(quantity) AS used FROM "StockMovement"
            WHERE type = 'SALE' AND "createdAt" >= (${iso(since14)}::timestamptz AT TIME ZONE 'UTC')
              AND (${ctx.dept}::text IS NULL OR "departmentId" = ${ctx.dept})
            GROUP BY 1, 2) u
      JOIN "DepartmentInventory" di ON di."departmentId" = u."departmentId" AND di."stockItemId" = u."stockItemId"
      JOIN "StockItem" si ON si.id = u."stockItemId"
      JOIN "Department" d ON d.id = u."departmentId"
      WHERE u.used > 0 AND di.quantity > 0 AND di.quantity / (u.used / 14.0) < 3
      ORDER BY di.quantity / (u.used / 14.0) LIMIT 10`,
    // Value lost to stock-take shortages and wastage in 30 days.
    prisma.$queryRaw<{ name: string; value: unknown }[]>`
      SELECT si.name, SUM(-m.quantity * m."unitCost") AS value
      FROM "StockMovement" m JOIN "StockItem" si ON si.id = m."stockItemId"
      WHERE m."createdAt" >= (${iso(since30)}::timestamptz AT TIME ZONE 'UTC')
        AND ((m.type = 'STOCKTAKE_ADJUST' AND m.quantity < 0) OR m.type = 'WASTAGE')
        AND (${ctx.dept}::text IS NULL OR m."departmentId" = ${ctx.dept})
      GROUP BY si.name HAVING SUM(-m.quantity * m."unitCost") > 0
      ORDER BY value DESC LIMIT 3`,
    prisma.order.aggregate({
      where: {
        status: { in: ["OPEN", "PROFORMA_PRINTED"] },
        createdAt: { lt: startOfLocalDay(ctx.today) },
        ...(ctx.dept ? { departmentId: ctx.dept } : {})
      },
      _count: true,
      _sum: { grossTotal: true }
    }),
    prisma.integrationJob.groupBy({ by: ["kind"], where: { status: { in: ["FAILED", "DEAD"] } }, _count: true })
  ]);

  const critical = ctx.stock.lowStock.filter(l => l.level === "CRITICAL");
  if (critical.length)
    items.push({
      code: "CRITICAL_STOCK",
      severity: "critical",
      message: `${critical.length} item(s) are at or below their critical level: ${critical.slice(0, 3).map(c => `${c.name} (${c.department})`).join(", ")}`,
      data: critical.map(c => c.stockItemId)
    });
  for (const u of usage) {
    const daysLeft = dec(u.quantity).div(dec(u.perDay));
    items.push({
      code: "REORDER_SOON",
      severity: "warning",
      message: `${u.name} in ${u.department} will run out in about ${daysLeft.toFixed(1)} day(s) at the current rate of sale`,
      data: { department: u.department, item: u.name, quantity: dec(u.quantity), perDay: dec(u.perDay).toDecimalPlaces(3), daysLeft: daysLeft.toDecimalPlaces(1) }
    });
  }
  if (losses.length)
    items.push({
      code: "STOCK_LOSS",
      severity: "warning",
      message: `Biggest stock losses in 30 days: ${losses.map(l => `${l.name} KES ${money(dec(l.value)).toFixed(2)}`).join(", ")}`,
      data: losses.map(l => ({ item: l.name, value: money(dec(l.value)) }))
    });
  if (ctx.change !== null && Math.abs(ctx.change) >= 10)
    items.push({
      code: ctx.change > 0 ? "REVENUE_UP" : "REVENUE_DOWN",
      severity: ctx.change > 0 ? "info" : "warning",
      message: `Revenue is ${ctx.change > 0 ? "up" : "down"} ${Math.abs(ctx.change)}% on the previous period`
    });
  if (oldOpen._count)
    items.push({
      code: "OLD_OPEN_BILLS",
      severity: "warning",
      message: `${oldOpen._count} bill(s) from earlier days are still open (KES ${money(dec(oldOpen._sum.grossTotal)).toFixed(2)})`
    });
  for (const j of failedJobs)
    items.push({
      code: "INTEGRATION_FAILURES",
      severity: "critical",
      message: `${j._count} ${j.kind.replace(/_/g, " ").toLowerCase()} job(s) have failed`,
      data: { kind: j.kind, count: j._count }
    });

  const order = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  return { method: "rule-based (thresholds over recent sales, stock and job data)", items };
}

// ---------------------------------------------------------------- activity

const ACTIONS: Record<string, string> = {
  "order.synced_sale": "Sale",
  "order.transfer_to_room": "Bill posted to room",
  "order.room_transfer_reversed": "Room posting reversed",
  "stocktake.start": "Stock take started",
  "stocktake.approve": "Stock take approved",
  "stocktake.cancel": "Stock take cancelled",
  "auth.login": "Signed in",
  "auth.override_granted": "Supervisor override",
  "terminal.register": "Terminal registered"
};

async function activityFeed() {
  const rows = await prisma.auditLog.findMany({
    where: { action: { notIn: ["auth.login_failed", "auth.pin_failed"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { fullName: true } } }
  });
  return rows.map(r => ({
    at: r.createdAt,
    action: r.action,
    label: ACTIONS[r.action] ?? r.action,
    entity: r.entity,
    entityId: r.entityId,
    user: r.user?.fullName ?? null,
    data: r.data
  }));
}
