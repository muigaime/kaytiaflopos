-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DepartmentKind" AS ENUM ('STORE', 'OUTLET', 'FRONT_OFFICE', 'ADMIN');

-- CreateEnum
CREATE TYPE "ModuleKey" AS ENUM ('DASHBOARD', 'PMS', 'POS', 'INVENTORY', 'ACCOUNTS', 'REPORTS', 'ADMIN');

-- CreateEnum
CREATE TYPE "MealPlan" AS ENUM ('RO', 'BB', 'HB', 'FB', 'AI');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('VACANT_CLEAN', 'VACANT_DIRTY', 'OCCUPIED', 'INSPECTED', 'OUT_OF_ORDER', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "SettlementMode" AS ENUM ('PAY_NOW', 'DEPOSIT', 'PENDING', 'COMPLIMENTARY');

-- CreateEnum
CREATE TYPE "FolioChargeType" AS ENUM ('ROOM', 'MEAL_PLAN', 'EXTRA_GUEST', 'EARLY_CHECKIN', 'LATE_CHECKOUT', 'FNB_TRANSFER', 'MINIBAR', 'LAUNDRY', 'MISC', 'DISCOUNT', 'WAIVER');

-- CreateEnum
CREATE TYPE "HousekeepingTaskType" AS ENUM ('CLEAN', 'INSPECT', 'TURNDOWN', 'DEEP_CLEAN', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "HousekeepingTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'INSPECTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIVE', 'TRANSFER_OUT', 'TRANSFER_IN', 'SALE', 'SALE_RETURN', 'SWAP_OUT', 'SWAP_IN', 'ISSUE_INTERNAL', 'ISSUE_STAFF_MEAL', 'ISSUE_PROMO', 'WASTAGE', 'STOCKTAKE_ADJUST', 'ADJUST');

-- CreateEnum
CREATE TYPE "TransferKind" AS ENUM ('REQUISITION', 'TRANSFER', 'NON_SALES_ISSUE');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ISSUED', 'RECEIVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NonSalesReason" AS ENUM ('INTERNAL', 'STAFF_MEAL', 'PROMOTION', 'WASTAGE');

-- CreateEnum
CREATE TYPE "StockTakeStatus" AS ENUM ('COUNTING', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStation" AS ENUM ('KOT', 'BOT', 'NONE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'PROFORMA_PRINTED', 'SETTLED', 'TRANSFERRED_TO_ROOM', 'MERGED', 'VOID');

-- CreateEnum
CREATE TYPE "EtimsStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SIGNED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('SENT', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MPESA', 'CARD', 'DEBTOR', 'ROOM_FOLIO', 'BANK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('APPLIED', 'REJECTED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "IntegrationKind" AS ENUM ('MPESA_STK_PUSH', 'ETIMS_SIGN_RECEIPT', 'ETIMS_Z_REPORT', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'DEAD');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSuperCashier" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "pinHash" TEXT,
    "cardNo" TEXT,
    "roleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DepartmentKind" NOT NULL,
    "printer" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDepartment" (
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "UserDepartment_pkey" PRIMARY KEY ("userId","departmentId")
);

-- CreateTable
CREATE TABLE "Terminal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT,
    "secretHash" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Terminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleToggle" (
    "id" TEXT NOT NULL,
    "module" "ModuleKey" NOT NULL,
    "roleId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleToggle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDay" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,

    CONSTRAINT "BusinessDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "businessDayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "openingFloat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "countedCash" DECIMAL(14,2),
    "expectedCash" DECIMAL(14,2),
    "originTerminalId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "rateToBase" DECIMAL(14,6) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "kraPin" TEXT,
    "isCorporate" BOOLEAN NOT NULL DEFAULT false,
    "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomClass" TEXT NOT NULL DEFAULT 'Standard',
    "description" TEXT,
    "baseRate" DECIMAL(14,2) NOT NULL,
    "rateFloor" DECIMAL(14,2) NOT NULL,
    "defaultOccupancy" INTEGER NOT NULL DEFAULT 1,
    "maxAdults" INTEGER NOT NULL DEFAULT 2,
    "maxChildren" INTEGER NOT NULL DEFAULT 0,
    "maxGuests" INTEGER NOT NULL DEFAULT 2,
    "maxExtraBeds" INTEGER NOT NULL DEFAULT 0,
    "extraGuestRate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "features" TEXT[],
    "facilities" TEXT[],
    "housekeepingCheck" BOOLEAN NOT NULL DEFAULT true,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomTariff" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "mealPlan" "MealPlan" NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'KES',
    "rate" DECIMAL(14,2) NOT NULL,
    "adultsIncluded" INTEGER NOT NULL DEFAULT 1,
    "mealPerExtraAdult" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "childPercent" INTEGER NOT NULL DEFAULT 50,
    "validFrom" DATE,
    "validTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RoomTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" TEXT,
    "categoryId" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'VACANT_CLEAN',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationality" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gender" TEXT,
    "documentRef" TEXT,
    "preferences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupBooking" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT,
    "sponsorName" TEXT,
    "sponsorPhone" TEXT,
    "masterBilling" BOOLEAN NOT NULL DEFAULT true,
    "coversIncidentals" BOOLEAN NOT NULL DEFAULT false,
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "originTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "categoryId" TEXT NOT NULL,
    "roomId" TEXT,
    "groupId" TEXT,
    "customerId" TEXT,
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "mealPlan" "MealPlan" NOT NULL DEFAULT 'RO',
    "currency" CHAR(3) NOT NULL DEFAULT 'KES',
    "roomRate" DECIMAL(14,2) NOT NULL,
    "mealRate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "settlement" "SettlementMode" NOT NULL DEFAULT 'PENDING',
    "earlyCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "lateCheckOut" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "originTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationGuest" (
    "reservationId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReservationGuest_pkey" PRIMARY KEY ("reservationId","guestId")
);

-- CreateTable
CREATE TABLE "RoomFolioCharge" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" "FolioChargeType" NOT NULL,
    "description" TEXT NOT NULL,
    "serviceDate" DATE,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'KES',
    "amountBase" DECIMAL(14,2) NOT NULL,
    "sourceOrderId" TEXT,
    "voided" BOOLEAN NOT NULL DEFAULT false,
    "postedById" TEXT NOT NULL,
    "originTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomFolioCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousekeepingTask" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "type" "HousekeepingTaskType" NOT NULL,
    "status" "HousekeepingTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" DATE NOT NULL,
    "assignedToId" TEXT,
    "scheduledById" TEXT NOT NULL,
    "inspectedById" TEXT,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inspectedAt" TIMESTAMP(3),
    "originTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousekeepingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "baseUnit" TEXT NOT NULL,
    "purchaseUnit" TEXT,
    "unitsPerPurchase" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "yieldFactor" DECIMAL(6,4) NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(14,2),
    "reorderLevel" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "criticalLevel" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "tracksExpiry" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentInventory" (
    "departmentId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reorderLevel" DECIMAL(14,3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentInventory_pkey" PRIMARY KEY ("departmentId","stockItemId")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "taxCode" TEXT NOT NULL DEFAULT 'B',
    "station" "OrderStation" NOT NULL DEFAULT 'KOT',
    "swapGroup" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "departmentId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,4) NOT NULL,
    "balanceAfter" DECIMAL(14,3) NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "originTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" "TransferKind" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "fromDepartmentId" TEXT NOT NULL,
    "toDepartmentId" TEXT,
    "nonSalesReason" "NonSalesReason",
    "note" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "receivedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "originTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransferLine" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(14,3) NOT NULL,
    "issuedQuantity" DECIMAL(14,3),
    "receivedQuantity" DECIMAL(14,3),

    CONSTRAINT "InventoryTransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTakeSession" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "StockTakeStatus" NOT NULL DEFAULT 'COUNTING',
    "departmentId" TEXT,
    "uncountedAsZero" BOOLEAN NOT NULL DEFAULT false,
    "startedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "itemsCounted" INTEGER,
    "shrinkageValue" DECIMAL(14,2),
    "surplusValue" DECIMAL(14,2),
    "netVarianceValue" DECIMAL(14,2),
    "stockValueAfter" DECIMAL(14,2),
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTakeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTakeItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "countedQuantity" DECIMAL(14,3),
    "countedById" TEXT,
    "countedAt" TIMESTAMP(3),
    "systemQuantity" DECIMAL(14,3),
    "varianceQuantity" DECIMAL(14,3),
    "unitCost" DECIMAL(14,4),
    "varianceValue" DECIMAL(14,2),
    "narration" TEXT,

    CONSTRAINT "StockTakeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemSwapLog" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "fromStockItemId" TEXT NOT NULL,
    "toStockItemId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "originTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemSwapLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "departmentId" TEXT NOT NULL,
    "shiftId" TEXT,
    "waiterId" TEXT NOT NULL,
    "cashierId" TEXT,
    "tableLabel" TEXT,
    "guestName" TEXT,
    "covers" INTEGER,
    "splitFromId" TEXT,
    "mergedIntoId" TEXT,
    "roomReservationId" TEXT,
    "netTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grossTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "proformaPrintedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "etimsStatus" "EtimsStatus" NOT NULL DEFAULT 'PENDING',
    "etimsReceiptNo" TEXT,
    "etimsSignedAt" TIMESTAMP(3),
    "originTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "taxCode" TEXT NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "station" "OrderStation" NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "kitchenNote" TEXT,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'SENT',
    "voidReason" TEXT,
    "voidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "orderId" TEXT,
    "reservationId" TEXT,
    "customerId" TEXT,
    "shiftId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'KES',
    "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
    "amountBase" DECIMAL(14,2) NOT NULL,
    "reference" TEXT,
    "mpesaPhone" TEXT,
    "mpesaCheckoutRequestId" TEXT,
    "userId" TEXT NOT NULL,
    "originTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncOperation" (
    "id" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "entity" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "clientTime" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SyncStatus" NOT NULL,
    "error" TEXT,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationJob" (
    "id" TEXT NOT NULL,
    "kind" "IntegrationKind" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'QUEUED',
    "refType" TEXT,
    "refId" TEXT,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "authorizedById" TEXT,
    "terminalId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_cardNo_key" ON "User"("cardNo");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Terminal_name_key" ON "Terminal"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleToggle_module_roleId_key" ON "ModuleToggle"("module", "roleId");

-- CreateIndex
CREATE INDEX "BusinessDay_closedAt_idx" ON "BusinessDay"("closedAt");

-- CreateIndex
CREATE INDEX "Shift_userId_closedAt_idx" ON "Shift"("userId", "closedAt");

-- CreateIndex
CREATE INDEX "ExchangeRate_currency_effectiveFrom_idx" ON "ExchangeRate"("currency", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "RoomCategory_code_key" ON "RoomCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RoomCategory_name_key" ON "RoomCategory"("name");

-- CreateIndex
CREATE INDEX "RoomTariff_categoryId_mealPlan_currency_idx" ON "RoomTariff"("categoryId", "mealPlan", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "Room_number_key" ON "Room"("number");

-- CreateIndex
CREATE INDEX "Guest_idNumber_idx" ON "Guest"("idNumber");

-- CreateIndex
CREATE INDEX "Guest_phone_idx" ON "Guest"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_number_key" ON "Reservation"("number");

-- CreateIndex
CREATE INDEX "Reservation_roomId_status_idx" ON "Reservation"("roomId", "status");

-- CreateIndex
CREATE INDEX "Reservation_arrival_departure_idx" ON "Reservation"("arrival", "departure");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RoomFolioCharge_sourceOrderId_key" ON "RoomFolioCharge"("sourceOrderId");

-- CreateIndex
CREATE INDEX "RoomFolioCharge_reservationId_type_idx" ON "RoomFolioCharge"("reservationId", "type");

-- CreateIndex
CREATE INDEX "HousekeepingTask_scheduledFor_status_idx" ON "HousekeepingTask"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "HousekeepingTask_assignedToId_status_idx" ON "HousekeepingTask"("assignedToId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_code_key" ON "StockItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeItem_menuItemId_stockItemId_key" ON "RecipeItem"("menuItemId", "stockItemId");

-- CreateIndex
CREATE INDEX "StockMovement_stockItemId_departmentId_createdAt_idx" ON "StockMovement"("stockItemId", "departmentId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_refType_refId_idx" ON "StockMovement"("refType", "refId");

-- CreateIndex
CREATE INDEX "StockMovement_type_createdAt_idx" ON "StockMovement"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_number_key" ON "InventoryTransfer"("number");

-- CreateIndex
CREATE INDEX "InventoryTransfer_status_kind_idx" ON "InventoryTransfer"("status", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransferLine_transferId_stockItemId_key" ON "InventoryTransferLine"("transferId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTakeSession_number_key" ON "StockTakeSession"("number");

-- CreateIndex
CREATE INDEX "StockTakeSession_status_idx" ON "StockTakeSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StockTakeItem_sessionId_departmentId_stockItemId_key" ON "StockTakeItem"("sessionId", "departmentId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_status_departmentId_idx" ON "Order"("status", "departmentId");

-- CreateIndex
CREATE INDEX "Order_waiterId_status_idx" ON "Order"("waiterId", "status");

-- CreateIndex
CREATE INDEX "Order_shiftId_idx" ON "Order"("shiftId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mpesaCheckoutRequestId_key" ON "Payment"("mpesaCheckoutRequestId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_reservationId_idx" ON "Payment"("reservationId");

-- CreateIndex
CREATE INDEX "Payment_shiftId_method_idx" ON "Payment"("shiftId", "method");

-- CreateIndex
CREATE INDEX "SyncOperation_receivedAt_idx" ON "SyncOperation"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncOperation_terminalId_sequence_key" ON "SyncOperation"("terminalId", "sequence");

-- CreateIndex
CREATE INDEX "IntegrationJob_status_nextAttemptAt_idx" ON "IntegrationJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "IntegrationJob_refType_refId_idx" ON "IntegrationJob"("refType", "refId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDepartment" ADD CONSTRAINT "UserDepartment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDepartment" ADD CONSTRAINT "UserDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Terminal" ADD CONSTRAINT "Terminal_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleToggle" ADD CONSTRAINT "ModuleToggle_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDay" ADD CONSTRAINT "BusinessDay_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDay" ADD CONSTRAINT "BusinessDay_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_businessDayId_fkey" FOREIGN KEY ("businessDayId") REFERENCES "BusinessDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTariff" ADD CONSTRAINT "RoomTariff_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoomCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoomCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupBooking" ADD CONSTRAINT "GroupBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoomCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GroupBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationGuest" ADD CONSTRAINT "ReservationGuest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationGuest" ADD CONSTRAINT "ReservationGuest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFolioCharge" ADD CONSTRAINT "RoomFolioCharge_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFolioCharge" ADD CONSTRAINT "RoomFolioCharge_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFolioCharge" ADD CONSTRAINT "RoomFolioCharge_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentInventory" ADD CONSTRAINT "DepartmentInventory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentInventory" ADD CONSTRAINT "DepartmentInventory_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransferLine" ADD CONSTRAINT "InventoryTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransferLine" ADD CONSTRAINT "InventoryTransferLine_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeSession" ADD CONSTRAINT "StockTakeSession_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeSession" ADD CONSTRAINT "StockTakeSession_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeSession" ADD CONSTRAINT "StockTakeSession_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeItem" ADD CONSTRAINT "StockTakeItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StockTakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeItem" ADD CONSTRAINT "StockTakeItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeItem" ADD CONSTRAINT "StockTakeItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakeItem" ADD CONSTRAINT "StockTakeItem_countedById_fkey" FOREIGN KEY ("countedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSwapLog" ADD CONSTRAINT "ItemSwapLog_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSwapLog" ADD CONSTRAINT "ItemSwapLog_fromStockItemId_fkey" FOREIGN KEY ("fromStockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSwapLog" ADD CONSTRAINT "ItemSwapLog_toStockItemId_fkey" FOREIGN KEY ("toStockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemSwapLog" ADD CONSTRAINT "ItemSwapLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_splitFromId_fkey" FOREIGN KEY ("splitFromId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_roomReservationId_fkey" FOREIGN KEY ("roomReservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
