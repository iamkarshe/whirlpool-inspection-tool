# AI Development Rules

1. Use `pnpm` for all Node/NPM commands. Never use `npm` or `yarn`.

2. Code must pass:
   - `pnpm lint`
   - `pnpm typecheck`

3. TypeScript strictness:
   - Do not use `any`.
   - Do not leave TypeScript errors or `@ts-ignore` in the code.

4. Hooks:
   - Do not use `React.useState`, `React.useEffect`, etc.
   - Import hooks directly and use `useState`, `useEffect`, etc.

   Correct:

   ```ts
   import { useState } from "react";

   const [count, setCount] = useState(0);
   ```

   Incorrect:

   ```ts
   const [count, setCount] = React.useState(0);
   ```

5. React types:
   - Prefer direct type imports instead of the `React.` namespace.
   - Use type-only imports when possible.

   Correct:

   ```ts
   import type { ChangeEvent } from "react";

   const handleInputChange = (
     event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
   ) => {};
   ```

   Avoid:

   ```ts
   const handleInputChange = (
     event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
   ) => {};
   ```

6. Form submissions:
   - Use **`SubmitEvent`** for form submission handlers.
   - Do not use `FormEvent`.
   - Prefer DOM-native event typing for submit handlers.

   Preferred:

   ```ts
   const handleSubmit = (event: SubmitEvent) => {
     event.preventDefault();
   };
   ```

   If the handler is attached via React `onSubmit`, cast when necessary:

   ```ts
   const handleSubmit = (event: SubmitEvent) => {
     event.preventDefault();
     const submitter = event.submitter;
   };
   ```

   Avoid:

   ```ts
   import type { FormEvent } from "react";
   ```

7. Dialogs and modals — component-driven design:
   - Every dialog and modal must be implemented as a **dedicated component**, not inlined in pages, tables, or layout components.
   - Use a clear naming convention: `dialog-<purpose>.tsx` (e.g. `dialog-lock-device.tsx`, `dialog-delete-device.tsx`) or `modal-<purpose>.tsx` for modal-only flows.
   - Each component should:
     - Accept **controlled props**: `open`, `onOpenChange`, and any entity/callback needed (e.g. `device`, `onConfirm`).
     - Own its **AlertDialog/Dialog/Modal** UI, content, and footer actions.
     - Call `onConfirm` (or equivalent) then `onOpenChange(false)` on confirm so the parent can handle side effects and close state.
   - Parents (pages, data-tables, etc.) should only hold **state** (e.g. `entityToLock: Device | null`) and **render** the dialog component with that state and callbacks.

   Preferred:

   ```ts
   // dialog-lock-device.tsx
   export type DialogLockDeviceProps = {
     open: boolean;
     onOpenChange: (open: boolean) => void;
     device: Device | null;
     onConfirm: (device: Device) => void;
   };
   export default function DialogLockDevice({ open, onOpenChange, device, onConfirm }: DialogLockDeviceProps) { ... }
   ```

   Avoid:

   - Inlining `<AlertDialog>...</AlertDialog>` or `<Dialog>...</Dialog>` inside a page or data-table with large blocks of JSX.

8. Entity IDs as UUID (string):
   - Where an entity identifier is a **UUID** (e.g. device id from backend), use **`string`** in TypeScript, not `number`.
   - Route params, endpoint path helpers, service functions, and entity types should accept/use `id: string` for such entities.
   - Example: `deviceViewPath(id: string)`, `Device.id: string`, `getDeviceById(id: string)`.

9. Generated/modified code quality:
   - Ensure the code compiles.
   - Ensure types are correct before introducing new functions/components.
   - Prefer explicit types for event handlers (e.g., `ChangeEvent`, `SubmitEvent`) over untyped `event`.

10. Commit messages must follow this format:

   ```
   [module] concise message (15–20 words)
   ```

   Allowed modules:
   - `feature`
   - `service`
   - `hotfix`
   - `bug`
   - `chores`
   - `ui`

   Example:

   ```

11. Relationship-based data tables:
    - When a parent entity has related collections (e.g. warehouse → users/devices/inspections, product category → products/checklists), expose **pre-computed count fields** on the parent type for table display.
      - Example: `Warehouse.users_count`, `Warehouse.devices_count`, `Warehouse.inspections_count`.
      - Example: `ProductCategory.products_count`, `ProductCategory.checklists_count`.
    - Render relationship counts as **clickable badges with icons**, not plain numbers:
      - Implement dedicated badge components alongside the feature (e.g. `warehouse-badge.tsx`, `product-category-badge.tsx`).
      - Each badge:
        - Uses `Badge` with `BADGE_ICON_CLASS` and a subtle hover state.
        - Includes an appropriate icon (e.g. `Users`, `Smartphone`, `ClipboardCheck`, `Package`, `ClipboardList`).
        - Wraps the badge in a `Link` that navigates via a **PAGES helper** which carries the parent id as a path or query param.
          - Example: `PAGES.warehouseUsersPath(warehouseId)`, `PAGES.productCategoryProductsPath(categoryId)`, `PAGES.productCategoryChecklistsPath(categoryId)`.
    - Data table columns for relationships:
      - One column per relationship, header named after the entity (e.g. “Users”, “Devices”, “Inspections”, “Products”, “Checklists”).
      - Cell renders the corresponding count badge component, passing the parent id and `count ?? 0`.
      - Keep the **actions** column minimal (e.g. “Delete”, “View details”) and reserve navigation to related collections for the badges.

12. Delete dialogs:
    - Use a **single shared UI layer** for delete confirmations across the app.
      - Component: `dialog-confirm-delete.tsx` exporting `ConfirmDeleteDialog`.
      - Props: `open`, `onOpenChange`, `entityLabel?`, `title?`, `description?`, `confirmLabel?`, `cancelLabel?`, `isLoading?`, `onConfirm`.
    - Pages/tables own the **state** for “what is being deleted” (e.g. `categoryToDelete: ProductCategory | null`) and render `ConfirmDeleteDialog` with:
      - A specific `entityLabel` (“product category”, “warehouse”, “device”, etc.).
      - An optional `description` that can interpolate entity details (name, code, etc.).
      - An `onConfirm` handler that performs the delete (API call or mock) and then clears local state.
    - For **new delete flows**:
      - Do **not** inline `<AlertDialog>`; always use `ConfirmDeleteDialog` as the outer UI.
      - Keep any entity-specific messaging inside the `description` or in the parent component that prepares the props.
    - Existing delete dialogs (e.g. older device delete dialogs) should be gradually refactored to delegate their UI to `ConfirmDeleteDialog` while keeping device-specific copy/behaviour in the calling component.
    - Delete triggers (e.g. `DropdownMenuItem`, buttons, row actions that open the delete flow) must use consistent destructive styling:
      - Labels: `className="text-destructive focus:text-destructive"`
      - Icons: use a `Trash2`-style icon with matching `text-destructive` color
      - This keeps delete UI consistent across all tables/pages.
   [feature] implement user pagination with server-side sorting and filtering for admin users table
   ```
13. Don't use `aria-*` properties or attributes on any generated code.