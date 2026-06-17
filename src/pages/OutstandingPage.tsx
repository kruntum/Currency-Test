import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRole } from '@/hooks/use-role';
import { useDashboardStore } from '@/stores/dashboard-store';
import { formatNumber } from '@/lib/utils';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/search-input';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';

export default function OutstandingPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const navigate = useNavigate();
  const { hasRole, isLoading: roleLoading } = useRole(['OWNER', 'ADMIN', 'FINANCE']);

  const currentYear = new Date().getFullYear();
  const { stats, fetchStats, loading, error } = useDashboardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  useEffect(() => {
    if (!roleLoading && !hasRole && cId) {
      navigate(`/company/${cId}/transactions`, { replace: true });
    }
  }, [roleLoading, hasRole, cId, navigate]);

  useEffect(() => {
    if (cId && !roleLoading && hasRole) {
      fetchStats(cId, currentYear);
    }
  }, [cId, currentYear, fetchStats, roleLoading, hasRole]);

  const allInvoices = stats?.unpaidInvoices || [];

  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return allInvoices;
    const lowerQ = searchQuery.toLowerCase();
    return allInvoices.filter(inv =>
      inv.customerName.toLowerCase().includes(lowerQ) ||
      inv.invoiceNumber.toLowerCase().includes(lowerQ) ||
      inv.currencyCode.toLowerCase().includes(lowerQ)
    );
  }, [allInvoices, searchQuery]);

  // useMemo and all derived values MUST be before any conditional return (Rules of Hooks)
  const totalOutstandingThb = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.estimatedThbValue, 0),
    [filteredInvoices]
  );

  const paginatedInvoices = useMemo(
    () => filteredInvoices.slice((page - 1) * perPage, page * perPage),
    [filteredInvoices, page, perPage]
  );

  if (roleLoading) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!hasRole) {
    return null;
  }

  if (loading && !stats) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center p-8">
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className="text-muted-foreground">กำลังโหลดข้อมูลลูกหนี้คงค้าง...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center p-8 text-center bg-red-50/50 dark:bg-red-950/20">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">ไม่สามารถโหลดข้อมูลได้</h2>
        <p className="text-red-600/80 dark:text-red-400/80 max-w-md">{error || "ตรวจสอบสิทธิ์การใช้งานของคุณ"}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader 
        title="ลูกหนี้คงค้าง (Outstanding)"
        description="รายการเปิดบิลที่ยังไม่ได้รับชำระหรือชำระไม่ครบ ตรวจสอบการค้างชำระและอายุหนี้"
      />

      <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">
        {/* Actions Row */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <SearchInput
              placeholder="ค้นหาลูกค้า, อินวอย, สกุลเงิน..."
              className="w-full sm:w-auto sm:min-w-[300px]"
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setPage(1);
              }}
            />
            
            <div className="flex items-center gap-4 bg-muted/50 px-4 py-2 rounded-lg border text-sm w-full sm:w-auto justify-end">
                <span className="text-muted-foreground">ยอดคงค้างประเมินรวม:</span>
                <span className="font-bold text-orange-600 dark:text-orange-400 text-lg">฿{formatNumber(totalOutstandingThb)}</span>
            </div>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 p-4">
            {filteredInvoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="ไม่มีลูกหนี้ค้างชำระในระบบ"
              />
            ) : (
              <>
                <div className="flex-1 overflow-auto rounded-md min-h-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-12 text-center font-medium">#</TableHead>
                        <TableHead className="font-medium text-left">ข้อมูลลูกค้า / อินวอย</TableHead>
                        <TableHead className="font-medium text-right">ยอดที่ค้าง (FCY)</TableHead>
                        <TableHead className="font-medium text-right">ประเมินมูลค่า (THB)</TableHead>
                        <TableHead className="font-medium text-center w-[100px]">อายุหนี้ (วัน)</TableHead>
                        <TableHead className="font-medium text-center w-[80px]">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInvoices.map((inv, idx) => (
                        <TableRow key={inv.id} className="cursor-default hover:bg-muted/30 transition-colors">
                          <TableCell className="text-center text-muted-foreground text-xs py-2">
                              {(page - 1) * perPage + idx + 1}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{inv.customerName}</div>
                            <div className="text-xs text-muted-foreground flex gap-2 items-center mt-1">
                              <FileText className="h-3 w-3" />
                              <span>{inv.invoiceNumber}</span>
                              <span>•</span>
                              <span>{format(new Date(inv.invoiceDate), 'dd MMM yyyy', { locale: th })}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="font-mono text-sm font-medium">{formatNumber(inv.pendingFcy, 2)} <span className="text-[10px] text-muted-foreground font-sans">{inv.currencyCode}</span></div>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                              ~฿{formatNumber(inv.estimatedThbValue)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Badge variant={inv.agingDays > 30 ? "destructive" : "secondary"} className="text-[10px] w-16 justify-center shadow-none py-0.5 font-normal">
                              {inv.agingDays} วัน
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-2">
                              <Button asChild variant="secondary" size="sm" className="h-7 text-[10px] px-3 max-w-[80px]">
                                  <Link to={`/company/${cId}/transactions?search=${inv.invoiceNumber}`}>
                                      ดูใบขน
                                  </Link>
                              </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <DataTablePagination
                  total={filteredInvoices.length}
                  page={page}
                  perPage={perPage}
                  onPageChange={setPage}
                  onPerPageChange={(v) => { setPage(1); setPerPage(v); }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
