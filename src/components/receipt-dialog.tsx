import { useState, useEffect } from 'react';
import { useReceiptStore } from '@/stores/receipt-store';
import { useCustomerStore } from '@/stores/customer-store';
import { useTransactionStore, type Transaction } from '@/stores/transaction-store';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
}

const today = format(new Date(), 'yyyy-MM-dd');

export function ReceiptDialog({ open, onOpenChange, companyId }: Props) {
  const { createReceipt } = useReceiptStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { fetchPendingTransactions } = useTransactionStore();

  const [customerId, setCustomerId] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState(today);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [receivedFcy, setReceivedFcy] = useState('');
  const [receivedBotRate, setReceivedBotRate] = useState('');
  const [rateDate, setRateDate] = useState(today);
  const [rateSource, setRateSource] = useState('BOT');
  const [bankReference, setBankReference] = useState('');

  const { rate, loading: rateLoading, fetchRate } = useExchangeRate();
  const isTHB = currencyCode === 'THB';

  const [pendingTxs, setPendingTxs] = useState<Transaction[]>([]);
  const [allocations, setAllocations] = useState<Record<number, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load currencies and customers
  useEffect(() => {
    if (open) {
      if (!currencies.length) {
        fetch('/api/currencies', { credentials: 'include' })
          .then(r => r.json())
          .then(j => setCurrencies(j.data || []))
          .catch(console.error);
      }
      fetchCustomers(companyId);
      
      // Reset form
      setCustomerId('');
      setReceivedDate(today);
      setRateDate(today);
      setRateSource('BOT');
      setReceivedFcy('');
      setBankReference('');
      setAllocations({});
      setPendingTxs([]);
    }
  }, [open, companyId]);

  // Auto-fetch exchange rate
  useEffect(() => {
    if (open && currencyCode && rateDate && !isTHB) {
      fetchRate(currencyCode, rateDate);
    }
    if (isTHB) {
      setReceivedBotRate('1');
      setRateSource('THB');
    }
  }, [open, currencyCode, rateDate, isTHB, fetchRate]);

  // Apply fetched rate
  useEffect(() => {
    if (rate && !isTHB) {
      setReceivedBotRate(rate.buyingTransfer);
      setRateSource(rate.source);
    }
  }, [rate, isTHB]);

  // Fetch pending transactions when customer/currency changes
  useEffect(() => {
    if (open && customerId && currencyCode) {
      setLoading(true);
      fetchPendingTransactions(companyId, parseInt(customerId))
        .then(txs => {
          // Filter by currency too
          const filtered = txs.filter(t => t.currencyCode === currencyCode);
          setPendingTxs(filtered);
          // Auto-initialize allocations to 0
          const initialAlloc: Record<number, string> = {};
          filtered.forEach(t => initialAlloc[t.id] = '');
          setAllocations(initialAlloc);
        })
        .finally(() => setLoading(false));
    } else {
      setPendingTxs([]);
      setAllocations({});
    }
  }, [customerId, currencyCode, open]);

  // Calculations
  const totalReceivedFcy = parseFloat(receivedFcy) || 0;
  let totalAllocatedFcy = 0;
  Object.values(allocations).forEach(val => {
    totalAllocatedFcy += parseFloat(val) || 0;
  });
  const unallocatedFcy = Math.max(0, totalReceivedFcy - totalAllocatedFcy);

  const handleAllocateChange = (txId: number, val: string) => {
    setAllocations(prev => ({ ...prev, [txId]: val }));
  };

  const handleAutoAllocate = (tx: Transaction) => {
    // Fill the remainder of this transaction
    const totalTxFcy = parseFloat(tx.foreignAmount);
    // Rough estimate of how much FCY is unpaid
    const totalThb = parseFloat(tx.thbAmount);
    const paidThb = parseFloat(tx.paidThb || '0');
    const unpaidRatio = 1 - (paidThb / totalThb);
    let unpaidFcy = totalTxFcy * unpaidRatio;

    // Remaining received we can allocate
    const remainingToGive = totalReceivedFcy - totalAllocatedFcy + (parseFloat(allocations[tx.id]) || 0);

    const toAllocate = Math.min(unpaidFcy, remainingToGive);
    if (toAllocate > 0) {
      handleAllocateChange(tx.id, toAllocate.toFixed(4));
    }
  };

  const handleSave = async () => {
    if (!customerId) { toast.error('กรุณาเลือกลูกค้า'); return; }
    if (!receivedFcy || parseFloat(receivedFcy) <= 0) { toast.error('ระบุยอดเงินที่รับ (FCY)'); return; }
    if (!receivedBotRate || parseFloat(receivedBotRate) <= 0) { toast.error('ระบุอัตราแลกเปลี่ยน (Rate)'); return; }

    const allocsToSubmit = Object.entries(allocations)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([id, val]) => ({
            transactionId: parseInt(id),
            appliedFcy: parseFloat(val)
        }));

    if (totalAllocatedFcy > totalReceivedFcy + 0.001) {
        toast.error('ยอดจัดสรร (Allocated) เกินยอดที่รับมา (Received)');
        return;
    }

    setSaving(true);
    try {
        await createReceipt({
            customerId: parseInt(customerId),
            receivedDate,
            currencyCode,
            receivedFcy: parseFloat(receivedFcy),
            receivedBotRate: parseFloat(receivedBotRate),
            bankReference,
            allocations: allocsToSubmit
        });
        toast.success('บันทึกรับเงินสำเร็จ');
        onOpenChange(false);
    } catch (err: any) {
        toast.error(err.message);
    } finally {
        setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>บันทึกรับเงิน (Receipt)</DialogTitle>
          <DialogDescription>
            บันทึกยอดเงินเข้าจากต่างประเทศ และจัดสรรเพื่อชำระใบขน (Allocation)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">ลูกค้า (Customer) *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="เลือกลูกค้า" /></SelectTrigger>
                <SelectContent>
                  {(customers[companyId] || []).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">วันที่รับเงิน *</Label>
              <DatePicker value={receivedDate} onChange={setReceivedDate} />
            </div>
            <div>
              <Label className="text-xs flex items-center justify-between">
                <span>ยอดเงินเข้า ({currencyCode}) *</span>
                <Wallet className="h-3 w-3 text-muted-foreground mr-1" />
              </Label>
              <Input className="h-8 text-sm font-semibold text-blue-600 dark:text-blue-400" type="number" step="0.01" value={receivedFcy} onChange={e => setReceivedFcy(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">สกุลเงิน *</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol || ''} {c.code} {c.nameTh ? `— ${c.nameTh}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isTHB ? (
              <>
                <div>
                  <Label className="text-xs">
                    อัตราแลกเปลี่ยน * {rateLoading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
                  </Label>
                  <div className="flex gap-1">
                    <Input className="h-8 text-sm" type="number" step="0.000001" value={receivedBotRate}
                      onChange={(e) => { setReceivedBotRate(e.target.value); setRateSource('MANUAL'); }} />
                    <Badge variant={rateSource === 'BOT' ? 'success' : 'warning'} className="shrink-0 self-center text-xs">
                      {rateSource}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">วันที่อัตราแลกเปลี่ยน</Label>
                  <DatePicker value={rateDate} onChange={setRateDate} />
                </div>
              </>
            ) : (
              <div className="col-span-2 flex items-end">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-1.5 w-full flex items-center h-8">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    💱 สกุลเงินบาท — อัตราแลกเปลี่ยน 1.0
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <div>
              <Label className="text-xs">อ้างอิงธนาคาร (Reference)</Label>
              <Input className="h-8 text-sm" placeholder="เช่น REF#1234 หรือ ข้อมูลการโอน" value={bankReference} onChange={e => setBankReference(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted p-2 flex justify-between items-center text-sm">
            <span className="font-semibold">รายการใบขนค้างชำระ ({currencyCode})</span>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่ใบขน</TableHead>
                  <TableHead>ยอดเต็ม ({currencyCode})</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="w-[180px]">จัดสรร (Allocate {currencyCode})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTxs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      {customerId ? 'ไม่มีใบขนค้างชำระสำหรับลูกค้านี้' : 'กรุณาเลือกลูกค้า'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingTxs.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.declarationNumber}</TableCell>
                      <TableCell>{formatNumber(tx.foreignAmount, 2)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.paymentStatus === 'PARTIAL' ? 'warning' : 'secondary'}>
                          {tx.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                            <Input 
                                className="h-8 w-[100px] text-right" 
                                type="number" 
                                value={allocations[tx.id] || ''} 
                                onChange={e => handleAllocateChange(tx.id, e.target.value)}
                            />
                            <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => handleAutoAllocate(tx)}>
                                Max
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {totalReceivedFcy > 0 && (
          <div className="bg-blue-50/50 p-4 rounded-lg flex items-center justify-between border border-blue-100 mt-2">
            <div>
              <p className="text-sm text-muted-foreground">สรุปการจัดสรร</p>
              <p className="text-sm font-medium">ยอดรับ: <span className="text-blue-700">{formatNumber(totalReceivedFcy, 2)}</span> {currencyCode}</p>
            </div>
            <div className="text-right">
              <p className="text-sm">เหลือเข้า <Wallet className="inline h-4 w-4 mx-1" /> Wallet:</p>
              <p className={`text-lg font-bold ${unallocatedFcy > 0 ? 'text-green-600' : 'text-slate-600'}`}>
                + {formatNumber(Math.max(0, unallocatedFcy), 2)} {currencyCode}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            บันทึกรับเงิน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
