KALAY — Implementation Guide for TAKDA

## What is Kalay

Global AI companion screen in TAKDA.
Accessible from sidebar bottom, always visible.
Kalay has CRUD access across selected spaces/hubs
and can generate reports/presentations saved to Outputs.

---

## Navigation placement

Sidebar (SidebarNavigator.js) — pinned at bottom:
✦ Ask Kalay → navigates to KalayScreen
Separate from spaces list, always visible.

---

## File structure to create

mobile/src/screens/kalay/
KalayScreen.js ← main screen (tabs: Chat, Outputs)
KalayChatTab.js ← chat UI with action cards
KalayOutputsTab.js ← repository of generated outputs
KalayContextPicker.js ← space/hub selector (header component)

mobile/src/services/
kalay.js ← all API calls

backend/routers/
kalay.py ← FastAPI router

backend/services/
kalay_agent.py ← AI agent logic

---

## Database — run in Supabase

-- Chat history
CREATE TABLE kalay_sessions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
title TEXT,
context_space_ids TEXT[] DEFAULT '{}',
context_hub_ids TEXT[] DEFAULT '{}',
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kalay_messages (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
session_id UUID REFERENCES kalay_sessions(id) ON DELETE CASCADE,
role TEXT NOT NULL, -- user | assistant
content TEXT NOT NULL,
actions JSONB DEFAULT '[]',
created_at TIMESTAMPTZ DEFAULT now()
);

-- Outputs repository
CREATE TABLE kalay_outputs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
session_id UUID REFERENCES kalay_sessions(id),
type TEXT NOT NULL, -- report | presentation | summary | plan
title TEXT NOT NULL,
content TEXT NOT NULL, -- markdown or JSON
space_ids TEXT[] DEFAULT '{}',
hub_ids TEXT[] DEFAULT '{}',
created_at TIMESTAMPTZ DEFAULT now()
);

---

## Backend — backend/routers/kalay.py

Endpoints:
POST /kalay/chat
body: { user_id, session_id?, message, space_ids[], hub_ids[] }
returns: { reply, actions[], session_id }

GET /kalay/sessions/{user_id}
returns: list of sessions with title + date

GET /kalay/sessions/{session_id}/messages
returns: full message history

DELETE /kalay/sessions/{session_id}

GET /kalay/outputs/{user_id}
returns: list of all generated outputs

DELETE /kalay/outputs/{output_id}

---

## Agent logic — backend/services/kalay_agent.py

System prompt (keep short):
"You are Kalay, a personal AI companion inside TAKDA.
You have access to the user's spaces and hubs.
You can create/read/update/delete tasks, read documents,
generate reports, and schedule events.
Always confirm before deleting.
After every action, return a structured action card.
Be concise, warm, and direct."

Action detection — parse AI reply for intents:
create_task → call track router POST /track/
update_task → call track router PATCH /track/{id}
delete_task → call track router DELETE /track/{id}
read_tasks → call track router GET /track/{hub_id}
search_docs → call embeddings search_chunks()
generate_report → save to kalay_outputs
chat_with_docs → call chat_with_documents()

Return format:
{
"reply": "Done! Created your task.",
"actions": [
{
"type": "task_created",
"label": "Finish pitch deck",
"hub": "Projects",
"space": "Work",
"id": "uuid"
}
],
"session_id": "uuid"
}

---

## Mobile — KalayScreen.js structure

Tabs: Chat | Outputs

Header (KalayContextPicker):
Row of space chips — tap to toggle
Long press space chip → show hub picker modal
"All" chip = select everything (default)
Store selected IDs in state, pass to chat calls

KalayChatTab:
Same pattern as KnowledgeChatTab
After AI reply, render action cards below message bubble:
[✓ Task created — Finish pitch deck · Work → Projects] [View]
[✓ Report saved — Q1 Finance Summary] [View in Outputs]
Input bar: multiline, send button in #BA7517 (Kalay color)
Kalay avatar color: #BA7517

KalayOutputsTab:
FlatList of kalay_outputs
Each card: title, type badge, date, space chips, [View] [Delete]
View → opens output as markdown or navigates to file

---

## Kalay color

#BA7517 (amber — same as Automate module)
All Kalay UI accents use this color.
Avatar dot, send button, active chips, action card borders.

---

## Sidebar integration (SidebarNavigator.js)

At bottom of sidebar, above profile:
<TouchableOpacity onPress={() => navigation.navigate('Kalay')}>
<KalayIcon /> ← amber dot or ✦ symbol
<Text>Ask Kalay</Text>
</TouchableOpacity>

Add 'Kalay' screen to the stack in RootNavigator or SidebarNavigator.

---

## service/kalay.js

const API_URL = process.env.EXPO_PUBLIC_API_URL

export const kalayService = {
async chat({ userId, sessionId, message, spaceIds, hubIds }) {
POST /kalay/chat
body: { user_id, session_id, message, space_ids, hub_ids }
},
async getSessions(userId) { GET /kalay/sessions/{userId} },
async getMessages(sessionId) { GET /kalay/sessions/{sessionId}/messages },
async deleteSession(sessionId) { DELETE /kalay/sessions/{sessionId} },
async getOutputs(userId) { GET /kalay/outputs/{userId} },
async deleteOutput(outputId) { DELETE /kalay/outputs/{outputId} },
}

---

## Build order

1. Run Supabase SQL (3 tables)
2. Create backend/routers/kalay.py
3. Create backend/services/kalay_agent.py
4. Register router in main.py: app.include_router(kalay.router)
5. Create mobile/src/services/kalay.js
6. Create KalayContextPicker.js
7. Create KalayChatTab.js
8. Create KalayOutputsTab.js
9. Create KalayScreen.js
10. Add Kalay to SidebarNavigator.js

---

## What already exists (reuse these)

- chat_with_documents() in backend/services/ai.py
- search_chunks() in backend/services/embeddings.py
- trackService pattern → reuse for task CRUD
- KnowledgeChatTab.js → copy pattern for KalayChatTab
- colors.js → Kalay color is colors.modules.automate (#BA7517)
- SpaceIcon, IconPicker → reuse as-is
