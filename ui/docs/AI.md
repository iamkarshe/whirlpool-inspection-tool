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
   - For React `<form onSubmit={...}>`, type the handler event as `FormEvent<HTMLFormElement>`.
   - If you need the native submit details (e.g., the clicked submit button), read `event.nativeEvent` as `SubmitEvent`.

   Preferred:

   ```ts
   import type { FormEvent } from "react";

   const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
     event.preventDefault();
   };
   ```

   When you need the native submitter:

   ```ts
   import type { FormEvent } from "react";

   const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
     event.preventDefault();

     const native = event.nativeEvent as SubmitEvent;
     const submitter = native.submitter;
   };
   ```

   Do not type React `onSubmit` as DOM `SubmitEvent`.

7. Generated/modified code quality:
   - Ensure the code compiles.
   - Ensure types are correct before introducing new functions/components.
   - Prefer explicit types for event handlers (e.g., `ChangeEvent`, `FormEvent`) over untyped `event`.

8. Commit messages must follow this format:

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
