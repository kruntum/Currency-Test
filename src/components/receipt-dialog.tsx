import { useState, useEffect } from 'react';
import { useReceiptStore } from '@/stores/receipt-store';
import { useCustomerStore } from '@/stores/customer-store';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
}

const today = format(new Date(), 'yyyy-MM-dd');

export function ReceiptDialog({ open, onOpenChange, companyId }: Props) {
  const { createReceipt } = useReceiptStore();
  const { customers, fetchCustomers } = useCustomerStore();

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (!currencies.length) {
        fetch('/api/currencies', { credentials: 'include' })
          .then(r => r.json())
          .then(j => setCurrencies(j.data || []))
          .catch(console.error);
      }
      fetchCustomers(companyId);
      
      setCustomerId('');
      setReceivedDate(today);
      setRateDate(today);
      setRateSource('BOT');
      setReceivedFcy('');
      setBankReference('');
    }
  }, [open, companyId]);

  useEffect(() => {
    if (open && currencyCode && rateDate && !isTHB) {
      fetchRate(currencyCode, rateDate);
    }
    if (isTHB) {
      setReceivedBotRate('1');
      setRateSource('THB');
    }
  }, [open, currencyCode, rateDate, isTHB, fetchRate]);

  useEffect(() => {
    if (rate && !isTHB) {
      setReceivedBotRate(rate.buyingTransfer);
      setRateSource(rate.source);
    }
  }, [rate, isTHB]);

  const handleSave = async () => {
    if (!customerId) { toast.error('กรุณาเลือกลูกค้า'); return; }
    if (!receivedFcy || parseFloat(receivedFcy) <= 0) { toast.error('ระบุยอดเงินที่รับ (FCY)'); return; }
    if (!receivedBotRate || parseFloat(receivedBotRate) <= 0) { toast.error('ระบุอัตราแลกเปลี่ยน (Rate)'); return; }

    setSaving(true);
    try {
        await createReceipt({
            companyId,
            customerId: parseInt(customerId),
            receivedDate,
            currencyCode,
            receivedFcy: parseFloat(receivedFcy),
            receivedBotRate: parseFloat(receivedBotRate),
            bankReference,
        });
        toast.success('บันทึกรับเงินสำเร็จ ยอดเงินได้เข้าสู่ FCD Pool แล้ว');
        onOpenChange(false);
    } catch (err: any) {
        toast.error(err.message);
    } finally {
        setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>บันทึกรับเงิน (Receipt)</DialogTitle>
          <DialogDescription>
            บันทึกยอดเงินเข้าจากต่างประเทศ ยอดนี้จะถูกนำไปเก็บใน FCD Pool โดยอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">สกุลเงิน *</Label>
              <Select value={currencyCode} onValueChange={setCurrencyCode}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol || ''} {c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs flex items-center justify-between">
                <span>ยอดเงินเข้า ({currencyCode}) *</span>
                <Wallet className="h-3 w-3 text-muted-foreground mr-1" />
              </Label>
              <Input className="h-8 text-sm font-semibold text-blue-600 dark:text-blue-400" type="number" step="0.01" value={receivedFcy} onChange={e => setReceivedFcy(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!isTHB ? (
              <>
                <div>
                  <Label className="text-xs">
                    อัตราแลกเปลี่ยน (BOT Rate) * {rateLoading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
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

        <DialogFooter className="mt-4 border-t pt-4">
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
