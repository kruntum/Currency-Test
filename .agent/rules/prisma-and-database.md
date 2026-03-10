# Prisma & Database Operations Rules

1. **Prisma Decimal Handling**: Financial fields (e.g., `amountFcy`, `thbAmount`, `exchangeRate`) are defined as `Decimal` in Prisma.
   - When Prisma serializes these fields to JSON (for API responses), they become `string` types.
   - Consequently, frontend Zustand stores and component interfaces MUST type these fields as `string | number` (NOT just `number`).
   - Always cast these values using `Number()`, `parseFloat()`, or a Decimal library before performing mathematical operations in the frontend.
2. **Prisma 'Where' Clause Limitations**: Prisma does not support comparing two columns directly within a standard `where` clause (e.g., `receivedFcy: { gt: prisma.receipt.fields.exchangedFcy }` will crash).
   - To perform column-to-column comparisons, you must either fetch the data and filter it in JavaScript memory (`.filter()`) or execute raw SQL via `$queryRaw`.
3. **Treasury Architecture (No Pooling)**:
   - The treasury business logic relies on a **per-receipt FCY Wallet** model.
   - Do NOT attempt to calculate an "average cost" by pooling all FCY. Each `Receipt` maintains its distinct `receivedBotRate` as its cost basis.
   - FX Layer 1 (Accounting) is calculated during allocation (`PaymentAllocation`).
   - FX Layer 2 (Realized) is calculated during bank exchange (`ExchangeLog`) based strictly on that specific receipt's cost rate.
