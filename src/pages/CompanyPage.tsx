import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore, type Company } from '@/stores/company-store';
import { PageHeader } from '@/components/page-header';
import { CompanyMembersDialog } from '@/components/CompanyMembersDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Ban, Building2, Loader2, ExternalLink, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function CompanyPage() {
  const navigate = useNavigate();
  const { companies, loading, fetchCompanies, createCompany, updateCompany, deleteCompany } =
    useCompanyStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [managingCompany, setManagingCompany] = useState<Company | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const resetForm = () => {
    setFormName('');
    setFormTaxId('');
    setFormAddress('');
    setFormPhone('');
    setEditingCompany(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (company: Company) => {
    setEditingCompany(company);
    setFormName(company.name);
    setFormTaxId(company.taxId || '');
    setFormAddress(company.address || '');
    setFormPhone(company.phone || '');
    setDialogOpen(true);
  };

  const handleOpenDelete = (company: Company) => {
    setDeletingCompany(company);
    setDeleteDialogOpen(true);
  };

  const handleOpenMembers = (company: Company) => {
    setManagingCompany(company);
    setMembersDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('กรุณากรอกชื่อบริษัท');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        taxId: formTaxId.trim() || undefined,
        address: formAddress.trim() || undefined,
        phone: formPhone.trim() || undefined,
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, data);
        toast.success('แก้ไขข้อมูลบริษัทสำเร็จ');
      } else {
        const newCompany = await createCompany(data);
        toast.success('เพิ่มบริษัทสำเร็จ');
        // Navigate to the new company's dashboard
        navigate(`/company/${newCompany.id}`);
      }
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCompany) return;
    try {
      await deleteCompany(deletingCompany.id);
      toast.success(`ยกเลิกบริษัท "${deletingCompany.name}" สำเร็จ`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingCompany(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader title="จัดการบริษัท" description="สร้าง แก้ไข หรือยกเลิกบริษัทของคุณ" />

      <div className="flex-1 space-y-6 p-4 overflow-auto min-h-0">
        {/* Header with Add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              ทั้งหมด {companies.length} บริษัท
            </span>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มบริษัท
          </Button>
        </div>

        {/* Companies Table */}
        <Card className="bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">รายการบริษัท</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>ยังไม่มีบริษัท</p>
                <p className="text-sm mt-1">กดปุ่ม "เพิ่มบริษัท" เพื่อเริ่มต้น</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-card rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>ชื่อบริษัท</TableHead>
                      <TableHead>เลขผู้เสียภาษี</TableHead>
                      <TableHead>ที่อยู่</TableHead>
                      <TableHead>เบอร์โทร</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>ผู้สร้าง</TableHead>
                      <TableHead>วันที่สร้าง</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company, index) => (
                      <TableRow key={company.id}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {company.taxId || '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {company.address || '-'}
                        </TableCell>
                        <TableCell className="text-sm">{company.phone || '-'}</TableCell>
                        <TableCell>
                          {company.status === 'active' ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                              ใช้งาน
                            </Badge>
                          ) : (
                            <Badge variant="destructive">ยกเลิก</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {company.user?.name || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(company.createdAt), 'd MMM yyyy', { locale: th })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/company/${company.id}`)}
                              className="gap-1 text-primary"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              เลือก
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenMembers(company)}
                              className="gap-1 text-purple-600 hover:text-purple-700"
                            >
                              <Users className="h-3.5 w-3.5" />
                              ทีมงาน
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(company)}
                              className="gap-1"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              แก้ไข
                            </Button>
                            {company.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDelete(company)}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                ยกเลิก
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'แก้ไขบริษัท' : 'เพิ่มบริษัทใหม่'}</DialogTitle>
            <DialogDescription>
              {editingCompany
                ? 'แก้ไขข้อมูลบริษัทของคุณ'
                : 'กรอกข้อมูลบริษัทที่ต้องการเพิ่ม'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company-name">
                ชื่อบริษัท <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company-name"
                placeholder="ชื่อบริษัท"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-tax-id">เลขผู้เสียภาษี</Label>
              <Input
                id="company-tax-id"
                placeholder="เลขผู้เสียภาษี 13 หลัก"
                value={formTaxId}
                onChange={(e) => setFormTaxId(e.target.value)}
                maxLength={13}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-address">ที่อยู่</Label>
              <Input
                id="company-address"
                placeholder="ที่อยู่บริษัท"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-phone">เบอร์โทร</Label>
              <Input
                id="company-phone"
                placeholder="เบอร์โทร"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCompany ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CompanyMembersDialog
        companyId={managingCompany?.id || null}
        companyName={managingCompany?.name || ''}
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกบริษัท</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการยกเลิกบริษัท <strong>"{deletingCompany?.name}"</strong> ใช่หรือไม่?
              <br />
              <span className="text-muted-foreground text-xs mt-2 block">
                บริษัทจะถูกเปลี่ยนสถานะเป็น "ยกเลิก" และจะไม่แสดงในรายการ
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ใช่</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
