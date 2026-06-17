import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentStatusBadgeProps {
    status: string;
    className?: string;
}

const STATUS_CONFIG = {
    PAID: {
        label: 'ชำระแล้ว',
        icon: CheckCircle2,
        className: 'bg-success/15 text-success border-success/30 dark:bg-success/20',
    },
    FULLY_ALLOCATED: {
        label: 'ตัดชำระแล้ว',
        icon: CheckCircle2,
        className: 'bg-success/15 text-success border-success/30 dark:bg-success/20',
    },
    PARTIAL: {
        label: 'ชำระบางส่วน',
        icon: Clock,
        className: 'bg-warning/15 text-warning border-warning/30 dark:bg-warning/20',
    },
    PENDING: {
        label: 'รอชำระ',
        icon: CircleDashed,
        className: 'bg-muted/50 text-muted-foreground border-border',
    },
    UNALLOCATED: {
        label: 'ยังไม่ตัดชำระ',
        icon: CircleDashed,
        className: 'bg-muted/50 text-muted-foreground border-border',
    },
} as const;

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
        label: status,
        icon: CircleDashed,
        className: 'bg-muted/50 text-muted-foreground',
    };
    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-0.5 font-normal whitespace-nowrap', config.className, className)}
        >
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
}
