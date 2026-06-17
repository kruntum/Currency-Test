import { cn } from '@/lib/utils';

interface CurrencyBadgeProps {
    code: string;
    symbol?: string;
    className?: string;
    showCode?: boolean;
}

export function CurrencyBadge({ code, symbol, className, showCode = true }: CurrencyBadgeProps) {
    return (
        <div className={cn('flex items-center gap-1.5', className)}>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                <span className="text-[10px] font-bold leading-none">{symbol || code.slice(0, 1)}</span>
            </div>
            {showCode && <span className="text-xs font-medium">{code}</span>}
        </div>
    );
}
