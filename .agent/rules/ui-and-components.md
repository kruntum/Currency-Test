# Shadcn UI & Component Reusability Rules

1. **Always Reuse First**: Before creating any new UI component, you MUST check if a suitable component already exists in `src/components/ui/` or elsewhere in the project.
2. **Use Shadcn CLI**: Do not reinvent the wheel. If a standard UI element (e.g., Select, DatePicker, Dialog) is missing, attempt to add it via the Shadcn CLI (`npx shadcn-ui@latest add <component>`) before writing a custom implementation from scratch.
3. **Compact Design Standard**: The project mandates a compact look. When styling forms, always use `h-7`, `text-xs`, and minimal padding.
4. **Highlighting Required Fields**: Required fields MUST be highlighted.
   - DO NOT apply backgrounds directly to generic wrapper components (like a DatePicker `div` wrapper) as it causes opacity stacking.
   - DO pass the highlight classes directly to the input element (e.g., via `inputClassName`).
   - Standard Highlight Class: `bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50`
5. **Dark Mode Integration**: All UI components and highlights must explicitly support dark mode using the `dark:` Tailwind variant.
6. **Pattern Matching**: When building complex, specialized components (like a combobox with a create function), review existing components (e.g., `ProductManagerDialog` or `CustomerCombobox`) to ensure consistent behavior and styling.
