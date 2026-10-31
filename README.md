# Front Trading Platform

Nuxt 4 frontend foundation for a trading platform.

## Stack

- Nuxt 4 with the `app/` directory structure
- Vue 3
- TypeScript strict mode
- Nitro server routes
- Shared types in `shared/`
- Nuxt ESLint module with flat config support

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Project Structure

```text
app/
  assets/       Processed CSS and assets
  composables/  Client/server composables auto-imported by Nuxt
  layouts/      Page layouts
  pages/        File-based routes
server/
  api/          Nitro API endpoints
shared/
  types/        Types shared by app and server code
```

Keep application code in `app/`, backend-facing endpoints in `server/`, and reusable cross-runtime contracts in `shared/`.

## Deployment

Pushing to `main` deploys https://botinex.ru and pushing to `dev` deploys https://dev.botinex.ru through `.github/workflows/deploy.yml`.

The build runs in GitHub Actions with the server's `.env`, then `.output` is sent to the server, where `scripts/ci-deploy.sh` (installed as `/usr/local/bin/ci-deploy`) swaps it in and rolls back if the container doesn't become healthy. Each target has its own SSH key, stored in the `server-prod` and `server-dev` GitHub environments and limited to that script.
