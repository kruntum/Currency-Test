import * as React from 'react';
import { useCustomerStore } from '@/stores/customer-store';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

interface CustomerComboboxProps {
  companyId: number;
  value: string; // This expects customerId as a string
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CustomerCombobox({ companyId, value, onChange, className, disabled }: CustomerComboboxProps) {
  const { customers, loading, fetchCustomers, addCustomer } = useCustomerStore();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  // Fetch customers on mount if empty for this company
  React.useEffect(() => {
    if (companyId && (!customers[companyId] || customers[companyId].length === 0)) {
      fetchCustomers(companyId);
    }
  }, [companyId, customers, fetchCustomers]);

  const companyCustomers = customers[companyId] || [];
  
  // Find selected customer name to display
  const selectedCustomer = companyCustomers.find(c => String(c.id) === value);
  const displayValue = selectedCustomer ? selectedCustomer.name : '';

  const handleCreateNew = async () => {
    if (!searchQuery.trim() || !companyId) return;
    setCreating(true);
    try {
      const newCustomer = await addCustomer(companyId, { name: searchQuery.trim() });
      onChange(String(newCustomer.id));
      setOpen(false);
      setSearchQuery('');
      toast.success(`เพิ่มลูกค้า '${newCustomer.name}' สำเร็จแล้ว 🎉`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !companyId}
          className={cn(
            'w-full justify-between px-3 font-normal',
            (!value || value === 'none') && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {value === 'none' ? '-- ไม่ระบุ --' : (displayValue || '-- ไม่ระบุ --')}
          </span>
          {loading && !companyCustomers.length ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="ค้นหาชื่อลูกค้า..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9 text-sm"
          />
          <CommandList className="max-h-[200px] overflow-auto">
            {loading && !companyCustomers.length ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CommandEmpty className="py-2 px-2 text-center text-sm">
                {searchQuery.trim() ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground mb-2">ไม่พบลูกค้า '{searchQuery}'</p>
                    <Button 
                      variant="secondary" 
                      className="w-full gap-1 text-sm h-8"
                      onClick={handleCreateNew}
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      สร้าง '{searchQuery}'
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">พิมพ์เพื่อค้นหาหรือสร้างลูกค้าใหม่</p>
                )}
              </CommandEmpty>
            )}
            <CommandGroup>
              {!searchQuery.trim() && (
                <CommandItem
                  value="none"
                  onSelect={() => {
                    onChange('none');
                    setOpen(false);
                    setSearchQuery('');
                  }}
                  className="text-sm italic text-muted-foreground"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      (!value || value === 'none') ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  -- ไม่ระบุ --
                </CommandItem>
              )}
              {companyCustomers
                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.taxId && c.taxId.includes(searchQuery)))
                .map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={String(customer.id)}
                    onSelect={(currentValue) => {
                      onChange(currentValue);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === String(customer.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {customer.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
