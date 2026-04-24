markdown# TAKDA — Claude Code Instructions

## What This Project Is
TAKDA is a personal life OS. Users design their own experience.
It is NOT a standard productivity app with fixed features.
Every architectural decision should preserve user sovereignty —
the user decides what their TAKDA looks like, not the codebase.

## How to Work in This Repo

### Before touching any file
1. Check which phase is active in antigravity-instructions.md
2. Understand the domain you're working in (backend router vs agent node vs mobile screen vs web page)
3. Never create new hardcoded lists of modules, nav items, or features — these should always be data-driven

### When editing the agent pipeline (backend/services/agent_graph/)
- node_load_context loads data for Aly — keep it lean
- After Phase 1: base context (spaces, hubs, user_bio) loads first, deep context loads after classify
- Never load more than needed for the detected intent — see INTENT_CONTEXT_MAP
- Tools in tools.py are Aly's actions — each tool must have a clear docstring Aly uses for routing
- Never add a tool without also adding its intent key to the coordinator prompt

### When editing navigation (mobile or web)
- Nav items must come from user data (nav_pins) — never add hardcoded nav items
- The user's pinned Screen is their home — do not add a fallback fixed layout
- On mobile: SidebarNavigator for spaces, CompassNavigator for module switching within a hub

### When editing modules / addons
- Module keys are the source of truth: track, annotate, knowledge, deliver, automate, calorie_counter, expense_tracker
- Phase 3+: modules come from module_definitions table — never hardcode new module types after Phase 3
- Adding a new addon before Phase 3: add to ADDON_CATALOG in CompassNavigator.js AND addons.py AND the web MODULE_CATALOG

### When editing Aly
- System prompt lives in nodes.py _get_system_prompt()
- Wellbeing signals are injected as soft context — Aly uses judgment, not rules
- context_bio from user_profiles is always injected — it personalizes every response
- Aly speaks like a trusted friend — never corporate, never clinical, never diagnostic
- One wellbeing observation per response max — never turn every message into a wellness check

### When editing embeddings
- Model: text-embedding-004 (Gemini)
- Dimensions: 768 — this must match the vector column in Supabase exactly
- Embed in background tasks — never block a request on embedding generation
- Tables with embeddings: document_chunks, annotations, aly_memories
- Search function: search_similar(table, query, user_id, limit) in services/embeddings.py

### When editing the Vault
- Vault is a capture inbox — never auto-route items without user confirmation
- Aly suggests routing via aly_suggestion field — user confirms destination
- Accept endpoint must support routing to any module, not just tasks
- Statuses: unprocessed → suggested → processed | dismissed

### When editing Screens / Widgets
- Screens are user-built — never inject system widgets automatically
- Widget types are defined in the screen editor — adding a new type requires:
  1. Add to widget palette in web/src/app/screens/[screenId]/page.tsx
  2. Add renderer in MobileWidget component in HomeScreen.js
  3. Add backend data endpoint if new data is needed

### When editing the Marketplace
- Phase 1-2: marketplace installs from hardcoded ADDON_CATALOG
- Phase 3+: marketplace reads from module_definitions table
- Never show a module in the marketplace that has status != 'published'

## Code Style

### Python (backend)
```python
# Good — explicit, typed, single responsibility
async def load_base_context(user_id: str) -> dict:
    spaces = await fetch_spaces(user_id)
    hubs = await fetch_hubs(user_id)
    return {"spaces": spaces, "hubs": hubs}

# Bad — one giant function doing everything
async def node_load_context(state):
    # 200 lines of mixed concerns
```

- Use async/await everywhere in routers and services
- Pydantic models for all request bodies
- try/except around every Supabase call with specific print for debugging
- Limit results at the query level — never load then slice in Python

### TypeScript (web)
```typescript
// Good — typed service call, clear error handling
const loadHub = async (hubId: string): Promise => {
  try {
    return await hubsService.getHub(hubId)
  } catch (err) {
    console.error('[loadHub]', err)
    return null
  }
}
```

- Always type component props — no `any` except in legacy code being refactored
- Services live in web/src/services/ — components never call fetch() directly
- CSS variables for all colors — never hardcode hex in components

### JavaScript (mobile)
```javascript
// Good — useFocusEffect for data that must refresh on screen focus
useFocusEffect(useCallback(() => {
  loadData()
}, [userId]))

// Bad — useEffect that only runs on mount for screen-level data
useEffect(() => { loadData() }, [])
```

- Always use colors constant — never hardcode hex
- useFocusEffect for any screen that shows live data
- Keep StyleSheet at bottom of file, always

## Common Patterns

### Adding a new backend endpoint
```python
# In the relevant router file
@router.post("/{hub_id}/my_feature")
async def create_thing(hub_id: str, body: MyBody):
    res = supabase.table("my_table").insert({
        "hub_id": hub_id,
        "user_id": body.user_id,
        ...
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed")
    return res.data[0]
```

### Adding a new Aly tool
```python
# In tools.py
@tool
def my_new_tool(field_one: str, field_two: int, user_id: str = "") -> dict:
    """
    Clear description Aly uses to decide when to call this.
    Be specific about when TO use it and when NOT to.
    """
    supabase.table("my_table").insert({...}).execute()
    return {"success": True, "type": "my_action_type", "label": field_one}

# Then in coordinator.py COORDINATOR_PROMPT, add the new intent
# Then in nodes.py _build_action_proposal(), handle the new tool_name
```

### Adding a new widget type
```typescript
// 1. In web/src/app/screens/[screenId]/page.tsx — add to WIDGET_CATALOG
{
  type: 'my_widget',
  label: 'My Widget',
  Icon: MyIcon,
  color: 'var(--modules-track)',
  desc: 'Short description'
}

// 2. In the widget renderer, handle the new type
// 3. In mobile HomeScreen.js MobileWidget, add the mobile renderer
// 4. Add backend endpoint in screens.py if new data needed
```

### Vectorizing a new table
```python
# 1. Add embedding column in Supabase:
#    ALTER TABLE my_table ADD COLUMN embedding vector(768);

# 2. Create match function in Supabase SQL:
#    (copy pattern from match_chunks function)

# 3. In embeddings.py, add search function:
async def search_my_table(query: str, user_id: str, limit: int = 5):
    embedding = await embed_query(query)
    result = supabase.rpc("match_my_table", {
        "query_embedding": embedding,
        "user_id": user_id,
        "match_count": limit
    }).execute()
    return result.data or []

# 4. Embed on write (in background task):
background_tasks.add_task(embed_and_store, record_id, content)
```

## What NOT to Do

- Do not add hardcoded nav items to Sidebar.tsx or SidebarNavigator.js
- Do not add hardcoded module types to MODULE_CATALOG after Phase 3
- Do not auto-route vault items without user confirmation
- Do not load more than 10 items of any type in base context
- Do not use `any` type for module/addon data structures
- Do not add new columns to existing tables without a migration comment
- Do not create a new Supabase client instance — use the one from database.py / services/supabase.js
- Do not hardcode user_id — always get it from Supabase Auth
- Do not mix 384-dim and 768-dim embeddings in the same vector column
- Do not add a feature that assumes a specific Space or Hub structure — users define these

## Debugging Checklist

**Aly not responding correctly**
- Check node_classify_intent output in logs — is intent correct?
- Check what's in state after node_load_context — is relevant data present?
- Check tools.py — is the tool docstring clear enough for the model to route to it?

**Embeddings returning wrong results**
- Verify vector column dimension matches EMBED_DIMS (768)
- Check match_* RPC function exists in Supabase
- Verify embed_query uses same model as embed_text

**Module not appearing in hub**
- Check hub_modules table — is is_enabled = true?
- Check hub_addons table for addon types
- Verify ADDON_CATALOG in CompassNavigator.js includes the type key

**Vault item not routing**
- Check aly_suggestion field on the vault_items row
- Check vault.py accept endpoint — does it handle the target module?
- Confirm user confirmed the action (status should be 'processed' after accept)

**Context too large / slow responses**
- Check node_load_context — is it loading unused data for this intent?
- Verify intent-gated loading is working (Phase 1)
- Check limits on Supabase queries — events should be max 5, tasks max 10 in base