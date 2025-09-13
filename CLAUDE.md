# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Reddit Devvit application using Phaser for 2D game development. The project consists of:
- **Client**: Phaser-based web game running in a webview
- **Server**: Node.js serverless backend with Redis access
- **Shared**: Common types and utilities

## Essential Commands

### Development
```bash
npm run dev            # Start development server with hot reload (client, server, and devvit)
npm run dev:client     # Start only client dev server
npm run dev:server     # Start only server dev server
npm run dev:devvit     # Start only devvit playtest
```

### Build & Deploy
```bash
npm run build          # Build both client and server
npm run deploy         # Build and upload to Reddit
npm run launch         # Build, deploy, and publish for review
```

### Code Quality
```bash
npm run check          # Run type-check, lint:fix, and prettier
npm run type-check     # TypeScript type checking
npm run lint           # ESLint checking
npm run lint:fix       # ESLint with auto-fix
npm run prettier       # Format code with Prettier
```

## Architecture

### Directory Structure
- `/src/client/` - Full screen webview with Phaser game
  - Built with Vite, outputs to `/dist/client/`
  - Access server APIs via `fetch(/my/api/endpoint)`
  - Entry point: `index.html`

- `/src/server/` - Serverless Node.js backend
  - Built with Vite, outputs to `/dist/server/`
  - Has Redis access via `import { redis } from '@devvit/web/server'`
  - Entry point: `index.ts` (compiles to `index.cjs`)

- `/src/shared/` - Shared code between client and server

### Key Constraints

**Client Limitations:**
- No websockets support (use realtime service for real-time features)
- Web-compatible NPM packages only
- Phaser is the primary game engine

**Server Limitations:**
- Serverless environment (like AWS Lambda)
- No access to: `fs`, `http`, `https`, `net` modules
- Use `fetch` instead of http/https
- Read-only filesystem (no file writes)
- No websockets or HTTP streaming
- No SQLite or stateful in-memory processes
- Redis available for persistence

### Devvit Configuration
Configured in `devvit.json`:
- Post creation menu item for moderators
- Client webview entry: `/dist/client/index.html`
- Server entry: `/dist/server/index.cjs`
- Trigger: `onAppInstall` endpoint

### Game Structure
The Phaser game includes these scenes:
- Boot
- Preloader
- MainMenu
- Game
- GameOver

## Development Workflow

1. Use `npm run dev` for live development
2. Client changes auto-rebuild with Vite watch mode
3. Server changes auto-rebuild with Vite watch mode
4. Access devvit playtest environment for testing
5. Use `npm run check` before committing to ensure code quality