import { useState } from 'react';
import { signIn, signUp } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        const result = await signUp.email({
          name: form.name,
          email: form.email,
          password: form.password,
        });
        if (result.error) {
          const errorMessage = result.error.message || 'Registration failed';
          setError(errorMessage);
          toast.error(errorMessage);
          return;
        }
        toast.success('Registration successful');
      } else {
        const result = await signIn.email({
          email: form.email,
          password: form.password,
        });
        if (result.error) {
          const errorMessage = result.error.message || 'Login failed';
          setError(errorMessage);
          toast.error(errorMessage);
          return;
        }
        toast.success('Login successful');
      }
      window.location.href = '/';
    } catch {
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-primary/5 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-border/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
            <ArrowRightLeft className="w-7 h-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {isRegister ? 'สร้างบัญชีผู้ใช้' : 'เข้าสู่ระบบ'}
            </CardTitle>
            <CardDescription className="mt-1">
              ระบบบันทึกข้อมูลใบขนสินค้าและอินวอย
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อผู้ใช้</Label>
                <Input
                  id="name"
                  placeholder="กรอกชื่อ-นามสกุล"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 font-medium">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isRegister
                  ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'
                  : 'ยังไม่มีบัญชี? สมัครสมาชิก'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
