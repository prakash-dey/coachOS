# CoachOS Mobile

The native iOS/Android app for CoachOS, built with Expo + React Native +
Expo Router. Talks to the same Supabase project as the web app (`../app`) —
same auth, same tables, same RLS boundary. See
`/Users/prakashdey/.claude/plans/should-we-build-two-atomic-twilight.md`
for the full Milestone 0 plan this scaffold implements.

## Status: Milestone 0 (foundation)

- Google OAuth + email/password login (`src/app/(auth)/login.tsx`)
- Role-based routing: coach shell vs. client shell, gated on
  `workspace_members.role` (`src/app/_layout.tsx`)
- Coach **Home** and Client **Today** render real Supabase data
- Every other tab is a placeholder screen — see the plan's "Milestone 1+"
  list for what's next

## Get started

1. Copy the env file and fill in the same Supabase project values used by
   the web app's `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` at the repo root):

   ```bash
   cp .env.example .env
   ```

2. Install dependencies (already done if you just cloned):

   ```bash
   npm install
   ```

3. Start the app:

   ```bash
   npx expo start
   ```

   Open it in an iOS simulator, Android emulator, or Expo Go.

4. In the Supabase Dashboard, under Auth → URL Configuration → Redirect
   URLs, make sure `coachos://auth/callback` is registered — required for
   Google sign-in to complete on-device.

## Project layout

- `src/app/` — Expo Router routes. `(auth)` is the signed-out stack,
  `(coach)` and `(client)` are the two role-based tab shells.
- `src/lib/supabase.ts` — Supabase client with AsyncStorage session
  persistence, matching Supabase's documented React Native setup.
- `src/types/database.types.ts` — hand-written DB types (Docker wasn't
  running when this was scaffolded, so `supabase gen types` couldn't run —
  see the comment at the top of that file for the regeneration command,
  and the note on why every type there uses `type` rather than
  `interface`).
- `src/theme/tokens.ts` — colors/radii ported from the web app's
  `app/globals.css` and `app/components/ui/design-system.ts`. Keep both in
  sync.
- `src/hooks/` — TanStack Query hooks; each one that ports a web query
  names the web file it mirrors in a comment.

## Verification

```bash
npx tsc --noEmit        # typecheck
npx expo lint           # lint (run once interactively first to generate an eslint config)
npx expo export --platform ios --output-dir /tmp/coachos-export   # bundle sanity check without a simulator
```
