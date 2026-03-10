import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTreasuryStore, type FCDWallet } from '@/stores/treasury-store';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { ExchangeDialog } from '@/components/exchange-dialog';
import { RoleProtect } from '@/components/role-protect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRightLeft, Wallet, TrendingUp, TrendingDown, Filter, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn, formatNumber } from '@/lib/utils';

export default function TreasuryPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const { pools, logs, loading, fetchPools, fetchLogs } = useTreasuryStore();
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<FCDWallet | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string>('__ALL__');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    if (cId) {
      fetchPools(cId);
      fetchLogs(cId);
    }
  }, [cId, fetchPools, fetchLogs]);

  // Derive unique customer names from pools
  const uniqueCustomers = useMemo(() => {
    const names = [...new Set(pools.map(p => p.customerName))];
    return names.sort();
  }, [pools]);

  // Filtered pools & logs based on selected customer
  const filteredPools = useMemo(() => {
    if (customerFilter === '__ALL__') return pools;
    return pools.filter(p => p.customerName === customerFilter);
  }, [pools, customerFilter]);

  const filteredLogs = useMemo(() => {
    if (customerFilter === '__ALL__') return logs;
    return logs.filter(l => l.receipt?.customer.name === customerFilter);
  }, [logs, customerFilter]);

  // Currency summary from filtered pools
  const currencySummary = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPools.forEach(p => {
      const bal = parseFloat(String(p.balanceFcy)) || 0;
      map[p.currencyCode] = (map[p.currencyCode] || 0) + bal;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredPools]);

  const handleOpenExchange = (pool: FCDWallet) => {
    setSelectedPool(pool);
    setExchangeOpen(true);
  };

  const filterLabel = customerFilter === '__ALL__'
    ? `ทั้งหมด (${pools.length})`
    : customerFilter;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader 
        title="คลังเงินตราต่างประเทศ (Treasury & FCD)" 
        description="จัดการบัญชี FCD, ตรวจสอบยอดคงเหลือ และแลกเปลี่ยนเงินตราสกุลต่างประเทศเป็นเงินบาท" 
      />

      <div className="flex-1 space-y-6 p-4 overflow-auto min-h-0">
        {/* Customer Filter + Currency Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-[250px] justify-between h-9 font-normal"
                >
                  <span className="truncate">{filterLabel}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="ค้นหาลูกค้า..." />
                  <CommandList>
                    <CommandEmpty>ไม่พบลูกค้า</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__ALL__"
                        onSelect={() => { setCustomerFilter('__ALL__'); setComboboxOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", customerFilter === '__ALL__' ? "opacity-100" : "opacity-0")} />
                        ทั้งหมด ({pools.length} wallets)
                      </CommandItem>
                      {uniqueCustomers.map(name => {
                        const count = pools.filter(p => p.customerName === name).length;
                        return (
                          <CommandItem
                            key={name}
                            value={name}
                            onSelect={() => { setCustomerFilter(name); setComboboxOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", customerFilter === name ? "opacity-100" : "opacity-0")} />
                            {name} ({count})
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {currencySummary.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currencySummary.map(([code, total]) => (
                <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {code}: {formatNumber(total, 2)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3 items-start relative">
            <Card className="md:col-span-1 bg-linear-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-sm dark:from-slate-900 dark:to-slate-800 dark:border-slate-800 sticky top-0">
                <CardHeader className="pb-2 px-4 pt-4">
                    <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                        <Wallet className="h-4 w-4" />
                        <CardTitle className="text-sm font-semibold">FCY Wallets</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                        {customerFilter === '__ALL__' 
                          ? `${filteredPools.length} กระเป๋า`
                          : `${customerFilter} — ${filteredPools.length}`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                    {loading ? (
                        <div className="flex justify-center p-3"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                    ) : filteredPools.length === 0 ? (
                        <div className="text-center p-3 text-muted-foreground text-xs">
                          {pools.length === 0 ? 'ยังไม่มีกระเป๋าเงิน' : 'ไม่พบกระเป๋า'}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                            {filteredPools.map(pool => (
                                <div key={pool.id} className="bg-white dark:bg-slate-950 p-3 rounded-lg border shadow-sm flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-base font-bold">{pool.currencyCode}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 font-medium">
                                                    {formatNumber(pool.avgCostRate, 4)}
                                                </span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                {formatNumber(pool.balanceFcy, 2)}
                                            </p>
                                        </div>
                                        <RoleProtect allowedRoles={['OWNER', 'ADMIN', 'FINANCE']}>
                                            <Button onClick={() => handleOpenExchange(pool)} variant="default" size="xs" className="shadow-sm gap-1 shrink-0 h-7 text-xs px-2">
                                                <ArrowRightLeft className="h-3 w-3" /> Sell
                                            </Button>
                                        </RoleProtect>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">
                                        <div className="truncate pr-1">
                                            <span className="font-medium text-slate-600 dark:text-slate-400">{pool.customerName}</span>
                                            <span className="mx-1">•</span>
                                            {format(new Date(pool.receivedDate), 'd MMM yy', { locale: th })}
                                        </div>
                                        <div className="shrink-0">
                                            {formatNumber(pool.originalFcy, 2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-muted/30 border shadow-sm flex flex-col min-h-0">
                <CardHeader className="pb-2 px-4 pt-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">ประวัติการแลกเปลี่ยน</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>แสดง</span>
                            <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
                                <SelectTrigger className="h-7 w-[70px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                    <SelectItem value="300">300</SelectItem>
                                </SelectContent>
                            </Select>
                            <span>รายการ</span>
                        </div>
                    </div>
                    <CardDescription>
                        {filteredLogs.length > rowsPerPage
                          ? `แสดง ${rowsPerPage} จาก ${filteredLogs.length} รายการ`
                          : `ทั้งหมด ${filteredLogs.length} รายการ`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0 flex-1 min-h-0">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center p-4 text-muted-foreground text-sm">ยังไม่มีประวัติการแลกเปลี่ยน</div>
                    ) : (
                        <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-x-auto overflow-y-auto pr-1 pl-4">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 w-[180px] py-1 text-[10px] h-7">วันที่รับ/ขาย</TableHead>
                                        <TableHead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 text-right py-1 text-[10px] h-7">จำนวน (FCY)</TableHead>
                                        <TableHead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 text-right py-1 text-[10px] h-7">เรทขาย</TableHead>
                                        <TableHead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 text-right py-1 text-[10px] h-7">ได้รับ (THB)</TableHead>
                                        <TableHead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 text-right pr-4 py-1 text-[10px] h-7">กำไร/ขาดทุน</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.slice(0, rowsPerPage).map(log => {
                                        const pl = parseFloat(String(log.fxLayer2GainLoss));
                                        return (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-xs py-1 h-8">
                                                    <div className="font-semibold">{log.receipt?.customer.name || 'Unknown'}</div>
                                                    <div className="text-muted-foreground mt-0.5">{format(new Date(log.exchangedDate), 'd MMM yy', { locale: th })}</div>
                                                </TableCell>
                                                <TableCell className="text-right py-1 h-8">
                                                    <div className="flex items-center justify-end gap-1 font-medium text-slate-700 dark:text-slate-200">
                                                        {formatNumber(log.amountFcy, 2)}
                                                        <span className="flex items-center justify-center w-[14px] h-[14px] rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[8px] font-bold text-slate-600 dark:text-slate-300 shadow-xs">
                                                            {log.currencyCode.substring(0,1)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-[10px] py-1 h-8 text-muted-foreground">
                                                    {formatNumber(log.actualBankRate, 4)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-primary py-1 h-8 text-[11px]">
                                                    ฿{formatNumber(log.thbReceived, 2)}
                                                </TableCell>
                                                <TableCell className="text-right pr-4 py-1 h-8">
                                                    <div className={`flex items-center justify-end gap-0.5 font-medium text-[11px] ${pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
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
