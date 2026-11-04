# Atlas Knowledge Workspace

## Atlas User Guide

Atlas is a shared knowledge workspace. Sign in at `/`, then use the workspace navigation to find articles, spaces, questions, and administration tools. The application stores workspace records in Supabase; it does not use a local demo-data fallback.

### The basic workflow

1. A Super Admin creates spaces and invites people from **People & permissions**.
2. The invitee opens the Supabase invitation email and sets a password. New invitees must finish password setup before entering the workspace.
3. Members create articles in the appropriate space, then request review.
4. Reviewers or admins review content, and authorized users publish it.
5. Members find content through the library, space pages, or search. They can bookmark articles and participate in questions and answers.

### Sign-in and passwords

- `/` is the sign-in page. After signing in, Atlas opens `/dashboard`.
- An invitation does not contain a shared or generated password. Supabase sends the invitee a link to establish their own password.
- On first access, invitees are required to choose a password with at least 12 characters.
- Signed-in users can choose **Change password** from their account menu. They must provide their current password.
- **Forgot password?** sends a recovery link to the user's email.
- Supabase must have email delivery configured, and the app's production URL must be an allowed Auth redirect URL.

### Spaces and membership

A space controls access to articles, questions, and uploaded files. Newly created spaces are workspace-visible: any active signed-in workspace user can read and contribute there. The access migration also opens existing app-created spaces while leaving the built-in seeded spaces unchanged. Other member-only spaces continue to require a `space_members` entry. Anonymous users cannot access either kind of space. Super Admins can manage the workspace.

When inviting someone, choose the specific space they need or **All spaces**. If an action in a member-only space returns a row-level security (RLS) error, confirm the user has membership in that space rather than weakening the RLS policies.

### Articles

- From **Knowledge library**, select **Add knowledge**, then **Write documentation**. Choose a space and a starting format such as Standard article, SOP, FAQ, or Post-mortem.
- The article is created as a Draft. Editing autosaves the Markdown body. **Save version** adds a restorable version to its history.
- **Request review** changes a Draft to Under review. The review queue shows articles awaiting review. Approval publishes an article; published articles can later be archived.
- Article details also include comments, helpful/not-helpful feedback, bookmarks, version comparison, and article metadata.
- Articles belong to a space and have one category. Categories are scoped to a space and are used to organize and filter its articles.

### Categories, tags, and taxonomy

These are different concepts in the current app:

- **Category** is an article's primary filing label inside one space, such as Runbooks or Guides. The same category name may exist in more than one space.
- **Article tags** are labels stored on an article and shown in search. In article details, editors can select an existing shared taxonomy term or add a custom tag, then remove tags individually.
- **Taxonomy & entities** in **Formats & models** is currently a workspace-wide vocabulary list. Add consistent terms for concepts such as product names, systems, or teams. The form trims whitespace, removes a leading `#`, and stores the term in lowercase.
- Super Admins and Space Admins can remove a term with the trash button beside it, then confirm. Removing a term also removes any article-to-term links. Other roles can view the shared list but do not get add/remove controls.

Important: adding a taxonomy term does not automatically attach it to articles or create entity relationships. Editors can explicitly select a shared term in article details to use it as an article tag. Super Admins and Space Admins can add or remove shared taxonomy terms in the hub.

### Files, sources, and AI readiness

- **Upload files & media** stores the file in the private `knowledge-assets` Supabase Storage bucket and writes an asset record in its selected space. The uploader must be a member of that space. Files are limited to 100 MB.
- Newly uploaded assets start with status **Processing**. A background extraction/indexing worker is not configured by this app yet, so do not assume that Processing will automatically become Indexed.
- **Connect source** currently saves a source-connector record. It does not itself configure scheduled GitHub/API synchronization.
- The AI-context panel is informational. Vector embeddings, retrieval, and cited AI answers require a separate search and generation service; they are not currently configured by this app.

### Questions and answers

Use **Questions & answers** to post a question in a space and add answers. Members can vote on questions and answers; a vote is one record per user and can be removed by voting again. Reviewers and admins can verify answers in the interface. Voting and question access are restricted to members of the question's space.

### Roles at a glance

| Role | Typical use |
| --- | --- |
| Super Admin | Manage workspace members, settings, spaces, and content. |
| Space Admin | Manage content and membership permissions for assigned spaces. |
| Author | Create and edit knowledge content in assigned spaces. |
| Reviewer | Work with the review queue and verify answers. |
| Viewer | Read available knowledge and participate in allowed questions. |

Access is also checked by Supabase RLS, not only by which buttons the interface displays. In particular, actions on an article or question require membership in that item's space. If a Reviewer who is not the owner or a Space Admin cannot publish an article, that is an RLS permission limitation to address in the database policy; the UI role alone does not grant database access.

### Administration

- **People & permissions**: invite a member, set their role and space, edit their profile, suspend/reactivate them, or send a password-reset link. Invited members set their own password through the email link.
- **Workspace settings**: set review expectations and workspace defaults. Authentication-provider settings and email delivery are configured in Supabase Auth.
- **Audit trail**: inspect recorded workspace and content events.
- **Formats & models**: manage the taxonomy vocabulary, view uploaded assets and source records, and inspect configured knowledge models.

### Common problems

| Symptom | What to check |
| --- | --- |
| `new row violates row-level security policy` | Confirm the signed-in user is Active. Member-only spaces also require a `space_members` row; newly created workspace-visible spaces do not. |
| Upload says a space is unavailable | Select a space the user belongs to. Confirm the selected space exists in Supabase and the `knowledge-assets` bucket is configured. |
| Invite request cannot reach `manage-workspace-user` | Confirm that Edge Function is deployed to the same Supabase project as `VITE_SUPABASE_URL`. Check its logs and Auth email delivery. |
| A migration or `supabase db push` fails | Read the complete CLI error before retrying. Confirm the CLI is authenticated and linked to the intended project; do not assume the production database has the latest schema. |
| Asset stays at Processing or a source does not sync | These statuses/actions do not include a background indexing or synchronization service yet. |
| Taxonomy term does not appear on an article | Taxonomy is currently a shared vocabulary only; it is not attached to article tags or categories. |

### Direct URLs

The main screens can be opened directly when signed in: `/dashboard`, `/library`, `/models`, `/reviews`, `/questions`, `/spaces`, `/search`, and `/help`. Article details use `/articles/<article-id>`. Admin-only screens include `/people`, `/settings`, and `/audit`. Signed-out users are sent to `/`.

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
  supabase secrets set APP_BASE_URL=https://atlas-kms.vercel.app --project-ref qbgnmsjkehkrhwqlwxah
  supabase config push --remote=qbgnmsjkehkrhwqlwxah
  supabase functions deploy manage-workspace-user
  ```

  The function validates the caller’s Supabase session and Super Admin profile before inviting, updating, suspending/reactivating, or deleting a member. Its service-role key stays in the Edge Function environment and is never sent to the browser. `supabase/config.toml` selects the Atlas-branded invite template at `supabase/templates/invite.html`; `config push` publishes it. Configure Supabase Auth email delivery, set the Auth **Site URL** to `https://atlas-kms.vercel.app`, and allow `https://atlas-kms.vercel.app/set-password` under **Redirect URLs**. Invitation emails use the secure confirmation link and redirect new members back to Atlas to set their password.

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
