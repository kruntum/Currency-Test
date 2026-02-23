import { useEffect, useState, useMemo } from 'react';
import { useTransactionStore, type Transaction } from '@/stores/transaction-store';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Plus, Search, Pencil, Trash2, Loader2,
} from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/page-header';
import { toast } from 'sonner';


interface Currency {
  code: string;
  nameTh: string;
  nameEn: string;
  symbol: string;
}

const emptyForm = {
  declarationNumber: '',
  declarationDate: format(new Date(), 'yyyy-MM-dd'),
  invoiceNumber: '',
  invoiceDate: format(new Date(), 'yyyy-MM-dd'),
  currencyCode: 'CNY',
  foreignAmount: '',
  exchangeRate: '',
  rateDate: format(new Date(), 'yyyy-MM-dd'),
  rateSource: 'BOT',
  notes: '',
};

export default function TransactionPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const {
    transactions, pagination, loading,
    searchQuery, setSearchQuery, filterCurrency, setFilterCurrency,
    fetchTransactions, createTransaction, updateTransaction, deleteTransaction, setLimit,
  } = useTransactionStore();

  const { rate, loading: rateLoading, error: rateError, fetchRate } = useExchangeRate();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Fetch currencies
  useEffect(() => {
    fetch('/api/currencies', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setCurrencies(j.data || []))
      .catch(console.error);
  }, []);

  // Fetch transactions on mount
  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  // Auto-fetch rate when currency or rateDate changes
  useEffect(() => {
    if (dialogOpen && formData.currencyCode && formData.rateDate) {
      fetchRate(formData.currencyCode, formData.rateDate);
    }
  }, [formData.currencyCode, formData.rateDate, dialogOpen, fetchRate]);

  // Apply fetched rate
  useEffect(() => {
    if (rate && dialogOpen) {
      setFormData((prev) => ({
        ...prev,
        exchangeRate: rate.buyingTransfer,
        rateSource: rate.source,
      }));
    }
  }, [rate, dialogOpen]);

  // Auto-calculate THB
  const calculatedThb = (() => {
    const fa = parseFloat(formData.foreignAmount);
    const er = parseFloat(formData.exchangeRate);
    if (isNaN(fa) || isNaN(er)) return '';
    return (fa * er).toFixed(2);
  })();

  const openCreate = () => {
    setEditingTx(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormData({
      declarationNumber: tx.declarationNumber,
      declarationDate: tx.declarationDate.split('T')[0],
      invoiceNumber: tx.invoiceNumber,
      invoiceDate: tx.invoiceDate.split('T')[0],
      currencyCode: tx.currencyCode,
      foreignAmount: tx.foreignAmount,
      exchangeRate: tx.exchangeRate,
      rateDate: tx.rateDate.split('T')[0],
      rateSource: tx.rateSource,
      notes: tx.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingTx) {
        await updateTransaction(editingTx.id, formData);
        toast.success('อัปเดตรายการเรียบร้อยแล้ว');
      } else {
        await createTransaction(formData);
        toast.success('เพิ่มรายการใหม่เรียบร้อยแล้ว');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTransaction(id);
      setDeleteConfirmId(null);
      toast.success('ลบรายการเรียบร้อยแล้ว');
    } catch (err) {
      toast.error((err as Error).message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleSearch = () => fetchTransactions(1);

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      accessorKey: 'declarationNumber',
      header: 'เลขที่ใบขน',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.declarationNumber}</span>,
    },
    {
      accessorKey: 'declarationDate',
      header: 'วันที่ใบขน',
      cell: ({ row }) => <span className="text-xs">{format(new Date(row.original.declarationDate), 'd MMM yy', { locale: th })}</span>,
    },
    {
      accessorKey: 'invoiceNumber',
      header: 'เลขที่อินวอย',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.invoiceNumber}</span>,
    },
    {
      accessorKey: 'invoiceDate',
      header: 'วันที่อินวอย',
      cell: ({ row }) => <span className="text-xs">{format(new Date(row.original.invoiceDate), 'd MMM yy', { locale: th })}</span>,
    },
    {
      accessorKey: 'currencyCode',
      header: () => <div className="text-center">สกุลเงิน</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline">{row.original.currencyCode}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'foreignAmount',
      header: () => <div className="text-right">ยอดต่างประเทศ</div>,
      cell: ({ row }) => <div className="text-right font-mono">{formatNumber(row.original.foreignAmount, 4)}</div>,
    },
    {
      accessorKey: 'exchangeRate',
      header: () => <div className="text-right">อัตราแลกเปลี่ยน</div>,
      cell: ({ row }) => <div className="text-right font-mono text-xs">{formatNumber(row.original.exchangeRate, 6)}</div>,
    },
    {
      accessorKey: 'thbAmount',
      header: () => <div className="text-right">ยอด THB</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-semibold text-primary">
          ฿{formatNumber(row.original.thbAmount)}
        </div>
      ),
    },
    {
      accessorKey: 'rateSource',
      header: () => <div className="text-center">แหล่ง</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant={row.original.rateSource === 'BOT' ? 'success' : 'warning'}>
            {row.original.rateSource}
          </Badge>
        </div>
      ),
    },
    ...(isAdmin ? [{
      id: 'recorder',
      header: 'ผู้บันทึก',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.user?.name}</span>,
    } as ColumnDef<Transaction>] : []),
    {
      id: 'actions',
      header: () => <div className="text-center">จัดการ</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirmId(row.original.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ], [isAdmin]);


  
  return (
    <div className="h-full flex flex-1 flex-col min-h-0">
      <PageHeader 
        title="รายการใบขนสินค้า"
        description="จัดการข้อมูลใบขนสินค้าและอินวอยซ์"
        action={
          <Button onClick={openCreate} className="gap-2 shrink-0 h-9" size="sm">
            <Plus className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
        }
      />
      <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">

      {/* Search & Filter */}
      <Card className="shrink-0 bg-muted/50 rounded-xl border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเลขที่ใบขน / เลขที่อินวอย..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCurrency} onValueChange={(v) => { setFilterCurrency(v === 'all' ? '' : v); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ทุกสกุลเงิน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสกุลเงิน</SelectItem>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.nameTh}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              ค้นหา
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
        <CardHeader className="shrink-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            ผลลัพธ์ <Badge variant="secondary">{pagination.total} รายการ</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 pb-4">
          <DataTable 
            columns={columns} 
            data={transactions} 
            loading={loading}
            pagination={{
              page: pagination.page,
              limit: pagination.limit,
              totalPages: pagination.totalPages,
              onPageChange: fetchTransactions,
              onLimitChange: setLimit,
            }}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTx ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
            </DialogTitle>
            <DialogDescription>
              กรอกข้อมูลใบขนสินค้าและอินวอย ระบบจะดึงอัตราแลกเปลี่ยนอัตโนมัติ
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Declaration section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="declarationNumber">เลขที่ใบขนสินค้า *</Label>
                <Input
                  id="declarationNumber"
                  placeholder="เช่น DEC-2026-0001"
                  value={formData.declarationNumber}
                  onChange={(e) => setFormData({ ...formData, declarationNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="declarationDate">วันที่ใบขน *</Label>
                <DatePicker
                  id="declarationDate"
                  value={formData.declarationDate}
                  onChange={(v) => setFormData({ ...formData, declarationDate: v })}
                />
              </div>
            </div>

            {/* Invoice section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">เลขที่อินวอย *</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="เช่น INV-2026-0001"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">วันที่ส่งข้อมูลอินวอย *</Label>
                <DatePicker
                  id="invoiceDate"
                  value={formData.invoiceDate}
                  onChange={(v) => setFormData({ ...formData, invoiceDate: v })}
                />
              </div>
            </div>

            {/* Currency & Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>สกุลเงิน *</Label>
                <Select
                  value={formData.currencyCode}
                  onValueChange={(v) => setFormData({ ...formData, currencyCode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.filter((c) => c.code !== 'THB').map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.nameTh}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="foreignAmount">ยอดเงินต่างประเทศ *</Label>
                <Input
                  id="foreignAmount"
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  value={formData.foreignAmount}
                  onChange={(e) => setFormData({ ...formData, foreignAmount: e.target.value })}
                />
              </div>
            </div>

            {/* Exchange Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rateDate">วันที่อัตราแลกเปลี่ยน *</Label>
                <DatePicker
                  id="rateDate"
                  value={formData.rateDate}
                  onChange={(v) => setFormData({ ...formData, rateDate: v })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchangeRate">
                  อัตราแลกเปลี่ยน (Buying Transfer) *
                  {rateLoading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="exchangeRate"
                    type="number"
                    step="0.000001"
                    placeholder="0.000000"
                    value={formData.exchangeRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      exchangeRate: e.target.value,
                      rateSource: 'MANUAL',
                    })}
                  />
                  <Badge variant={formData.rateSource === 'BOT' ? 'success' : 'warning'} className="shrink-0">
                    {formData.rateSource}
                  </Badge>
                </div>
                {rateError && (
                  <p className="text-xs text-destructive">{rateError}</p>
                )}
              </div>
            </div>

            {/* THB Calculated */}
            {calculatedThb && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">ยอดเงินบาท (คำนวณ)</span>
                  <span className="text-2xl font-bold text-primary">
                    ฿{formatNumber(calculatedThb)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.foreignAmount} {formData.currencyCode} × {formData.exchangeRate} = {calculatedThb} THB
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Input
                id="notes"
                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTx ? 'บันทึกการแก้ไข' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบรายการนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              ลบรายการ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
