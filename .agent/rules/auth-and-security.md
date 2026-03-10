# Authentication & Authorization Rules

1. **Authentication System**:
   - The project uses **Better Auth** (`better-auth`) with the Prisma adapter for user authentication.
   - Sessions are managed automatically. Do not build custom JWT handlers unless explicitly requested.
   - Use `auth.api.getSession(req)` on the backend to verify the global user instance.

2. **Dual-Layer Security Model**:
   - **Layer 1: Global User (`User`)**
     - Handled by Better Auth. Represents the physical person logging in.
     - Protected via `authMiddleware` in the backend (`c.get('user')`).
   - **Layer 2: Company Level RBAC (`CompanyUser`)**
     - A single global `User` can belong to multiple companies via the `CompanyUser` bridging table.
     - Each `CompanyUser` record has a specific `role` (e.g., `OWNER`, `ADMIN`, `FINANCE`, `DATA_ENTRY`).
     - **CRITICAL**: Backend routes interacting with company data (transactions, invoices, customers) MUST use the `requireCompanyRole([...])` middleware to enforce access control.
     - The `companyId` is expected to be passed via route parameter, query parameter, or `x-company-id` header for the middleware to validate.

3. **Frontend Rules**:
   - When fetching data for a specific company, the frontend MUST always include the active `companyId` in the API request (usually from the Zustand store or URL parameters).
   - UI elements should be conditionally rendered based on the user's `CompanyUser` role if they do not have the required permissions.

4. **Bypasses & Backwards Compatibility**:
   - Users with a global role of `admin` (set in the generic User table) generally bypass `CompanyUser` role restrictions for support purposes.
   - If a company was created before the RBAC system, the `companyAuth` middleware auto-grants the `OWNER` role to the user whose ID matches `company.createdBy`.
