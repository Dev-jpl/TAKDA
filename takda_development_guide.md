You are continuing development of TAKDA, a personal life OS mobile app.
Keep all design decisions, architecture, and conventions exactly as described below.

---

## WHAT IS TAKDA

TAKDA = Track · Annotate · Knowledge · Deliver · Automate
A personal life operating system. Users create "spaces" (Fitness, Finance, Work, etc),
and each space contains 5 tools (modules): T, A, K, D, A.

The name comes from Tagalog: "takda" = a mark, an item noted in a document.

---

## TECH STACK

| Layer         | Technology                                                  |
| ------------- | ----------------------------------------------------------- |
| Mobile        | React Native + Expo bare workflow                           |
| Backend       | FastAPI + Docker                                            |
| Database      | PostgreSQL via Supabase                                     |
| Vector search | pgvector (1024 dims)                                        |
| Auth          | Supabase Auth                                               |
| AI (dev)      | OpenRouter — meta-llama/llama-3.2-3b-instruct:free          |
| AI (prod)     | anthropic/claude-sonnet-4-5 via OpenRouter                  |
| Embeddings    | Voyage AI — voyage-3                                        |
| Audio         | ElevenLabs API                                              |
| Icons         | Phosphor Icons (phosphor-react-native) — NO emojis anywhere |

---

## FILE STRUCTURE

takda/
├── mobile/
│ ├── src/
│ │ ├── screens/
│ │ │ ├── auth/LoginScreen.js
│ │ │ ├── auth/RegisterScreen.js
│ │ │ ├── home/HomeScreen.js
│ │ │ ├── home/CreateSpaceScreen.js
│ │ │ ├── space/SpaceScreen.js
│ │ │ ├── track/TrackScreen.js (placeholder)
│ │ │ ├── annotate/AnnotateScreen.js (placeholder)
│ │ │ ├── knowledge/
│ │ │ │ ├── KnowledgeScreen.js ✅
│ │ │ │ ├── KnowledgeChatTab.js ✅
│ │ │ │ ├── KnowledgeDocsTab.js ✅
│ │ │ │ └── KnowledgeUploadModal.js ✅
│ │ │ ├── deliver/DeliverScreen.js (placeholder)
│ │ │ └── automate/AutomateScreen.js (placeholder)
│ │ ├── components/
│ │ │ ├── navigation/RootNavigator.js
│ │ │ ├── navigation/CompassNavigator.js
│ │ │ ├── common/SpaceIcon.js
│ │ │ └── common/IconPicker.js
│ │ ├── services/
│ │ │ ├── supabase.js
│ │ │ ├── spaces.js
│ │ │ └── knowledge.js ✅
│ │ └── constants/
│ │ └── colors.js
│ ├── App.js
│ └── babel.config.js
├── backend/
│ ├── routers/
│ │ ├── knowledge.py
│ │ └── spaces.py
│ ├── services/
│ │ ├── ai.py (OpenRouter)
│ │ └── embeddings.py (Voyage AI)
│ ├── main.py
│ ├── database.py
│ ├── requirements.txt
│ ├── Dockerfile
│ └── .env
└── docker-compose.yml

---

## NAVIGATION STRUCTURE

Home screen → grid of space cards
Tap space → SpaceScreen with CompassNavigator inside

CompassNavigator — swipe or tap compass dots:

- K (up) → KnowledgeScreen
- T (left) → TrackScreen
- A (right) → AnnotateScreen
- D (down) → DeliverScreen
- Center holds Automate (long press or dedicated trigger TBD)

---

## DESIGN SYSTEM — STRICT, DO NOT DEVIATE

### Colors (from colors.js)

background: {
primary: '#0A0A0A',
secondary: '#141414',
tertiary: '#1A1A1A',
}
text: {
primary: '#F0F0F0',
secondary: '#A0A0A0',
tertiary: '#606060',
}
border: {
primary: '#2A2A2A',
secondary: '#222222',
}
modules: {
track: '#7F77DD', // purple
annotate: '#1D9E75', // teal
knowledge: '#378ADD', // blue
deliver: '#D85A30', // coral
automate: '#BA7517', // amber
}
status: {
urgent: '#E24B4A',
high: '#EF9F27',
low: '#639922',
success: '#1D9E75',
info: '#378ADD',
}

### Design rules

- Dark theme ONLY. Background is always #0A0A0A.
- Phosphor icons, weight="light" always. NO emojis anywhere in the app.
- Cards: backgroundColor secondary (#141414), borderRadius 12-14,
  borderWidth 0.5, borderColor primary (#2A2A2A)
- Font sizes: titles 15-16px weight 500, body 13-14px weight 400,
  meta/labels 11-12px, letter-spacing 0.5-1 on uppercase labels
- Module accent colors used for: dots, badges, active states, send buttons,
  upload buttons, icon backgrounds (color + '15' or '20' for bg tint)
- Borders on module elements: color + '30' to '60' for subtle borders
- Back button uses ‹ character, fontSize 28, color text.secondary
- Headers: paddingTop 56 (to clear status bar), paddingHorizontal 20
- Tab bars: fontSize 11, fontWeight 600, letterSpacing 1, UPPERCASE labels
- Active tab: module color, with 1.5px underline
- Input fields: backgroundColor tertiary, borderRadius 10 or 20 (pill),
  borderWidth 0.5, borderColor border.primary, padding 14, fontSize 14
- Empty states: centered, title fontSize 15 color text.secondary,
  hint fontSize 13 color text.tertiary

---

## DATABASE SCHEMA (Supabase / PostgreSQL)

Tables:

- profiles (id, full_name, username, avatar_url, created_at)
- spaces (id, user_id, name, icon, color, order_index, created_at)
  → icon is a Phosphor icon name string e.g. "Briefcase"
- space_modules (id, space_id, module, is_enabled, order_index)
- documents (id, space_id, user_id, title, source_type, source_url,
  content, metadata, created_at)
- document_chunks (id, document_id, content, embedding vector(1024),
  chunk_index, metadata)
- notebooks, notebook_documents, flashcards, audio_overviews
- boards, tasks (kanban — todo/in_progress/done, priority, due_date,
  time_estimate, tags, subtasks)
- annotations, note_links
- channels, dispatches
- automations, briefings

Key Supabase functions:

- handle_new_user() trigger → creates profile + default spaces on signup
- create_default_spaces(user_uuid) → seeds 6 spaces:
  Work/Briefcase, Fitness/Barbell, Finance/CurrencyDollar,
  Personal/User, Hobbies/Palette, Learning/BookOpen
- match_chunks(query_embedding, match_threshold, match_count, space_id_filter)
  → RPC for semantic search via pgvector

---

## BACKEND API ROUTES

### /spaces

GET /spaces/{user_id} → list all spaces for user
POST /spaces/ → create space {user_id, name, icon, color}

### /knowledge

GET /knowledge/documents/{space_id} → list docs in space
POST /knowledge/upload → upload PDF (multipart form)
POST /knowledge/upload-url → fetch and process URL
POST /knowledge/chat → chat with docs in space
DELETE /knowledge/documents/{doc_id} → delete document

---

## ENVIRONMENT VARIABLES

backend/.env:
SUPABASE_URL=
SUPABASE_KEY=
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
OPENROUTER_API_KEY=
AI_PROVIDER=openrouter
OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free

mobile/.env:
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=http://localhost:8000

---

## MODULES — FULL DEFINITIONS

### T — Track

Kanban board: columns todo / in_progress / done
Task fields: title, priority (urgent/high/low), due_date, time_estimate, tags, subtasks
Features: AI task generation from documents, drag between columns
Connects to: Knowledge (generate tasks from docs), Automate (deadline sync)

### A — Annotate

NotebookLM-style. Upload PDF/URL/markdown/image/video.
Highlights: yellow=idea, blue=reference, green=action
Features: margin notes, bi-directional links, voice notes,
video URL transcript ingestion, AI chat with citations,
export, progressive summarization

### K — Knowledge ✅ (UI built, backend built)

Global library + space-scoped. AI chat across all docs with citations.
Tabs: Chat, Docs (Search tab placeholder for later)
Features: semantic search, knowledge graph, serendipity feed,
audio overviews (podcast from docs), flashcards with spaced repetition
Upload: PDF via expo-document-picker, URL fetch

### D — Deliver

Dispatch format (not chat). Entry types: Update / Decision / Delivered / Question
Channels per project. Threaded replies only when needed.
Scales: solo → client → team
AI summarizes threads, auto-posts task completions

### A — Automate

Smart calendar scheduling, morning brief + evening recap
Weekly digest, audio overview generation on schedule
Deadline reminders + rescheduling suggestions
AI agent: notify for small actions, ask first for big ones
Flow state protection: silences notifications during hyperfocus

---

## CURRENT STATUS

COMPLETED:

- Auth screens (Login + Register) — dark UI
- Home screen — space grid with Phosphor icons
- CreateSpace screen — icon picker (searchable, 40 icons) + color picker
- SpaceScreen — header + compass navigator
- CompassNavigator — swipe gesture + tap dots, 5 modules
- All 5 module placeholder screens
- Knowledge module — full UI (KnowledgeScreen, ChatTab, DocsTab, UploadModal)
- Knowledge service (knowledgeService) — all API calls
- Backend: FastAPI + Docker running
- Backend knowledge pipeline: upload PDF/URL, chunk, embed, pgvector search, AI chat
- Database schema fully created in Supabase
- Phosphor icons throughout, no emojis

IN PROGRESS / KNOWN ISSUES:

- Profile trigger fix: handle_new_user() must create profile before inserting documents
  Fix: ensure trigger exists on auth.users after insert

NEXT TO BUILD (in order):

1. Fix profile trigger issue (if not already done)
2. Test Knowledge module end-to-end (upload PDF → chat → get cited answer)
3. Build Track module — kanban board UI + backend CRUD
4. Build Annotate module — document viewer + highlight system
5. Build Deliver module — dispatch/channel UI
6. Build Automate module — scheduling + briefings
7. Search tab in Knowledge
8. Audio overviews (ElevenLabs)
9. Flashcards with spaced repetition
10. Onboarding flow

---

## CONVENTIONS

- All new screens receive { space } prop from CompassNavigator
- Services live in mobile/src/services/ — one file per domain
- API calls always use EXPO_PUBLIC_API_URL from env
- On real device use Mac's local IP, not localhost
- Colors always imported from constants/colors.js — never hardcode hex
- Phosphor icon weight is always "light"
- No emojis anywhere — ever
- Module color used consistently: track=#7F77DD, annotate=#1D9E75,
  knowledge=#378ADD, deliver=#D85A30, automate=#BA7517
