import { useState, useEffect } from 'react';
import { type Receipt } from '@/stores/receipt-store';
import { useAllocationStore } from '@/stores/allocation-store';
import { useTransactionStore, type Transaction } from '@/stores/transaction-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Save, TrendingUp, TrendingDown, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  receipt: Receipt | null;
  onSuccess?: () => void;
}

export function AllocationDialog({ open, onOpenChange, companyId, receipt, onSuccess }: Props) {
  const { createAllocation } = useAllocationStore();
  const { fetchPendingTransactions } = useTransactionStore();

  const [pendingTxs, setPendingTxs] = useState<Transaction[]>([]);
  const [allocations, setAllocations] = useState<Record<number, { appliedThb: string, invoiceThb: string }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && receipt) {
      setLoading(true);
      fetchPendingTransactions(companyId, receipt.customerId)
        .then(txs => {
          setPendingTxs(txs);
          const initialAlloc: Record<number, { appliedThb: string, invoiceThb: string }> = {};
          txs.forEach(t => initialAlloc[t.id] = { appliedThb: '', invoiceThb: '' });
          setAllocations(initialAlloc);
        })
        .finally(() => setLoading(false));
    } else {
      setPendingTxs([]);
      setAllocations({});
    }
  }, [open, receipt, companyId]);

  if (!receipt) return null;

  const totalReceivedThb = parseFloat(receipt.receivedThb.toString()) || 0;
  const currentlyAllocatedThb = parseFloat(receipt.allocatedThb.toString()) || 0;
  const availableThb = Math.max(0, totalReceivedThb - currentlyAllocatedThb);

  let totalAppliedThb = 0;
  Object.values(allocations).forEach(val => {
    totalAppliedThb += parseFloat(val.appliedThb) || 0;
  });
  const remainingThb = availableThb - totalAppliedThb;

  const handleAllocateChange = (txId: number, field: 'appliedThb' | 'invoiceThb', value: string) => {
    setAllocations(prev => ({
      ...prev,
      [txId]: {
        ...prev[txId],
        [field]: value,
      }
    }));
  };

  const handleAutoFill = (tx: Transaction) => {
    const invoiceTotalThb = parseFloat(tx.thbAmount);
    const paidThb = parseFloat(tx.paidThb?.toString() || '0');
    const unpaidInvoiceThb = invoiceTotalThb - paidThb;

    if (unpaidInvoiceThb <= 0) return;

    // The user wants to map matching Unpaid Invoice THB by taking THB equivalent from Receipt.
    // If the invoice outstanding is X THB, their goal is to apply effectively X THB worth of expected receipt equivalent.
    // Wait, the user said: "ตัดชำระเป็นเงินบาทที่ convert มาแล้วเท่านั้น"
    // Applied THB comes from Receipt THB. Invoice THB comes from Invoice THB.
    // To Auto Fill, we likely want to fill the Invoice THB exactly up to unpaidInvoiceThb.
    // Equivalent FCY required = unpaidInvoiceThb / tx.exchangeRate
    // So the Applied THB needed from Receipt = Equivalent FCY * receipt.receivedBotRate
    const txRate = parseFloat(tx.exchangeRate.toString());
    const botRate = parseFloat(receipt.receivedBotRate.toString());
    
    // We assume Equivalent FCY * botRate is what we apply
    const fcyNeeded = unpaidInvoiceThb / txRate;
    let appliedThbNeeded = fcyNeeded * botRate;
    let toInvoiceThb = unpaidInvoiceThb;

    // Can we fulfill it? Check against remaining THB bucket.
    const currentApplied = parseFloat(allocations[tx.id]?.appliedThb) || 0;
    const actualRemaining = remainingThb + currentApplied;
    
    if (appliedThbNeeded > actualRemaining) {
        // Only partial fulfill
        appliedThbNeeded = actualRemaining;
        const fcyCanPay = appliedThbNeeded / botRate;
        toInvoiceThb = fcyCanPay * txRate;
    }

    handleAllocateChange(tx.id, 'appliedThb', appliedThbNeeded.toFixed(2));
    handleAllocateChange(tx.id, 'invoiceThb', toInvoiceThb.toFixed(2));
  };

  const handleSave = async () => {
    const allocsToSubmit = Object.entries(allocations)
        .filter(([_, val]) => parseFloat(val.appliedThb) > 0 && parseFloat(val.invoiceThb) > 0)
        .map(([id, val]) => ({
            transactionId: parseInt(id),
            appliedThb: parseFloat(val.appliedThb),
            invoiceThb: parseFloat(val.invoiceThb),
        }));

    if (allocsToSubmit.length === 0) {
      toast.error('ไม่มีรายการตัดชำระ');
      return;
    }

    if (totalAppliedThb > availableThb + 0.01) {
        toast.error('ยอดตัดชำระ (Applied THB) เกินยอดที่มีใน Receipt');
        return;
    }

    setSaving(true);
    try {
        await createAllocation(companyId, receipt.id, allocsToSubmit);
        toast.success('บันทึกการตัดชำระสำเร็จ');
        onSuccess?.();
        onOpenChange(false);
    } catch (err: any) {
        toast.error(err.message);
    } finally {
        setSaving(false);
    }
  };

  const filteredTxs = pendingTxs.filter(tx => 
    tx.declarationNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-4">
        <DialogHeader className="shrink-0 border-b pb-3">
          <DialogTitle>ตัดชำระเงินใบขน (THB Allocation)</DialogTitle>
          <DialogDescription>
            หักล้างยอด THB ที่รับจริง (ตามเรท BOT วันรับเงิน) กับ THB ของใบขน เพื่อหากำไร/ขาดทุน
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between bg-white border p-3 rounded-xl shadow-sm my-3 shrink-0 dark:bg-slate-900 border-border">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold flex items-center gap-2">
              Receipt Ref: #{receipt.id}
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {receipt.currencyCode}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>วันที่รับ: {format(new Date(receipt.receivedDate), 'dd/MM/yyyy')}</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>เรท BOT: <span className="font-medium text-foreground">{receipt.receivedBotRate}</span></span>
            </p>
          </div>
          <div className="text-right p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50">
            <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-0.5">ยอดเงินบาทที่ใช้ตัดชำระได้ (Available THB)</p>
            <p className={`text-2xl font-bold ${remainingThb > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
              ฿{formatNumber(remainingThb, 2)}
            </p>
          </div>
        </div>

        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="ค้นหาเลขที่ใบขน..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 h-8 text-sm rounded-lg"
          />
        </div>

        <div className="flex-1 overflow-auto rounded-lg border min-h-0 bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-950 dark:ring-white/10 dark:border-slate-800">
          <Table>
            <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md">
              <TableRow className="hover:bg-transparent border-b-slate-200 dark:border-b-slate-800">
                <TableHead className="font-semibold text-slate-700 dark:text-slate-300 py-2 text-xs">เลขที่ใบขน</TableHead>
                <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300 py-2 text-xs">ใช้ THB จาก Receipt (1)</TableHead>
                <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300 py-2 text-xs">หัก THB ของใบขน (2)</TableHead>
                <TableHead className="text-right w-[140px] font-semibold text-slate-700 dark:text-slate-300 py-2 text-xs">กำไร/ขาดทุน</TableHead>
                <TableHead className="w-[80px] text-center font-semibold text-slate-700 dark:text-slate-300 py-2 text-xs">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                     <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                     กำลังโหลดข้อมูลใบขน...
                  </TableCell>
                </TableRow>
              ) : filteredTxs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                      <Search className="h-10 w-10 text-slate-400" />
                      <div>
                        <p className="text-lg font-medium text-slate-600 dark:text-slate-400">ไม่พบใบขน</p>
                        <p className="text-sm mt-1">{searchQuery ? 'ไม่พบใบขนที่ตรงกับการค้นหา' : 'ลูกค้ารายนี้ไม่มีรายการใบขนค้างชำระแล้ว'}</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTxs.map(tx => {
                  const applied = parseFloat(allocations[tx.id]?.appliedThb) || 0;
                  const invoice = parseFloat(allocations[tx.id]?.invoiceThb) || 0;
                  const fx = applied - invoice;
                  
                  const invoiceTotalThb = parseFloat(tx.thbAmount);
                  const paidThb = parseFloat(tx.paidThb?.toString() || '0');
                  const unpaidThb = invoiceTotalThb - paidThb;

                  return (
                    <TableRow key={tx.id} className="hover:bg-slate-50/50 transition-colors group dark:hover:bg-slate-900/50 border-b-slate-100 dark:border-b-slate-800/60">
                      <TableCell className="py-2">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{tx.declarationNumber}</div>
                        <div className="text-[10px] font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          ค้างชำระ: ฿{formatNumber(unpaidThb, 2)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex justify-end relative items-center group/input">
                          <span className="absolute left-2.5 text-[10px] font-medium text-slate-400 transition-colors group-focus-within/input:text-blue-500">฿</span>
                          <Input 
                              className="h-8 w-[160px] text-xs text-right pl-6 border-slate-200 bg-slate-50/50 transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-blue-300 dark:bg-slate-900 dark:border-slate-800 dark:focus:bg-slate-950" 
                              type="number" 
                              placeholder="0.00"
                              value={allocations[tx.id]?.appliedThb || ''} 
                              onChange={e => handleAllocateChange(tx.id, 'appliedThb', e.target.value)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex justify-end relative items-center group/input">
                          <span className="absolute left-2.5 text-[10px] font-medium text-slate-400 transition-colors group-focus-within/input:text-indigo-500">฿</span>
                          <Input 
                              className="h-8 w-[160px] text-xs text-right pl-6 border-slate-200 bg-slate-50/50 transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-indigo-300 dark:bg-slate-900 dark:border-slate-800 dark:focus:bg-slate-950" 
                              type="number" 
                              placeholder="0.00"
                              value={allocations[tx.id]?.invoiceThb || ''} 
                              onChange={e => handleAllocateChange(tx.id, 'invoiceThb', e.target.value)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {fx !== 0 ? (
                          <div className={`flex items-center justify-end gap-1 font-bold text-xs px-2 py-1 rounded-md inline-flex shadow-sm transition-all ${fx > 0 ? 'text-emerald-700 bg-emerald-100 ring-1 ring-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900/50' : 'text-rose-700 bg-rose-100 ring-1 ring-rose-200/50 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-900/50'}`}>
                            {fx > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {fx > 0 ? '+' : ''}{formatNumber(fx, 2)}
                          </div>
                        ) : <span className="text-slate-300 dark:text-slate-600">-</span>}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {applied > 0 || invoice > 0 ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 dark:text-emerald-500" title="Auto Re-calculate" onClick={() => handleAutoFill(tx)}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="h-8 px-3 text-[11px] font-medium w-full rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border-slate-200 shadow-xs transition-all dark:border-slate-800 dark:hover:bg-blue-900/30 dark:hover:border-blue-800/50 dark:hover:text-blue-400" onClick={() => handleAutoFill(tx)}>
                              Auto
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="mt-6 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            บันทึกการตัดชำระ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
