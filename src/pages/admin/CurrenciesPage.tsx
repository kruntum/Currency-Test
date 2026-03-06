import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Coins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Currency {
  code: string;
  nameTh: string;
  nameEn: string;
  symbol: string;
  _count?: { transactions: number };
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formNameTh, setFormNameTh] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formSymbol, setFormSymbol] = useState('');

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/currencies/admin', { credentials: 'include' });
      const json = await res.json();
      setCurrencies(json.data || []);
    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถโหลดข้อมูลสกุลเงินได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const resetForm = () => {
    setFormCode('');
    setFormNameTh('');
    setFormNameEn('');
    setFormSymbol('');
    setEditingCurrency(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (c: Currency) => {
    setEditingCurrency(c);
    setFormCode(c.code);
    setFormNameTh(c.nameTh);
    setFormNameEn(c.nameEn);
    setFormSymbol(c.symbol);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formCode.trim() || !formNameTh.trim() || !formNameEn.trim()) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็น');
      return;
    }

    setSaving(true);
    try {
      if (editingCurrency) {
        const res = await fetch(`/api/currencies/admin/${editingCurrency.code}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ nameTh: formNameTh, nameEn: formNameEn, symbol: formSymbol }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to update');
        }
        toast.success('แก้ไขสกุลเงินสำเร็จ');
      } else {
        const res = await fetch('/api/currencies/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code: formCode.toUpperCase(), nameTh: formNameTh, nameEn: formNameEn, symbol: formSymbol }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to create');
        }
        toast.success('เพิ่มสกุลเงินสำเร็จ');
      }
      setDialogOpen(false);
      resetForm();
      fetchCurrencies();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCurrency) return;
    try {
      const res = await fetch(`/api/currencies/admin/${deletingCurrency.code}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete');
      }
      toast.success(`ลบสกุลเงิน ${deletingCurrency.code} สำเร็จ`);
      fetchCurrencies();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingCurrency(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader title="จัดการสกุลเงิน" description="เพิ่ม แก้ไข หรือลบสกุลเงินในระบบ (Admin only)" />

      <div className="flex-1 space-y-6 p-4 overflow-auto min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              ทั้งหมด {currencies.length} สกุลเงิน
            </span>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มสกุลเงิน
          </Button>
        </div>

        <Card className="bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">รายการสกุลเงิน</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : currencies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>ยังไม่มีสกุลเงิน</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-card rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Code</TableHead>
                      <TableHead className="w-[60px]">Symbol</TableHead>
                      <TableHead>ชื่อไทย</TableHead>
                      <TableHead>ชื่ออังกฤษ</TableHead>
                      <TableHead className="text-center">จำนวนรายการ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies.map((c) => (
                      <TableRow key={c.code}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{c.code}</Badge>
                        </TableCell>
                        <TableCell className="text-lg">{c.symbol || '—'}</TableCell>
                        <TableCell className="font-medium">{c.nameTh}</TableCell>
                        <TableCell className="text-muted-foreground">{c.nameEn}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{c._count?.transactions ?? 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(c)} className="gap-1">
                              <Pencil className="h-3.5 w-3.5" />
                              แก้ไข
                            </Button>
                            {(c._count?.transactions ?? 0) === 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setDeletingCurrency(c); setDeleteDialogOpen(true); }}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                ลบ
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
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingCurrency ? 'แก้ไขสกุลเงิน' : 'เพิ่มสกุลเงินใหม่'}</DialogTitle>
            <DialogDescription>
              {editingCurrency ? 'แก้ไขข้อมูลสกุลเงิน' : 'กรอกข้อมูลสกุลเงินที่ต้องการเพิ่ม'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="currency-code">
                รหัสสกุลเงิน (Code) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-code"
                placeholder="เช่น USD, EUR, CNY"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                maxLength={10}
                disabled={!!editingCurrency}
              />
              {editingCurrency && (
                <p className="text-xs text-muted-foreground">ไม่สามารถเปลี่ยน code ได้</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency-name-th">
                ชื่อภาษาไทย <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-name-th"
                placeholder="เช่น ดอลลาร์สหรัฐ"
                value={formNameTh}
                onChange={(e) => setFormNameTh(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency-name-en">
                ชื่อภาษาอังกฤษ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-name-en"
                placeholder="เช่น US Dollar"
                value={formNameEn}
                onChange={(e) => setFormNameEn(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency-symbol">สัญลักษณ์</Label>
              <Input
                id="currency-symbol"
                placeholder="เช่น $, €, ¥, ₩"
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value)}
                maxLength={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCurrency ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสกุลเงิน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบสกุลเงิน <strong>"{deletingCurrency?.code}"</strong> ({deletingCurrency?.nameTh}) ใช่หรือไม่?
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                การลบสกุลเงินนี้ไม่สามารถย้อนกลับได้
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบสกุลเงิน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
