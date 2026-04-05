# TAKDA — Mobile App Rebuild Instructions

## Context
React Native + Expo bare workflow. Dark theme. Filipino personal life OS.
Backend: FastAPI + Docker at localhost:8000
Database: Supabase + PostgreSQL
Icons: phosphor-react-native (weight="light" always)
Assistant name: Aly (color: #BA7517)

## Design tokens (never hardcode, always use colors.js)
background: primary=#0A0A0A secondary=#141414 tertiary=#1A1A1A
text: primary=#F0F0F0 secondary=#A0A0A0 tertiary=#606060
border: primary=#2A2A2A
modules: track=#7F77DD annotate=#1D9E75 knowledge=#378ADD
         deliver=#D85A30 automate=#BA7517 aly=#BA7517
status: urgent=#E24B4A high=#EF9F27 low=#639922

## Navigation architecture (final, do not deviate)

FLOATING (all screens):
- Aly button: bottom-right, #BA7517, opens half-sheet chat

SIDEBAR (drawer, swipe-right):
- Header: "TAKDA" brand
- Home | Calendar | Vault [badge] | Ask Aly
- Pinned hubs (max 5, long-press hub to pin)
- Settings | Profile
- NO spaces list (spaces has its own bottom nav tab)

BOTTOM NAV (visible outside hubs only):
- Home | Quick Tools | Spaces
- Hides when entering a hub (animated slide down)
- Compass appears when bottom nav hides (animated slide up)

COMPASS (inside hubs only):
- T=Track A=Annotate K=Knowledge D=Deliver A=Automate
- Tap dots or swipe to navigate modules
- Aly floating button stays visible

## Task 1 — Bottom Navigation Bar
File: mobile/src/components/navigation/BottomNav.js

Requirements:
- 3 tabs: Home, Quick Tools, Spaces
- Active tab uses module color accent
- Use Phosphor icons: House, Wrench, SquaresFour
- Animated show/hide (slide + fade, 200ms)
- Controlled by prop: visible={true|false}
- Pass to RootNavigator, hide when route is HubScreen

## Task 2 — Home Screen Redesign
File: mobile/src/screens/home/HomeScreen.js

Sections (in order):
1. Greeting — "Good morning [name]" + date
2. Vault summary — if items > 0: "📥 X items need sorting" → tap opens Vault
3. Daily brief card — tasks due today, upcoming events, Aly nudge
4. Pinned hubs row — horizontal scroll, tappable, goes to HubScreen
5. Recent activity — last 5 actions across all hubs

Data sources:
- supabase.auth.getUser() for name
- GET /track/{hub_id} for tasks (fetch across all hubs)
- Vault: SELECT * FROM vault_items WHERE status='unprocessed'
- Events: GET /calendar/events?date=today

Keep it simple. No charts. Text + cards only.

## Task 3 — Vault Screen + Capture
Files:
- mobile/src/screens/vault/VaultScreen.js
- mobile/src/screens/vault/VaultCaptureSheet.js
- mobile/src/services/vault.js

VaultCaptureSheet (bottom sheet):
- Opens from Quick Tools "Dump to Vault" or anywhere
- Text input (autofocus)
- Icons: camera, mic, link
- Submit → POST /vault/ → close sheet
- Max 3 taps from any screen

VaultScreen:
- Tabs: Unprocessed | Suggested | All
- Each item shows: content preview, type icon, time ago
- Suggested items show Aly's recommendation + [Accept] [Dismiss]
- Empty state: "Drop anything here. Aly will help sort it."

vault.js service:
- getItems(userId, status) → GET /vault/{userId}?status=
- createItem(userId, content, type) → POST /vault/
- acceptSuggestion(itemId, hubId, module) → PATCH /vault/{itemId}/accept
- dismissSuggestion(itemId) → PATCH /vault/{itemId}/dismiss

## Task 4 — Sidebar Rebuild
File: mobile/src/components/navigation/SidebarNavigator.js

Sidebar content (top to bottom):
- Brand: "TAKDA" (14px, letterSpacing 4, tertiary color)
- Nav items: Home | Calendar | Vault [badge] | Ask Aly
- Divider
- "PINNED" label (11px uppercase)
- Pinned hubs list (from AsyncStorage key 'pinned_hubs')
- Spacer flex:1
- Settings | Profile (bottom)

Pinned hubs:
- Load from AsyncStorage: JSON array of hub objects
- Each item: SpaceIcon + hub name + space name (small)
- Tap → navigate to HubScreen with hub + space params
- No spaces list (removed)

## Task 5 — Aly Floating Button
File: mobile/src/components/common/AlyButton.js

Specs:
- Position: absolute, bottom=32, right=20
- Size: 52x52, borderRadius 26
- Background: #BA7517
- Icon: Sparkle from phosphor, weight="fill", white
- Breathing animation: opacity 0.85→1.0, 2s loop
- Proactive badge: small white dot top-right when Aly has suggestion
- Tap → AlySheet slides up (half screen)
- Always rendered in App.js above everything except modals

AlySheet:
- Context header: current screen name
- Chat interface (reuse coordinator ChatTab pattern)
- Input bar at bottom

## Task 6 — Quick Tools Drawer
File: mobile/src/screens/quicktools/QuickToolsDrawer.js

Bottom drawer (not a screen):
- Opens from bottom nav "Quick Tools" tab
- Shows user-configured tools (from AsyncStorage 'quick_tools')
- First item always: "📥 Dump to Vault" (cannot be removed)
- Max 6 tools visible
- Each tool: icon + label → opens inline form sheet
- [Edit] button top-right → opens QuickToolsSettings

Tool forms (inline sheets, not screens):
- Log expense: amount + merchant + category → POST /expenses/
- Log calories: food name + amount → POST /food-logs/
- Quick note: text → POST /vault/ with type='text'
- Add task: title + priority → POST /track/ (ask which hub)

QuickToolsSettings:
- List all available tools from user's spaces
- Toggle on/off
- Drag to reorder

## Task 7 — Hub Transition Animation
File: mobile/src/components/navigation/CompassNavigator.js
File: mobile/src/screens/hubs/HubScreen.js

When entering HubScreen:
- BottomNav: opacity 0→ animated slide down (200ms)
- Compass: slide up from bottom (200ms, 50ms delay)
- Aly button: stays in place, no animation

When leaving HubScreen (back):
- Compass: slide down (200ms)
- BottomNav: slide up (200ms, 50ms delay)

Use Animated.timing or reanimated withTiming.
Pass hideBottomNav callback from RootNavigator via context or prop.

## Task 8 — Calendar Sidebar Entry
File: mobile/src/screens/calendar/CalendarScreen.js

Already exists — just ensure:
- Accessible from sidebar "Calendar" nav item
- Shows week view by default
- Events color-coded by space color
- Tasks with due dates appear as all-day items
- Tap event → detail sheet

## Bug fixes to apply alongside all tasks

1. TrackScreen — pass userId directly to loadTasks, don't wait for state:
   supabase.auth.getUser().then(({data:{user}}) => {
     if (user) loadTasks(user.id) // pass directly
   })

2. KnowledgeScreen — same pattern, pass userId to loadDocs directly

3. SidebarNavigator — spaces list removed (Task 4 handles this)

4. HomeScreen recent hub nav — fetch full space object before navigating:
   const spaces = await spacesService.getSpaces(user.id)
   const space = spaces.find(s => s.id === hub.space_id)
   navigation.navigate('Main', { screen: space.id, params: { screen: 'Hub', params: { hub, space }}})

## Database tables needed (run in Supabase if not exists)

-- Vault
CREATE TABLE IF NOT EXISTS vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  content_type TEXT DEFAULT 'text', -- text|voice|photo|link|file|task
  raw_url TEXT,
  transcription TEXT,
  status TEXT DEFAULT 'unprocessed', -- unprocessed|suggested|organized|dismissed
  aly_suggestion JSONB,
  suggested_space_id UUID REFERENCES spaces(id),
  suggested_hub_id UUID REFERENCES hubs(id),
  suggested_module TEXT,
  organized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES hubs(id),
  merchant TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'PHP',
  category TEXT,
  items JSONB DEFAULT '[]',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Food logs
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES hubs(id),
  food_name TEXT,
  calories DECIMAL(8,2),
  protein_g DECIMAL(8,2),
  carbs_g DECIMAL(8,2),
  fat_g DECIMAL(8,2),
  meal_type TEXT, -- breakfast|lunch|dinner|snack
  logged_at TIMESTAMPTZ DEFAULT now()
);

## Backend endpoints needed

POST   /vault/                    create vault item
GET    /vault/{user_id}           list items (query: status)
PATCH  /vault/{item_id}/accept    accept Aly suggestion
PATCH  /vault/{item_id}/dismiss   dismiss suggestion
POST   /vault/{item_id}/process   trigger Aly to analyze item

POST   /expenses/                 log expense
GET    /expenses/{user_id}        list expenses (query: hub_id, date)

POST   /food-logs/                log food
GET    /food-logs/{user_id}       list logs (query: date)

## Order of execution for Claude Code

1. Run Supabase SQL (vault_items, expenses, food_logs)
2. Task 8 — Calendar sidebar (quick, already exists)
3. Task 5 — Aly floating button (needed by everything)
4. Task 4 — Sidebar rebuild (foundation)
5. Task 1 — Bottom nav (foundation)
6. Task 7 — Hub transition animation (connects nav layers)
7. Task 2 — Home screen redesign
8. Task 3 — Vault screen + capture
9. Task 6 — Quick tools drawer
10. Apply bug fixes throughout

## Conventions (never break these)
- No emojis in code — use Phosphor icons only
- No hardcoded colors — always colors.js
- No bold (600+) font weights — max 500
- borderRadius: cards=12-14, buttons=8-10, pills=20
- borderWidth always 0.5
- All screens need SafeAreaView edges={['top']}
- Phosphor icons weight="light" always (except Aly=fill)
- AsyncStorage for local preferences (pinned hubs, quick tools)
- supabase.auth.getUser() not getSession() for user data