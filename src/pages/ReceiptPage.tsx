import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReceiptStore } from '@/stores/receipt-store';
import { useCustomerStore } from '@/stores/customer-store';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ReceiptDialog } from '@/components/receipt-dialog';
import { AllocationDialog } from '@/components/allocation-dialog';
import { AllocationHistoryDialog } from '@/components/allocation-history-dialog';
import { type Receipt } from '@/stores/receipt-store';
import { Plus, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/utils';
import { RoleProtect } from '@/components/role-protect';
import { SearchInput } from '@/components/ui/search-input';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { PaymentStatusBadge } from '@/components/payment-status-badge';
import { CurrencyBadge } from '@/components/currency-badge';

export default function ReceiptPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const { receipts, loading, fetchReceipts, deleteAllocation } = useReceiptStore();
  const { fetchCustomers } = useCustomerStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  useEffect(() => {
    if (selectedReceipt) {
      const updated = receipts.find(r => r.id === selectedReceipt.id);
      if (updated) {
        setSelectedReceipt(updated);
      } else {
        setSelectedReceipt(null);
        setHistoryOpen(false);
      }
    }
  }, [receipts, selectedReceipt?.id]);

  useEffect(() => {
    if (cId) {
      fetchReceipts(cId);
      fetchCustomers(cId);
    }
  }, [cId, fetchReceipts, fetchCustomers]);

  const filteredReceipts = searchQuery.trim()
    ? receipts.filter((r) =>
        (r.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.bankReference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.currencyCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(r.id).includes(searchQuery.toLowerCase()) ||
        `receipt #${r.id}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `#${r.id}`.includes(searchQuery.toLowerCase())
      )
    : receipts;

  const pagedReceipts = filteredReceipts.slice((page - 1) * perPage, page * perPage);

  const handleSaved = () => {
    fetchReceipts(cId);
  };

  const handleOpenAllocation = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setAllocationOpen(true);
  };

  const handleOpenHistory = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setHistoryOpen(true);
  };

  const handleRemoveAllocation = async (allocId: number) => {
    if (window.confirm('คุณต้องการยกเลิกการตัดชำระของใบขนนี้ใช่หรือไม่?\nยอดค้างชำระของใบขนและยอดใน Receipt จะถูกดึงกลับคืนมา')) {
      try {
        await deleteAllocation(allocId, cId);
        toast.success('ยกเลิกการตัดชำระสำเร็จ');
        fetchReceipts(cId);
      } catch (err: any) {
        toast.error(err.message || 'เกิดข้อผิดพลาดในการยกเลิก');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader title="รับเงิน (Receipts)" description="บันทึกยอดชำระจากต่างประเทศและตัดยอดใบขน" />

      <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">
        {/* Top bar: search + add button */}
        <div className="flex items-center justify-between shrink-0">
          <SearchInput
            className="max-w-sm flex-1"
            placeholder="ค้นหาลูกค้า, อ้างอิงธนาคาร, สกุลเงิน..."
            value={searchQuery}
            onChange={(val) => { setSearchQuery(val); setPage(1); }}
          />
          <RoleProtect allowedRoles={['OWNER', 'ADMIN', 'FINANCE']}>
            <Button onClick={() => setDialogOpen(true)} className="gap-2 h-7 text-xs">
              <Plus className="h-3.5 w-3.5" />
              บันทึกรับเงิน
            </Button>
          </RoleProtect>
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
              <EmptyState
                icon={Search}
                title={searchQuery.trim() ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีประวัติการรับเงิน'}
              />
            ) : (
              <div className="flex-1 overflow-auto rounded-md min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12 text-center py-2 h-9 text-xs font-medium">#</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">วันที่รับ</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">ลูกค้า (Customer)</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">เลขที่รับเงิน (Receipt ID)</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">อ้างอิงธนาคาร</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">สกุลเงิน</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium text-right">ยอดรับ (FCY)</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium text-right">ยอดรับ (THB)</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium text-center">สถานะตัดชำระ</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium text-right w-[130px]">จัดการ</TableHead>
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
                        <TableCell className="font-semibold font-mono text-xs py-1.5 h-10 text-primary/90">
                          Receipt #{rcpt.id}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5 h-10">
                          {rcpt.bankReference || '-'}
                        </TableCell>
                        <TableCell className="py-1.5 h-10">
                          <CurrencyBadge code={rcpt.currencyCode} symbol={rcpt.currency?.symbol} />
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
                          {Number(rcpt.allocatedThb) > 0 && (
                            <button
                               onClick={() => handleOpenHistory(rcpt)}
                               className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 hover:underline flex items-center gap-0.5 justify-end ml-auto transition-all"
                             >
                               ตัดแล้ว: ฿{formatNumber(rcpt.allocatedThb, 2)}
                             </button>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-1.5 h-10">
                          <PaymentStatusBadge status={rcpt.status} />
                        </TableCell>
                        <TableCell className="text-right py-1.5 h-10">
                          <div className="flex justify-end gap-1.5">
                             {rcpt.status !== 'FULLY_ALLOCATED' && (
                               <RoleProtect allowedRoles={['OWNER', 'ADMIN', 'FINANCE']}>
                                 <Button 
                                   variant="default" 
                                   size="xs" 
                                   className="h-6 text-[10px] px-2 shadow-sm"
                                   onClick={() => handleOpenAllocation(rcpt)}
                                 >
                                   ตัดชำระ
                                 </Button>
                               </RoleProtect>
                             )}
                             {rcpt.allocations && rcpt.allocations.length > 0 && (
                               <Button 
                                 variant="outline" 
                                 size="xs" 
                                 className="h-6 text-[10px] px-2 text-slate-600 dark:text-slate-300 shadow-sm"
                                 onClick={() => handleOpenHistory(rcpt)}
                               >
                                 ประวัติ
                               </Button>
                             )}
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && filteredReceipts.length > 0 && (
              <DataTablePagination
                total={filteredReceipts.length}
                page={page}
                perPage={perPage}
                onPageChange={setPage}
                onPerPageChange={(v) => { setPage(1); setPerPage(v); }}
              />
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

      <AllocationHistoryDialog
         open={historyOpen}
         onOpenChange={setHistoryOpen}
         receipt={selectedReceipt}
         onRemoveAllocation={handleRemoveAllocation}
      />
    </div>
  );
}
