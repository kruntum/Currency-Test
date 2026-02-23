import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTransactionStore } from '@/stores/transaction-store';
import { useSession } from '@/lib/auth-client';
import { formatNumber } from '@/lib/utils';
import { FileText, ArrowRightLeft, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { PageHeader } from '@/components/page-header';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { transactions, fetchTransactions } = useTransactionStore();
  const [stats, setStats] = useState({
    total: 0,
    totalThb: '0',
    currencies: {} as Record<string, number>,
    todayCount: 0,
  });

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const totalThb = transactions.reduce((sum, t) => sum + parseFloat(t.thbAmount), 0);
    const currencies: Record<string, number> = {};
    let todayCount = 0;

    transactions.forEach((t) => {
      currencies[t.currencyCode] = (currencies[t.currencyCode] || 0) + 1;
      if (t.createdAt.startsWith(today)) todayCount++;
    });

    setStats({
      total: transactions.length,
      totalThb: totalThb.toFixed(2),
      currencies,
      todayCount,
    });
  }, [transactions]);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader 
        title={`สวัสดี, ${session?.user?.name || 'ผู้ใช้'}`}
        description="ภาพรวมระบบบันทึกข้อมูลใบขนสินค้า"
      />
      <div className="flex-1 space-y-6 p-4 overflow-auto min-h-0">

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow duration-300 bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รายการทั้งหมด</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">รายการ</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดรวม (THB)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{formatNumber(stats.totalThb)}</div>
            <p className="text-xs text-muted-foreground mt-1">บาท</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สกุลเงิน</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(stats.currencies).map(([code, count]) => (
                <Badge key={code} variant="secondary">
                  {code}: {count}
                </Badge>
              ))}
              {Object.keys(stats.currencies).length === 0 && (
                <span className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300 bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">วันนี้</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), 'd MMMM yyyy', { locale: th })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-muted/50 rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">รายการล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>ยังไม่มีรายการ</p>
              <p className="text-sm mt-1">เริ่มบันทึกข้อมูลใบขนสินค้าได้ที่เมนู "รายการ"</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-card rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">เลขที่ใบขน</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">เลขที่อินวอย</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">สกุลเงิน</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">ยอดเงินต่างประเทศ</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">อัตราแลกเปลี่ยน</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">ยอดเงิน (THB)</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map((t) => (
                    <tr key={t.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-2 px-2 font-mono text-xs">{t.declarationNumber}</td>
                      <td className="py-2 px-2 font-mono text-xs">{t.invoiceNumber}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline">{t.currencyCode}</Badge>
                      </td>
                      <td className="text-right py-2 px-2 font-mono">{formatNumber(t.foreignAmount, 4)}</td>
                      <td className="text-right py-2 px-2 font-mono text-xs">{formatNumber(t.exchangeRate, 6)}</td>
                      <td className="text-right py-2 px-2 font-mono font-semibold">฿{formatNumber(t.thbAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
