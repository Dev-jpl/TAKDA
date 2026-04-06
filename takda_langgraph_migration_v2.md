# TAKDA — LangGraph Migration (v2)

# Improved from takda_langgraph_migration_instruction.md

# Fixes: model versions, real streaming, deduped memory, outputs table, tool injection, create_space/hub tools

## What we're replacing

Current flow:
message → classify_intent() → if/elif routing → stream response
→ regex parse [ACTION_TAGS] → execute actions

New LangGraph flow:
message → graph.astream_events(state) → nodes execute in sequence
→ typed tool calls → real token streaming → actions stored cleanly

Key improvements over v1 instruction:

- Real streaming via astream_events (not fake word-split)
- Correct model versions (sonnet-4-6 not sonnet-4-5)
- Two-tier model: Gemini Flash (fast) + Claude Sonnet 4.6 (main)
- Memory deduped — uses existing aly_memory.py, not reimplemented
- Correct outputs table name (coordinator_outputs not kalay_outputs)
- user_id/session_id injection fixed for all tools
- create_space + create_hub tools added (were missing from v1)
- Dead loop_count guard removed from state (was never used)

---

## Step 1 — Update requirements.txt

Add to backend/requirements.txt:
langgraph>=0.2.0
langchain-core>=0.3.0
langchain-openai>=0.2.0

Then rebuild Docker:
docker-compose down
docker-compose build --no-cache
docker-compose up

Verify:
docker-compose exec backend python -c "import langgraph; print('ok')"

Also fix ai.py line 10: change default gemini model from
"gemini-3.1-flash-lite-preview" (does not exist)
to:
"gemini-2.0-flash"

---

## Model strategy (two-tier)

Fast nodes (classification, memory, follow-up confirmations):
Provider: gemini via existing services/ai.py get_ai_response_async()
Model: gemini-2.0-flash (set GEMINI_MODEL=gemini-2.0-flash in .env)

Main Aly response node:
Provider: OpenRouter (OPENROUTER_API_KEY already in .env)
Model: anthropic/claude-sonnet-4-6
Via: langchain-openai ChatOpenAI with base_url=https://openrouter.ai/api/v1

---

## File structure to create

backend/services/aly_graph/
**init**.py (empty)
state.py
tools.py
nodes.py
graph.py

Modify:
backend/services/coordinator_agent.py (replace entirely)
backend/routers/coordinator.py (small update only)
backend/services/ai.py (fix gemini model default)
backend/.env (update GEMINI_MODEL)

---

## FILE 1 — backend/services/aly_graph/**init**.py

(empty file)

---

## FILE 2 — backend/services/aly_graph/state.py

from typing import TypedDict, List, Optional

class AlyState(TypedDict): # Input
user_message: str
user_id: str
session_id: str
space_ids: List[str]
hub_ids: List[str]

    # Context (loaded by node_load_context)
    tasks: List[dict]
    hubs: List[dict]
    memories: List[dict]
    docs_text: str

    # Conversation history
    history: List[dict]  # [{role, content}]

    # Intent classification
    intent: str
    intents: List[str]

    # Clarification flow
    needs_clarification: bool
    clarification_question: str

    # Output
    response: str
    actions: List[dict]
    tool_results: List[dict]

---

## FILE 3 — backend/services/aly_graph/tools.py

from langchain_core.tools import tool
from database import supabase
from datetime import datetime, timedelta

@tool
def create_task(title: str, hub_id: str,
priority: str = "low",
user_id: str = "") -> dict:
"""
Creates a task in a hub.
Call when user wants to add, create, or remember a task.
priority: low | high | urgent
"""
result = supabase.table("tasks").insert({
"title": title, "hub_id": hub_id,
"priority": priority, "status": "todo", "user_id": user_id,
}).execute()
if result.data:
t = result.data[0]
return {"success": True, "type": "task_created",
"label": title, "id": t["id"]}
return {"success": False, "error": "Failed to create task"}

@tool
def update_task(task_id: str, status: str = None,
title: str = None, priority: str = None) -> dict:
"""
Updates an existing task.
status: todo | in_progress | done
"""
updates = {k: v for k, v in {
"status": status, "title": title, "priority": priority
}.items() if v is not None}
supabase.table("tasks").update(updates).eq("id", task_id).execute()
return {"success": True, "type": "task_updated", "id": task_id, \*\*updates}

@tool
def create_event(title: str, start_time: str,
end_time: str = None, location: str = None,
user_id: str = "") -> dict:
"""
Creates a calendar event.
start_time must be ISO 8601 e.g. 2026-04-10T09:00:00
end_time defaults to 1 hour after start if not given.
"""
if not end_time:
dt = datetime.fromisoformat(start_time)
end_time = (dt + timedelta(hours=1)).isoformat()
result = supabase.table("events").insert({
"title": title, "start_time": start_time,
"end_time": end_time, "location": location, "user_id": user_id,
}).execute()
if result.data:
return {"success": True, "type": "event_created",
"label": title, "start": start_time}
return {"success": False, "error": "Failed to create event"}

@tool
def log_expense(amount: float, merchant: str = None,
category: str = "General", hub_id: str = None,
user_id: str = "", currency: str = "PHP") -> dict:
"""
Logs a financial expense.
Call when user mentions spending, paying, or buying.
"""
supabase.table("expenses").insert({
"amount": amount, "merchant": merchant, "category": category,
"hub_id": hub_id, "user_id": user_id, "currency": currency,
"date": datetime.now().date().isoformat(),
}).execute()
return {"success": True, "type": "expense_logged",
"label": f"{currency} {amount:.2f} at {merchant or 'unknown'}"}

@tool
def log_food(food_name: str, calories: float = None,
meal_type: str = "meal", hub_id: str = None,
user_id: str = "") -> dict:
"""
Logs a food entry for calorie tracking.
meal_type: breakfast | lunch | dinner | snack | meal
"""
supabase.table("food_logs").insert({
"food_name": food_name, "calories": calories,
"meal_type": meal_type, "hub_id": hub_id,
"user_id": user_id, "logged_at": datetime.now().isoformat(),
}).execute()
return {"success": True, "type": "food_logged",
"label": f"{food_name}" + (f" · {calories} kcal" if calories else "")}

@tool
def save_to_vault(content: str, content_type: str = "text",
user_id: str = "") -> dict:
"""
Saves anything to the vault for later sorting.
Call when user wants to save something without specifying where.
content_type: text | link | task | note
"""
supabase.table("vault_items").insert({
"content": content, "content_type": content_type,
"user_id": user_id, "status": "unprocessed",
}).execute()
return {"success": True, "type": "vault_saved",
"label": content[:60] + ("..." if len(content) > 60 else "")}

@tool
def save_report(title: str, content: str,
report_type: str = "report",
user_id: str = "", session_id: str = "") -> dict:
"""
Saves a generated report or summary to outputs.
report_type: report | summary | plan | briefing
NOTE: table is coordinator_outputs (not kalay_outputs)
"""
supabase.table("coordinator_outputs").insert({
"title": title, "content": content, "type": report_type,
"user_id": user_id, "session_id": session_id,
}).execute()
return {"success": True, "type": "report_saved", "label": title}

@tool
def create_space(name: str, icon: str = "Folder",
color: str = "#7F77DD",
user_id: str = "") -> dict:
"""
Creates a new space (life domain) for the user.
Call when user wants to organize a new area of their life.
"""
result = supabase.table("spaces").insert({
"name": name, "icon": icon, "color": color, "user_id": user_id,
}).execute()
if result.data:
return {"success": True, "type": "space_created",
"label": name, "id": result.data[0]["id"]}
return {"success": False, "error": "Failed to create space"}

@tool
def create_hub(name: str, space_id: str,
icon: str = "Folder", color: str = "#7F77DD",
user_id: str = "") -> dict:
"""
Creates a new hub inside a space.
Call when user wants to add a hub/project to an existing space.
"""
result = supabase.table("hubs").insert({
"name": name, "space_id": space_id,
"icon": icon, "color": color, "user_id": user_id,
}).execute()
if result.data:
return {"success": True, "type": "hub_created",
"label": name, "id": result.data[0]["id"]}
return {"success": False, "error": "Failed to create hub"}

# Export all tools

ALY_TOOLS = [
create_task, update_task, create_event,
log_expense, log_food, save_to_vault, save_report,
create_space, create_hub,
]

---

## FILE 4 — backend/services/aly_graph/nodes.py

import os, json, re
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from database import supabase
from services.aly_graph.state import AlyState
from services.aly_graph.tools import ALY_TOOLS
from services.ai import get_ai_response_async
from services.aly_memory import extract_and_store_memories
from config import ASSISTANT_NAME

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")

# Main Aly model — Claude Sonnet 4.6 via OpenRouter

def get_main_model():
model = ChatOpenAI(
model="anthropic/claude-sonnet-4-6",
base_url=OPENROUTER_BASE,
api_key=OPENROUTER_KEY,
streaming=True,
temperature=0.3,
)
return model.bind_tools(ALY_TOOLS)

ALY_SYSTEM = f"""You are {ASSISTANT_NAME} — a warm, sharp personal companion inside TAKDA.
You know the user's tasks, documents, calendar, and spending.
Speak like a trusted friend who gets things done.
Be concise. Be real. Never corporate or robotic.
If data isn't in context, say so briefly.
Always respond in the same language the user writes in."""

# ── Node 1: Load context ─────────────────────────────────────────────────────

async def node_load_context(state: AlyState) -> AlyState:
user_id = state["user_id"]
hub_ids = state.get("hub_ids", [])
tasks, hubs, memories = [], [], []

    try:
        q = supabase.table("tasks").select("id,title,status,priority,hub_id,due_date") \
            .eq("user_id", user_id).neq("status", "done").limit(20)
        if hub_ids:
            q = q.in_("hub_id", hub_ids)
        tasks = q.execute().data or []
    except Exception as e:
        print(f"[node_load_context] tasks error: {e}")

    try:
        q = supabase.table("hubs").select("id,name,space_id,spaces(name)") \
            .eq("user_id", user_id)
        if hub_ids:
            q = q.in_("id", hub_ids)
        raw = q.execute().data or []
        hubs = [{"id": h["id"], "name": h["name"],
                 "space_name": (h.get("spaces") or {}).get("name", "")} for h in raw]
    except Exception as e:
        print(f"[node_load_context] hubs error: {e}")

    try:
        memories = supabase.table("aly_memory") \
            .select("content,memory_type") \
            .eq("user_id", user_id) \
            .order("last_reinforced", desc=True) \
            .limit(8).execute().data or []
    except Exception as e:
        print(f"[node_load_context] memories error: {e}")

    return {
        **state,
        "tasks": tasks, "hubs": hubs, "memories": memories,
        "docs_text": "", "tool_results": [], "actions": [],
        "needs_clarification": False, "clarification_question": "",
    }

# ── Node 2: Classify intent (fast — Gemini via existing ai.py) ───────────────

async def node_classify_intent(state: AlyState) -> AlyState:
history = state.get("history", [])
history_text = "\n".join([
f"{m['role']}: {m['content'][:100]}" for m in history[-4:]
]) if history else ""

    prompt = f"""Classify this message into one or more intents.

Intents: TASK | CALENDAR | EXPENSE | FOOD | REPORT | QUIZ | KNOWLEDGE | BRIEFING | VAULT | SPACE | CHAT | CLARIFY

CLARIFY = user wants an action but essential info is missing (no hub, no amount, no date)
VAULT = user wants to save something without specifying where
BRIEFING = user asks about their day, week, or status
SPACE = user wants to create or organize spaces/hubs

Return ONLY valid JSON: {{"intents":["TASK"],"primary":"TASK"}}

Recent conversation:
{history_text}

Message: "{state['user_message']}"
"""
try:
response = await get_ai_response_async(
"You classify user intent. Return JSON only.", prompt
)
match = re.search(r'\{.\*\}', response, re.DOTALL)
if match:
data = json.loads(match.group())
return {\*\*state, "intent": data.get("primary", "CHAT"),
"intents": data.get("intents", ["CHAT"])}
except Exception as e:
print(f"[node_classify_intent] error: {e}")

    return {**state, "intent": "CHAT", "intents": ["CHAT"]}

# ── Node 3: Check clarification (fast — Gemini) ──────────────────────────────

async def node_check_clarification(state: AlyState) -> AlyState:
if state.get("intent") != "CLARIFY":
return {\*\*state, "needs_clarification": False}

    hubs_text = "\n".join([f"- {h['name']} [id:{h['id']}]"
                           for h in state.get("hubs", [])])
    prompt = f"""The user wants to do something but details are missing.

Available hubs: {hubs_text}
User message: "{state['user_message']}"

Ask ONE specific question to get the missing info. Be brief and warm. Max 1 sentence."""

    try:
        question = await get_ai_response_async(
            "You ask for missing information. One question only.", prompt
        )
        return {**state, "needs_clarification": True,
                "clarification_question": question.strip(),
                "response": question.strip()}
    except Exception as e:
        print(f"[node_check_clarification] error: {e}")
        return {**state, "needs_clarification": False}

# ── Node 4: Main Aly response (Claude Sonnet 4.6 via OpenRouter) ─────────────

async def node_aly_respond(state: AlyState) -> AlyState:
tasks_text = "\n".join([
f"- {t['title']} ({t['status']}, {t.get('priority','low')}) [id:{t['id']}]"
for t in state.get("tasks", [])
]) or "No active tasks."

    hubs_text = "\n".join([
        f"- {h['name']} — {h.get('space_name','')} [id:{h['id']}]"
        for h in state.get("hubs", [])
    ]) or "No hubs found."

    memory_text = "\n".join([f"- {m['content']}" for m in state.get("memories", [])])
    history_text = "\n".join([
        f"{m['role']}: {m['content'][:200]}" for m in state.get("history", [])[-6:]
    ])

    context = f"""Tasks:

{tasks_text}

Hubs:
{hubs_text}

What you know about this user:
{memory_text or 'Nothing yet.'}

Recent conversation:
{history_text}

User: {state['user_message']}"""

    messages = [SystemMessage(content=ALY_SYSTEM), HumanMessage(content=context)]
    model = get_main_model()
    tool_results = []
    actions = []
    response_text = ""

    try:
        response = await model.ainvoke(messages)
        response_text = response.content or ""

        if hasattr(response, 'tool_calls') and response.tool_calls:
            for tc in response.tool_calls:
                tool_name = tc["name"]
                tool_args = tc.get("args", {})
                # Inject user_id and session_id into every tool call
                tool_args["user_id"] = state["user_id"]
                tool_args["session_id"] = state.get("session_id", "")

                tool_fn = next((t for t in ALY_TOOLS if t.name == tool_name), None)
                if tool_fn:
                    try:
                        result = await tool_fn.ainvoke(tool_args)
                        tool_results.append(result)
                        if isinstance(result, dict) and result.get("success"):
                            actions.append(result)
                    except Exception as e:
                        tool_results.append({"success": False, "error": str(e)})

            # Warm confirmation if tools ran — use fast Gemini model
            if actions:
                actions_summary = "\n".join([
                    f"- {a.get('type','action')}: {a.get('label','done')}"
                    for a in actions
                ])
                follow_up_prompt = f"""You just did these things for the user:

{actions_summary}

Write a brief, warm confirmation in 1-2 sentences. Don't list everything out."""
response_text = await get_ai_response_async(ALY_SYSTEM, follow_up_prompt)

    except Exception as e:
        print(f"[node_aly_respond] error: {e}")
        response_text = "Something went wrong. Try again?"

    return {**state, "response": response_text,
            "tool_results": tool_results, "actions": actions}

# ── Node 5: Extract memories (fast — reuses existing aly_memory.py) ──────────

async def node_extract_memories(state: AlyState) -> AlyState:
"""Uses existing extract_and_store_memories() — no duplication."""
try:
conversation = (state.get("history", [])[-4:] +
[{"role": "assistant", "content": state.get("response", "")}])
await extract_and_store_memories(state["user_id"], conversation)
except Exception as e:
print(f"[node_extract_memories] error: {e}")
return state # fire and forget

---

## FILE 5 — backend/services/aly_graph/graph.py

from langgraph.graph import StateGraph, END
from services.aly_graph.state import AlyState
from services.aly_graph.nodes import (
node_load_context, node_classify_intent,
node_check_clarification, node_aly_respond, node_extract_memories,
)

def route_after_classify(state: AlyState) -> str:
if state.get("intent") == "CLARIFY":
return "check_clarification"
return "aly_respond"

def route_after_clarification(state: AlyState) -> str:
if state.get("needs_clarification"):
return "extract_memories"
return "aly_respond"

def build_aly_graph():
graph = StateGraph(AlyState)

    graph.add_node("load_context",         node_load_context)
    graph.add_node("classify_intent",      node_classify_intent)
    graph.add_node("check_clarification",  node_check_clarification)
    graph.add_node("aly_respond",          node_aly_respond)
    graph.add_node("extract_memories",     node_extract_memories)

    graph.set_entry_point("load_context")
    graph.add_edge("load_context", "classify_intent")

    graph.add_conditional_edges("classify_intent", route_after_classify, {
        "check_clarification": "check_clarification",
        "aly_respond": "aly_respond",
    })

    graph.add_conditional_edges("check_clarification", route_after_clarification, {
        "aly_respond": "aly_respond",
        "extract_memories": "extract_memories",
    })

    graph.add_edge("aly_respond", "extract_memories")
    graph.add_edge("extract_memories", END)

    return graph.compile()

# Singleton — compiled once on startup, reused

aly_graph = build_aly_graph()

---

## FILE 6 — backend/services/coordinator_agent.py (REPLACE ENTIRELY)

import json
from typing import AsyncGenerator
from services.aly_graph.graph import aly_graph
from services.aly_graph.state import AlyState

async def process_coordinator_chat_stream(
user_id: str,
message: str,
conversation_history: list = [],
context: dict = {},
session_id: str = "",
space_ids: list = [],
hub_ids: list = [],
) -> AsyncGenerator[str, None]:
"""
LangGraph-based Aly pipeline.
Replaces old if/elif routing + regex tag parsing.
Uses astream_events for real token streaming.
"""
initial_state: AlyState = {
"user_message": message,
"user_id": user_id,
"session_id": session_id,
"space_ids": space_ids,
"hub_ids": hub_ids,
"history": conversation_history,
"tasks": context.get("tasks", []),
"hubs": context.get("hubs", []),
"memories": [],
"docs_text": context.get("docs_text", ""),
"intent": "",
"intents": [],
"needs_clarification": False,
"clarification_question": "",
"response": "",
"actions": [],
"tool_results": [],
}

    try:
        # Stream events from the graph
        actions = []
        async for event in aly_graph.astream_events(initial_state, version="v2"):
            kind = event.get("event", "")

            # Stream text tokens from the main respond node
            if (kind == "on_chat_model_stream" and
                    event.get("metadata", {}).get("langgraph_node") == "aly_respond"):
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    yield chunk.content

            # Capture final state when graph ends
            elif kind == "on_chain_end" and event.get("name") == "LangGraph":
                final = event.get("data", {}).get("output", {})
                actions = final.get("actions", [])
                # If clarification, yield the question (wasn't streamed above)
                if final.get("needs_clarification"):
                    yield final.get("clarification_question", "")

        # Yield actions metadata at end — same pattern router expects
        if actions:
            yield f"|||{json.dumps({'actions': actions})}"

    except Exception as e:
        print(f"[process_coordinator_chat_stream] error: {e}")
        yield "Something went wrong. Please try again."

async def parse_and_propose_actions(
user_id: str, session_id: str, full_text: str,
space_ids: list = [], hub_ids: list = []
) -> tuple[str, list]:
"""
Backward-compatible — router still calls this.
LangGraph handles actions internally; this just splits the metadata delimiter.
"""
if "|||" in full_text:
parts = full_text.split("|||")
clean_text = parts[0].strip()
try:
metadata = json.loads(parts[1])
actions = metadata.get("actions", [])
except Exception:
actions = []
return clean_text, actions
return full_text.strip(), []

---

## FILE 7 — backend/routers/coordinator.py (small update only)

Find:
async for chunk in process_coordinator_chat_stream(
user_id=body.user_id,
message=body.message,
conversation_history=conversation_history,
context=context
):

Replace with:
async for chunk in process_coordinator_chat_stream(
user_id=body.user_id,
message=body.message,
conversation_history=conversation_history,
context=context,
session_id=session_id,
space_ids=body.space_ids,
hub_ids=body.hub_ids,
):

Also remove the memory_context/get_memory_context() call from coordinator.py
since node_load_context now fetches memories directly from Supabase.
(Avoids double-fetching memories on every request.)

---

## .env update

Change:
GEMINI_MODEL=gemini-1.5-flash
To:
GEMINI_MODEL=gemini-2.0-flash

---

## ai.py fix (1 line)

File: backend/services/ai.py line 10
Change:
"gemini": os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview"),
To:
"gemini": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),

---

## Supabase table (run if not exists)

CREATE TABLE IF NOT EXISTS aly_memory (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
memory_type TEXT DEFAULT 'fact',
content TEXT NOT NULL,
confidence FLOAT DEFAULT 0.7,
last_reinforced TIMESTAMPTZ DEFAULT now(),
created_at TIMESTAMPTZ DEFAULT now(),
UNIQUE(user_id, content)
);

---

## Execution order

1. Update requirements.txt (add langgraph, langchain-core, langchain-openai)
2. Fix ai.py default gemini model (1 line)
3. Update .env GEMINI_MODEL=gemini-2.0-flash
4. docker-compose down && docker-compose build --no-cache && docker-compose up
5. Verify: docker-compose exec backend python -c "import langgraph; print('ok')"
6. Run Supabase SQL for aly_memory table (if not done yet from previous session)
7. Create backend/services/aly_graph/**init**.py
8. Create state.py
9. Create tools.py
10. Create nodes.py
11. Create graph.py
12. Replace coordinator_agent.py
13. Update coordinator.py (pass session_id, space_ids, hub_ids; remove memory_context)
14. docker-compose restart
15. Test: send "what's on my plate today?" → confirm response streams
16. Test tool: "add a task to buy groceries" → check tasks table in Supabase
17. Test clarification: "add a task" (no hub) → Aly should ask which hub
18. Test memory: chat twice, check aly_memory table in Supabase after second chat

---

## Verification log lines (docker-compose logs backend -f)

You should see in order:
[node_load_context] — context fetched
[node_classify_intent] — intent classified
[node_aly_respond] — response generating (tokens stream to client)
[node_extract_memories] — memories extracted in background

---

## What changes for the user

Before: Aly responds with silent regex fail — action shows "done" but nothing created
After: Tool either succeeds (Supabase row created) or returns clear error

Before: "Add a task" with no hub → Aly guesses or fails
After: Aly asks "Which hub should I add it to?" and waits

Before: Memory never persists between sessions
After: Memories extracted after every conversation, injected into next context

Before: Fake streaming (word-split on complete response)
After: Real token streaming via astream_events

Before: create_space and create_hub were broken after regex tag removal
After: Proper typed tools for both
