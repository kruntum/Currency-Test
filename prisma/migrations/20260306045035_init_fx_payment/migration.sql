-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "customer_id" INTEGER,
ADD COLUMN     "paid_thb" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payment_status" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "company_users" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DATA_ENTRY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "tax_id" TEXT,
    "wallet_balance_thb" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "received_date" TIMESTAMP(3) NOT NULL,
    "currency_code" TEXT NOT NULL,
    "received_fcy" DECIMAL(18,4) NOT NULL,
    "received_bot_rate" DECIMAL(18,6) NOT NULL,
    "received_thb" DECIMAL(18,2) NOT NULL,
    "bank_reference" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "receipt_id" INTEGER,
    "wallet_tx_id" INTEGER,
    "applied_fcy" DECIMAL(18,4) NOT NULL,
    "applied_thb" DECIMAL(18,2) NOT NULL,
    "fx_layer1_gain_loss" DECIMAL(18,2) NOT NULL,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount_fcy" DECIMAL(18,4) NOT NULL,
    "fx_rate_at_time" DECIMAL(18,6) NOT NULL,
    "amount_thb" DECIMAL(18,2) NOT NULL,
    "receipt_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fcd_holding_pools" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "currency_code" TEXT NOT NULL,
    "balance_fcy" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "avg_cost_rate" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fcd_holding_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_logs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "currency_code" TEXT NOT NULL,
    "amount_fcy" DECIMAL(18,4) NOT NULL,
    "actual_bank_rate" DECIMAL(18,6) NOT NULL,
    "thb_received" DECIMAL(18,2) NOT NULL,
    "cost_rate" DECIMAL(18,6) NOT NULL,
    "fx_layer2_gain_loss" DECIMAL(18,2) NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "exchanged_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_users_user_id_idx" ON "company_users"("user_id");

-- CreateIndex
CREATE INDEX "company_users_company_id_idx" ON "company_users"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_users_user_id_company_id_key" ON "company_users"("user_id", "company_id");

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "customers"("company_id");

-- CreateIndex
CREATE INDEX "receipts_company_id_idx" ON "receipts"("company_id");

-- CreateIndex
CREATE INDEX "receipts_customer_id_idx" ON "receipts"("customer_id");

-- CreateIndex
CREATE INDEX "payment_allocations_transaction_id_idx" ON "payment_allocations"("transaction_id");

-- CreateIndex
CREATE INDEX "payment_allocations_receipt_id_idx" ON "payment_allocations"("receipt_id");

-- CreateIndex
CREATE INDEX "payment_allocations_wallet_tx_id_idx" ON "payment_allocations"("wallet_tx_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_company_id_idx" ON "wallet_transactions"("company_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_customer_id_idx" ON "wallet_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "fcd_holding_pools_company_id_idx" ON "fcd_holding_pools"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "fcd_holding_pools_company_id_currency_code_key" ON "fcd_holding_pools"("company_id", "currency_code");

-- CreateIndex
CREATE INDEX "exchange_logs_company_id_idx" ON "exchange_logs"("company_id");

-- CreateIndex
CREATE INDEX "transactions_customer_id_idx" ON "transactions"("customer_id");

-- CreateIndex
CREATE INDEX "transactions_payment_status_idx" ON "transactions"("payment_status");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_wallet_tx_id_fkey" FOREIGN KEY ("wallet_tx_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fcd_holding_pools" ADD CONSTRAINT "fcd_holding_pools_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fcd_holding_pools" ADD CONSTRAINT "fcd_holding_pools_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_logs" ADD CONSTRAINT "exchange_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_logs" ADD CONSTRAINT "exchange_logs_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
