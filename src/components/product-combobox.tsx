import * as React from 'react';
import { useProductStore } from '@/stores/product-store';
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

interface ProductComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ProductCombobox({ value, onChange, className }: ProductComboboxProps) {
  const { products, loading, createProduct, fetchProducts } = useProductStore();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  // Fetch products on mount if empty
  React.useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [products.length, fetchProducts]);

  const handleCreateNew = async () => {
    if (!searchQuery.trim()) return;
    setCreating(true);
    try {
      const newProduct = await createProduct(searchQuery.trim());
      onChange(newProduct.name);
      setOpen(false);
      setSearchQuery('');
      toast.success(`สร้างสินค้า '${newProduct.name}' สำเร็จแล้ว 🎉`);
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
          className={cn(
            'w-full justify-between px-2 font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{value || 'เลือกหรือพิมพ์ชื่อสินค้า...'}</span>
          {loading ? (
            <Loader2 className="ml-2 h-3.5 w-3.5 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="ค้นหาชื่อสินค้า..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9 text-sm"
          />
          <CommandList className="max-h-[200px] overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CommandEmpty className="py-2 px-2 text-center text-sm">
                {searchQuery.trim() ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground mb-2">ไม่พบสินค้า '{searchQuery}'</p>
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
                  <p className="text-muted-foreground">พิมพ์เพื่อค้นหาหรือสร้างสินค้าใหม่</p>
                )}
              </CommandEmpty>
            )}
            <CommandGroup>
              {products
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
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
                        value === product.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {product.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
