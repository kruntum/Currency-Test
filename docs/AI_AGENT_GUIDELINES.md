# Cursor / AI Agent Development Guidelines for Currency-Test

## Introduction

This document serves as the primary source of truth for any AI Assistant or Developer working on the `currency-test` project. You MUST read and understand these guidelines before making any architectural or business logic changes.

## 1. Project Architecture & Stack

This is a full-stack web application with the following stack:

- **Frontend**: React 19, Vite, TailwindCSS v4, Shadcn/UI (Radix UI), Zustand (State Management), React Router DOM.
- **Backend**: Node.js, Hono.js (framework), Prisma ORM (Database access), Zod (Validation).
- **Database**: PostgreSQL.

## 2. Authentication & Authorization (Security)

- **Global User Auth (`better-auth`)**: Standard session management handles the user's primary login identity (`c.get('user')`).
- **CompanyLevel RBAC (`CompanyUser`)**:
  - A user connects to business data via the `CompanyUser` bridging table.
  - Allowed roles: `OWNER`, `ADMIN`, `FINANCE`, `DATA_ENTRY`.
  - **CRITICAL BACKEND RULE**: Any route touching transactions, invoices, or treasury MUST be protected using the `requireCompanyRole([...])` middleware to verify the user has permission for that specific `companyId`.
  - **CRITICAL FRONTEND RULE**: The frontend must consistently pass the `companyId` (via query param, route param, or header) to authorized backend endpoints.

## 3. Core Business Logic (The 2-Track System)

This system handles export transactions and foreign currency reconciliation based on a **per-receipt FCY wallet** model. It NEVER pools money together for average costing.

### Track 1: Accounting (Transaction & Allocation)

- **Transactions (ใบขนสินค้า)**: Represents goods exported. Has an `exchangeRate` based on the BOT rate on the `rateDate`. Has a `thbAmount` (expected revenue).
- **Receipts (รับเงิน)**: Represents incoming foreign wire transfers. Has an `receivedBotRate` for the day the money landed.
- **Payment Allocation (ตัดชำระ)**: Links a Receipt to a Transaction.
  - **FX Layer 1 (Accounting Gain/Loss)** is calculated here:
    `FX Layer 1 = THB Received (from Receipt's BOT rate) - THB Expected (from Transaction's BOT rate)`

### Track 2: Treasury (FCY Wallets & Exchange)

- **FCY Wallets**: Every `Receipt` acts as its own distinct Wallet. It tracks `receivedFcy`, `exchangedFcy`, and the remaining balance. The _cost rate_ of the wallet is strictly the `receivedBotRate` of that specific receipt.
- **Exchange (ขายเงินธนาคาร)**: When the company sells FCY to the bank, they pull from a specific `Receipt` wallet.
  - **FX Layer 2 (Realized Treasury Gain/Loss)** is calculated here:
    `FX Layer 2 = (Actual Bank Rate - Receipt's Cost Rate) * FCY Exchanged Amount`

**CRITICAL RULE**: Do not attempt to calculate an "average cost" across all FCY holding pools. The system was explicitly refactored AWAY from this model to a per-receipt wallet model for precise P/L tracking.

## 4. Database & Prisma Rules

- **Schema**: Located at `prisma/schema.prisma`.
- **Decimal Fields**: Financial fields (e.g., `amountFcy`, `thbAmount`, `exchangeRate`) use `Decimal` type in Prisma (`db.Decimal`).
  - **WARNING**: When fetching Decimal fields via API to the frontend, they arrive as `string` or `number` in JSON.
  - **Frontend Type Safety**: Interface types for these fields in Zustand stores (e.g., `balanceFcy`, `avgCostRate`) MUST account for `string | number`. Do not blindly type them as `number`. Use `Number()` or `parseFloat()` safely before math operations on the frontend.
  - **Backend Math**: Use `Decimal.js` (or cast to `Decimal`) for all math operations in Hono routes to prevent floating-point errors.
- **Prisma Constraints**: Prisma cannot compare two columns directly in a `where` clause (e.g., `receivedFcy: { gt: prisma.receipt.fields.exchangedFcy }` will throw an error). You must fetch the records and filter them in memory/JS or use `$queryRaw` for such queries.

## 5. Frontend Conventions

- **Styling**: We use TailwindCSS.
  - For compact UIs, prefer `h-7 text-xs` for inputs, dropdowns, and buttons.
  - Required fields in forms must be highlighted. We currently use `bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40` to ensure visibility across light and dark modes without stacking overlaps.
  - If styling a 3rd-party component (like a custom DatePicker), pass `inputClassName` instead of a wrapper `className` to avoid opacity stacking.
- **State Management**: Use Zustand (`src/stores/*`). Always include `companyId` when fetching or mutating data that belongs to a specific company.
- **Component Reusability & Shadcn UI (CRITICAL RULE)**:
  - The project heavily relies on **Shadcn UI** components.
  - **ALWAYS REUSE** existing components first. Before determining that a new component needs to be built from scratch, thoroughly check the `src/components/ui/` directory.
  - Do not reinvent the wheel. If a Shadcn component does not exist in the project, check if it can be added via the CLI (`npx shadcn-ui@latest add <component>`) rather than building a custom implementation.
  - When creating complex components (like new dialogs or comboboxes), pattern match against existing ones (like `ProductManagerDialog` or `CustomerCombobox`) to ensure a cohesive UI structure and behavior.

## 6. Backend Conventions (Hono)

- Routes are located in `server/routes/*`.
- Use `zValidator` from `@hono/zod-validator` for input validation.
- All protected routes should expect a `user` and `session` object in the Hono Context (`c.get('user')`).
- Return financial math results properly formatted or serialized so the frontend can display them easily. ห้ามให้ Backend ส่งค่าที่คำนวณผิดพลาดไปให้ Frontend แสดงผลเด็ดขาด.

## 7. How to Proceed with Tasks

1. **Understand First**: Always check `docs/payment-reconciliation.md` if touching anything related to Treasury or Accounting.
2. **Schema Audit**: Check `prisma/schema.prisma` before proposing DB changes.
3. **Draft Plan**: Create an `implementation_plan.md` artifact outlining the steps, especially for complex UI changes or structural refactors.
4. **Be Precise**: The user values "compact" UIs and "exact" implementations. Do not provide generic boilerplate if a specific UI tweak was requested.
