import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReceiptStore } from '@/stores/receipt-store';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ReceiptDialog } from '@/components/receipt-dialog';
import { Plus, ArrowDownToLine, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/utils';

export default function ReceiptPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const { receipts, loading, fetchReceipts } = useReceiptStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (cId) {
      fetchReceipts(cId);
    }
  }, [cId, fetchReceipts]);

  const handleSaved = () => {
    fetchReceipts(cId);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader title="รับเงิน (Receipts)" description="บันทึกยอดชำระจากต่างประเทศและตัดยอดใบขน" />

      <div className="flex-1 space-y-6 p-4 overflow-auto min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              ทั้งหมด {receipts.length} รายการ
            </span>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            บันทึกรับเงิน
          </Button>
        </div>

        <Card className="bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">ประวัติการรับเงิน</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : receipts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowDownToLine className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>ยังไม่มีประวัติการรับเงิน</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-card rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่รับ</TableHead>
                      <TableHead>ลูกค้า (Customer)</TableHead>
                      <TableHead>อ้างอิงธนาคาร</TableHead>
                      <TableHead className="text-right">ยอดรับ (FCY)</TableHead>
                      <TableHead className="text-right">อัตราแลกเปลี่ยน</TableHead>
                      <TableHead className="text-right">ยอดรับ (THB)</TableHead>
                      <TableHead className="text-center">ตรวจสอบ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((rcpt) => (
                      <TableRow key={rcpt.id}>
                        <TableCell className="text-sm">
                          {format(new Date(rcpt.receivedDate), 'd MMM yyyy', { locale: th })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {rcpt.customer?.name || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {rcpt.bankReference || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {formatNumber(rcpt.receivedFcy, 2)} {rcpt.currencyCode}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {formatNumber(rcpt.receivedBotRate, 4)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {formatNumber(rcpt.receivedThb, 2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {rcpt.allocations.length} ใบขน
                          </Badge>
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

      <ReceiptDialog 
        companyId={cId} 
        open={dialogOpen} 
        onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) handleSaved();
        }} 
      />
    </div>
  );
}
