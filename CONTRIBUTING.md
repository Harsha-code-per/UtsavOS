# Contributing to UtsavOS

## Setup

Use the Node version in [`.nvmrc`](.nvmrc), then:

```bash
npm install
cp .env.example .env.local   # optional: GEMINI_API_KEY and Firebase web config
UTSAV_AI_OFFLINE=1 npm run dev  # works without any keys
```

## Where code goes

| Layer          | Holds                                                                       | May import                 |
| -------------- | --------------------------------------------------------------------------- | -------------------------- |
| `lib/domain`   | Pure plan logic: schema, budget, timeline, iCal, plan changes, formats      | nothing outside `domain`   |
| `lib/ai`       | The `Planner` interface, the Gemini adapter, the offline planner, prompts   | `domain`                   |
| `lib/api`      | HTTP helpers, the shared route guard, the TTL cache, the typed client       | `domain`, `ai`, `security` |
| `lib/store`    | Local and Firestore persistence, framework-free                             | `domain`, `firebase`       |
| `components/*` | UI, one feature folder each; logic lives in `use*.ts` hooks or pure modules | any `lib`                  |
| `app/`         | Routes only: pages compose components, API routes wire `lib` together       | any                        |

Anything Gemini returns is untrusted: validate it with the zod schemas in `lib/domain/schema.ts` before it reaches the plan. Any change to a plan goes through `applyChange`, which re-validates the whole plan.

## Conventions

- **Files:** `PascalCase.tsx` for components, `useThing.ts` for hooks, `kebab-case.ts` for other modules. A CSS module sits beside its component.
- **Tests:** a colocated `*.test.ts(x)` for every module that has logic. Test behaviour through the UI or public functions, with shared fixtures from `src/test/fixtures.ts`.
- **Types:** no `any` and no non-null assertions in application code. Narrow `unknown` with checks or zod rather than casts; the casts left are on freshly parsed JSON, either right before zod validates it or in the browser client reading this app's own API. Prefer discriminated unions and exhaustive `Record` tables over `switch`.
- **Copy:** plain, active, sentence case. Errors say what happened and what to do next.
- **Accessibility:** native elements first, with every input labelled, and errors linked through `aria-describedby`. Every new screen gets an axe check in `e2e/a11y.spec.ts`.

## Before you push

```bash
npm run format:check && npm run lint && npm run typecheck
npm run coverage      # fails below 90% lines, statements and functions, or 80% branches
npm run test:rules    # Firestore rules on the emulator (needs Java 21)
npm run test:e2e      # Playwright on desktop and mobile, with axe audits
```

CI runs the same checks on every push and pull request. Lint enforces the size and complexity budgets in [`eslint.config.mjs`](eslint.config.mjs). If a file outgrows them, split it by responsibility rather than raising the limit.

## Security issues

Please report them privately, as described in [SECURITY.md](SECURITY.md).
