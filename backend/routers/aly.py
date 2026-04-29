import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from database import supabase
from services.ai import get_ai_response_async
from config import ASSISTANT_NAME

router = APIRouter(prefix="/aly", tags=["aly"])

# In-memory cache: { user_id: { "date": "YYYY-MM-DD", "insight": "..." } }
_insight_cache: dict[str, dict] = {}

@router.get("/daily-insight")
async def daily_insight(user_id: str):
    try:
        now_utc = datetime.now(timezone.utc)
        now_pht = now_utc + timedelta(hours=8)
        today_str = now_pht.strftime("%A, %B %-d, %Y")
        today_date = now_pht.date().isoformat()

        # Return cached insight if it's still for today
        cached = _insight_cache.get(user_id)
        if cached and cached.get("date") == today_date and cached.get("insight"):
            return {"insight": cached["insight"]}

        # ── User's assistant name
        assistant_name = ASSISTANT_NAME
        try:
            profile = supabase.table("user_profiles").select("assistant_name").eq("id", user_id).maybe_single().execute().data
            if profile and profile.get("assistant_name"):
                assistant_name = profile["assistant_name"]
        except Exception:
            pass

        # ── Today's calendar events (PHT window = UTC-8h to UTC+16h)
        day_start_utc = (now_pht.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(hours=8)).isoformat()
        day_end_utc   = (now_pht.replace(hour=23, minute=59, second=59, microsecond=0) - timedelta(hours=8)).isoformat()
        events_res = supabase.table("events") \
            .select("title,start_at,end_at,location") \
            .eq("user_id", user_id) \
            .gte("start_at", day_start_utc) \
            .lte("start_at", day_end_utc) \
            .order("start_at") \
            .limit(10).execute()
        events = events_res.data or []

        # ── Active tasks (with titles)
        tasks_res = supabase.table("tasks") \
            .select("title,priority,due_date") \
            .eq("user_id", user_id) \
            .neq("status", "done") \
            .order("due_date") \
            .limit(10).execute()
        tasks = tasks_res.data or []

        # ── Unprocessed vault items
        vault_res = supabase.table("vault_items") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("status", "unprocessed") \
            .execute()
        vault_count = len(vault_res.data or [])

        # ── Today's expenses — table may not exist yet, skip gracefully
        expenses = []
        total_spent = 0.0
        try:
            expenses_res = supabase.table("expenses") \
                .select("amount,merchant,category") \
                .eq("user_id", user_id) \
                .eq("date", today_date) \
                .execute()
            expenses = expenses_res.data or []
            total_spent = sum(float(e.get("amount", 0)) for e in expenses)
        except Exception:
            pass  # table doesn't exist yet

        # ── Build context
        def fmt_time(iso):
            try:
                dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
                pht = dt + timedelta(hours=8)
                return pht.strftime("%-I:%M %p")
            except Exception:
                return iso[:10]

        events_text = "\n".join(
            f"- {e['title']} at {fmt_time(e['start_at'])}" + (f" [{e['location']}]" if e.get("location") else "")
            for e in events
        ) if events else "No events today."

        tasks_text = "\n".join(
            f"- [{t.get('priority','low')}] {t['title']}" + (f" (due {t['due_date']})" if t.get("due_date") else "")
            for t in tasks
        ) if tasks else "No active tasks."

        expenses_text = f"₱{total_spent:.0f} spent today across {len(expenses)} transaction(s)." if expenses else "No spending today."

        context = f"""Today is {today_str} in the Philippines.

Schedule today:
{events_text}

Active tasks:
{tasks_text}

Spending: {expenses_text}
Vault items to sort: {vault_count}"""

        system = (
            f"You are {assistant_name}, a warm personal assistant. "
            "Write a brief morning briefing (3-6 lines max) for the user's home screen. "
            "Use Markdown: bold key items, use bullet points if helpful. "
            "Be encouraging and specific. Reference actual events and tasks by name. "
            "Do not use headers. Keep it warm and conversational."
        )

        insight = await get_ai_response_async(system, context)
        result  = insight.strip()

        # Store in server-side cache for the rest of the day
        _insight_cache[user_id] = {"date": today_date, "insight": result}

        return {"insight": result}

    except Exception as e:
        print(f"[daily_insight] error for user {user_id}: {e}")
        return {"insight": ""}


@router.get("/hub-snapshot")
async def hub_snapshot(hub_id: str, user_id: str):
    """Short AI summary of recent hub activity for the Hub Snapshot widget."""
    try:
        assistant_name = ASSISTANT_NAME
        try:
            profile = supabase.table("user_profiles").select("assistant_name").eq("id", user_id).maybe_single().execute().data
            if profile and profile.get("assistant_name"):
                assistant_name = profile["assistant_name"]
        except Exception:
            pass

        # Fetch hub name
        hub_res = supabase.table("hubs").select("name").eq("id", hub_id).maybe_single().execute().data
        hub_name = hub_res.get("name", "this hub") if hub_res else "this hub"

        # Recent tasks
        tasks_res = supabase.table("tasks") \
            .select("title,status,priority") \
            .eq("hub_id", hub_id) \
            .neq("status", "done") \
            .order("created_at", desc=True) \
            .limit(8).execute()
        tasks = tasks_res.data or []

        # Recent annotations
        ann_res = supabase.table("annotations") \
            .select("content,category") \
            .eq("hub_id", hub_id) \
            .order("created_at", desc=True) \
            .limit(6).execute()
        annotations = ann_res.data or []

        tasks_text = "\n".join(
            f"- [{t.get('priority','low')}] {t['title']} ({t['status']})"
            for t in tasks
        ) or "No open tasks."

        notes_text = "\n".join(
            f"- [{a.get('category','')}] {a['content'][:80]}"
            for a in annotations
        ) or "No notes."

        context = f"""Hub: {hub_name}

Open tasks:
{tasks_text}

Recent notes:
{notes_text}"""

        system = (
            f"You are {assistant_name}. Write a 2-3 sentence snapshot of what's happening "
            "in this hub. Be specific, warm, and concise. No headers or bullet points."
        )

        summary = await get_ai_response_async(system, context)
        return {
            "summary":     summary.strip(),
            "tasks":       tasks,
            "annotations": annotations,
            "hub_name":    hub_name,
        }

    except Exception as e:
        print(f"[hub_snapshot] error: {e}")
        return {"summary": "", "tasks": [], "annotations": [], "hub_name": ""}


# ── UI Layout Assistant ───────────────────────────────────────────────────────

class UIAssistRequest(BaseModel):
    message: str
    current_definition: dict[str, Any]
    schema_fields: list[dict[str, Any]]
    assistant_name: str = "Assistant"


@router.post("/ui-assist")
async def ui_layout_assist(body: UIAssistRequest):
    """AI assistant for the Module Creator UI Builder canvas."""
    schema_text = "\n".join(
        f"- {f.get('key')}: {f.get('label')} ({f.get('type')}{'*' if f.get('required') else ''})"
        + (f"  options={f.get('options')}" if f.get('options') else "")
        for f in body.schema_fields
    )
    current_json = json.dumps(body.current_definition, separators=(',', ':'))

    system = (
        f"You are a UI layout assistant for TAKDA, a personal life management app.\n"
        "The user is designing a module entry form using a canvas. Help them modify the layout.\n\n"
        f"SCHEMA FIELDS AVAILABLE:\n{schema_text}\n\n"
        f"CURRENT LAYOUT:\n{current_json}\n\n"
        "AVAILABLE BLOCK TYPES: field_input, section_header, divider, spacer (size: sm/md/lg), "
        "assistant_nudge, save_button, cancel_button\n\n"
        "COMPONENT TYPES FOR FIELD INPUTS: text_input, longtext_input, number_input, currency_input, "
        "counter_stepper, boolean_toggle, date_picker, datetime_picker, select_chips, select_dropdown\n\n"
        "RULES:\n"
        "- Never invent field_key values. Only use keys from the schema above.\n"
        "- Always keep at least one save_button block.\n"
        "- Use span 12 for most blocks. Use span 6 for side-by-side pairs.\n"
        "- IDs must be unique strings: row_1, row_2... col_1, col_2...\n"
        "- version must be exactly \"1.0\"\n\n"
        "Respond with exactly two parts:\n"
        "1. A plain-text description of what you changed (2-5 bullet points, no JSON)\n"
        "2. The complete updated UIDefinition JSON wrapped in <ui_definition>...</ui_definition> tags\n\n"
        "Do not include any other text outside these two parts."
    )

    try:
        response_text = await get_ai_response_async(system, body.message)

        # Extract description (everything before the first <ui_definition> tag)
        tag = "<ui_definition>"
        end_tag = "</ui_definition>"
        tag_idx = response_text.find(tag)
        if tag_idx < 0:
            raise ValueError("No <ui_definition> tag in response")

        description = response_text[:tag_idx].strip()
        json_start = tag_idx + len(tag)
        json_end = response_text.find(end_tag, json_start)
        if json_end < 0:
            raise ValueError("Unclosed <ui_definition> tag")

        raw_json = response_text[json_start:json_end].strip()
        new_definition = json.loads(raw_json)

        return {"description": description, "new_definition": new_definition}

    except Exception as e:
        print(f"[ui_layout_assist] error: {e}")
        raise HTTPException(
            status_code=422,
            detail="Agent returned an invalid layout. Try rephrasing your request.",
        )
