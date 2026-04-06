# TAKDA — User-Friendly Enhancement Instructions
# For Claude Code VS Code extension
# Goal: make TAKDA feel like a personal companion, not a system to learn

## What we're fixing
Current problem: users must learn the app before getting value.
Target: user opens app, talks to Aly, gets value in under 60 seconds.

## Design tokens (never hardcode)
colors.js reference:
  background: primary=#0A0A0A secondary=#141414 tertiary=#1A1A1A
  text: primary=#F0F0F0 secondary=#A0A0A0 tertiary=#606060
  border: primary=#2A2A2A
  modules.aly=#BA7517
  modules.track=#7F77DD modules.knowledge=#378ADD
  modules.annotate=#1D9E75 modules.deliver=#D85A30
Icons: phosphor-react-native weight="light" always (Sparkle weight="fill" for Aly)

---

## TASK 1 — Onboarding Flow (new users only)
File: mobile/src/screens/onboarding/OnboardingScreen.js

Trigger: add to RootNavigator — check AsyncStorage key 'onboarding_done'
If not set → show OnboardingScreen before Main
After complete → set 'onboarding_done' = 'true' → navigate to Main

Screen flow (3 steps, swipeable):

Step 1 — Welcome
  Large Sparkle icon (amber, weight fill, size 64)
  Title: "Meet Aly"
  Body: "Your personal companion. Tell her anything.
         She'll remember, organize, and help you
         live better — one conversation at a time."
  CTA: "Let's go →"

Step 2 — Choose your spaces
  Title: "What areas of life matter to you?"
  Subtitle: "Aly will set up your spaces automatically."
  Show grid of selectable cards (min 1 required):
    Health | Finance | Work | Education
    Family | Personal | Music | Build | Create
  Each card: SpaceIcon + label, tap to select (amber border when selected)
  CTA: "Set up my spaces →"
  On next: call POST /spaces/batch to create selected spaces with defaults

Step 3 — Meet Aly
  Title: "Aly is ready"
  Body: "Just talk to her naturally. You can say things like:"
  Show 3 example prompts as tappable chips:
    "Add a task to buy groceries"
    "Log ₱350 I spent on lunch"
    "Remind me about my workout tomorrow"
  CTA: "Start talking to Aly"
  On tap CTA: open AlySheet immediately + set onboarding_done

Backend endpoint needed:
POST /spaces/batch
body: { user_id, space_names: ['Health', 'Finance', 'Work'] }
Creates each space with default icon/color + seeds default hubs per space
Use existing create_default_spaces logic as reference

---

## TASK 2 — Aly as primary interface (AlyButton + AlySheet)
File: mobile/src/components/common/AlyButton.js
File: mobile/src/components/common/AlySheet.js (new)

AlyButton (already exists — enhance it):
- Keep current position: absolute bottom=32 right=20
- Add context awareness: pass currentScreen prop from RootNavigator
- Remove condition {!drawerOpen && <AlyButton />}
  Replace with: <AlyButton currentScreen={activeRouteName} />
  Aly ALWAYS visible, even when drawer open

AlySheet (new — extracted from coordinator):
- Modal, animationType="slide", transparent
- Slides up to 70% of screen height
- Header row:
    Left: amber dot + "Aly"
    Right: context chip showing current screen
      e.g. "In Fitness hub" or "On Home" or "In Vault"
    Color: modules.aly, fontSize 11, borderRadius 8
- Chat area: FlatList of messages (reuse ChatTab MessageBubble)
- Input bar at bottom (same as coordinator)
- On open: send context to Aly automatically
    "User is currently on [screen]. Greet them briefly and ask what they need."
- Suggestion chips on empty state (4 chips):
    "What's on my plate today?"
    "Add a quick task"
    "Log something"
    "How am I doing this week?"

Wire AlySheet to AlyButton onPress.
Pass currentScreen from RootNavigator → AlyButton → AlySheet.

---

## TASK 3 — Home screen as daily companion
File: mobile/src/screens/home/HomeScreen.js (already exists — modify)

Current sections are good. Make these changes:

1. Greeting section — add Aly insight below date:
   Fetch from GET /aly/daily-insight?user_id=
   Show as italic text in amber color below the date
   Example: "You have 3 tasks due today and ₱800 left in your budget."
   If fetch fails or no data: show nothing (don't break)

2. Add "Talk to Aly" card if user has NO pinned hubs yet:
   Shows instead of empty pinned hubs section
   Card: amber border, Sparkle icon, text "Talk to Aly to get started"
   Tap → opens AlySheet with prompt:
     "Help me set up TAKDA for my life"

3. Empty states everywhere must be warm not technical:
   No pinned hubs: "Pin your most-used hubs for quick access"
   No events: "Nothing scheduled. A good day to get ahead."
   No vault items: don't show vault banner

4. Pull to refresh must reload ALL sections simultaneously
   Already using Promise.all — verify it works

Backend endpoint needed:
GET /aly/daily-insight?user_id=
Returns: { insight: "You have 3 tasks due today..." }
Logic: fetch tasks due today + vault count + recent spending
       pass to claude-haiku with prompt:
       "Write one warm sentence summarizing this user's day. Max 15 words."
       Return the sentence.

---

## TASK 4 — Aly tone fix (global)
Touch these files:
  mobile/src/screens/coordinator/ChatTab.js
  mobile/src/components/common/AlySheet.js
  backend/services/coordinator_agent.py
  backend/services/agents/coordinator.py
  backend/config.py

Replace in ALL files:
  "MISSION" → remove or replace with natural language
  "SITREP" → "Daily briefing"
  "mission-critical" → "important"
  "high-fidelity" → remove entirely
  "coordinate" (when used as jargon) → "organize" or "handle"
  "Registry" → "History"
  "Intelligence Archive" → "Chat history"
  "New Registry" → "New chat"
  "Mission Intelligence Session" → "Chat session"
  "Initiate mission coordination" → "What do you need?"
  "Aly Synthesis protocol ready" → "Hi, I'm Aly. What's on your mind?"
  "ABORT" → "Cancel"
  "CONFIRM" → "Yes, do it"
  "SUBMIT AUDIT" → "Submit"
  "NEXT STEP" → "Next"
  "Agent" (when referring to user) → use their actual name

Update Aly's BASE_IDENTITY in backend/services/agents/base.py:
Replace current prompt with:
"""
You are Aly — a warm, sharp personal companion inside TAKDA.
You know the user's tasks, documents, calendar, and spending.
You speak like a trusted friend who gets things done.
Be concise. Be real. Never corporate, never robotic.
If you don't know something, say so briefly.
Never make up data that isn't in the context provided.
"""

Update suggestion chips in ChatTab.js WelcomeView:
Replace military suggestions with:
  { label: 'My day', prompt: 'What does my day look like?' }
  { label: 'Add task', prompt: 'I need to add a task' }
  { label: 'Daily briefing', prompt: 'Give me a quick briefing on my week' }
  { label: 'Log something', prompt: 'I want to log something' }
  { label: 'I need help', prompt: 'Help me figure out what to focus on' }
  { label: 'Quiz me', prompt: 'Create a quiz from my notes' }

---

## TASK 5 — Spaces screen — feel like a home not a directory
File: mobile/src/screens/spaces/SpacesScreen.js

Current: likely shows a list or grid of spaces.
Make these changes:

Header:
  "Your spaces" (16px, weight 500)
  Subtitle: "Tap a space to see your hubs" (13px, tertiary)
  No hamburger menu needed here — keep it clean

Space cards (already 2-column grid — keep):
  Add subtitle below space name showing hub count:
    "3 hubs" in tertiary color, 11px
  Add long-press to edit space (name, icon, color)

Empty state (no spaces):
  Don't show empty grid
  Show centered card with Sparkle icon:
    "Aly can set up your spaces"
    "Tell her what areas of life you want to organize"
    [Talk to Aly] button → opens AlySheet with
      "Help me create my spaces in TAKDA"

---

## TASK 6 — Hub screen — compass labels for new users
File: mobile/src/components/navigation/CompassNavigator.js

Add a "first visit" hint for new hub visitors.
Check AsyncStorage key 'compass_hint_shown'
If not set → show one-time tooltip over compass for 3 seconds:
  Small card above compass:
  "Swipe or tap to switch between tools"
  After 3 seconds → fade out → set 'compass_hint_shown' = 'true'

Also update compass dot labels to be more human on long-press:
Long press any dot → show label tooltip:
  T → "Tasks"
  A → "Notes"  
  K → "Knowledge"
  D → "Updates"
  A → "Automate"
Use a simple absolute-positioned View, auto-hide after 1.5s

---

## TASK 7 — Aly memory extraction (backend)
File: backend/services/aly_memory.py (new)
File: backend/routers/coordinator.py (modify stream_generator)

Create aly_memory.py:

MEMORY_EXTRACT_PROMPT = """
Read this conversation and extract facts about the user.
Return JSON array. Each item: { type, content, confidence }
Types: preference | pattern | goal | fact
Only extract genuinely useful things to remember.
Be specific. Max 5 memories per conversation.
Example: {"type":"preference","content":"prefers morning workouts","confidence":0.9}
Return [] if nothing worth remembering.
"""

async def extract_and_store_memories(user_id: str, conversation: list):
    history = "\n".join([f"{m['role']}: {m['content'][:200]}" for m in conversation[-6:]])
    response = await get_ai_response_async(MEMORY_EXTRACT_PROMPT, history)
    try:
        memories = json.loads(response)
        for mem in memories[:5]:
            supabase.table("aly_memory").upsert({
                "user_id": user_id,
                "memory_type": mem.get("type", "fact"),
                "content": mem.get("content", ""),
                "confidence": mem.get("confidence", 0.7),
                "last_reinforced": "now()",
            }, on_conflict="user_id,content").execute()
    except:
        pass  # Silent fail — memory is enhancement not core

In coordinator.py stream_generator, after persisting assistant message:
  background_tasks.add_task(
      extract_and_store_memories,
      body.user_id,
      conversation_history + [{"role": "assistant", "content": clean_reply}]
  )

Supabase table (run if not exists):
CREATE TABLE IF NOT EXISTS aly_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  memory_type TEXT, -- preference|pattern|goal|fact
  content TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.7,
  last_reinforced TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, content)
);

Include memories in Aly's context:
In process_coordinator_chat_stream, fetch memories:
  memories = supabase.table("aly_memory")
    .select("content, memory_type")
    .eq("user_id", user_id)
    .order("last_reinforced", desc=True)
    .limit(8)
    .execute()
  
  memory_text = "\n".join([f"- {m['content']}" for m in (memories.data or [])])

Add to system prompt:
  f"What you know about this user:\n{memory_text}" if memory_text else ""

---

## TASK 8 — Daily insight endpoint (backend)
File: backend/routers/aly.py (new or add to existing)

GET /aly/daily-insight?user_id=

Logic:
  1. Fetch tasks due today (status != done, due_date = today)
  2. Fetch vault_items count where status = unprocessed
  3. Fetch today's expenses total
  4. Build context string
  5. Call claude-haiku:
     "Write one warm, specific sentence (max 15 words) 
      summarizing this person's day based on:
      Tasks due: {count}
      Vault items to sort: {vault_count}  
      Spent today: {amount}
      Be encouraging not alarming."
  6. Return { insight: "..." }

Register in main.py:
  from routers.aly import router as aly_router
  app.include_router(aly_router)

---

## Execution order
1. TASK 4 — tone fix (touches everything, do first)
2. TASK 7 — memory table + extraction (backend, quick)
3. TASK 8 — daily insight endpoint (backend, quick)
4. TASK 1 — onboarding flow (new file)
5. TASK 2 — AlySheet + AlyButton enhancement
6. TASK 3 — HomeScreen changes
7. TASK 5 — SpacesScreen empty state
8. TASK 6 — compass hint

## Conventions (never break)
- No emojis in code — Phosphor icons only
- No hardcoded colors — always colors.js
- Max font weight: 500
- borderWidth always 0.5
- SafeAreaView edges={['top']} on all screens
- Phosphor weight="light" (Sparkle = "fill")
- AsyncStorage for local state (onboarding, hints, pinned)
- supabase.auth.getUser() not getSession()
- Silent fail on non-critical features (memory, insights)
  use try/catch and console.warn, never crash the app