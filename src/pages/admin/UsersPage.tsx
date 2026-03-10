import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield, User, MoreHorizontal, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2 } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { transactions: number };
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = searchQuery.trim()
    ? users.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const json = await res.json();
      setUsers(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);


  const handleDeleteUser = async (userId: string) => {    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      
      if (!res.ok) {
        toast.error(json.error || 'ไม่สามารถลบผู้ใช้ได้');
        return;
      }
      
      fetchUsers();
      toast.success('ลบผู้ใช้สำเร็จ');
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการลบผู้ใช้');
    } finally {
      setIsDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      
      if (!res.ok) {
        toast.error(json.error || 'ไม่สามารถสร้างผู้ใช้ได้');
        return;
      }
      
      setIsAddOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      fetchUsers();
      toast.success('เพิ่มผู้ใช้สำเร็จ');
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการสร้างผู้ใช้');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
        }),
      });
      const json = await res.json();
      
      if (!res.ok) {
        toast.error(json.error || 'ไม่สามารถอัปเดตผู้ใช้ได้');
        return;
      }
      
      setIsEditOpen(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      fetchUsers();
      toast.success('แก้ไขข้อมูลผู้ใช้สำเร็จ');
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตผู้ใช้');
    }
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setIsEditOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader
        title="จัดการผู้ใช้"
        description="จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง (Admin only)"
      />
      <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">

        {/* Top bar: search + add button */}
        <div className="flex items-center justify-between shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="ค้นหาชื่อ หรืออีเมล..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <Button onClick={() => {
            setFormData({ name: '', email: '', password: '', role: 'user' });
            setIsAddOpen(true);
          }} className="gap-2">
            <Plus className="h-4 w-4" /> เพิ่มผู้ใช้
          </Button>
        </div>

      <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
        <CardHeader className="shrink-0 pb-2">
          <CardTitle className="text-lg">รายชื่อผู้ใช้ <span className="text-sm font-normal text-muted-foreground ml-2">{filteredUsers.length} คน</span></CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-auto rounded-md min-h-0">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="w-12 text-center py-2 px-3 font-medium h-9 text-xs">#</th>
                    <th className="text-left py-2 px-3 font-medium h-9 text-xs">ชื่อ</th>
                    <th className="text-left py-2 px-3 font-medium h-9 text-xs">อีเมล</th>
                    <th className="text-center py-2 px-3 font-medium h-9 text-xs">บทบาท</th>
                    <th className="text-center py-2 px-3 font-medium h-9 text-xs">จำนวนรายการ</th>
                    <th className="text-center py-2 px-3 font-medium h-9 text-xs">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice((page - 1) * perPage, page * perPage).map((u, index) => (
                    <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="text-center text-muted-foreground text-xs py-1.5 px-3 h-10">
                        {(page - 1) * perPage + index + 1}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-sm h-10">{u.name}</td>
                      <td className="py-1.5 px-3 text-muted-foreground text-xs h-10">{u.email}</td>
                      <td className="text-center py-1.5 px-3 h-10">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="gap-1 text-[10px] shadow-none">
                          {u.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {u.role}
                        </Badge>
                      </td>
                      <td className="text-center py-1.5 px-3 h-10">{u._count.transactions}</td>
                      <td className="text-center py-1.5 px-3 h-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-6 w-6 p-0">
                              <span className="sr-only">เปิดเมนู</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">การจัดการ</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => openEditModal(u)}>
                              <Edit2 className="mr-2 h-3.5 w-3.5" />
                              <span>แก้ไขข้อมูล</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer text-xs"
                              onClick={() => {
                                setUserToDelete(u.id);
                                setIsDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              <span>ลบผู้ใช้</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 pb-1 px-1 gap-4 mt-auto border-t">
              <div className="text-sm text-muted-foreground">
                รายการทั้งหมด <span className="font-medium text-foreground">{filteredUsers.length}</span> รายการ
              </div>
              {Math.ceil(filteredUsers.length / perPage) > 1 && (
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    หน้า <span className="font-medium text-foreground">{page}</span> จาก {Math.ceil(filteredUsers.length / perPage)}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1}
                      onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= Math.ceil(filteredUsers.length / perPage)}
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

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
              <DialogDescription>
                สร้างบัญชีผู้ใช้ใหม่และกำหนดสิทธิ์การเข้าถึงระบบ
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">ชื่อ-สกุล</Label>
                <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">อีเมล</Label>
                <Input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">รหัสผ่าน</Label>
                <Input id="password" type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">บทบาท</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>ยกเลิก</Button>
              <Button type="submit">บันทึก</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
              <DialogDescription>
                อัปเดตข้อมูลบัญชีผู้ใช้
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">ชื่อ-สกุล</Label>
                <Input id="edit-name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">อีเมล</Label>
                <Input id="edit-email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">บทบาท</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>ยกเลิก</Button>
              <Button type="submit">บันทึก</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้งาน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้? การกระทำนี้ไม่สามารถย้อนกลับได้ หากดำเนินการแล้วข้อมูลของผู้ใช้งานรายนี้จะถูกลบออกจากระบบเป็นการถาวร
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (userToDelete) {
                  handleDeleteUser(userToDelete);
                }
              }}
            >
              ลบผู้ใช้งาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
