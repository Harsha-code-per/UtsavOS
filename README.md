# UtsavOS

**An AI celebration planner for weddings, birthdays and community events.** Describe the celebration in a sentence, in English, Hindi, Hinglish or eight other Indian languages. Google Gemini drafts the **budget**, **timeline**, **vendor checklist** and **personalized ideas**, and a co-planner refines the plan with you. Nothing changes until you approve it.

**Live app: https://utsav-os-teal.vercel.app** · Built for PromptWars Virtual, Challenge 5: Celebration & Event Planner.

[![CI](https://github.com/Harsha-code-per/UtsavOS/actions/workflows/ci.yml/badge.svg)](https://github.com/Harsha-code-per/UtsavOS/actions/workflows/ci.yml)

## What it does

| Part of the brief      | In UtsavOS                                                                                                    | Code                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Event types            | A two-step brief with traditions per type, or a one-sentence AI quick-fill                                    | [`components/brief`](src/components/brief)                                                        |
| **Budgets**            | Gemini proposes a split; code allocates exact amounts. Log payments, see overruns, ask for a rebalance        | [`budget.ts`](src/lib/domain/budget.ts), [`BudgetPanel.tsx`](src/components/plan/BudgetPanel.tsx) |
| **Timelines**          | Tasks counted back from the event date, a run sheet for the day, and Google Calendar export (`.ics`/links)    | [`timeline.ts`](src/lib/domain/timeline.ts), [`ics.ts`](src/lib/domain/ics.ts)                    |
| **Vendor checklists**  | Each vendor tracked from to-do to booked, with quotes and questions to ask                                    | [`VendorsPanel.tsx`](src/components/plan/VendorsPanel.tsx)                                        |
| **Personalized ideas** | Themes, decor, menus, activities and gifts for the culture, city, vibe and diet, with Google Search grounding | [`IdeasPanel.tsx`](src/components/plan/IdeasPanel.tsx)                                            |
| Planning assistant     | A co-planner that edits the plan through Gemini function calling, one approved change at a time               | [`CoPlanner.tsx`](src/components/plan/CoPlanner.tsx), [`tools.ts`](src/lib/ai/tools.ts)           |

## How Gemini is used

All model calls live in [`src/lib/ai/gemini.ts`](src/lib/ai/gemini.ts), behind four API routes:

- **`/api/plan`**: structured output. The response schema is generated from the same zod schema the app validates with.
- **`/api/brief`**: extracts brief fields from free text in any language ("1.5 lakh" → 150000, "next February" → a date).
- **`/api/chat`**: function calling with seven typed tools (`moveBudget`, `addMilestone`, `setVendorStatus`…).
- **`/api/ideas`**: Google Search grounding with cited sources, falling back to structured ideas when grounding is unavailable.

Requests go through a model chain (Gemini 3.8 Flash, then Flash-Lite) inside a 50-second budget. If both fail, `/api/plan` returns a starter plan from templates that can be redrafted later.

## Design decisions

- **Gemini proposes, code guarantees.** The model returns percentages and lead times. Pure, tested code turns them into amounts that add up exactly and dates that fall before the event. Model output is untrusted: [`sanitizeDraft`](src/lib/domain/plan.ts) keeps valid items, and [`applyChange`](src/lib/domain/plan.ts) re-validates the whole plan after every edit.
- **The person approves every AI edit.** Function calls become typed `PlanChange`s. The server drops any that wouldn't apply, and the rest wait for an Apply click.
- **Local first, synced when signed in.** Plans save on the device instantly. Google sign-in syncs them through Firestore, keeping the newest copy of each.
- **Strict CSP over static HTML.** Pages render per request to carry a fresh script nonce, so production never needs `unsafe-inline`.

## Architecture

```
src/
  app/              pages, and the API routes (each declared through lib/api/route.ts)
  components/       brief wizard, plan dashboard, landing page, auth, brand
  lib/domain/       pure plan logic: schema, budget, timeline, iCal, plan changes, formatting
  lib/ai/           Gemini adapter and model chain, prompts, tools, output guards, offline planner
  lib/api/          route guard (rate limit + validated body), HTTP helpers, cache, browser client
  lib/security/     CSP builder, rate limiter
  lib/store/        local and Firestore persistence
  proxy.ts          per-request CSP nonce
e2e/                Playwright flows, axe audits, security-header checks
rules/              Firestore rules tests on the emulator
```

Layer rules and conventions are in [CONTRIBUTING.md](CONTRIBUTING.md); the threat model is in [SECURITY.md](SECURITY.md).

## Quality checks

Each runs in CI on every push ([`ci.yml`](.github/workflows/ci.yml)).

| Check                        | Command                            | What it enforces                                                            |
| ---------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| Lint                         | `npm run lint`                     | typescript-eslint strict presets, import order, size and complexity budgets |
| Types                        | `npm run typecheck`                | `strict` with `noUncheckedIndexedAccess`                                    |
| Unit and component tests     | `npm run coverage`                 | Vitest and Testing Library; fails below 90% lines or 80% branches           |
| Firestore rules              | `npm run test:rules`               | owner-only access and document shape, on the emulator                       |
| End-to-end and accessibility | `npm run test:e2e`                 | the main flows on desktop and mobile, axe WCAG 2.2 AA on every page and tab |
| Duplication and audit        | `npm run duplication`, `npm audit` | jscpd under 1%, no high-severity production advisories                      |

## Run it locally

```bash
cp .env.example .env.local   # add GEMINI_API_KEY and, optionally, Firebase web config
npm install
npm run dev                  # http://localhost:3000
```

`UTSAV_AI_OFFLINE=1` runs without a Gemini key, using the deterministic planner the end-to-end tests use. Without Firebase config, sign-in is hidden and plans stay on the device. `GEMINI_MODEL` overrides the model chain (comma-separated).

Stack: Next.js 16, React 19, TypeScript, zod 4, `@google/genai`, Firebase (Auth, Firestore), Vitest, Playwright.
