# UtsavOS

AI celebration planner for weddings, birthdays and community events. One sentence in; budgets, timelines, vendor checklists and personalized ideas out, powered by Google Gemini.

> Work in progress for PromptWars Virtual, Challenge 5.

## Develop

```bash
cp .env.example .env.local   # add your Gemini key and Firebase web config
npm install
npm run dev
```

| Command                              | What it does                                      |
| ------------------------------------ | ------------------------------------------------- |
| `npm run lint` / `npm run typecheck` | ESLint and strict TypeScript                      |
| `npm test` / `npm run coverage`      | Vitest unit and component tests                   |
| `npm run test:e2e`                   | Playwright end-to-end and axe accessibility tests |
