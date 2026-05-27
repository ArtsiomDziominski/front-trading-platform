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
