-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" SERIAL NOT NULL,
    "currency_code" TEXT NOT NULL,
    "rate_date" TIMESTAMP(3) NOT NULL,
    "buying_transfer" DECIMAL(18,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rates_currency_code_rate_date_idx" ON "exchange_rates"("currency_code", "rate_date");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_currency_code_rate_date_key" ON "exchange_rates"("currency_code", "rate_date");

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE CASCADE ON UPDATE CASCADE;
