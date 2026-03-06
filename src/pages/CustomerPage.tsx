import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCustomerStore } from '@/stores/customer-store';
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
import { Plus, Users, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const { customers, loading, fetchCustomers, addCustomer } = useCustomerStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');

  useEffect(() => {
    if (cId) {
      fetchCustomers(cId);
    }
  }, [cId, fetchCustomers]);

  const companyCustomers = customers[cId] || [];

  const handleOpenDialog = () => {
    setName('');
    setAddress('');
    setTaxId('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('กรุณาระบุชื่อลูกค้า');
      return;
    }

    setSaving(true);
    try {
      await addCustomer(cId, { name, address, taxId });
      toast.success('เพิ่มลูกค้าสำหรับบริษัทนี้สำเร็จ');
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader 
        title="จัดการลูกค้า (Customers)" 
        description="เพิ่มและจัดการข้อมูลลูกค้าของบริษัท เพื่อใช้ผูกกับรายการใบขน" 
      />

      <div className="flex-1 space-y-6 p-4 overflow-auto min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              ทั้งหมด {companyCustomers.length} รายชื่อ
            </span>
          </div>
          <Button onClick={handleOpenDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มลูกค้าใหม่
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">รายชื่อลูกค้าทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : companyCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>ยังไม่มีข้อมูลลูกค้าสำหรับบริษัทนี้</p>
                <Button variant="link" onClick={handleOpenDialog}>
                  คลิกที่นี่เพื่อเพิ่มลูกค้าคนแรก
                </Button>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อลูกค้า (Name)</TableHead>
                      <TableHead>รหัสประจำตัวผู้เสียภาษี (Tax ID)</TableHead>
                      <TableHead>ที่อยู่ (Address)</TableHead>
                      <TableHead className="text-right">ยอดคงเหลือ Wallet (THB)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyCustomers.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">{c.name}</TableCell>
                        <TableCell className="text-slate-500">{c.taxId || '-'}</TableCell>
                        <TableCell className="text-slate-500 max-w-xs truncate" title={c.address || ''}>
                            {c.address || '-'}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">
                          {/* Note: In real app we might fetch walletBalanceThb here if we expanded the store to show it */}
                          -
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มลูกค้าใหม่</DialogTitle>
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
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
