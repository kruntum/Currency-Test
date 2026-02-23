import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value?: string; // yyyy-MM-dd string
  onChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "dd/mm/yyyy", id, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Sync inputValue when value prop changes (from calendar pick)
  React.useEffect(() => {
    if (value) {
      try {
        const d = parse(value, "yyyy-MM-dd", new Date());
        if (isValid(d)) {
          setInputValue(format(d, "dd/MM/yyyy"));
        }
      } catch {
        // ignore
      }
    } else {
      setInputValue("");
    }
  }, [value]);

  const date = React.useMemo(() => {
    if (!value) return undefined;
    try {
      const d = parse(value, "yyyy-MM-dd", new Date());
      return isValid(d) ? d : undefined;
    } catch {
      return undefined;
    }
  }, [value]);

  const handleCalendarSelect = (selected: Date | undefined) => {
    if (selected && onChange) {
      onChange(format(selected, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    // Try parsing dd/MM/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const parsed = parse(raw, "dd/MM/yyyy", new Date());
      if (isValid(parsed) && onChange) {
        onChange(format(parsed, "yyyy-MM-dd"));
      }
    }
  };

  const handleInputBlur = () => {
    // On blur, also try other common formats
    const formats = ["dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "yyyy-MM-dd"];
    for (const fmt of formats) {
      try {
        const parsed = parse(inputValue, fmt, new Date());
        if (isValid(parsed)) {
          if (onChange) onChange(format(parsed, "yyyy-MM-dd"));
          setInputValue(format(parsed, "dd/MM/yyyy"));
          return;
        }
      } catch {
        // try next format
      }
    }
    // If nothing worked and we have an existing value, revert
    if (value) {
      try {
        const d = parse(value, "yyyy-MM-dd", new Date());
        if (isValid(d)) setInputValue(format(d, "dd/MM/yyyy"));
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className={cn("flex gap-1", className)}>
      <Input
        id={id}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            defaultMonth={date}
            locale={th}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
