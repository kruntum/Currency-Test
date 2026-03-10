import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCustomerStore, type Customer } from '@/stores/customer-store';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Users, Loader2, Save, MoreHorizontal, Pencil, Ban, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    if (cId) {
      fetchCustomers(cId);
    }
  }, [cId, fetchCustomers]);

  const companyCustomers = customers[cId] || [];

  const filteredCustomers = searchQuery.trim()
    ? companyCustomers.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.taxId && c.taxId.toLowerCase().includes(searchQuery.toLowerCase())))
    : companyCustomers;

  // Open dialog for ADD
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setAddress('');
    setTaxId('');
    setDialogOpen(true);
  };

  // Open dialog for EDIT
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setAddress(customer.address || '');
    setTaxId(customer.taxId || '');
    setDialogOpen(true);
  };

  // Save (Add or Update)
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('กรุณาระบุชื่อลูกค้า');
      return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(cId, editingCustomer.id, { name, address, taxId });
        toast.success('แก้ไขข้อมูลลูกค้าสำเร็จ');
      } else {
        await addCustomer(cId, { name, address, taxId });
        toast.success('เพิ่มลูกค้าสำหรับบริษัทนี้สำเร็จ');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    setDeleting(true);
    try {
      await deleteCustomer(cId, deletingCustomer.id);
      toast.success(`ยกเลิกลูกค้า "${deletingCustomer.name}" สำเร็จ`);
      setDeleteDialogOpen(false);
      setDeletingCustomer(null);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการยกเลิกลูกค้า');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader 
        title="จัดการลูกค้า (Customers)" 
        description="เพิ่มและจัดการข้อมูลลูกค้าของบริษัท เพื่อใช้ผูกกับรายการใบขน" 
      />

      <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">
        {/* Top bar: search + add button */}
        <div className="flex items-center justify-between shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="ค้นหาชื่อลูกค้า หรือ Tax ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มลูกค้าใหม่
          </Button>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle className="text-lg">รายชื่อลูกค้า <span className="text-sm font-normal text-muted-foreground ml-2">{filteredCustomers.length} รายชื่อ</span></CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 pb-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery.trim() ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีข้อมูลลูกค้าสำหรับบริษัทนี้'}</p>
                {!searchQuery.trim() && (
                  <Button variant="link" onClick={handleOpenAdd}>
                    คลิกที่นี่เพื่อเพิ่มลูกค้าคนแรก
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-auto rounded-md min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12 text-center py-2 h-9 text-xs">#</TableHead>
                      <TableHead className="py-2 h-9 text-xs">ชื่อลูกค้า (Name)</TableHead>
                      <TableHead className="py-2 h-9 text-xs">เลขประจำตัวผู้เสียภาษี (Tax ID)</TableHead>
                      <TableHead className="py-2 h-9 text-xs">ที่อยู่ (Address)</TableHead>
                      <TableHead className="w-24 text-center py-2 h-9 text-xs">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.slice((page - 1) * perPage, page * perPage).map((c, index) => (
                      <TableRow key={c.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center text-muted-foreground text-xs py-1.5 h-10">
                          {(page - 1) * perPage + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-sm py-1.5 h-10">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs py-1.5 h-10">{c.taxId || '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-xs truncate py-1.5 h-10" title={c.address || ''}>
                          {c.address || '-'}
                        </TableCell>
                        <TableCell className="w-24 text-center py-1.5 h-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-6 w-6 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEdit(c)} className="gap-2 cursor-pointer text-xs">
                                <Pencil className="h-3.5 w-3.5" />
                                แก้ไข
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleConfirmDelete(c)}
                                className="gap-2 cursor-pointer text-destructive focus:text-destructive text-xs"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                ยกเลิกลูกค้า
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Footer */}
            {!loading && filteredCustomers.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 pb-1 px-1 gap-4 mt-auto border-t">
                <div className="text-sm text-muted-foreground">
                  รายการทั้งหมด <span className="font-medium text-foreground">{filteredCustomers.length}</span> รายการ
                </div>
                {Math.ceil(filteredCustomers.length / perPage) > 1 && (
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      หน้า <span className="font-medium text-foreground">{page}</span> จาก {Math.ceil(filteredCustomers.length / perPage)}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1}
                        onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= Math.ceil(filteredCustomers.length / perPage)}
                        onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>ชื่อลูกค้า *</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="ระบุชื่อหรือบริษัทลูกค้า" 
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingCustomer ? 'บันทึกการแก้ไข' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกลูกค้า</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการยกเลิกลูกค้า <strong>"{deletingCustomer?.name}"</strong> ใช่หรือไม่?
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                ข้อมูลจะไม่ถูกลบออกจากระบบ แต่จะไม่แสดงในรายการอีกต่อไป เนื่องจากอาจมีรายการธุรกรรมที่ผูกอยู่
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ไม่ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
