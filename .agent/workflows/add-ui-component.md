---
description: How to safely add a new UI component to the project using Shadcn UI
---

# Adding a New UI Component

When you determine that a new standard UI element is needed (e.g., a Slider, a Switch, or a Tooltip), follow this workflow to ensure it adheres to the project's Shadcn UI standards.

1. Search the existing `src/components/ui/` directory to confirm the component does not already exist.
2. If it does not exist, run the standard Shadcn UI add command. (Replace `<component-name>` with the desired component, like `accordion` or `dropdown-menu`).

```bash
// turbo
npx shadcn-ui@latest add <component-name>
```

3. Once the component is installed, review its generated file in `src/components/ui/`.
4. If the component accepts a `className`, ensure it leverages `tailwind-merge` (`cn` utility) correctly as per Shadcn standards.
5. If the component involves text inputs or selection, ensure its default styling can be overridden to support the project's compact `h-7 text-xs` standard.
6. Look for any wrapper elements that might cause opacity stacking if a user applies a semi-transparent background (like our warning highlight). If necessary, expose an `inputClassName` prop to allow direct styling of the input elements.
