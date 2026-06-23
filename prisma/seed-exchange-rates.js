// server/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set. Please check your .env file.");
}
var connectionString = process.env.DATABASE_URL;
var pool = new pg.Pool({ connectionString });
var adapter = new PrismaPg(pool);
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// prisma/seed-exchange-rates.ts
import { subDays, format } from "date-fns";
var currencies = ["CNY", "USD", "EUR", "JPY", "GBP"];
async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function main() {
  const apiKey = process.env.BOT_API_KEY;
  if (!apiKey || apiKey === "your_bot_api_key_here") {
    console.error("\u274C BOT_API_KEY not configured in .env file!");
    process.exit(1);
  }
  console.log(`Starting exchange rate seeding for last 1 year for currencies: ${currencies.join(", ")}...`);
  const totalDays = 365;
  const chunkSize = 30;
  const today = /* @__PURE__ */ new Date();
  for (const currency of currencies) {
    console.log(`
Fetching ${currency} exchange rates...`);
    let fetchedCount = 0;
    let insertedCount = 0;
    for (let daysAgo = totalDays; daysAgo >= 0; daysAgo -= chunkSize) {
      const startOffset = daysAgo;
      const endOffset = Math.max(0, daysAgo - chunkSize + 1);
      const startDate = subDays(today, startOffset);
      const endDate = subDays(today, endOffset);
      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");
      console.log(`  -> Querying range: ${startDateStr} to ${endDateStr}...`);
      const url = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${startDateStr}&end_period=${endDateStr}&currency=${currency}`;
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "*/*",
            "Authorization": apiKey
          }
        });
        if (!response.ok) {
          console.error(`  \u274C BOT API error for ${currency} [${startDateStr} to ${endDateStr}]: ${response.status} ${response.statusText}`);
          await wait(2e3);
          continue;
        }
        const data = await response.json();
        const details = data.result?.data?.data_detail || [];
        fetchedCount += details.length;
        for (const detail of details) {
          if (detail.period && detail.buying_transfer) {
            try {
              await prisma.exchangeRate.upsert({
                where: {
                  currencyCode_rateDate: {
                    currencyCode: currency,
                    rateDate: new Date(detail.period)
                  }
                },
                update: {
                  buyingTransfer: detail.buying_transfer
                },
                create: {
                  currencyCode: currency,
                  rateDate: new Date(detail.period),
                  buyingTransfer: detail.buying_transfer
                }
              });
              insertedCount++;
            } catch (dbErr) {
            }
          }
        }
        console.log(`  \u2705 Received ${details.length} records, processed successfully.`);
      } catch (err) {
        console.error(`  \u274C Network/Parser error for ${currency}:`, err);
      }
      await wait(1e3);
    }
    console.log(`\u{1F389} Finished ${currency}: fetched ${fetchedCount} items, inserted/updated ${insertedCount} records in local DB.`);
  }
  console.log("\n\u2705 Exchange rate seeding complete!");
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error("\u274C Seeding failed with error:", e);
  process.exit(1);
});
