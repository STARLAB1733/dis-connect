# Contributing to DISConnect

Thank you for your interest in contributing to DISConnect.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/STARLAB1733/dis-connect.git
cd dis-connect

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp example.env.local .env.local
# Fill in Firebase keys in .env.local

# Start dev server
npm run dev
```

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<short-description>` | `feature/replay-timeline` |
| Bug fix | `fix/<short-description>` | `fix/leaderboard-query` |
| Content | `content/<short-description>` | `content/arc4-scenarios` |
| Chore | `chore/<short-description>` | `chore/update-deps` |

## Pull Requests

- Branch off `develop`, not `main`
- Keep PRs focused — one feature or fix per PR
- Run `npm run build` and `npm run lint` before opening a PR
- All PRs targeting `main` go via `develop` first

## Adding a Scenario

1. Create `src/scenarios/arc{N}-ch{M}.json` following the schema in `src/types/scenario.ts`
2. Register it in `src/lib/scenarioLoader.ts`
3. Add a chapter illustration SVG to `public/chapters/`
4. Run `npm test` to confirm no schema validation tests break

## Running Tests

```bash
npm test          # Run all 143 tests
npm test -- --watch   # Watch mode
```

## Code Style

- TypeScript strict mode — no `any` unless unavoidable
- Tailwind for all styling — no inline style objects except where required by libraries
- Firebase writes must be awaited — never fire-and-forget
