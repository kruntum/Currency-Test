import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTreasuryStore, type FCDHoldingPool } from '@/stores/treasury-store';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ExchangeDialog } from '@/components/exchange-dialog';
import { Loader2, ArrowRightLeft, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/utils';

export default function TreasuryPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const { pools, logs, loading, fetchPools, fetchLogs } = useTreasuryStore();
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<FCDHoldingPool | null>(null);

  useEffect(() => {
    if (cId) {
      fetchPools(cId);
      fetchLogs(cId);
    }
  }, [cId, fetchPools, fetchLogs]);

  const handleOpenExchange = (pool: FCDHoldingPool) => {
    setSelectedPool(pool);
    setExchangeOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader 
        title="คลังเงินตราต่างประเทศ (Treasury & FCD)" 
        description="จัดการบัญชี FCD, ตรวจสอบยอดคงเหลือ และแลกเปลี่ยนเงินตราสกุลต่างประเทศเป็นเงินบาท" 
      />

      <div className="flex-1 space-y-6 p-4 overflow-auto min-h-0">
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-linear-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-sm dark:from-slate-900 dark:to-slate-800 dark:border-slate-800">
                <CardHeader>
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <Wallet className="h-5 w-5" />
                        <CardTitle className="text-lg">FCD Holding Pools</CardTitle>
                    </div>
                    <CardDescription>
                        ยอดเงินต่างประเทศคงค้างจาก Receipt ที่รอการแลกเปลี่ยนเป็นไทยบาท
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : pools.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground text-sm">ไม่มีเงินตราต่างประเทศคงค้าง</div>
                    ) : (
                        <div className="space-y-4">
                            {pools.map(pool => (
                                <div key={pool.id} className="bg-white dark:bg-slate-950 p-4 rounded-xl border shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold">{pool.currencyCode}</span>
                                            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400 font-medium tracking-wide">
                                                AVG COST: {formatNumber(pool.avgCostRate, 4)}
                                            </span>
                                        </div>
                                        <p className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-1">
                                            {formatNumber(pool.balanceFcy, 2)}
                                        </p>
                                    </div>
                                    <Button onClick={() => handleOpenExchange(pool)} variant="outline" className="border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800 shadow-sm gap-2">
                                        <ArrowRightLeft className="h-4 w-4" /> แลกเป็นบาท
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-muted/30 border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">ประวัติการแลกเปลี่ยน (Exchange History)</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : logs.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground text-sm">ยังไม่มีประวัติการแลกเปลี่ยน</div>
                    ) : (
                        <div className="max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-4">วันที่</TableHead>
                                        <TableHead>จำนวน (FCY)</TableHead>
                                        <TableHead>เรทขาย</TableHead>
                                        <TableHead>ได้รับ (THB)</TableHead>
                                        <TableHead className="text-right pr-4">กำไร/ขาดทุน</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map(log => {
                                        const pl = parseFloat(log.fxLayer2GainLoss);
                                        return (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-xs pl-4">
                                                    {format(new Date(log.exchangedDate), 'd MMM yyyy', { locale: th })}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {formatNumber(log.amountFcy, 2)} <span className="text-xs text-muted-foreground">{log.currencyCode}</span>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {formatNumber(log.actualBankRate, 4)}
                                                </TableCell>
                                                <TableCell className="font-medium text-emerald-600">
                                                    {formatNumber(log.thbReceived, 2)}
                                                </TableCell>
                                                <TableCell className="text-right pr-4">
                                                    <div className={`flex items-center justify-end gap-1 font-medium text-sm ${pl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {pl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                        {pl >= 0 ? '+' : ''}{formatNumber(pl, 2)}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>

      <ExchangeDialog 
        companyId={cId} 
        open={exchangeOpen} 
        onOpenChange={setExchangeOpen} 
        pool={selectedPool}
      />
    </div>
  );
}
