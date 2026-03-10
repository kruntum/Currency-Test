import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useSession } from '@/lib/auth-client';
import { formatNumber } from '@/lib/utils';
import { TrendingUp, Landmark, BarChart3, AlertCircle, ArrowUpRight, ArrowDownRight, Wallet, Users, CalendarDays, Filter } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';                                                                                                           
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DashboardPage() {
  const { data: session } = useSession();
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const { stats, fetchStats, loading, error } = useDashboardStore();

  useEffect(() => {
    if (cId) {
      const year = parseInt(selectedYear);
      const month = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
      fetchStats(cId, year, month);
    }
  }, [cId, selectedYear, selectedMonth, fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">กำลังโหลดข้อมูลสรุปผล...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center p-8 text-center bg-red-50/50 dark:bg-red-950/20">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">ไม่สามารถโหลดข้อมูลได้</h2>
        <p className="text-red-600/80 dark:text-red-400/80 max-w-md">{error || "ตรวจสอบสิทธิ์การใช้งานของคุณ"}</p>
      </div>
    );
  }

  // Define styling based on profit/loss
  const isNetProfit = stats.netFxGainLoss >= 0;
  
  // Transform data for Recharts
  // 1. Monthly Trend
  const allMonths = Array.from(new Set([
      ...Object.keys(stats.layer1ByMonth),
      ...Object.keys(stats.layer2ByMonth)
  ])).sort();

  const monthlyData = allMonths.map(month => ({
      name: month,
      "Accounting (Layer 1)": stats.layer1ByMonth[month] || 0,
      "Treasury (Layer 2)": stats.layer2ByMonth[month] || 0,
  }));

  // 2. Currency Breakdown
  const curDataL1 = Object.entries(stats.layer1ByCurrency).map(([name, value]) => ({ name, value }));
  const curDataL2 = Object.entries(stats.layer2ByCurrency).map(([name, value]) => ({ name, value }));
  
  // Merge currencies for unified view
  const unifiedCurrencies: Record<string, number> = {};
  curDataL1.forEach(d => unifiedCurrencies[d.name] = (unifiedCurrencies[d.name] || 0) + d.value);
  curDataL2.forEach(d => unifiedCurrencies[d.name] = (unifiedCurrencies[d.name] || 0) + d.value);
  const currencyPieData = Object.entries(unifiedCurrencies)
    .filter(([_, value]) => value !== 0)
    .map(([name, value]) => ({ name, value: Math.abs(value), actual: value })) // Abs for pie size, actual for tooltip

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-50/50 dark:bg-slate-950/50">
      <PageHeader 
        title={`Executive FX Dashboard`}
        description={`สรุปภาพรวมกำไร/ขาดทุนจากอัตราแลกเปลี่ยน (P/L) ของ ${session?.user?.name || 'บริษัท'}`}
      />

      <div className="flex-1 flex flex-col gap-4 p-2 md:p-4 overflow-auto min-h-0">
          
      {/* Filters Area */}
      <div className="flex items-center justify-end shrink-0">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
              <Filter className="h-4 w-4 text-muted-foreground ml-2" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0">
                      <CalendarDays className="mr-2 h-3.5 w-3.5 text-slate-500" />
                      <SelectValue placeholder="ปี" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value={(currentYear).toString()}>{currentYear}</SelectItem>
                      <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
                      <SelectItem value={(currentYear - 2).toString()}>{currentYear - 2}</SelectItem>
                  </SelectContent>
              </Select>
              
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[120px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0">
                      <SelectValue placeholder="เดือน" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">ทั้งปี (All)</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <SelectItem key={m} value={m.toString()}>
                              {format(new Date(2000, m - 1, 1), 'MMMM', { locale: th })}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 shrink-0">
        {/* Net Gain/Loss */}
        <Card className="shadow-sm border-blue-200 dark:border-blue-900 bg-linear-to-br from-white to-blue-50/80 dark:from-slate-900 dark:to-slate-800/80 ring-1 ring-blue-500/10 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-100">กำไรสุทธิ (Net FX P/L)</CardTitle>
            <div className={`p-1.5 rounded-full ${isNetProfit ? 'bg-emerald-100/50 dark:bg-emerald-500/20' : 'bg-red-100/50 dark:bg-red-500/20'}`}>
                {isNetProfit ? <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" /> : <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400 stroke-[2.5]" />}
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-xl font-bold tracking-tight ${isNetProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {isNetProfit ? '+' : ''}฿{formatNumber(stats.netFxGainLoss)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">ผลรวม Layer 1 และ Layer 2</p>
          </CardContent>
        </Card>

        {/* Layer 1 */}
        <Card className="shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Accounting P/L (Layer 1)</CardTitle>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                <BarChart3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-lg font-bold ${stats.netLayer1 >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {stats.netLayer1 >= 0 ? '+' : ''}฿{formatNumber(stats.netLayer1)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">ส่วนต่างอัตราวางบิล vs วันรับเงิน</p>
          </CardContent>
        </Card>

        {/* Layer 2 */}
        <Card className="shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Treasury P/L (Layer 2)</CardTitle>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                <Landmark className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-lg font-bold ${stats.netLayer2 >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {stats.netLayer2 >= 0 ? '+' : ''}฿{formatNumber(stats.netLayer2)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">ส่วนต่างต้นทุน FCD vs อัตราขายจริง</p>
          </CardContent>
        </Card>

        {/* FCD Exposure */}
        <Card className="shadow-sm border-purple-200 dark:border-purple-900 bg-linear-to-br from-white to-purple-50/80 dark:from-slate-900 dark:to-slate-800/80 ring-1 ring-purple-500/10 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-sm font-semibold text-purple-900 dark:text-purple-100">มูลค่าคลังเงินต่างประเทศ</CardTitle>
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
              ~฿{formatNumber(stats.totalFcdValueThb)}
            </div>
            <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">ตีมูลค่าจากต้นทุนเฉลี่ยที่มีอยู่</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts area */}
      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7 shrink-0">
        
        {/* Monthly Trend - Takes up more space */}
        <Card className="md:col-span-5 shadow-sm flex flex-col">
          <CardHeader className="pb-0 pt-3">
            <CardTitle className="text-sm">แนวโน้มกำไร/ขาดทุน รายเดือน</CardTitle>
            <CardDescription className="text-[10px]">การเติบโตของผลกำไรจากอัตราแลกเปลี่ยนแยกตามประเภท Layer (THB)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-2">
            {monthlyData.length > 0 ? (
                <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                    data={monthlyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: -5 }}
                    >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        style={{ fontSize: '11px', fill: '#6B7280' }}
                    />
                    <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value >= 0 ? '' : ''}${formatNumber(value/1000)}k`}
                        style={{ fontSize: '11px', fill: '#6B7280' }}
                    />
                    <RechartsTooltip 
                        formatter={(value: any) => [`฿${formatNumber(Number(value))}`, undefined]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        cursor={{fill: '#f1f5f9'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}/>
                    <Bar dataKey="Accounting (Layer 1)" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Treasury (Layer 2)" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
                    ยังไม่มีข้อมูลทำรายการ
                </div>
            )}
          </CardContent>
        </Card>

        {/* Currency Split */}
        <Card className="md:col-span-2 shadow-sm flex flex-col">
          <CardHeader className="pb-0 pt-3">
            <CardTitle className="text-sm">สัดส่วนสกุลเงิน</CardTitle>
            <CardDescription className="text-[10px]">ความผันผวน P/L ตามสกุลเงิน</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-2">
             {currencyPieData.length > 0 ? (
                <div className="h-[200px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={currencyPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {currencyPieData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip 
                            formatter={(_value: any, name: any, props: any) => {
                                // Show the actual positive/negative value, not the absolute used for sizing
                                const actual = props.payload.actual;
                                return [`${actual >= 0 ? '+' : ''}฿${formatNumber(actual)}`, name]
                            }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '11px'}}/>
                    </PieChart>
                </ResponsiveContainer>
                </div>
             ) : (
                 <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
                    ยังไม่มีข้อมูล
                </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Area: Tables */}
      <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-[250px]">
          
        {/* Top 5 Customers */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b border-border/40 mb-2 shrink-0">
            <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Top 5 ลูกค้าที่ได้กำไร FX (Layer 1) มากที่สุด
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-3 text-sm overflow-auto">
              {stats.topCustomers.length > 0 ? (
                  <div className="space-y-3">
                      {stats.topCustomers.slice(0, 4).map((customer, i) => (
                          <div key={i} className="flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold text-xs">
                                      #{i+1}
                                  </div>
                                  <span className="font-medium text-slate-700 dark:text-slate-300">{customer.name}</span>
                              </div>
                              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  +฿{formatNumber(customer.gain)}
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                   <div className="py-6 text-center text-muted-foreground text-xs">ไม่พบประวัติลูกค้า</div>
              )}
          </CardContent>
        </Card>

        {/* Unpaid Invoices Tracker */}
        <Card className="shadow-sm flex flex-col bg-muted/50 rounded-xl border">
          <CardHeader className="pb-2 border-b border-border/40 mb-2 bg-orange-50/10 dark:bg-orange-950/20 shrink-0">
            <CardTitle className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
                <Users className="h-4 w-4" />
                ลูกหนี้คงค้าง (Outstanding Receivables)
            </CardTitle>
            <CardDescription className="text-[10px] text-orange-600/70 dark:text-orange-400/70">
                รายการเปิดบิลที่ยังไม่ได้รับชำระหรือชำระไม่ครบ เรียงตามอายุ
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 px-0 pb-0 overflow-auto">
             {stats.unpaidInvoices.length > 0 ? (
                 <div className="h-full">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/30 z-10">
                            <tr className="border-b text-slate-500">
                                <th className="text-left font-medium px-4 py-1.5">ลูกค้า / Invoice</th>
                                <th className="text-right font-medium px-4 py-1.5">ยอดที่ค้าง (FCY)</th>
                                <th className="text-right font-medium px-4 py-1.5">อายุหนี้</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.unpaidInvoices.map(inv => (
                                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-1.5">
                                        <div className="font-medium text-slate-800 dark:text-slate-200">{inv.customerName}</div>
                                        <div className="text-[10px] text-muted-foreground flex gap-2 items-center mt-0.5">
                                            <span>{inv.invoiceNumber}</span>
                                            <span>•</span>
                                            <span>{format(new Date(inv.invoiceDate), 'dd MMM yyyy', { locale: th })}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-1.5 text-right">
                                        <div className="font-mono font-medium">{formatNumber(inv.pendingFcy, 2)} <span className="text-[10px] text-muted-foreground">{inv.currencyCode}</span></div>
                                        <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">
                                            ~฿{formatNumber(inv.estimatedThbValue)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-1.5 text-right">
                                        <Badge variant={inv.agingDays > 30 ? "destructive" : "secondary"} className="text-[10px] w-14 justify-center shadow-none py-0">
                                            {inv.agingDays} วัน
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             ) : (
                 <div className="py-6 text-center text-muted-foreground flex flex-col items-center">
                     <span className="text-3xl mb-1">🎉</span>
                     <span className="text-xs">สุดยอด! ไม่มีลูกหนี้ค้างชำระ</span>
                 </div>
             )}
          </CardContent>
        </Card>

      </div>

      </div>
    </div>
  );
}
