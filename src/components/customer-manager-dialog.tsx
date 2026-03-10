import React, { useState, useEffect } from 'react';
import { useCustomerStore, type Customer } from '@/stores/customer-store';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Plus, Pencil, Ban, Search, Save } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
}

export function CustomerManagerDialog({ open, onOpenChange, companyId }: CustomerManagerDialogProps) {
  const { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore();
  const [search, setSearch] = useState('');
  
  // Create / Edit state
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deletingCustomerName, setDeletingCustomerName] = useState<string>('');

  useEffect(() => {
    if (open && companyId) fetchCustomers(companyId);
  }, [open, companyId, fetchCustomers]);

  const companyCustomers = customers[companyId] || [];
  const filtered = companyCustomers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.taxId && c.taxId.includes(search))
  );

  const handleCreate = () => {
    setEditCustomer(null);
    setName('');
    setAddress('');
    setTaxId('');
    setFormOpen(true);
  };

  const handleEdit = (c: Customer) => {
    setEditCustomer(c);
    setName(c.name);
    setAddress(c.address || '');
    setTaxId(c.taxId || '');
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('กรุณาระบุชื่อลูกค้า');
      return;
    }
    
    setSaving(true);
    try {
      if (editCustomer) {
        await updateCustomer(companyId, editCustomer.id, { name: name.trim(), address: address.trim(), taxId: taxId.trim() });
        toast.success('แก้ไขข้อมูลลูกค้าสำเร็จ');
      } else {
        await addCustomer(companyId, { name: name.trim(), address: address.trim(), taxId: taxId.trim() });
        toast.success('เพิ่มลูกค้าใหม่สำเร็จ');
      }
      setFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (c: Customer) => {
    setDeleteId(c.id);
    setDeletingCustomerName(c.name);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCustomer(companyId, deleteId);
      toast.success(`ยกเลิกลูกค้า "${deletingCustomerName}" สำเร็จ`);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการยกเลิกลูกค้า');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-4 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            จัดการลูกค้า (Customers)
          </DialogTitle>
          <DialogDescription className="mt-1">
            รายชื่อลูกค้าของบริษัทนี้ สำหรับผูกกับรายการใบขนหรือรับเงิน
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="ค้นหาชื่อลูกค้า หรือเลขผู้เสียภาษี..." 
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" /> เพิ่มลูกค้าใหม่
            </Button>
          </div>

          <div className="flex-1 overflow-auto rounded-md border min-h-0">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>ชื่อลูกค้า (Name)</TableHead>
                  <TableHead>เลขประจำตัวผู้เสียภาษี</TableHead>
                  <TableHead>ที่อยู่ (Address)</TableHead>
                  <TableHead className="text-right w-[100px]">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && companyCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                      {search ? `ไม่พบลูกค้า "${search}"` : 'ยังไม่มีข้อมูลลูกค้า'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c, index) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-center text-muted-foreground text-xs">{index + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{c.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.taxId || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={c.address || ''}>
                        {c.address || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(c)}>
                            <Ban className="h-4 w-4" />
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
      </DialogContent>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label>ชื่อลูกค้า *</Label>
              <Input 
                autoFocus
                placeholder="ระบุชื่อหรือบริษัทลูกค้า"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>รหัสประจำตัวผู้เสียภาษี (Tax ID)</Label>
              <Input 
                value={taxId} 
                onChange={e => setTaxId(e.target.value)} 
                placeholder="เลขประจำตัวผู้เสียภาษี 13 หลัก" 
              />
            </div>
            <div className="grid gap-2">
              <Label>ที่อยู่</Label>
              <Input 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="ที่อยู่ของลูกค้า" 
              />
            </div>
            <div className="flex justify-end gap-2 p-1">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={saving || !name.trim()} className="gap-2">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editCustomer ? 'บันทึกการแก้ไข' : 'บันทึก'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกลูกค้า</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการยกเลิกลูกค้า <strong>"{deletingCustomerName}"</strong> ใช่หรือไม่?
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                ข้อมูลจะไม่ถูกลบออกจากระบบ แต่จะไม่แสดงในรายการอีกต่อไป เนื่องจากอาจมีรายการธุรกรรมที่ผูกอยู่
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
               ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
