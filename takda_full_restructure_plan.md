TAKDA — Full Restructure Plan
==============================

## What Changed

Old structure:
  Home Grid → Space → CompassNavigator (T·A·K·D·A)

New structure:
  Sidebar → Space → Hubs list → Hub → CompassNavigator (T·A·K·D·A)

Terminology changes:
  Old "Space"     → now "Space" (kept, but becomes a sidebar item)
  Old "Sub-space" → now "Hub" (the working area with modules)
  "Focus"         → dropped entirely

---

## New Navigation Flow

App loads
└── Sidebar (persistent, left drawer or bottom tab)
    └── List of Spaces (Health, Finance, Work...)
        └── Tap a Space → HubsScreen
            └── Grid/list of Hubs (Fitness, Nutrition, Sleep...)
                └── Tap a Hub → HubScreen
                    └── CompassNavigator (T·A·K·D·A)

---

## Database Changes

### spaces table (rename + add category)
-- Add category column
ALTER TABLE spaces ADD COLUMN category TEXT DEFAULT 'personal';

-- category values:
-- health, finance, work, education, family,
-- ventures, build, music, create, personal

-- Spaces are now top-level life domains, not working areas.
-- Example rows:
-- { name: "Health", category: "health", icon: "Heartbeat" }
-- { name: "Finance", category: "finance", icon: "CurrencyDollar" }
-- { name: "Work", category: "work", icon: "Briefcase" }

### hubs table (new — replaces old sub-space concept)
CREATE TABLE hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Circle',
  color TEXT DEFAULT '#7F77DD',
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Example rows under Health space:
-- { name: "Fitness", icon: "Barbell", color: "#1D9E75" }
-- { name: "Nutrition", icon: "ForkKnife", color: "#D85A30" }
-- { name: "Sleep", icon: "Moon", color: "#7F77DD" }

### hub_modules table (new — replaces space_modules)
CREATE TABLE hub_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID REFERENCES hubs(id) ON DELETE CASCADE,
  module TEXT NOT NULL,  -- track | annotate | knowledge | deliver | automate
  is_enabled BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0
);

### Update all existing tables to reference hub_id instead of space_id
-- documents, tasks, channels, annotations etc.
-- Add hub_id column, keep space_id for now during migration

ALTER TABLE documents ADD COLUMN hub_id UUID REFERENCES hubs(id);
ALTER TABLE tasks ADD COLUMN hub_id UUID REFERENCES hubs(id);
ALTER TABLE channels ADD COLUMN hub_id UUID REFERENCES hubs(id);
ALTER TABLE annotations ADD COLUMN hub_id UUID REFERENCES hubs(id);

-- Eventually drop space_id from these tables once migration is done.

### Update create_default_spaces trigger
-- Spaces now seed as categories, not working areas
-- Each space gets default hubs seeded as well

CREATE OR REPLACE FUNCTION public.create_default_spaces(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  space_id UUID;
BEGIN
  -- Health
  INSERT INTO spaces (user_id, name, icon, color, category, order_index)
  VALUES (user_uuid, 'Health', 'Heartbeat', '#1D9E75', 'health', 0)
  RETURNING id INTO space_id;
  INSERT INTO hubs (space_id, user_id, name, icon, color, order_index)
  VALUES
    (space_id, user_uuid, 'Fitness', 'Barbell', '#1D9E75', 0),
    (space_id, user_uuid, 'Nutrition', 'ForkKnife', '#D85A30', 1);

  -- Finance
  INSERT INTO spaces (user_id, name, icon, color, category, order_index)
  VALUES (user_uuid, 'Finance', 'CurrencyDollar', '#BA7517', 'finance', 1)
  RETURNING id INTO space_id;
  INSERT INTO hubs (space_id, user_id, name, icon, color, order_index)
  VALUES
    (space_id, user_uuid, 'Budget', 'Wallet', '#BA7517', 0),
    (space_id, user_uuid, 'Investments', 'TrendUp', '#378ADD', 1);

  -- Work
  INSERT INTO spaces (user_id, name, icon, color, category, order_index)
  VALUES (user_uuid, 'Work', 'Briefcase', '#7F77DD', 'work', 2)
  RETURNING id INTO space_id;
  INSERT INTO hubs (space_id, user_id, name, icon, color, order_index)
  VALUES
    (space_id, user_uuid, 'Projects', 'Kanban', '#7F77DD', 0),
    (space_id, user_uuid, 'Meetings', 'Users', '#378ADD', 1);

  -- Education
  INSERT INTO spaces (user_id, name, icon, color, category, order_index)
  VALUES (user_uuid, 'Education', 'BookOpen', '#378ADD', 'education', 3)
  RETURNING id INTO space_id;
  INSERT INTO hubs (space_id, user_id, name, icon, color, order_index)
  VALUES
    (space_id, user_uuid, 'Notes', 'NotePencil', '#378ADD', 0),
    (space_id, user_uuid, 'Exams', 'Exam', '#D85A30', 1);

  -- Family
  INSERT INTO spaces (user_id, name, icon, color, category, order_index)
  VALUES (user_uuid, 'Family', 'House', '#D4537E', 'family', 4)
  RETURNING id INTO space_id;
  INSERT INTO hubs (space_id, user_id, name, icon, color, order_index)
  VALUES
    (space_id, user_uuid, 'Events', 'CalendarBlank', '#D4537E', 0),
    (space_id, user_uuid, 'Birthdays', 'Cake', '#D85A30', 1);

  -- Personal
  INSERT INTO spaces (user_id, name, icon, color, category, order_index)
  VALUES (user_uuid, 'Personal', 'User', '#888780', 'personal', 5)
  RETURNING id INTO space_id;
  INSERT INTO hubs (space_id, user_id, name, icon, color, order_index)
  VALUES
    (space_id, user_uuid, 'Journal', 'BookBookmark', '#888780', 0),
    (space_id, user_uuid, 'Goals', 'Target', '#1D9E75', 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---

## Backend Changes

### New file: backend/routers/hubs.py
Endpoints needed:
  GET    /hubs/{space_id}         → list all hubs in a space
  POST   /hubs/                   → create hub { space_id, user_id, name, icon, color }
  PATCH  /hubs/{hub_id}           → update hub
  DELETE /hubs/{hub_id}           → delete hub
  POST   /hubs/reorder            → reorder hubs { hub_ids: [] }

### Update existing routers
  track.py    → accept hub_id instead of space_id
  knowledge.py → accept hub_id instead of space_id
  spaces.py   → spaces are now just category containers, simplify

### Register in main.py
  from routers.hubs import router as hubs_router
  app.include_router(hubs_router)

---

## Mobile Changes

### New file structure
mobile/src/
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js          (unchanged)
│   │   └── RegisterScreen.js       (unchanged)
│   ├── spaces/
│   │   └── SpacesScreen.js         (NEW — replaces HomeScreen, shows hubs)
│   ├── hubs/
│   │   ├── HubsScreen.js           (NEW — grid of hubs within a space)
│   │   ├── HubScreen.js            (NEW — renamed from SpaceScreen)
│   │   └── CreateHubScreen.js      (NEW — renamed from CreateSpaceScreen)
│   ├── track/                      (update hub_id refs)
│   ├── annotate/
│   ├── knowledge/                  (update hub_id refs)
│   ├── deliver/
│   └── automate/
├── components/
│   ├── navigation/
│   │   ├── RootNavigator.js        (update routes)
│   │   ├── SidebarNavigator.js     (NEW — spaces as sidebar)
│   │   └── CompassNavigator.js     (unchanged)
│   └── common/
│       ├── SpaceIcon.js            (unchanged)
│       └── IconPicker.js           (unchanged)
└── services/
    ├── supabase.js                 (unchanged)
    ├── spaces.js                   (simplify — spaces are just categories now)
    ├── hubs.js                     (NEW — replaces spaces.js logic)
    ├── track.js                    (update hub_id refs)
    └── knowledge.js                (update hub_id refs)

### Navigation structure (new)
RootNavigator
└── SidebarNavigator (drawer)
    ├── Sidebar — list of spaces (icons + names)
    └── Stack per space
        ├── HubsScreen    → shows hubs grid for active space
        ├── CreateHubScreen
        └── HubScreen     → compass navigator scoped to hub

### SidebarNavigator
Use @react-navigation/drawer:
  npm install @react-navigation/drawer
  npm install react-native-gesture-handler react-native-reanimated (already installed)

Drawer content = list of Space icons + names (vertical).
Tap a space → navigates to that space's HubsScreen.
Active space is highlighted with space color.
Bottom of drawer: + Add Space button.

### RootNavigator.js (updated)
import { createDrawerNavigator } from '@react-navigation/drawer'

-- Replace Stack navigator with Drawer navigator for authenticated users
-- Each space becomes a drawer screen
-- Drawer is the sidebar

### SpacesScreen.js → SidebarContent component
Shows list of spaces as sidebar items:
  [SpaceIcon] [Space Name]
  [SpaceIcon] [Space Name]
  ...
  [+] Add space

### HubsScreen.js (new — main screen after selecting a space)
Shows grid of hubs within the active space:
  Header: Space name + category badge + Add Hub button
  Grid: 2-column, each hub is a card with icon, name, color accent
  Tap hub → HubScreen (compass navigator)
  Long press hub → edit / delete options

### HubScreen.js (replaces SpaceScreen.js)
Same as current SpaceScreen but:
  - receives { hub } instead of { space }
  - header shows hub name + parent space name as subtitle
  - CompassNavigator scoped to hub.id

### CreateHubScreen.js (replaces CreateSpaceScreen.js)
Same UI as current CreateSpaceScreen but:
  - Creates a hub under a space
  - Needs space_id passed as param

### services/hubs.js (new)
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

export const hubsService = {
  async getHubs(spaceId) → GET /hubs/{spaceId}
  async createHub({ spaceId, userId, name, icon, color }) → POST /hubs/
  async updateHub(hubId, updates) → PATCH /hubs/{hubId}
  async deleteHub(hubId) → DELETE /hubs/{hubId}
}

### Update KnowledgeScreen, TrackScreen
  Change: spaceId → hubId
  Change: all service calls to pass hub.id instead of space.id

---

## New Screen Designs

### HubsScreen — main screen of each space
Header:
  Space icon (large, 40px) + Space name (20px, weight 500)
  Category badge (e.g. "HEALTH") — small, uppercase, color tinted
  + button top right

Hub cards (2-column grid):
  Each card:
    backgroundColor: colors.background.secondary
    borderRadius: 14
    borderWidth: 0.5
    borderColor: hub.color + '30'
    padding: 16
    Hub icon (SpaceIcon component, size 40)
    Hub name (14px, weight 500)
    Module count or last active (12px, tertiary)

Empty state:
  "No hubs yet"
  "Tap + to create your first hub"

### SidebarContent
Width: 72px (icon only) or 220px (icon + name)
Start collapsed (icon only), expand on tap or gesture.

Each space item:
  SpaceIcon (size 36)
  Space name (13px) — only visible when expanded
  Active state: left border 2px space.color

Bottom:
  + Add space (icon only when collapsed)
  Settings icon

---

## Migration Steps (in order)

1. Run Supabase SQL:
   a. Add category column to spaces
   b. Create hubs table
   c. Create hub_modules table
   d. Add hub_id to documents, tasks, channels, annotations
   e. Update create_default_spaces function
   f. Drop old space_modules table (after migration)

2. Backend:
   a. Create backend/routers/hubs.py
   b. Update track.py to use hub_id
   c. Update knowledge.py to use hub_id
   d. Register hubs router in main.py
   e. Restart Docker

3. Mobile:
   a. Install @react-navigation/drawer
   b. Create SidebarNavigator.js
   c. Update RootNavigator.js
   d. Create HubsScreen.js
   e. Rename SpaceScreen → HubScreen, update props
   f. Rename CreateSpaceScreen → CreateHubScreen
   g. Create services/hubs.js
   h. Update services/spaces.js (simplify)
   i. Update KnowledgeScreen, TrackScreen to use hub.id
   j. Rebuild

4. Test flow:
   Open app → sidebar shows spaces
   → tap Health → see Fitness, Nutrition hubs
   → tap Fitness → compass navigator
   → add a task → confirm hub_id is saved correctly
   → upload a doc → confirm hub_id is saved correctly

---

## What Stays The Same

- CompassNavigator.js — unchanged
- T·A·K·D·A module screens — only hub_id ref update
- colors.js — unchanged
- Auth screens — unchanged
- Design system — unchanged
- All 5 module colors — unchanged
- Phosphor icons — unchanged
- Backend AI/embeddings pipeline — unchanged