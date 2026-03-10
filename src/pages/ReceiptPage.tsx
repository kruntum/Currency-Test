import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReceiptStore } from '@/stores/receipt-store';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ReceiptDialog } from '@/components/receipt-dialog';
import { AllocationDialog } from '@/components/allocation-dialog';
import { type Receipt } from '@/stores/receipt-store';
import { Plus, Loader2, CheckCircle2, CircleDashed, Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/utils';

export default function ReceiptPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const { receipts, loading, fetchReceipts } = useReceiptStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  useEffect(() => {
    if (cId) {
      fetchReceipts(cId);
    }
  }, [cId, fetchReceipts]);

  const filteredReceipts = searchQuery.trim()
    ? receipts.filter((r) =>
        (r.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.bankReference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.currencyCode || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : receipts;

  const totalPages = Math.ceil(filteredReceipts.length / perPage);
  const pagedReceipts = filteredReceipts.slice((page - 1) * perPage, page * perPage);

  const handleSaved = () => {
    fetchReceipts(cId);
  };

  const handleOpenAllocation = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setAllocationOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader title="รับเงิน (Receipts)" description="บันทึกยอดชำระจากต่างประเทศและตัดยอดใบขน" />

      <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">
        {/* Top bar: search + add button */}
        <div className="flex items-center justify-between shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="ค้นหาลูกค้า, อ้างอิงธนาคาร, สกุลเงิน..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            บันทึกรับเงิน
          </Button>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle className="text-lg">ประวัติการรับเงิน <span className="text-sm font-normal text-muted-foreground ml-2">{filteredReceipts.length} รายการ</span></CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredReceipts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery.trim() ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีประวัติการรับเงิน'}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto rounded-md min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12 text-center py-2 h-9 text-xs font-medium">#</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">วันที่รับ</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">ลูกค้า (Customer)</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">อ้างอิงธนาคาร</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">สกุลเงิน</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium text-right">ยอดรับ (FCY)</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium text-right">ยอดรับ (THB)</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium text-center">สถานะตัดชำระ</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium text-right w-[80px]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedReceipts.map((rcpt, index) => (
                      <TableRow key={rcpt.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center text-muted-foreground text-xs py-1.5 h-10">
                          {(page - 1) * perPage + index + 1}
                        </TableCell>
                        <TableCell className="text-xs py-1.5 h-10">
                          {format(new Date(rcpt.receivedDate), 'd MMM yyyy', { locale: th })}
                        </TableCell>
                        <TableCell className="font-medium text-sm py-1.5 h-10">
                          {rcpt.customer?.name || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5 h-10">
                          {rcpt.bankReference || '-'}
                        </TableCell>
                        <TableCell className="py-1.5 h-10">
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300 shadow-xs">
                              {rcpt.currency?.symbol || rcpt.currencyCode.substring(0,1)}
                            </span>
                            <span className="text-xs font-medium">{rcpt.currencyCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-1.5 h-10">
                          <div className="flex flex-col items-end">
                            <div className="font-medium text-sm">
                              {formatNumber(rcpt.receivedFcy, 2)}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-normal mt-0.5">@ {formatNumber(rcpt.receivedBotRate, 4)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-1.5 h-10">
                          <div className="font-medium text-sm text-primary">
                            ฿{formatNumber(rcpt.receivedThb, 2)}
                          </div>
                          {rcpt.allocatedThb > 0 && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal mt-0.5">
                              ตัดแล้ว: ฿{formatNumber(rcpt.allocatedThb, 2)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-1.5 h-10">
                          <Badge 
                            variant={rcpt.status === 'FULLY_ALLOCATED' ? 'success' : rcpt.status === 'PARTIAL' ? 'warning' : 'secondary'} 
                            className="text-[10px] w-20 justify-center shadow-none gap-1 pl-1.5"
                          >
                            {rcpt.status === 'FULLY_ALLOCATED' && <CheckCircle2 className="w-3 h-3" />}
                            {rcpt.status === 'PARTIAL' && <CircleDashed className="w-3 h-3" />}
                            {rcpt.status === 'PENDING' && <Clock className="w-3 h-3" />}
                            {rcpt.status === 'FULLY_ALLOCATED' ? 'PAID' : rcpt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-1.5 h-10">
                          <Button 
                            variant="default" 
                            size="xs" 
                            className="h-6 text-xs shadow-sm"
                            disabled={rcpt.status === 'FULLY_ALLOCATED'}
                            onClick={() => handleOpenAllocation(rcpt)}
                          >
                            ตัดชำระ
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Footer */}
            {!loading && filteredReceipts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 pb-1 px-1 gap-4 mt-auto border-t">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    รายการทั้งหมด <span className="font-medium text-foreground">{filteredReceipts.length}</span> รายการ
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">แสดง</span>
                    <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                      <SelectTrigger className="w-[70px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">รายการ</span>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      หน้า <span className="font-medium text-foreground">{page}</span> จาก {totalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1}
                        onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReceiptDialog 
        companyId={cId} 
        open={dialogOpen} 
        onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) handleSaved();
        }} 
      />

      <AllocationDialog
        companyId={cId}
        open={allocationOpen}
        onOpenChange={setAllocationOpen}
        receipt={selectedReceipt}
        onSuccess={handleSaved}
      />
    </div>
  );
}
