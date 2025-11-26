-- Add order references to stock_movements for better tracking
ALTER TABLE "stock_movements" ADD COLUMN "salesOrderId" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "purchaseOrderId" TEXT;

-- Add indexes for performance
CREATE INDEX "stock_movements_salesOrderId_idx" ON "stock_movements"("salesOrderId");
CREATE INDEX "stock_movements_purchaseOrderId_idx" ON "stock_movements"("purchaseOrderId");
