import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTransactionStore } from '@/stores/transaction-store';
import { TransactionDialog } from '@/components/transaction-dialog';
import { ProductManagerDialog } from '@/components/product-manager-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Loader2, Search, FileText, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';

export default function TransactionPage() {
  const { companyId } = useParams();
  const {
    transactions, pagination, loading, searchQuery,
    setSearchQuery, setCompanyId, setLimit, fetchTransactions, deleteTransaction,
  } = useTransactionStore();

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [productManagerOpen, setProductManagerOpen] = useState(false);
  
  const [expandedTxIds, setExpandedTxIds] = useState<Set<number>>(new Set());
  const [expandedInvIds, setExpandedInvIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (companyId) setCompanyId(parseInt(companyId));
  }, [companyId, setCompanyId]);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions, companyId]);

  const handleSearch = () => fetchTransactions(1);

  const handleCreate = () => {
    setEditId(null);
    setDialogOpen(true);
  };

  const handleEdit = (id: number) => {
    setEditId(id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTransaction(deleteId);
      toast.success('ลบรายการสำเร็จ');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy'); }
    catch { return d; }
  };

  const toggleTx = (id: number) => {
    const next = new Set(expandedTxIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedTxIds(next);
  };

  const toggleInv = (id: number) => {
    const next = new Set(expandedInvIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedInvIds(next);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader
        title="รายการใบขนสินค้า"
        description="จัดการรายการนำเข้าและอินวอย"
      />

      <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">
        {/* Search + limit + action buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="ค้นหาเลขที่ใบขน / อินวอย / ชื่อสินค้า..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            </div>
            <Select value={String(pagination.limit)} onValueChange={(v) => { setLimit(parseInt(v)); fetchTransactions(1); }}>
              <SelectTrigger className="w-[120px] shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 รายการ</SelectItem>
                <SelectItem value="30">30 รายการ</SelectItem>
                <SelectItem value="50">50 รายการ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <Button variant="outline" onClick={() => setProductManagerOpen(true)} className="gap-2 text-primary border-primary/20 hover:bg-primary/10 flex-1 sm:flex-auto">
              <Package className="h-4 w-4" /> จัดการสินค้า
            </Button>
            <Button onClick={handleCreate} className="gap-2 flex-1 sm:flex-auto shadow-sm">
              <Plus className="h-4 w-4" /> สร้างรายการใหม่
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="h-12 w-12 opacity-50 mb-3" />
                <p>ยังไม่มีรายการ</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={handleCreate}>
                  <Plus className="h-4 w-4" /> สร้างรายการแรก
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-auto rounded-md min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="font-medium">เลขที่ใบขน</TableHead>
                      <TableHead className="font-medium">วันที่</TableHead>
                      <TableHead className="font-medium text-center">อินวอย</TableHead>
                      <TableHead className="font-medium">สกุลเงิน</TableHead>
                      <TableHead className="font-medium text-right">อัตรา</TableHead>
                      <TableHead className="font-medium text-right">ยอดต่างประเทศ</TableHead>
                      <TableHead className="font-medium text-right">ยอด THB</TableHead>
                      <TableHead className="font-medium">แหล่ง</TableHead>
                      <TableHead className="font-medium text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <React.Fragment key={tx.id}>
                        <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => toggleTx(tx.id)}>
                          <TableCell className="p-1 text-center">
                            {expandedTxIds.has(tx.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground mx-auto" /> : <ChevronRight className="h-4 w-4 text-muted-foreground mx-auto" />}
                          </TableCell>
                          <TableCell className="font-medium text-xs py-1">{tx.declarationNumber}</TableCell>
                          <TableCell className="text-xs py-1">{formatDate(tx.declarationDate)}</TableCell>
                          <TableCell className="text-center py-1">
                            <Badge variant="secondary">{tx._count?.invoices ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="py-1">
                            <Badge variant="outline">{tx.currency?.symbol} {tx.currencyCode}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs py-1">{formatNumber(tx.exchangeRate, 6)}</TableCell>
                          <TableCell className="text-right py-1">
                            {tx.currency?.symbol}{formatNumber(tx.foreignAmount, 4)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary py-1">
                            ฿{formatNumber(tx.thbAmount)}
                          </TableCell>
                          <TableCell className="py-1">
                            <Badge variant={tx.rateSource === 'BOT' ? 'success' : 'warning'} className="text-xs">
                              {tx.rateSource}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs"
                                onClick={() => handleEdit(tx.id)}>
                                <Pencil className="h-3.5 w-3.5" /> แก้ไข
                              </Button>
                              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-destructive"
                                onClick={() => setDeleteId(tx.id)}>
                                <Trash2 className="h-3.5 w-3.5" /> ลบ
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {expandedTxIds.has(tx.id) && tx.invoices && tx.invoices.length > 0 && (
                          <TableRow className="bg-muted/10 hover:bg-muted/10 border-b-0">
                            <TableCell colSpan={10} className="p-0 border-b-0">
                              <div className="pl-[60px] pr-4 py-3 min-h-0 bg-linear-to-r from-transparent to-muted/20">
                                <Table className="bg-background border rounded-md overflow-hidden">
                                  <TableHeader>
                                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                                      <TableHead className="w-[40px] py-1"></TableHead>
                                      <TableHead className="py-1 text-xs">เลขที่อินวอย</TableHead>
                                      <TableHead className="py-1 text-xs">วันที่อินวอย</TableHead>
                                      <TableHead className="py-1 text-xs text-center">จำนวนสินค้า</TableHead>
                                      <TableHead className="py-1 text-xs text-right">ยอด {tx.currencyCode}</TableHead>
                                      <TableHead className="py-1 text-xs text-right">ยอด THB</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {tx.invoices.map((inv) => (
                                      <React.Fragment key={inv.id}>
                                        <TableRow className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleInv(inv.id!)}>
                                          <TableCell className="p-1 text-center">
                                            {expandedInvIds.has(inv.id!) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mx-auto" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-auto" />}
                                          </TableCell>
                                          <TableCell className="py-1 text-xs">{inv.invoiceNumber}</TableCell>
                                          <TableCell className="py-1 text-xs">{formatDate(inv.invoiceDate)}</TableCell>
                                          <TableCell className="py-1 text-xs text-center"><Badge variant="outline" className="text-[10px] h-4 leading-none">{inv.items?.length || 0}</Badge></TableCell>
                                          <TableCell className="py-1 text-xs text-right">{formatNumber(inv.totalForeign, 4)}</TableCell>
                                          <TableCell className="py-1 text-xs text-right text-primary font-medium">฿{formatNumber(inv.totalThb)}</TableCell>
                                        </TableRow>
                                        
                                        {expandedInvIds.has(inv.id!) && inv.items && inv.items.length > 0 && (
                                          <TableRow className="bg-muted/5 hover:bg-muted/5">
                                            <TableCell colSpan={6} className="p-0 border-b-0">
                                              <div className="pl-[50px] pr-4 py-2 border-l-2 border-primary/20 bg-muted/5 my-1">
                                                <Table className="bg-card border border-muted-foreground/10 rounded-sm">
                                                  <TableHeader>
                                                    <TableRow className="hover:bg-transparent">
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] w-[30px] text-center">#</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px]">ชื่อสินค้า</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] text-right">น้ำหนัก</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] text-right">ราคา</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] text-right">ราคารวม ({tx.currencyCode})</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] text-right">รวม THB</TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {inv.items.map((item, idx) => (
                                                      <TableRow key={item.id} className="hover:bg-muted/20">
                                                        <TableCell className="py-1.5 px-2 text-[10px] text-muted-foreground text-center">{idx + 1}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] font-medium">{item.goodsName}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] text-right text-muted-foreground">{item.netWeight ? formatNumber(item.netWeight, 3) : '-'}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] text-right">{formatNumber(item.price, 4)}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] text-right">{formatNumber(item.totalPrice, 4)}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] text-right text-primary/80">฿{formatNumber(item.totalPriceTHB)}</TableCell>
                                                      </TableRow>
                                                    ))}
                                                  </TableBody>
                                                </Table>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination & Footer */}
            {!loading && transactions.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 pb-1 px-1 gap-4 mt-auto border-t">
                <div className="text-sm text-muted-foreground">
                  รายการทั้งหมด <span className="font-medium text-foreground">{pagination.total}</span> รายการ
                </div>
                
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      หน้า <span className="font-medium text-foreground">{pagination.page}</span> จาก {pagination.totalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page <= 1}
                        onClick={() => fetchTransactions(pagination.page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={pagination.page >= pagination.totalPages}
                        onClick={() => fetchTransactions(pagination.page + 1)}>
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

      {/* Transaction Dialog */}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={parseInt(companyId || '0')}
        editId={editId}
        onSaved={() => fetchTransactions(pagination.page)}
      />

      {/* Product Manager Dialog */}
      <ProductManagerDialog
        open={productManagerOpen}
        onOpenChange={setProductManagerOpen}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบรายการนี้ใช่หรือไม่? รายการนี้รวมถึงอินวอยและรายการสินค้าทั้งหมดจะถูกลบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
