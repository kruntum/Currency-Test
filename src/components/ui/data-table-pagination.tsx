import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTablePaginationProps {
    total: number;
    page: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
    perPageOptions?: number[];
    className?: string;
}

export function DataTablePagination({
    total,
    page,
    perPage,
    onPageChange,
    onPerPageChange,
    perPageOptions = [30, 50, 100],
    className = '',
}: DataTablePaginationProps) {
    const totalPages = Math.ceil(total / perPage);

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between pt-4 pb-1 px-1 gap-4 mt-auto border-t ${className}`}>
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                    รายการทั้งหมด <span className="font-semibold text-foreground">{total.toLocaleString()}</span> รายการ
                </span>
                {onPerPageChange && (
                    <Select value={String(perPage)} onValueChange={(v) => onPerPageChange(parseInt(v))}>
                        <SelectTrigger className="h-7 w-20 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {perPageOptions.map((opt) => (
                                <SelectItem key={opt} value={String(opt)} className="text-xs">
                                    {opt} / หน้า
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs px-2">
                    {page} / {totalPages || 1}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
