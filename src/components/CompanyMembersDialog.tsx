import { useEffect, useState } from 'react';
import { useCompanyStore, type CompanyUser } from '@/stores/company-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Props {
  companyId: number | null;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES = [
  { value: 'OWNER', label: 'เจ้าของบริษัท (Owner)' },
  { value: 'ADMIN', label: 'ผู้ดูแล (Admin)' },
  { value: 'FINANCE', label: 'การเงิน (Finance)' },
  { value: 'DATA_ENTRY', label: 'ผู้จัดการใบขน (Data Entry)' },
];

export function CompanyMembersDialog({ companyId, companyName, open, onOpenChange }: Props) {
  const { companyMembers, fetchCompanyUsers, addCompanyUser, updateCompanyUser, removeCompanyUser } = useCompanyStore();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('DATA_ENTRY');

  const members = companyId ? (companyMembers[companyId] || []) : [];

  useEffect(() => {
    if (open && companyId) {
      setLoading(true);
      fetchCompanyUsers(companyId).finally(() => setLoading(false));
    } else {
      setNewEmail('');
      setNewRole('DATA_ENTRY');
    }
  }, [open, companyId, fetchCompanyUsers]);

  const handleAddMember = async () => {
    if (!companyId) return;
    if (!newEmail.trim()) {
      toast.error('กรุณาระบุอีเมลผู้ใช้งาน');
      return;
    }

    setAdding(true);
    try {
      await addCompanyUser(companyId, newEmail.trim(), newRole);
      toast.success('เพิ่มทีมงานสำเร็จ');
      setNewEmail('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    if (!companyId) return;
    try {
      await updateCompanyUser(companyId, userId, role);
      toast.success('อัปเดตสิทธิ์สำเร็จ');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!companyId) return;
    if (!confirm(`ยืนยันการลบ ${userName} ออกจากบริษัทนี้?`)) return;

    try {
      await removeCompanyUser(companyId, userId);
      toast.success('ลบทีมงานสำเร็จ');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-purple-600';
      case 'ADMIN': return 'bg-blue-600';
      case 'FINANCE': return 'bg-amber-600';
      default: return 'bg-slate-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>บริหารทีมงาน</DialogTitle>
          <DialogDescription>
            จัดการสมาชิกในบริษัท <strong>{companyName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-end gap-2 bg-muted/50 p-4 rounded-lg border">
            <div className="grid gap-2 flex-1">
              <Label htmlFor="email">เชิญสมาชิกด้วยอีเมล</Label>
              <Input
                id="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2 w-[200px]">
              <Label>สิทธิ์การใช้งาน</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddMember} disabled={adding} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              เพิ่ม
            </Button>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>ผู้ใช้งาน</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>สิทธิ์ (Role)</TableHead>
                  <TableHead>เข้าร่วมเมื่อ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      ยังไม่มีสมาชิกในทีม
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m: CompanyUser) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.user?.name || '-'}</TableCell>
                      <TableCell className="text-sm">{m.user?.email || '-'}</TableCell>
                      <TableCell>
                        <Select 
                          value={m.role} 
                          onValueChange={(val) => handleUpdateRole(m.userId, val)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <Badge variant="default" className={`${getRoleBadgeColor(m.role)} mr-2 p-0.5 px-1.5`}>
                              {m.role}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => (
                              <SelectItem key={r.value} value={r.value} className="text-xs">
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(m.createdAt), 'd MMM yyyyy', { locale: th })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveMember(m.userId, m.user?.name || 'Unknown')}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิดหน้าต่าง
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
