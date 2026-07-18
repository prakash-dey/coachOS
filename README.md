# CoachOS

CoachOS is a private coaching workspace for fitness coaches and nutritionists. Coaches manage their own clients, collect weekly check-ins, review progress, build reusable workout and nutrition plans, and assign those plans directly to clients.

CoachOS is not a marketplace. Clients join only through a coach invitation and can access only their own workspace data.

## Product areas

- Coach onboarding and secure Supabase authentication
- Client records and single-use invitation links
- Weekly check-ins with compressed progress photos and coach feedback
- Coach-wide check-in inbox and progress map
- Workout plan library, day/exercise builder, and assignments
- Nutrition plan library, meals, food alternatives, macros, and assignments
- Dedicated responsive client portal for plans and check-ins
- Isolated six-hour demo workspaces with 20 fictional clients
- PostgreSQL Row Level Security for workspace isolation

## Local development

Requirements: Node.js 24+, npm 11+, Docker, and the Supabase CLI.

```bash
npm install
npx supabase start
npx supabase db reset
npm run dev
```

Copy the local Supabase URL and publishable key into `.env.local`, together with:

```text
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

Never expose or commit the Supabase secret/service-role key.

## Demo mode

Demo mode uses Supabase anonymous authentication and provisions a real,
isolated CoachOS workspace. It renders through the same dashboard, client,
check-in, workout, nutrition, and progress routes as a permanent workspace.
Demo workspaces expire after six hours and are removed by Supabase Cron.

For local development, anonymous authentication is enabled in
`supabase/config.toml`. For the hosted project, enable Anonymous Sign-Ins in
Supabase Authentication settings and configure CAPTCHA or Cloudflare
Turnstile before publishing the demo entry point.

## Verification

```bash
npx supabase db lint --local
npm run lint
npm run build
```

## Git workflow

Create a focused feature branch, commit and push it, open a pull request targeting `main`, merge through GitHub, then delete the merged remote and local branch.
