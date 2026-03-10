import { useState, useEffect } from 'react';
import { useTreasuryStore, type FCDWallet } from '@/stores/treasury-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  pool: FCDWallet | null;
}

const today = format(new Date(), 'yyyy-MM-dd');

export function ExchangeDialog({ open, onOpenChange, companyId, pool }: Props) {
  const { exchangeFcy } = useTreasuryStore();

  const [amountFcy, setAmountFcy] = useState('');
  const [actualBankRate, setActualBankRate] = useState('');
  const [exchangedDate, setExchangedDate] = useState(today);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountFcy('');
      setActualBankRate('');
      setExchangedDate(today);
    }
  }, [open]);

  if (!pool) return null;

  const currentFcy = parseFloat(String(pool.balanceFcy)) || 0;
  const sellFcy = parseFloat(amountFcy) || 0;
  const sellRate = parseFloat(actualBankRate) || 0;
  const thbReceived = sellFcy * sellRate;
  
  const costRate = parseFloat(String(pool.avgCostRate)) || 0;
  const pl = (sellRate - costRate) * sellFcy;

  const handleSave = async () => {
    if (sellFcy <= 0 || sellFcy > currentFcy) {
      toast.error('ระบุจำนวนเงิน FCY ที่ถูกต้องและไม่เกินยอดคงเหลือ');
      return;
    }
    if (sellRate <= 0) {
      toast.error('ระบุอัตราแลกเปลี่ยนที่ถูกต้อง');
      return;
    }

    setSaving(true);
    try {
      await exchangeFcy({
        companyId,
        receiptId: pool.id,
        currencyCode: pool.currencyCode,
        amountFcy: sellFcy,
        actualBankRate: sellRate,
        exchangedDate
      });
      toast.success('บันทึกการแลกเปลี่ยนเสร็จสมบูรณ์');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            แลกเงิน (Sell FCY)
          </DialogTitle>
          <DialogDescription>
            ขายเงินตราต่างประเทศจากบัญชี FCD ({pool.currencyCode}) เพื่อรับเป็นเงินบาท
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="bg-muted/50 p-3 rounded-md border flex justify-between items-center">
            <span className="text-sm font-medium">ยอดคงเหลือ:</span>
            <span className="text-lg font-bold text-primary">
              {formatNumber(currentFcy, 2)} {pool.currencyCode}
            </span>
          </div>

          <div className="grid gap-2">
            <Label>วันที่ทำรายการ</Label>
            <DatePicker value={exchangedDate} onChange={setExchangedDate} />
          </div>

          <div className="grid gap-2">
            <Label>จำนวนเงินที่ต้องการขาย ({pool.currencyCode}) *</Label>
            <div className="flex gap-2">
                <Input 
                    type="number" 
                    step="0.01" 
                    value={amountFcy} 
                    onChange={(e) => setAmountFcy(e.target.value)} 
                    className="flex-1"
                />
                <Button 
                    variant="secondary" 
                    onClick={() => setAmountFcy(currentFcy.toString())}
                >
                    Max
                </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>อัตราแลกเปลี่ยนจริง (Actual Bank Rate) *</Label>
            <Input 
                type="number" 
                step="0.000001" 
                value={actualBankRate} 
                onChange={(e) => setActualBankRate(e.target.value)} 
                placeholder="เช่น 36.50"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              ต้นทุนเรท BOT ของบิลนี้: <strong>{formatNumber(costRate, 4)}</strong>
            </p>
          </div>

          {sellFcy > 0 && sellRate > 0 && (
            <div className="bg-slate-50 border p-3 rounded-md mt-2 space-y-2 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ผลการคำนวณ:</span>
              </div>
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>เงินบาทที่ได้รับ:</span>
                <span className="text-emerald-600">฿{formatNumber(thbReceived, 2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>กำไร/ขาดทุนรับรู้ (Realized P/L):</span>
                <span className={`font-medium ${pl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {pl >= 0 ? '+' : ''}{formatNumber(pl, 2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving || sellFcy <= 0 || sellRate <= 0} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            ยืนยันแลกเงิน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
