# AI Development Rules

1. Use `pnpm` for all Node/NPM commands. Never use `npm` or `yarn`.

2. Code must pass:
   - `pnpm lint`
   - `pnpm typecheck`

3. Do not use the `any` type in TypeScript.

4. All generated or modified code must compile without TypeScript errors.

5. Verify TypeScript types before suggesting or implementing any function, method, or component.

6. Commit messages must follow this format:

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
