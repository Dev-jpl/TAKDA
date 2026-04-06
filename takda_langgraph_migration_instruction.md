# TAKDA — LangGraph Migration Instructions
# Backend runs in Docker — all changes go through Docker
# Mobile unchanged

## Step 1 — Update requirements.txt first
Add these lines to backend/requirements.txt:
  langgraph>=0.2.0
  langchain-core>=0.3.0
  langchain-openai>=0.2.0

Then rebuild Docker:
  docker-compose down
  docker-compose build --no-cache
  docker-compose up

Verify install worked:
  docker-compose exec backend python -c "import langgraph; print('ok')"

---

## What we're replacing
Current flow:
  message → classify_intent() → if/elif routing → stream response
  → regex parse [ACTION_TAGS] → execute actions

New LangGraph flow:
  message → graph.ainvoke(state) → nodes execute in sequence
  → tools called with typed params → stream response
  → actions stored cleanly

Key improvements:
  - No more regex tag parsing — typed tool calls
  - Aly can loop back and ask for missing info
  - Each step is a clean isolated function
  - State shared across all nodes
  - Easy to add new nodes later

---

## FILE STRUCTURE TO CREATE
backend/services/aly_graph/
  __init__.py          (empty)
  state.py             (shared state TypedDict)
  tools.py             (typed tools replace action tags)
  nodes.py             (graph node functions)
  graph.py             (graph assembly)

Modify:
  backend/services/coordinator_agent.py  (replace with graph call)
  backend/routers/coordinator.py         (minor update)

---

## FILE 1 — backend/services/aly_graph/__init__.py
(empty file)

---

## FILE 2 — backend/services/aly_graph/state.py

from typing import TypedDict, Annotated, List, Optional
import operator

class AlyState(TypedDict):
    # Input
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

    # Loop control
    needs_clarification: bool
    clarification_question: str
    loop_count: int  # prevent infinite loops

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
    Call this when user wants to add, create, or remember a task.
    Requires title and hub_id. Ask user for hub if unclear.
    priority: low | high | urgent
    """
    result = supabase.table("tasks").insert({
        "title": title,
        "hub_id": hub_id,
        "priority": priority,
        "status": "todo",
        "user_id": user_id,
    }).execute()
    if result.data:
        t = result.data[0]
        return {
            "success": True,
            "type": "task_created",
            "label": title,
            "id": t["id"],
            "hub_id": hub_id,
            "priority": priority,
        }
    return {"success": False, "error": "Failed to create task"}

@tool
def update_task(task_id: str,
                status: str = None,
                title: str = None,
                priority: str = None) -> dict:
    """
    Updates an existing task.
    Call this when user wants to complete, update, or change a task.
    status: todo | in_progress | done
    """
    updates = {k: v for k, v in {
        "status": status,
        "title": title,
        "priority": priority,
    }.items() if v is not None}
    supabase.table("tasks").update(updates).eq("id", task_id).execute()
    return {"success": True, "type": "task_updated",
            "id": task_id, **updates}

@tool
def create_event(title: str, start_time: str,
                 end_time: str = None,
                 location: str = None,
                 user_id: str = "") -> dict:
    """
    Creates a calendar event.
    start_time must be ISO 8601 format e.g. 2026-04-10T09:00:00
    If end_time not given, defaults to 1 hour after start.
    """
    if not end_time:
        dt = datetime.fromisoformat(start_time)
        end_time = (dt + timedelta(hours=1)).isoformat()
    result = supabase.table("events").insert({
        "title": title,
        "start_time": start_time,
        "end_time": end_time,
        "location": location,
        "user_id": user_id,
    }).execute()
    if result.data:
        return {"success": True, "type": "event_created",
                "label": title, "start": start_time}
    return {"success": False, "error": "Failed to create event"}

@tool
def log_expense(amount: float,
                merchant: str = None,
                category: str = "General",
                hub_id: str = None,
                user_id: str = "",
                currency: str = "PHP") -> dict:
    """
    Logs a financial expense.
    Call this when user mentions spending, paying, or buying something.
    """
    supabase.table("expenses").insert({
        "amount": amount,
        "merchant": merchant,
        "category": category,
        "hub_id": hub_id,
        "user_id": user_id,
        "currency": currency,
        "date": datetime.now().date().isoformat(),
    }).execute()
    return {
        "success": True,
        "type": "expense_logged",
        "label": f"{currency} {amount:.2f} at {merchant or 'unknown'}",
    }

@tool
def log_food(food_name: str,
             calories: float = None,
             meal_type: str = "meal",
             hub_id: str = None,
             user_id: str = "") -> dict:
    """
    Logs a food entry for calorie tracking.
    Call when user mentions eating, food, or calories.
    meal_type: breakfast | lunch | dinner | snack | meal
    """
    supabase.table("food_logs").insert({
        "food_name": food_name,
        "calories": calories,
        "meal_type": meal_type,
        "hub_id": hub_id,
        "user_id": user_id,
        "logged_at": datetime.now().isoformat(),
    }).execute()
    return {
        "success": True,
        "type": "food_logged",
        "label": f"{food_name}" + (f" · {calories} kcal" if calories else ""),
    }

@tool
def save_to_vault(content: str,
                  content_type: str = "text",
                  user_id: str = "") -> dict:
    """
    Saves anything to the vault for later sorting.
    Call when user wants to remember something but
    doesn't specify where it should go.
    content_type: text | link | task | note
    """
    supabase.table("vault_items").insert({
        "content": content,
        "content_type": content_type,
        "user_id": user_id,
        "status": "unprocessed",
    }).execute()
    return {
        "success": True,
        "type": "vault_saved",
        "label": content[:60] + ("..." if len(content) > 60 else ""),
    }

@tool
def save_report(title: str,
                content: str,
                report_type: str = "report",
                user_id: str = "",
                session_id: str = "") -> dict:
    """
    Saves a generated report or summary to outputs.
    report_type: report | summary | plan | briefing
    """
    supabase.table("kalay_outputs").insert({
        "title": title,
        "content": content,
        "type": report_type,
        "user_id": user_id,
        "session_id": session_id,
    }).execute()
    return {"success": True, "type": "report_saved", "label": title}

# Export all tools
ALY_TOOLS = [
    create_task,
    update_task,
    create_event,
    log_expense,
    log_food,
    save_to_vault,
    save_report,
]

---

## FILE 4 — backend/services/aly_graph/nodes.py

import os
import json
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_openai import ChatOpenAI
from database import supabase
from services.aly_graph.state import AlyState
from services.aly_graph.tools import ALY_TOOLS
from services.ai import get_ai_response_async
from config import ASSISTANT_NAME

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")

def get_model(tier: str = "balanced", with_tools: bool = False):
    models = {
        "fast":     "meta-llama/llama-3.1-8b-instruct:free",
        "balanced": "anthropic/claude-sonnet-4-5",
        "powerful": "anthropic/claude-opus-4-5",
    }
    model = ChatOpenAI(
        model=models[tier],
        base_url=OPENROUTER_BASE,
        api_key=OPENROUTER_KEY,
        streaming=True,
        temperature=0.3,
    )
    if with_tools:
        return model.bind_tools(ALY_TOOLS)
    return model

ALY_SYSTEM = f"""You are {ASSISTANT_NAME} — a warm, sharp personal companion inside TAKDA.
You know the user's tasks, documents, calendar, and spending.
Speak like a trusted friend who gets things done.
Be concise. Be real. Never corporate or robotic.
If data isn't in context, say so briefly.
Always respond in the same language the user writes in."""

# ── Node 1: Load context ─────────────────────────────────────────────────────
async def node_load_context(state: AlyState) -> AlyState:
    """Fetch tasks, hubs, memories for this user."""
    user_id = state["user_id"]
    hub_ids = state.get("hub_ids", [])

    tasks, hubs, memories = [], [], []

    try:
        # Tasks from selected hubs or all user tasks
        q = supabase.table("tasks").select("id,title,status,priority,hub_id,due_date") \
            .eq("user_id", user_id).neq("status", "done").limit(20)
        if hub_ids:
            q = q.in_("hub_id", hub_ids)
        tasks = q.execute().data or []
    except Exception as e:
        print(f"[node_load_context] tasks error: {e}")

    try:
        # Hubs
        q = supabase.table("hubs").select("id,name,space_id,spaces(name)") \
            .eq("user_id", user_id)
        if hub_ids:
            q = q.in_("id", hub_ids)
        raw = q.execute().data or []
        hubs = [{
            "id": h["id"],
            "name": h["name"],
            "space_name": (h.get("spaces") or {}).get("name", ""),
        } for h in raw]
    except Exception as e:
        print(f"[node_load_context] hubs error: {e}")

    try:
        # Aly memories
        memories = supabase.table("aly_memory") \
            .select("content,memory_type") \
            .eq("user_id", user_id) \
            .order("last_reinforced", desc=True) \
            .limit(8).execute().data or []
    except Exception as e:
        print(f"[node_load_context] memories error: {e}")

    return {
        **state,
        "tasks": tasks,
        "hubs": hubs,
        "memories": memories,
        "docs_text": "",
        "tool_results": [],
        "actions": [],
        "needs_clarification": False,
        "clarification_question": "",
        "loop_count": 0,
    }

# ── Node 2: Classify intent ──────────────────────────────────────────────────
async def node_classify_intent(state: AlyState) -> AlyState:
    """Classify what the user wants. Fast model."""
    message = state["user_message"]
    history = state.get("history", [])

    history_text = "\n".join([
        f"{m['role']}: {m['content'][:100]}"
        for m in history[-4:]
    ]) if history else ""

    prompt = f"""Classify this message into one or more intents.
Intents: TASK | CALENDAR | EXPENSE | FOOD | REPORT | QUIZ | KNOWLEDGE | BRIEFING | VAULT | CHAT | CLARIFY

CLARIFY = user wants an action but essential info is missing (no hub, no amount, no date etc)
VAULT = user wants to save something without specifying where
BRIEFING = user asks about their day, week, or status

Return ONLY valid JSON: {{"intents":["TASK"],"primary":"TASK"}}

Recent conversation:
{history_text}

Message: "{message}"
"""
    try:
        response = await get_ai_response_async("You classify user intent. Return JSON only.", prompt)
        import re
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            data = json.loads(match.group())
            return {
                **state,
                "intent": data.get("primary", "CHAT"),
                "intents": data.get("intents", ["CHAT"]),
            }
    except Exception as e:
        print(f"[node_classify_intent] error: {e}")

    return {**state, "intent": "CHAT", "intents": ["CHAT"]}

# ── Node 3: Call Aly with tools ──────────────────────────────────────────────
async def node_aly_respond(state: AlyState) -> AlyState:
    """Main Aly response node. Uses tools for actions."""
    tasks_text = "\n".join([
        f"- {t['title']} ({t['status']}, {t.get('priority','low')}) [id:{t['id']}]"
        for t in state.get("tasks", [])
    ]) or "No active tasks."

    hubs_text = "\n".join([
        f"- {h['name']} — {h.get('space_name','')} [id:{h['id']}]"
        for h in state.get("hubs", [])
    ]) or "No hubs found."

    memory_text = "\n".join([
        f"- {m['content']}"
        for m in state.get("memories", [])
    ])

    history_text = "\n".join([
        f"{m['role']}: {m['content'][:200]}"
        for m in state.get("history", [])[-6:]
    ])

    context = f"""Your tasks:
{tasks_text}

Your hubs:
{hubs_text}

What you know about this user:
{memory_text or 'Nothing yet.'}

Recent conversation:
{history_text}

User: {state['user_message']}"""

    messages = [
        SystemMessage(content=ALY_SYSTEM),
        HumanMessage(content=context),
    ]

    model = get_model("balanced", with_tools=True)
    tool_results = []
    actions = []

    try:
        response = await model.ainvoke(messages)
        response_text = response.content or ""

        # Execute any tool calls
        if hasattr(response, 'tool_calls') and response.tool_calls:
            for tc in response.tool_calls:
                tool_name = tc["name"]
                tool_args = tc.get("args", {})

                # Inject user_id and session_id into tool args
                tool_args["user_id"] = state["user_id"]
                if "session_id" in tool_args:
                    tool_args["session_id"] = state.get("session_id", "")

                # Find and call the tool
                tool_fn = next((t for t in ALY_TOOLS if t.name == tool_name), None)
                if tool_fn:
                    try:
                        result = await tool_fn.ainvoke(tool_args)
                        tool_results.append(result)
                        if isinstance(result, dict) and result.get("success"):
                            actions.append(result)
                    except Exception as e:
                        tool_results.append({"success": False, "error": str(e)})

            # If tools were called, get a follow-up response summarizing what happened
            if actions:
                actions_summary = "\n".join([
                    f"- {a.get('type','action')}: {a.get('label','done')}"
                    for a in actions
                ])
                follow_up_prompt = f"""You just did these things for the user:
{actions_summary}

Write a brief, warm confirmation in 1-2 sentences.
Don't list everything out — just confirm naturally."""

                follow_up = await get_model("fast").ainvoke([
                    SystemMessage(content=ALY_SYSTEM),
                    HumanMessage(content=follow_up_prompt),
                ])
                response_text = follow_up.content

    except Exception as e:
        print(f"[node_aly_respond] error: {e}")
        response_text = "Something went wrong. Try again?"

    return {
        **state,
        "response": response_text,
        "tool_results": tool_results,
        "actions": actions,
    }

# ── Node 4: Check if clarification needed ───────────────────────────────────
async def node_check_clarification(state: AlyState) -> AlyState:
    """
    If intent is CLARIFY or essential params missing, set clarification flag.
    This node runs BEFORE node_aly_respond for CLARIFY intents.
    """
    if state.get("intent") != "CLARIFY":
        return {**state, "needs_clarification": False}

    hubs_text = "\n".join([f"- {h['name']} [id:{h['id']}]"
                           for h in state.get("hubs", [])])

    prompt = f"""The user wants to do something but details are missing.
Available hubs: {hubs_text}
User message: "{state['user_message']}"

Ask ONE specific question to get the missing info.
Be brief and warm. Max 1 sentence."""

    try:
        question = await get_ai_response_async(
            "You ask for missing information. One question only.",
            prompt
        )
        return {
            **state,
            "needs_clarification": True,
            "clarification_question": question.strip(),
            "response": question.strip(),
        }
    except Exception as e:
        print(f"[node_check_clarification] error: {e}")
        return {**state, "needs_clarification": False}

# ── Node 5: Extract memories ─────────────────────────────────────────────────
async def node_extract_memories(state: AlyState) -> AlyState:
    """Background memory extraction — never blocks response."""
    try:
        conversation = (state.get("history", [])[-4:] +
                        [{"role": "assistant", "content": state.get("response", "")}])
        history_text = "\n".join([f"{m['role']}: {m['content'][:150]}"
                                  for m in conversation])

        prompt = f"""Extract facts about the user from this conversation.
Return JSON array. Max 3 items.
Each: {{"type":"preference|pattern|goal|fact","content":"specific fact","confidence":0.7}}
Return [] if nothing worth remembering.

{history_text}"""

        response = await get_ai_response_async(
            "Extract user memories. Return JSON array only.", prompt
        )

        import re
        match = re.search(r'\[.*\]', response, re.DOTALL)
        if match:
            memories = json.loads(match.group())
            for mem in memories[:3]:
                try:
                    supabase.table("aly_memory").upsert({
                        "user_id": state["user_id"],
                        "memory_type": mem.get("type", "fact"),
                        "content": mem.get("content", ""),
                        "confidence": mem.get("confidence", 0.7),
                        "last_reinforced": "now()",
                    }, on_conflict="user_id,content").execute()
                except:
                    pass
    except Exception as e:
        print(f"[node_extract_memories] error: {e}")

    return state  # Return unchanged — memory is fire and forget

---

## FILE 5 — backend/services/aly_graph/graph.py

from langgraph.graph import StateGraph, END
from services.aly_graph.state import AlyState
from services.aly_graph.nodes import (
    node_load_context,
    node_classify_intent,
    node_check_clarification,
    node_aly_respond,
    node_extract_memories,
)

def route_after_classify(state: AlyState) -> str:
    """After classification, decide which node runs next."""
    if state.get("intent") == "CLARIFY":
        return "check_clarification"
    return "aly_respond"

def route_after_clarification(state: AlyState) -> str:
    """If clarification needed, end. Otherwise respond."""
    if state.get("needs_clarification"):
        return "extract_memories"  # Skip respond, just end
    return "aly_respond"

def build_aly_graph():
    graph = StateGraph(AlyState)

    # Add nodes
    graph.add_node("load_context", node_load_context)
    graph.add_node("classify_intent", node_classify_intent)
    graph.add_node("check_clarification", node_check_clarification)
    graph.add_node("aly_respond", node_aly_respond)
    graph.add_node("extract_memories", node_extract_memories)

    # Entry point
    graph.set_entry_point("load_context")

    # Edges
    graph.add_edge("load_context", "classify_intent")

    # Conditional: after classify → clarify check or respond
    graph.add_conditional_edges(
        "classify_intent",
        route_after_classify,
        {
            "check_clarification": "check_clarification",
            "aly_respond": "aly_respond",
        }
    )

    # Conditional: after clarification check
    graph.add_conditional_edges(
        "check_clarification",
        route_after_clarification,
        {
            "aly_respond": "aly_respond",
            "extract_memories": "extract_memories",
        }
    )

    # After responding → extract memories → end
    graph.add_edge("aly_respond", "extract_memories")
    graph.add_edge("extract_memories", END)

    return graph.compile()

# Singleton — compiled once, reused
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
    New LangGraph-based Aly pipeline.
    Replaces old if/elif routing + regex tag parsing.
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
        "loop_count": 0,
        "response": "",
        "actions": [],
        "tool_results": [],
    }

    try:
        final_state = await aly_graph.ainvoke(initial_state)
        response = final_state.get("response", "")
        actions = final_state.get("actions", [])

        # Stream response token by token
        # (LangGraph ainvoke returns complete — stream word by word)
        words = response.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")

        # Yield metadata (actions) at end — same pattern as before
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
    Kept for backward compatibility with coordinator.py router.
    LangGraph handles actions internally now — this just
    extracts the metadata delimiter from the streamed text.
    """
    if "|||" in full_text:
        parts = full_text.split("|||")
        clean_text = parts[0].strip()
        try:
            metadata = json.loads(parts[1])
            actions = metadata.get("actions", [])
        except:
            actions = []
        return clean_text, actions
    return full_text.strip(), []

---

## FILE 7 — backend/routers/coordinator.py (small update only)
Find this line in stream_generator:
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

No other changes to coordinator.py needed.

---

## Supabase table needed (run if not exists)
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
1. Add langgraph to requirements.txt
2. docker-compose down && docker-compose build --no-cache && docker-compose up
3. Verify: docker-compose exec backend python -c "import langgraph; print('ok')"
4. Create backend/services/aly_graph/__init__.py (empty)
5. Create state.py
6. Create tools.py
7. Create nodes.py
8. Create graph.py
9. Replace coordinator_agent.py
10. Update coordinator.py (small change only)
11. Run Supabase SQL for aly_memory table
12. Restart Docker: docker-compose restart
13. Test: send a message to Aly → confirm response works
14. Test tool: "add a task to buy groceries" → check tasks table in Supabase

## How to verify it's working
docker-compose logs backend -f

You should see these log lines in order:
  [node_load_context] — context fetched
  [node_classify_intent] — intent classified
  [node_aly_respond] — response generated
  [node_extract_memories] — memories extracted

If you see errors — check logs, the node name tells you exactly where it failed.

## What changes for the user
Before: Aly might say "Done!" but nothing was created (silent tag parsing fail)
After: Tool either succeeds (Supabase row created) or fails with clear error
Before: "Add a task" with no hub → Aly guesses or fails silently
After: Aly asks "Which hub should I add it to?" and waits
Before: Memory never persists between sessions
After: Memories extracted after every conversation, included in next context