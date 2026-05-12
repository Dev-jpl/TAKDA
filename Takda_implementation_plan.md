# TAKDA — Comprehensive Implementation Plan

> **Last updated:** May 2026  
> **Stack:** FastAPI (Python 3.11) · React Native / Expo ~54 · Next.js 16 · Supabase · LangGraph  
> **AI Provider:** OpenRouter → `anthropic/claude-sonnet-4-6` (main) · Gemini (embeddings)

---

## 0. Critical Pre-Work (Do Before Anything Else)

These are blocking issues that affect multiple phases. Resolve them first.

### 0.1 Migrate AI Model — Deadline: June 1 2026

Gemini 2.0 Flash is deprecated. Every reference must be swapped.

**Files to change:**
- `backend/services/agent_graph/nodes.py` — `get_main_model()` and `get_fast_model()`
- `backend/services/ai.py` — any hardcoded model string
- `backend/.env` — `MAIN_MODEL` / `FAST_MODEL` env vars

```python
# backend/services/agent_graph/nodes.py
# BEFORE
model = "google/gemini-2.0-flash"

# AFTER
model = "anthropic/claude-sonnet-4-6"   # main
model = "meta-llama/llama-3.1-8b-instruct:free"  # fast (already correct)
```

**Verify:** Hit the `/coordinator/chat` endpoint and confirm responses stream correctly.

---

### 0.2 Unify Embeddings to 768d (Gemini text-embedding-004)

FastEmbed (384d) and Gemini (768d) must not coexist in the same Supabase vector columns. The migration SQL (`schema_v13_phase1.sql`) already drops and recreates columns at 768d — but the Python embedding call path must be audited.

**Check `backend/services/embeddings.py`:**

```python
# Ensure EMBED_PROVIDER=gemini in .env
# Ensure embed_text() always returns 768-dim vectors
# Remove any FastEmbed import or fallback path
```

**Run migration if not already applied:**
```sql
-- Already in backend/migrations/schema_v13_phase1.sql
-- Verify columns:
SELECT column_name, udt_name 
FROM information_schema.columns 
WHERE table_name IN ('annotations','document_chunks','aly_memories')
  AND column_name = 'embedding';
-- Expected: vector(768) for all three
```

**Re-embed existing data** after migration:
```python
# backend/scripts/reembed_all.py  (create this script)
# Fetch all annotations / memories with NULL embedding
# Call embed_text(content) for each
# Update embedding column in Supabase
```

---

### 0.3 Fix Sidebar Spaces Refresh (Mobile)

**File:** `mobile/src/components/navigation/SidebarNavigator.js`

```js
// ADD this import
import { useFocusEffect } from '@react-navigation/native';

// REPLACE the useEffect that loads spaces:
useFocusEffect(
  React.useCallback(() => {
    loadSpaces();
  }, [])
);
```

---

### 0.4 Fix Vault Accept Routing

**File:** `backend/routers/vault.py` (or wherever vault accept is handled)

The accept action currently inserts into `tasks`. It must route based on the vault item type or a user-selected target module.

```python
# Current (wrong):
supabase.table("tasks").insert({ ... }).execute()

# Fixed — check item type and route accordingly:
if item_type == "task":
    supabase.table("tasks").insert({ ... }).execute()
elif item_type in ["food", "calorie"]:
    # route to module_entries for calorie_counter def
    supabase.table("module_entries").insert({ "module_def_id": CALORIE_DEF_ID, ... }).execute()
elif item_type in ["expense"]:
    supabase.table("module_entries").insert({ "module_def_id": EXPENSE_DEF_ID, ... }).execute()
else:
    # default: create annotation
    supabase.table("annotations").insert({ ... }).execute()
```

Store global module def IDs in `config.py` or fetch by slug on startup.

---

## Phase 1 — Foundation

**Goal:** User profiles drive the experience. The home screen is personal. The AI knows who it's talking to.

### 1.1 `user_profiles` — Wire context_bio into Aly

The `context_bio` field is fetched in `node_load_context` but never injected into the system prompt.

**File:** `backend/services/agent_graph/nodes.py`

Find the section that builds `AGENT_SYSTEM` and add the bio:

```python
# node_load_context already fetches:
# context_bio = raw.get("context_bio", "") or ""

# In node_respond, find the system prompt builder:
bio_section = f"\nAbout the user:\n{context_bio}\n" if context_bio else ""

AGENT_SYSTEM = f"""You are {assistant_name}, a personal AI operating system...
{bio_section}
...(rest of prompt)
"""
```

The variable `bio_section` is already referenced in the prompt template — confirm it is populated and not always empty.

---

### 1.2 Dynamic nav from `nav_pins`

**Web — `web/src/components/layout/Sidebar.tsx`:**

```typescript
// Load nav_pins from user_profiles on mount
const { data: profile } = await supabase
  .from('user_profiles')
  .select('nav_pins, home_screen_id')
  .eq('id', userId)
  .single();

// nav_pins shape: [{ type: 'space'|'hub'|'screen', id: string, label: string }]
// Render pinned items in the sidebar nav order
```

**Mobile — `mobile/src/components/navigation/SidebarNavigator.js`:**

```js
// Same pattern: fetch nav_pins from user_profiles
// Render pinned spaces/hubs at top of drawer
// Store in AsyncStorage for offline fallback
```

---

### 1.3 HomeScreen renders user's pinned Screen

**Web — `web/src/app/dashboard/page.tsx`:**

```typescript
// CURRENT: fixed widget grid
// TARGET: load home_screen_id from user_profiles, redirect to /screens/[home_screen_id]
// If no home_screen_id, show onboarding prompt to pick or create a screen

const profile = await getUserProfile(userId);
if (profile?.home_screen_id) {
  redirect(`/screens/${profile.home_screen_id}`);
} else {
  // Show "Set up your home screen" CTA
}
```

**Mobile — `mobile/src/screens/home/HomeScreen.js`:**

```js
// Same: fetch home_screen_id, render that Screen's widgets
// Fallback: show dashboard intro if none set
```

---

### 1.4 Split `node_load_context` into Tier 1 + Tier 2

**File:** `backend/services/agent_graph/nodes.py`

The current node loads all data regardless of intent. This causes ~3000 token bloat per request.

```python
INTENT_CONTEXT_MAP = {
    "CHAT":     ["memories", "annotations", "knowledge", "strava"],
    "BRIEFING": ["memories", "annotations", "knowledge", "strava"],
    "KNOWLEDGE":["annotations", "knowledge"],
    "TASK":     ["annotations"],
}

async def node_load_context(state: AgentState) -> AgentState:
    intent = state.get("intent", "CHAT")
    needed = INTENT_CONTEXT_MAP.get(intent, ["memories"])

    # TIER 1 — always load (fast, small):
    # - user profile + assistant_name
    # - wellbeing signals
    # - tasks (active only, limit 20)
    # - hubs + spaces

    # TIER 2 — load only if in needed list:
    if "memories" in needed:
        # load aly_memories (limit 8, recency-ordered)
        pass
    if "annotations" in needed:
        # load recent annotations (limit 10)
        pass
    if "knowledge" in needed:
        # load document titles (no content, just metadata)
        pass
    if "strava" in needed:
        # load last 5 strava activities
        pass
    
    return {**state, "tasks": tasks, "hubs": hubs, ...}
```

**Expected result:** TASK intents drop from ~3000 tokens to ~800 tokens of context.

---

## Phase 2 — Aly Intelligence Upgrade

**Goal:** Aly gives semantic, proactive, personalized responses.

### 2.1 Wire Intent-Gated Context (complete the loop)

The `INTENT_CONTEXT_MAP` is defined but classification happens before context loading. Fix the graph order:

**File:** `backend/services/agent_graph/graph.py`

```python
# CURRENT graph order:
# classify_intent → load_context → respond

# This is correct — intent is classified first, then context loads based on intent
# The fix is inside node_load_context (see 1.4 above)
# Verify graph entry point is still "classify_intent"
graph.set_entry_point("classify_intent")
graph.add_edge("classify_intent", "load_context")
```

---

### 2.2 Vectorize Annotations on Save

**File:** `backend/routers/annotate.py` — in the create annotation endpoint:

```python
from services.embeddings import embed_text
from fastapi import BackgroundTasks

@router.post("/annotations")
async def create_annotation(body: AnnotationBody, background_tasks: BackgroundTasks):
    result = supabase.table("annotations").insert({ ... }).execute()
    annotation_id = result.data[0]["id"]
    content = body.content
    
    # Embed in background — don't block the response
    background_tasks.add_task(embed_annotation, annotation_id, content)
    return result.data[0]

async def embed_annotation(annotation_id: str, content: str):
    try:
        embedding = embed_text(content)
        supabase.table("annotations").update({"embedding": embedding}).eq("id", annotation_id).execute()
    except Exception as e:
        print(f"[embed_annotation] error: {e}")
```

---

### 2.3 Semantic Memory Retrieval

**File:** `backend/services/aly_memory.py`

Replace recency-only retrieval with semantic search when query embedding is available:

```python
def get_memory_context(user_id: str, query: str = "") -> str:
    if query:
        try:
            from services.embeddings import embed_text
            q_embedding = embed_text(query)
            res = supabase.rpc("match_memories", {
                "query_embedding": q_embedding,
                "match_count": 8,
                "target_user_id": user_id
            }).execute()
            memories = res.data or []
        except Exception:
            memories = _fallback_recency_memories(user_id)
    else:
        memories = _fallback_recency_memories(user_id)
    
    if not memories:
        return ""
    lines = [f"- {m['content']}" for m in memories]
    return "What you know about this user:\n" + "\n".join(lines)

def _fallback_recency_memories(user_id: str) -> list:
    res = supabase.table("aly_memories") \
        .select("content, memory_type") \
        .eq("user_id", user_id) \
        .order("last_reinforced", desc=True) \
        .limit(8).execute()
    return res.data or []
```

Pass `state["user_message"]` as the query in `node_load_context`.

---

### 2.4 Implement `aly_nudge` Widget Type

The widget type is registered in `GLOBAL_WIDGET_TYPES` but has no renderer.

**Web — `web/src/components/screens/WidgetCard.tsx`:**

```typescript
// Add AlyNudgeWidget component:
function AlyNudgeWidget({ userId }: { userId?: string }) {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`${API}/aly/daily-insight?user_id=${userId}`)
      .then(r => r.ok ? r.json() : { insight: '' })
      .then(d => setInsight(d.insight ?? ''))
      .catch(() => setInsight(''))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <WidgetSkeleton rows={3} />;
  if (!insight) return <WidgetEmpty label="No nudge today" />;

  return (
    <div className="px-4 py-3 flex gap-3">
      <SparkleIcon size={14} className="text-modules-aly mt-0.5 shrink-0" weight="fill" />
      <p className="text-sm text-text-secondary leading-relaxed">{insight}</p>
    </div>
  );
}
```

Register it in the widget render switch:
```typescript
case 'aly_nudge': return <AlyNudgeWidget userId={userId} />;
```

**Mobile — add `AlyNudgeWidget` to `mobile/src/components/screens/WidgetCard.js` with the same pattern.**

---

## Phase 3 — Module System Cleanup

**Goal:** The module system is the single source of truth. No more hardcoded addon routes.

### 3.1 Migrate calorie_counter + expense_tracker to Module Entries

The `food_logs` and `expenses` tables and their dedicated backend routers still exist. The seeded module_definitions are already in Supabase (`schema_v15_modules.sql`). The remaining work is to:

1. **Route writes through the generic `/modules/{def_id}/entries` endpoint.**
2. **Update mobile services** to call module entries API instead of `/addons/{hub_id}/calorie/logs`.
3. **Keep food_logs/expenses tables** for backward compatibility but stop writing to them directly.

**Step 1 — Get module def IDs on backend startup:**

```python
# backend/config.py
def load_module_def_ids():
    from database import supabase
    defs = supabase.table("module_definitions") \
        .select("id, slug").in_("slug", ["calorie_counter","expense_tracker"]).execute().data or []
    return {d["slug"]: d["id"] for d in defs}

MODULE_DEF_IDS = {}  # populated in main.py startup
```

**Step 2 — Update `backend/routers/addons.py`** calorie/expense POST handlers to write to `module_entries` using the def ID.

**Step 3 — Mobile services:**

```js
// mobile/src/services/addons.js
// BEFORE:
const res = await fetch(`${API}/addons/${hubId}/calorie/logs`, { method: 'POST', ... });

// AFTER:
const defId = await getModuleDefId('calorie_counter');
const res = await fetch(`${API}/modules/${defId}/entries`, { method: 'POST', ... });
```

---

### 3.2 Add `schema_key` Support to Mobile DynamicModuleScreen

**File:** `mobile/src/components/modules/DynamicModuleScreen.js`

The web `CustomModuleView` already handles multi-collection schemas (`schemas` dict). Ensure the mobile screen passes the correct `schema_key` when fetching and posting entries:

```js
// When module has multiple collections (definition.schemas is a dict):
const schemaKey = Object.keys(definition.schemas ?? {})[0] ?? 'default';
// Pass schema_key to API calls
```

---

## Phase 4 — Module Creator Polish

**Goal:** Creators can see their module working before they publish it.

### 4.1 Live Preview Pane

Add a real-time preview panel to the creator that renders `CustomModuleView` with the current draft definition.

**Web — `web/src/app/creator/[moduleId]/layout.tsx`:**

```typescript
// Add a split-pane layout:
// Left: creator tabs (schema, intelligence, web interface, etc.)
// Right: <CustomModuleView definition={draftDefinition} preview={true} />

// The preview panel should:
// - Render the hub view / entry form from current ui_definition
// - Show "No preview available" if ui_definition is empty
// - Update live as the user edits (useContext from ModuleEditorContext)
```

**Implementation:**

```typescript
// In each creator tab, after saving, the ModuleEditorContext updates `definition`
// The preview panel is subscribed to that context and re-renders automatically
// Wrap preview in an error boundary so bad ui_definition doesn't crash the creator
```

---

### 4.2 Module Creator — Mobile Config Tab

**File:** `web/src/app/creator/[moduleId]/mobile/page.tsx` (create if missing)

The `mobile_config._configured` flag gates the publish checklist. Expose key mobile settings:

```typescript
// Fields to configure:
// - list_item_display: which schema field is shown as the card title
// - secondary_field: shown below title
// - badge_field: shown as colored badge (e.g. priority, status)
// - quick_actions: array of { label, action_type } (e.g. "Mark done", "Delete")
// - empty_state_message: custom string

// On save, set mobile_config._configured = true
```

---

### 4.3 Web Interface Builder — Hub View Config

The `hub_view` surface in `ui_definition` is parsed by `CustomModuleView` but the creator only configures `entry_form`. Add a hub view editor:

**File:** `web/src/app/creator/[moduleId]/interface/page.tsx`

```typescript
// Add a "Hub View" tab alongside "Entry Form":
// - Display mode: table | cards | timeline | goal_progress
// - Columns to show (for table mode)
// - Sort field + direction
// - Widget config (col span, summary type)
```

---

## Phase 5 — Marketplace Completion

### 5.1 Module Detail Page

**Create:** `web/src/app/marketplace/[slug]/page.tsx`

```typescript
export default async function ModuleDetailPage({ params }: { params: { slug: string } }) {
  // Fetch module_definition by slug
  // Show: name, description, schema preview, screenshots (if any)
  // Install button → same install flow as card modal
  // Creator info (name, avatar from user_profiles)
  // Version history from updated_at / version field
}
```

Update `MarketplacePage` module card `onClick` to navigate to `/marketplace/{module.slug}` instead of opening modal.

---

### 5.2 Creator Profile Pages

**Create:** `web/src/app/creator-profile/[userId]/page.tsx`

```typescript
export default async function CreatorProfilePage({ params }) {
  // Fetch: user_profiles (display_name, avatar_url, bio)
  // Fetch: module_definitions where user_id = params.userId AND status = 'published'
  // Show: creator bio, published modules grid
  // No private data — public page
}
```

Add a link to the creator profile from the module detail page.

---

### 5.3 Ratings + Reviews (Supabase migration needed)

**Create:** `backend/migrations/schema_v17_ratings.sql`

```sql
CREATE TABLE IF NOT EXISTS public.module_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_def_id UUID REFERENCES public.module_definitions(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  review        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (module_def_id, user_id)
);

ALTER TABLE public.module_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ratings" ON public.module_ratings FOR SELECT USING (true);
CREATE POLICY "Users manage own ratings" ON public.module_ratings FOR ALL USING (auth.uid() = user_id);

-- Add avg_rating denormalized column to module_definitions for fast reads
ALTER TABLE public.module_definitions ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE public.module_definitions ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;
```

**Backend endpoint:**
```python
# backend/routers/marketplace.py (create)
@router.post("/modules/{def_id}/rate")
async def rate_module(def_id: str, body: RatingBody):
    # Upsert rating
    # Recalculate avg_rating and rating_count via SQL function
    pass
```

---

## Phase 6 — Creator Economy

### 6.1 Real Stripe Integration (replace mock)

**File:** `backend/routers/payments.py`

Replace mock session with actual Stripe SDK:

```python
import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

@router.post("/create-checkout-session")
async def create_checkout_session(body: CheckoutSessionBody):
    module = supabase.table("module_definitions").select("price,name,user_id").eq("id", body.module_def_id).single().execute().data
    if not module or float(module["price"]) <= 0:
        # Free — install directly
        return {"url": None, "free": True}
    
    # Get creator's Stripe Connect account
    creator_profile = supabase.table("creator_profiles") \
        .select("stripe_connect_id").eq("id", module["user_id"]).maybe_single().execute().data
    
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "php",
                "unit_amount": int(float(module["price"]) * 100),
                "product_data": {"name": module["name"]},
            },
            "quantity": 1,
        }],
        payment_intent_data={
            "application_fee_amount": int(float(module["price"]) * 100 * 0.30),
            "transfer_data": {"destination": creator_profile["stripe_connect_id"]},
        } if creator_profile?.get("stripe_connect_id") else {},
        success_url=f"{FRONTEND_URL}/marketplace/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/marketplace",
        metadata={"module_def_id": body.module_def_id, "user_id": body.user_id},
    )
    
    # Record pending transaction
    supabase.table("transactions").insert({ ... }).execute()
    return {"url": session.url}
```

**Add Stripe webhook handler:**
```python
@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    event = stripe.Webhook.construct_event(payload, sig, os.getenv("STRIPE_WEBHOOK_SECRET"))
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        # Mark transaction completed
        # Install module for user
        # Update creator earnings
    
    return {"received": True}
```

---

### 6.2 Stripe Connect Onboarding for Creators

**Web — `web/src/app/creator/settings/page.tsx`** (create):

```typescript
// Show Stripe Connect onboarding status
// If not connected: "Connect Stripe to receive payouts" → POST /payments/connect/onboard
// If connected: show payout balance, next payout date

// Backend:
@router.post("/payments/connect/onboard")
async def stripe_connect_onboard(user_id: str):
    account = stripe.Account.create(type="express", country="PH")
    supabase.table("creator_profiles").upsert({"id": user_id, "stripe_connect_id": account.id}).execute()
    link = stripe.AccountLink.create(
        account=account.id,
        refresh_url=f"{FRONTEND_URL}/creator/settings",
        return_url=f"{FRONTEND_URL}/creator/settings?stripe=connected",
        type="account_onboarding",
    )
    return {"url": link.url}
```

---

### 6.3 Creator Dashboard — Analytics

**Web — `web/src/app/creator/page.tsx`** — add analytics section:

```typescript
// Fetch per-module analytics:
// - Install count: SELECT COUNT(*) FROM hub_addons WHERE type = module.slug
// - Revenue: SELECT SUM(amount_creator_payout) FROM transactions WHERE module_def_id = X AND status = 'completed'
// - Avg rating: from module_definitions.avg_rating

// Display as a row of stats above the module list
// Link to /creator/[moduleId] for per-module breakdown
```

---

### 6.4 Admin Review Queue

**Create:** `web/src/app/admin/review/page.tsx`

```typescript
// Only accessible to admin users (check user role in user_profiles)
// Show: modules with status = 'pending_review'
// Actions: Approve → set status = 'published', Reject → set status = 'draft' + send reason
```

**Backend:**
```python
# backend/routers/admin.py (create)
@router.get("/admin/review-queue")
async def get_review_queue(admin_key: str = Header(None)):
    # Validate admin_key == os.getenv("ADMIN_SECRET")
    res = supabase.table("module_definitions") \
        .select("*, user:user_profiles(display_name)") \
        .eq("status", "pending_review") \
        .order("created_at").execute()
    return res.data

@router.post("/admin/review/{module_id}")
async def review_module(module_id: str, body: ReviewBody, admin_key: str = Header(None)):
    # body.action: 'approve' | 'reject'
    # body.reason: str (for rejections)
    new_status = "published" if body.action == "approve" else "draft"
    supabase.table("module_definitions").update({"status": new_status}).eq("id", module_id).execute()
    # TODO: send email notification to creator
    return {"status": new_status}
```

Add a `schema_v18_review.sql`:
```sql
-- Add pending_review to allowed statuses (already TEXT, no enum to update)
-- Add admin_notes column
ALTER TABLE public.module_definitions ADD COLUMN IF NOT EXISTS admin_notes TEXT;
```

---

## Phase 7 — Infrastructure & Quality

### 7.1 Testing — Backend

**Create:** `backend/tests/` directory.

Start with critical paths:

```python
# backend/tests/test_agent_graph.py
import pytest
from services.agent_graph.nodes import node_classify_intent

@pytest.mark.asyncio
async def test_classify_intent_task():
    state = {"user_message": "add a task: review PR", "history": [], "user_id": "test"}
    result = await node_classify_intent(state)
    assert result["intent"] == "TASK"

@pytest.mark.asyncio
async def test_classify_intent_briefing():
    state = {"user_message": "how am I doing this week?", "history": [], "user_id": "test"}
    result = await node_classify_intent(state)
    assert result["intent"] == "BRIEFING"
```

```python
# backend/tests/test_modules.py
# Test generic module CRUD endpoints
# Mock supabase client with pytest-mock
```

**Add to `backend/requirements.txt`:**
```
pytest==8.3.5
pytest-asyncio==0.24.0
pytest-mock==3.14.0
httpx==0.28.0  # for TestClient
```

**Run:** `cd backend && pytest tests/`

---

### 7.2 Testing — Mobile

**Create:** `mobile/__tests__/` directory.

```js
// mobile/__tests__/TrackScreen.test.js
import { render, fireEvent } from '@testing-library/react-native';
import TrackScreen from '../src/screens/track/TrackScreen';

test('renders task list header', () => {
  const { getByText } = render(<TrackScreen hub={{ id: '1', name: 'Test' }} />);
  expect(getByText('Track')).toBeTruthy();
});
```

**Add to `mobile/package.json`:**
```json
"devDependencies": {
  "jest": "^29",
  "@testing-library/react-native": "^12",
  "jest-expo": "~51"
}
```

---

### 7.3 Offline Mode — Mobile

**Strategy:** Cache critical data in AsyncStorage. Show stale data with a banner if network fails.

```js
// mobile/src/services/offlineCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getCached(key) {
  const raw = await AsyncStorage.getItem(`cache:${key}`);
  if (!raw) return null;
  const { data, ts } = JSON.parse(raw);
  const age = Date.now() - ts;
  return { data, stale: age > 5 * 60 * 1000 }; // 5 min freshness
}

export async function setCache(key, data) {
  await AsyncStorage.setItem(`cache:${key}`, JSON.stringify({ data, ts: Date.now() }));
}
```

```js
// Use in TrackScreen loadTasks():
const cached = await getCached(`tasks:${hubId}`);
if (cached) {
  setTasks(cached.data);
  if (cached.stale) setStaleWarning(true);
}
try {
  const fresh = await trackService.getTasks(hubId, userId);
  setTasks(fresh);
  setCache(`tasks:${hubId}`, fresh);
  setStaleWarning(false);
} catch (e) {
  if (!cached) setError("No connection");
}
```

---

### 7.4 Environment Hardening

**Create:** `backend/.env.example`

```bash
# AI Provider
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
MAIN_MODEL=anthropic/claude-sonnet-4-6
FAST_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Embeddings
EMBED_PROVIDER=gemini
GOOGLE_API_KEY=AIza...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
FRONTEND_URL=https://app.takda.io
ASSISTANT_NAME=Aly
ADMIN_SECRET=change-me
```

---

## Execution Order (Recommended Sprint Plan)

| Sprint | Items | Estimated Days |
|--------|-------|----------------|
| **Sprint 0** | 0.1 Model migration · 0.2 Embeddings unify · 0.3 Sidebar refresh · 0.4 Vault routing | 2 |
| **Sprint 1** | 1.1 context_bio injection · 1.2 nav_pins · 1.3 HomeScreen personalization · 1.4 node_load_context tiers | 3 |
| **Sprint 2** | 2.1 intent-gated context · 2.2 vectorize annotations · 2.3 semantic memory · 2.4 aly_nudge widget | 3 |
| **Sprint 3** | 3.1 calorie/expense migration · 3.2 mobile schema_key support | 2 |
| **Sprint 4** | 4.1 live preview pane · 4.2 mobile config tab · 4.3 hub view builder | 3 |
| **Sprint 5** | 5.1 module detail page · 5.2 creator profiles · 5.3 ratings system | 3 |
| **Sprint 6** | 6.1 real Stripe · 6.2 Stripe Connect · 6.3 creator analytics · 6.4 admin review | 4 |
| **Sprint 7** | 7.1 backend tests · 7.2 mobile tests · 7.3 offline mode · 7.4 env hardening | 4 |
| **Total** | | ~24 days |

---

## Key File Reference

### Backend
| File | Purpose |
|------|---------|
| `backend/services/agent_graph/nodes.py` | `node_load_context`, `node_respond`, intent logic |
| `backend/services/agent_graph/graph.py` | LangGraph pipeline definition |
| `backend/services/aly_memory.py` | Memory extraction + retrieval |
| `backend/services/embeddings.py` | text-embedding-004 calls |
| `backend/routers/aly.py` | Daily insight, hub snapshot endpoints |
| `backend/routers/payments.py` | Stripe checkout (currently mock) |
| `backend/routers/modules.py` | Generic module CRUD |
| `backend/config.py` | `ASSISTANT_NAME`, `AI_PROVIDER`, module def IDs |

### Web
| File | Purpose |
|------|---------|
| `web/src/app/dashboard/page.tsx` | Home screen — needs pinned Screen rendering |
| `web/src/components/layout/Sidebar.tsx` | Navigation — needs nav_pins support |
| `web/src/components/screens/WidgetCard.tsx` | Widget renderers — needs `aly_nudge` |
| `web/src/app/creator/[moduleId]/` | Module creator tabs |
| `web/src/app/marketplace/page.tsx` | Module marketplace |
| `web/src/app/marketplace/[slug]/page.tsx` | Module detail (to create) |

### Mobile
| File | Purpose |
|------|---------|
| `mobile/src/components/navigation/SidebarNavigator.js` | Add useFocusEffect for spaces |
| `mobile/src/components/navigation/CompassNavigator.js` | Hub module switcher |
| `mobile/src/components/modules/DynamicModuleScreen.js` | Dynamic addon renderer |
| `mobile/src/screens/coordinator/ChatTab.js` | Aly chat interface |
| `mobile/src/services/addons.js` | Addon API calls — update to module entries |

### Database Migrations (in order)
| File | Status |
|------|--------|
| `schema_v13_phase1.sql` | Apply if not done — 768d embeddings |
| `schema_v15_modules.sql` | Should be applied — module system |
| `schema_v16_economy.sql` | Should be applied — creator economy |
| `schema_v17_ratings.sql` | Create — ratings system |
| `schema_v18_review.sql` | Create — admin review queue |

---

## Known Gotchas

- **Never mix FastEmbed (384d) and Gemini embeddings (768d)** in the same vector column. Check `EMBED_PROVIDER` env var before running any embedding script.
- **`c-{ramp}` classes use direct-child selectors** — do not wrap colored nodes in extra `<g>` tags or color inheritance breaks.
- **LangGraph `astream_events` version must be `v2`** — version `v1` does not include `langgraph_node` in metadata.
- **Supabase RLS** — all new tables need RLS enabled and policies before they're usable from the client. Check `ENABLE ROW LEVEL SECURITY` in every migration.
- **Expo dev client required** for any native module (camera, document picker). Standard Expo Go will not run the full app.
- **Stripe Connect in PH** — verify Stripe Express accounts support PHP payouts in your region before launching paid modules.
- **`node_load_context` graph position** — entry point is `classify_intent`, which feeds into `load_context`. If you change the graph entry point, intent will be undefined when context loads.