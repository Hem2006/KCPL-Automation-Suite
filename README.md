# KCPL Self-Healing Smoke Tests

Playwright smoke test suite for [KCPL Chit Fund Management](https://dev.mykcpl.com/admin/index.html) with Healenium self-healing.

## Quick Start

```bash
npm install
npx playwright install chromium
npm test
```

## Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:smoke` | Run smoke tests only |
| `npm run test:headed` | Run in headed browser |
| `npm run test:debug` | Run with Playwright inspector |
| `npm run report` | Open HTML report |

## Self-Healing with Healenium

Start the Healenium backend (PostgreSQL + Healenium server):

```bash
npm run healenium:up
```

Run tests with healing enabled:

```bash
HEALING_ENABLED=true npm test
```

Stop Healenium:

```bash
npm run healenium:down
```

## Simulate UI Drift

To test self-healing, mutate selectors on the live page:

```bash
npm run simulate-drift
```

Then run tests in a separate terminal. To restore:

```bash
npm run restore-ui
```

## CI

GitHub Actions runs smoke tests nightly at 11 PM UTC. HTML reports are uploaded as artifacts for 30 days.

## Project Structure

```
tests/
  smoke/          Smoke tests (login, navigation)
  pages/          Page object models
  fixtures/       Auth fixture (auto-login)
  healing/        Healenium self-healing layer
scripts/          simulate-drift, restore-ui
.github/workflows CI config
```
