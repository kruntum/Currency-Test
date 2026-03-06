import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { ProductCombobox } from '@/components/product-combobox';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export interface FormItem {
  goodsName: string;
  netWeight: string;
  price: string;
  totalPrice: string;
}

export interface FormInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  items: FormItem[];
  isOpen: boolean;
}

export const emptyItem: FormItem = { goodsName: '', netWeight: '', price: '', totalPrice: '' };

interface InvoiceCardProps {
  invoice: FormInvoice;
  index: number;
  currencyCode: string;
  currencySymbol: string;
  exchangeRate: number;
  canDelete: boolean;
  onUpdate: (field: keyof FormInvoice, value: string) => void;
  onToggle: () => void;
  onRemove: () => void;
  onAddItem: () => void;
  onRemoveItem: (itemIdx: number) => void;
  onUpdateItem: (itemIdx: number, field: keyof FormItem, value: string) => void;
}

export function InvoiceCard({
  invoice, index, currencyCode, currencySymbol, exchangeRate,
  canDelete, onUpdate, onToggle, onRemove, onAddItem, onRemoveItem, onUpdateItem,
}: InvoiceCardProps) {
  const calcThb = useCallback((price: string) => {
    return ((parseFloat(price) || 0) * exchangeRate).toFixed(2);
  }, [exchangeRate]);

  const totalForeign = invoice.items.reduce((s, i) => s + (parseFloat(i.totalPrice) || 0), 0);
  const totalThb = invoice.items.reduce((s, i) => s + (parseFloat(i.totalPrice) || 0) * exchangeRate, 0);

  return (
    <div className="border rounded-lg bg-card">
      <Collapsible open={invoice.isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              {invoice.isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              อินวอย #{index + 1}
              {invoice.invoiceNumber && (
                <Badge variant="outline" className="text-xs">{invoice.invoiceNumber}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{invoice.items.length} รายการ</span>
              <span>{currencySymbol}{formatNumber(totalForeign, 4)}</span>
              <span className="text-primary font-semibold">฿{formatNumber(totalThb)}</span>
              {canDelete && (
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {/* Invoice header */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">เลขที่อินวอย *</Label>
                <Input className="h-8 text-sm" placeholder="INV-001" value={invoice.invoiceNumber}
                  onChange={(e) => onUpdate('invoiceNumber', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">วันที่อินวอย</Label>
                <DatePicker value={invoice.invoiceDate} onChange={(v) => onUpdate('invoiceDate', v)} />
              </div>
            </div>

            {/* Items table */}
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="py-1.5 px-1 text-left w-[20px]">#</th>
                    <th className="py-1.5 px-1 text-left w-[150px]">ชื่อสินค้า *</th>
                    <th className="py-1.5 px-1 text-right w-[90px]">น้ำหนัก</th>
                    <th className="py-1.5 px-1 text-right w-[100px]">ราคา ({currencyCode}) *</th>
                    <th className="py-1.5 px-1 text-right w-[100px]">ราคารวม</th>
                    <th className="py-1.5 px-1 text-right w-[100px]">THB</th>
                    <th className="py-1.5 px-1 w-[32px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, itemIdx) => (
                    <tr key={itemIdx} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="py-1 px-2 text-muted-foreground">{itemIdx + 1}</td>
                      <td className="py-1 px-1">
                        <ProductCombobox 
                          value={item.goodsName} 
                          onChange={(val) => onUpdateItem(itemIdx, 'goodsName', val)} 
                          className="h-7 text-xs md:text-xs" 
                        />
                      </td>
                      <td className="py-1 px-1">
                        <Input className="h-7 text-right text-xs md:text-xs" type="number" placeholder="0.000" value={item.netWeight}
                          onChange={(e) => onUpdateItem(itemIdx, 'netWeight', e.target.value)} />
                      </td>
                      <td className="py-1 px-1">
                        <Input className="h-7 text-right text-xs md:text-xs" type="number" step="0.01" placeholder="0.000"
                          value={item.price} onChange={(e) => onUpdateItem(itemIdx, 'price', e.target.value)} />
                      </td>
                      <td className="py-1 px-1">
                        <Input className="h-7 text-right text-xs md:text-xs" type="number" step="0.01" placeholder="0.000"
                          value={item.totalPrice} onChange={(e) => onUpdateItem(itemIdx, 'totalPrice', e.target.value)} />
                      </td>
                      <td className="py-1 px-1 text-right text-primary font-semibold text-xs">
                        ฿{formatNumber(calcThb(item.totalPrice || item.price))}
                      </td>
                      <td className="py-1 px-1">
                        {invoice.items.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveItem(itemIdx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="ghost" size="sm" onClick={onAddItem} className="gap-1 w-full border border-dashed text-xs h-7">
              <Plus className="h-3 w-3" /> เพิ่มรายการ
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
