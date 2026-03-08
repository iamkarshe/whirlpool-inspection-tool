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
   [feature] implement user pagination with server-side sorting and filtering for admin users table
   ```
