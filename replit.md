# Plataforma de Escala

A full-stack internal scheduling platform for a video content production team. Built in Portuguese (PT-BR).

## Architecture

**Monorepo** managed with pnpm workspaces.

- `artifacts/escala` — React + Vite frontend (port via `$PORT`)
- `artifacts/api-server` — Express API server (port 8080, proxied at `/api`)
- `lib/db` — Drizzle ORM schema + PostgreSQL connection
- `lib/api-spec` — OpenAPI 3.0 spec + orval codegen config
- `lib/api-zod` — Zod validators generated from OpenAPI spec
- `lib/api-client-react` — React Query hooks generated from OpenAPI spec
- `lib/object-storage-web` — `useUpload` hook for presigned GCS uploads

## Features

- **Dashboard** — Weekly summary: producer responsible, scheduled days, conflicts, duo breakdown
- **Calendário (Calendar)** — Drag-and-drop monthly calendar; assign duplas to main/side/off roles
- **Escala Semanal** — Weekly schedule view with member details
- **Escala Mensal** — Monthly read-only view with statistics sidebar
- **Duplas** — CRUD for team pairs (color-coded, member selection)
- **Membros** — CRUD for individual team members with roles/contacts/photo upload
- **Produtores** — CRUD for producers + week assignment
- **Relatórios** — Statistics tabs: duo stats, producer stats, change history

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, shadcn/ui, @dnd-kit/core, date-fns, wouter (routing), TanStack Query
- Backend: Express, Fastify-style typed routes, Pino logging, Zod validation
- DB: PostgreSQL via Drizzle ORM
- Codegen: Orval (OpenAPI → React Query hooks + Zod schemas)

## Database Schema

- `members` — team members (name, role, contact, notes, photoUrl)
- `duos` — team pairs with color (name, color, notes)
- `duo_members` — join table
- `producers` — producers (name, contact, notes)
- `schedules` — daily schedule (date, mainDuoId, sideDuoId, offDuoId, notes)
- `producer_weeks` — week-to-producer assignment (weekStart, producerId)
- `change_logs` — audit log for schedule changes

## Key Patterns

- API routes use `formatRow()` to convert Drizzle Date objects → ISO strings before Zod parse
- `buildScheduleWithRelations()` helper joins schedules with duos/members/producerWeeks
- Orval codegen patches `lib/api-zod/src/index.ts` post-generation to avoid duplicate exports
- All UI text in Portuguese (PT-BR)

## Seeded Data

- 6 members (Ana Lima, Bruno Souza, Carla Dias, Diego Mota, Eduarda Costa, Felipe Ramos)
- 3 duplas (A=indigo, B=green, C=amber) each with 2 members
- 2 producers (Mariana Ferreira, Rafael Nunes)
- 30 schedules for April 2026 in 3-day rotation cycle
- 5 producer week assignments for April 2026

## Running

```bash
# API server
pnpm --filter @workspace/api-server run dev

# Frontend
pnpm --filter @workspace/escala run dev

# Codegen (from lib/api-spec)
pnpm --filter @workspace/api-spec run codegen

# DB push
pnpm --filter @workspace/db run push
```
