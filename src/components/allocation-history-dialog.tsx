import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { type Receipt } from '@/stores/receipt-store';
import { formatNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { RoleProtect } from '@/components/role-protect';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: Receipt | null;
  onRemoveAllocation: (allocId: number) => Promise<void>;
}

export function AllocationHistoryDialog({ open, onOpenChange, receipt, onRemoveAllocation }: Props) {
  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-5">
        <DialogHeader className="shrink-0 border-b pb-3">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            ประวัติการตัดชำระเงินใบขน
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              Receipt #{receipt.id}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            รายการใบขนสินค้าทั้งหมดที่ถูกหักชำระด้วยเงินบาทจาก Receipt ใบนี้ (เรท BOT: {receipt.receivedBotRate})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto my-4 rounded-lg border bg-white dark:bg-slate-950">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
              <TableRow className="border-b text-xs hover:bg-transparent">
                <TableHead className="font-semibold py-2">เลขที่ใบขน</TableHead>
                <TableHead className="font-semibold py-2">วันที่ตัดชำระ</TableHead>
                <TableHead className="font-semibold py-2 text-right">ใช้ THB จาก Receipt (1)</TableHead>
                <TableHead className="font-semibold py-2 text-right">หัก THB ของใบขน (2)</TableHead>
                <TableHead className="font-semibold py-2 text-right">กำไร/ขาดทุน</TableHead>
                <TableHead className="font-semibold py-2 text-center w-[80px]">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.allocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    ยังไม่มีการตัดชำระ
                  </TableCell>
                </TableRow>
              ) : (
                receipt.allocations.map((alloc) => {
                  const applied = parseFloat(alloc.appliedThb.toString()) || 0;
                  const invoice = parseFloat(alloc.invoiceThb.toString()) || 0;
                  const fx = applied - invoice;

                  return (
                    <TableRow key={alloc.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <TableCell className="font-semibold py-2.5">
                        <div className="flex items-center gap-1.5">
                          {alloc.transaction?.declarationNumber}
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-medium font-mono">
                            {alloc.transaction?.currencyCode || 'USD'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground py-2.5">
                        {format(new Date(alloc.allocatedAt), 'd MMM yyyy HH:mm', { locale: th })}
                      </TableCell>
                      <TableCell className="text-right font-medium py-2.5">
                        ฿{formatNumber(applied, 2)}
                      </TableCell>
                      <TableCell className="text-right font-medium py-2.5">
                        ฿{formatNumber(invoice, 2)}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        {fx !== 0 ? (
                          <span className={`font-bold ${fx > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {fx > 0 ? '+' : ''}{formatNumber(fx, 2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <RoleProtect allowedRoles={['OWNER', 'ADMIN', 'FINANCE']}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:text-rose-400"
                            onClick={() => onRemoveAllocation(alloc.id)}
                            title="ยกเลิกการตัดชำระ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </RoleProtect>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="shrink-0 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            ปิดหน้าต่าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
