# TAKDA — Antigravity (AI) Instructions

## Project Overview
TAKDA is a personal life operating system — a platform where users design their own
experience using Spaces, Hubs, Modules, Screens, and an AI companion named Aly.
It is not an opinionated productivity app. It is a canvas users build on top of.

## Stack
- **Backend**: FastAPI (Python), LangGraph, Supabase (PostgreSQL + pgvector)
- **Mobile**: React Native (Expo)
- **Web**: Next.js (App Router, TypeScript, Tailwind)
- **AI**: Configurable provider via AI_PROVIDER env var (ollama | openrouter | gemini)
- **Embeddings**: text-embedding-004 (Gemini, free tier) — 768 dimensions
- **Auth**: Supabase Auth
- **Realtime**: Supabase subscriptions

## Core Mental Models

### Spaces → Hubs → Modules
- **Spaces** are life domains (Work, Health, Finance, Personal)
- **Hubs** are projects or focus areas within a Space
- **Modules** are capabilities installed into a Hub (Tasks, Notes, Resources, etc.)
- **Addons** are user-installable data modules (Calorie Counter, Expense Tracker, etc.)
- Modules are not features — they are building blocks the user assembles

### Screens + Widgets
- Screens are user-built dashboards composed of Widgets
- A user's pinned Screen IS their home — there is no fixed HomeScreen layout
- Widgets pull data from any Hub the user owns
- Multiple Screens are supported (work view, health view, etc.)

### Vault
- A universal capture inbox — dump anything fast, sort later
- Aly suggests routing (hub + module) — user confirms before anything moves
- Statuses: unprocessed → suggested → processed | dismissed

### Aly (AI Companion)
- Powered by LangGraph agent pipeline in backend/services/agent_graph/
- Has access to: tasks, events, vault, food logs, expenses, strava, annotations, memories
- Context is loaded in two tiers: base (always) + deep (intent-gated)
- Has wellbeing signals: screen time proxy, vault density, meal gaps, activity gaps
- User can provide a context_bio that personalizes every Aly response
- Aly should feel like a trusted companion, not a corporate assistant

### Module Definitions (Phase 3+)
- Modules are defined by config: schema fields, UI layout, widget type, Aly integration
- module_definitions table stores creator-built module configs
- hub_addons links installed modules to hubs
- The generic entries API handles CRUD for any module schema

## File Structure
takda/
├── backend/
│   ├── main.py                          # FastAPI app, router registration
│   ├── database.py                      # Supabase client
│   ├── routers/                         # One file per domain
│   │   ├── coordinator.py               # Aly chat endpoints
│   │   ├── hubs.py
│   │   ├── spaces.py
│   │   ├── vault.py
│   │   ├── addons.py                    # Addon CRUD + calorie/expense endpoints
│   │   ├── screens.py
│   │   └── ...
│   └── services/
│       ├── agent_graph/
│       │   ├── graph.py                 # LangGraph graph definition
│       │   ├── nodes.py                 # node_load_context, node_classify_intent, node_respond
│       │   ├── state.py                 # AgentState TypedDict
│       │   └── tools.py                 # Aly's callable tools
│       ├── embeddings.py                # text-embedding-004 via Gemini
│       ├── ai.py                        # Provider-agnostic AI calls
│       └── aly_memory.py                # Memory extraction and storage
│
├── mobile/
│   └── src/
│       ├── components/navigation/
│       │   ├── RootNavigator.js         # App entry, session routing
│       │   ├── SidebarNavigator.js      # Drawer nav, space-driven
│       │   ├── CompassNavigator.js      # Hub-level module switcher
│       │   └── BottomNav.js             # 4-tab bottom bar
│       ├── screens/
│       │   ├── home/HomeScreen.js       # Renders user's pinned Screen
│       │   ├── vault/VaultScreen.js
│       │   ├── hubs/
│       │   └── coordinator/ChatTab.js
│       └── services/                    # API service wrappers
│
└── web/
└── src/
├── app/                         # Next.js App Router pages
│   ├── dashboard/               # User's home (renders pinned Screen)
│   ├── spaces/[id]/hub/[hubId]/ # Hub detail
│   ├── screens/[screenId]/      # Screen editor
│   ├── vault/
│   ├── marketplace/
│   └── module-creator/          # Phase 4
└── components/
├── layout/Sidebar.tsx       # Dynamic nav from user pins
├── aly/AlyAssistant.tsx     # Slide-in Aly panel
└── addons/                  # Addon UI components

## Environment Variables
AI Provider
AI_PROVIDER=ollama                  # ollama | openrouter | gemini
OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
FAST_MODEL=qwen2.5:3b
MAIN_MODEL=qwen2.5:7b
OPENROUTER_API_KEY=
GOOGLE_API_KEY=                     # Used for Gemini AI + embeddings
Embeddings
EMBED_PROVIDER=gemini               # gemini | fastembed
Dimensions: gemini=768, fastembed=384
Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

## Key Conventions

### Backend
- Each router owns one domain — never cross-import routers
- Supabase is the only database — no ORM, use supabase-py client directly
- Background tasks for anything slow (embeddings, AI calls that don't need to stream)
- All endpoints return plain dicts or Pydantic models — no custom response wrappers
- node_load_context runs in two stages: base (Tier 1) then deep after intent classify (Tier 2)

### Mobile
- Colors always from `colors` constant — never hardcode hex in components
- Module colors: `colors.modules.aly`, `colors.modules.track`, etc.
- Navigation: drawer for spaces, stack for hub flow, compass for module switching within hub
- Aly sheet is a global overlay — opened via AlySheetContext from anywhere

### Web
- Tailwind only — no custom CSS files
- CSS variables for theme: `var(--modules-aly)`, `var(--color-text-primary)`, etc.
- All pages are server-optional but currently client components (`"use client"`)
- Sidebar nav items come from user's nav_pins — not hardcoded

### Shared
- User ID always comes from Supabase Auth — never passed as a trust-me param in prod
- Timestamps in ISO 8601, timezone-aware, stored as UTC
- PHT (UTC+8) used for display and Aly's date awareness
- Module keys are snake_case strings: `track`, `annotate`, `calorie_counter`

## Database Tables (Key Ones)
users (via Supabase Auth)
user_profiles          — context_bio, nav_pins, home_screen_id, wellbeing_prefs
spaces                 — id, user_id, name, icon, color
hubs                   — id, space_id, user_id, name, icon, color, description
hub_modules            — hub_id, module (string key), is_enabled, order_index
hub_addons             — hub_id, user_id, type, config
tasks                  — hub_id, user_id, title, status, priority, due_date
events                 — user_id, title, start_at, end_at, location
annotations            — hub_id, user_id, content, category, embedding (vector 768)
documents              — hub_id, user_id, title, source_type, raw_content
document_chunks        — document_id, content, chunk_index, embedding (vector 768)
vault_items            — user_id, content, content_type, status, aly_suggestion
food_logs              — hub_id, user_id, food_name, calories, meal_type, logged_at
expenses               — hub_id, user_id, amount, item, merchant, category, date
strava_activities      — user_id, sport_type, distance_meters, moving_time_seconds
coordinator_sessions   — user_id, title
coordinator_messages   — session_id, role, content
aly_memories           — user_id, content, memory_type, last_reinforced, embedding (vector 768)
screens                — user_id, name, position
screen_widgets         — screen_id, type, hub_id, position, config
module_definitions     — (Phase 3) id, creator_id, name, schema, ui_config, widget_config, aly_config, price, status
module_entries         — (Phase 3) module_def_id, hub_id, user_id, data (jsonb)

## Current Development Phase

**Phase 1 — Foundation** (in progress)
- [ ] user_profiles table with context_bio, nav_pins, home_screen_id
- [ ] Inject context_bio into Aly system prompt
- [ ] HomeScreen renders user's pinned Screen (not fixed layout)
- [ ] Dynamic nav from nav_pins
- [ ] Migrate embeddings to text-embedding-004 (768 dims)
- [ ] Split node_load_context into base + deep tiers

**Phase 2 — Aly Upgrade**
- [ ] Wellbeing signals loader
- [ ] Intent-gated context (INTENT_CONTEXT_MAP)
- [ ] Vectorize annotations and memories
- [ ] aly_nudge widget type

**Phase 3 — Module System Refactor**
- [ ] module_definitions table
- [ ] Generic DynamicModuleView component
- [ ] Generic /modules/{def_id}/entries API
- [ ] Migrate calorie_counter + expense_tracker to module definitions

**Phase 4 — Module Creator**
- [ ] /module-creator page (web)
- [ ] Schema field builder
- [ ] Layout picker + live preview
- [ ] Widget config
- [ ] Aly integration setup
- [ ] Private test environment
- [ ] Publish flow

**Phase 5 — Marketplace**
- [ ] module_definitions as marketplace catalog
- [ ] Filters: category, price, rating
- [ ] Module detail page
- [ ] Install/uninstall from marketplace
- [ ] Creator profile pages

**Phase 6 — Creator Economy**
- [ ] Pricing on module_definitions
- [ ] Stripe Connect for creator payouts
- [ ] TAKDA 30% / Creator 70% split
- [ ] Creator dashboard (installs, revenue, ratings)
- [ ] Review queue for paid modules

## Important Warnings

- **Gemini 2.0 Flash is deprecated** — migrate to gemini-2.5-flash before June 1 2026
- **text-embedding-004** uses 768 dims — Supabase vector columns must match exactly
- **FastEmbed (bge-small)** uses 384 dims — incompatible with Gemini embeddings — do not mix
- Vault accept currently only routes to `tasks` table — needs to be fixed to route to all modules
- Sidebar spaces do not refresh on new space creation — needs useFocusEffect reload
- node_load_context currently loads ALL data blindly — causes ~3000 token context bloat per request