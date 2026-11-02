# React + TypeScript + Vite

## Supabase setup

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SUPABASE_BUCKET` using the project URL and publishable/anon key. Never put a Supabase secret/service-role key in a `VITE_` variable.
2. Create the first auth user in Supabase Dashboard under **Authentication → Users**.
3. Apply the schema, workspace-user status, vote-count RPC, and private Storage bucket policies:

  ```sh
  npm run supabase:login
  npm run supabase:link
  npm run db:push
  ```

  Linking prompts for the database password. The migrations create profiles, spaces and memberships, articles and versions, comments, feedback, bookmarks, assets, Q&A, taxonomy, integrations, audit/search records, workspace settings, and vector-ready knowledge chunks. They also create a private `knowledge-assets` bucket with space-membership policies.
4. Promote the initial admin profile in the Supabase SQL Editor after the migration:

  ```sql
  update public.profiles
  set role = 'Super Admin'
  where email = 'admin@atlas.com';
  ```

5. Add the same URL and publishable/anon key to Vercel Environment Variables as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, set `VITE_SUPABASE_BUCKET=knowledge-assets`, then redeploy.

6. Deploy the server-side user-management function:

  ```sh
  supabase functions deploy manage-workspace-user
  ```

  The function validates the caller’s Supabase session and Super Admin profile before inviting, updating, suspending/reactivating, or deleting a member. Its service-role key stays in the Edge Function environment and is never sent to the browser. Configure Supabase Auth email delivery and the allowed redirect URL for invitation emails.

The role is read from `public.profiles`. Create the first auth user before applying the migration or afterward; the migration backfills existing users, and the auth trigger creates profiles for future users. People, articles, spaces, Q&A, models, bookmarks, taxonomy, integrations, settings, and search gaps load from Supabase; the app no longer falls back to local demo records. Do not expose the database password or Supabase secret/service-role key to the browser.

### Seed development accounts

After the migration is pushed, copy `.env.seed.example` to `.env.seed.local` and fill in the project URL, server-only secret key, and five unique passwords (at least 14 characters). This file is ignored by Git. Then run:

```sh
npm run seed:users
```

The script creates or updates `admin@atlas.com` as Super Admin, plus Space Admin, Author, Reviewer, and Viewer accounts with corresponding space memberships. It never prints passwords. Rerunning it resets each seeded account to the password currently in `.env.seed.local`.

The optional seed script is for development environments only. Seeded accounts and sample workspace data must not be used as production content.

## Local commands

```sh
npm run dev
npm run build
npm run lint
```

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
