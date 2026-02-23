import { SidebarTrigger } from '@/components/ui/sidebar';
import { ModeToggle } from '@/components/mode-toggle';
import { Separator } from '@/components/ui/separator';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div>
          <h1 className="text-sm font-semibold">{title}</h1>
          {description && <p className="text-xs text-muted-foreground hidden md:block">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action}
        <ModeToggle />
      </div>
    </header>
  );
}
