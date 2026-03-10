import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import TransactionPage from '@/pages/TransactionPage';
import CompanyPage from '@/pages/CompanyPage';
import CustomerPage from '@/pages/CustomerPage';
import ReceiptPage from '@/pages/ReceiptPage';
import TreasuryPage from '@/pages/TreasuryPage';
import AuditLogsPage from '@/pages/AuditLogsPage';
import OutstandingPage from '@/pages/OutstandingPage';
import UsersPage from '@/pages/admin/UsersPage';
import CurrenciesPage from '@/pages/admin/CurrenciesPage';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Company management */}
        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <CompanyPage />
            </ProtectedRoute>
          }
        />

        {/* Company-scoped routes */}
        <Route
          path="/company/:companyId"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/transactions"
          element={
            <ProtectedRoute>
              <TransactionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/customers"
          element={
            <ProtectedRoute>
              <CustomerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/outstanding"
          element={
            <ProtectedRoute>
              <OutstandingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/receipts"
          element={
            <ProtectedRoute>
              <ReceiptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/treasury"
          element={
            <ProtectedRoute>
              <TreasuryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/:companyId/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/currencies"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <CurrenciesPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        {/* Default: redirect to companies list */}
        <Route path="/" element={<Navigate to="/companies" replace />} />
        <Route path="*" element={<Navigate to="/companies" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
