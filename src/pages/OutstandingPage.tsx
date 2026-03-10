import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDashboardStore } from '@/stores/dashboard-store';
import { formatNumber } from '@/lib/utils';
import { AlertCircle, Search, FileText } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export default function OutstandingPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const currentYear = new Date().getFullYear();
  const { stats, fetchStats, loading, error } = useDashboardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  useEffect(() => {
    if (cId) {
      fetchStats(cId, currentYear);
    }
  }, [cId, currentYear, fetchStats]);

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

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / perPage));
  const paginatedInvoices = filteredInvoices.slice((page - 1) * perPage, page * perPage);

  if (loading && !stats) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
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

  const totalOutstandingThb = filteredInvoices.reduce((sum, inv) => sum + inv.estimatedThbValue, 0);

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
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาลูกค้า, อินวอย, สกุลเงิน..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            
            <div className="flex items-center gap-4 bg-muted/50 px-4 py-2 rounded-lg border text-sm w-full sm:w-auto justify-end">
                <span className="text-muted-foreground">ยอดคงค้างประเมินรวม:</span>
                <span className="font-bold text-orange-600 dark:text-orange-400 text-lg">฿{formatNumber(totalOutstandingThb)}</span>
            </div>
          </div>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 p-4">
            {/* Table Area */}
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
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((inv, idx) => (
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      <div className="py-12 flex flex-col items-center">
                        <span className="text-3xl mb-3">🎉</span>
                        <span className="text-sm">ไม่มีลูกหนี้ค้างชำระในระบบ</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Footer */}
          {filteredInvoices.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 shrink-0 border-t mt-4">
            <div className="text-sm text-muted-foreground">
              รายการทั้งหมด <span className="font-medium text-foreground">{filteredInvoices.length}</span> รายการ
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-12 text-right">แสดง</span>
                <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground text-left w-14">รายการ</span>
              </div>
              
              <div className="flex items-center gap-1 font-medium bg-muted/30 p-1 rounded-md border text-sm">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-16 text-center text-xs">
                  หน้า {page} จาก {totalPages}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
