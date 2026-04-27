from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta
from database import supabase

router = APIRouter(prefix="/habits", tags=["habits"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class HabitCreate(BaseModel):
    user_id: str
    name: str
    color: str = "#6366f1"
    icon: str = "Star"
    frequency: str = "daily"

class HabitLog(BaseModel):
    user_id: str
    log_date: Optional[str] = None   # YYYY-MM-DD, defaults to today PHT


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
def list_habits(user_id: str):
    res = supabase.table("habit_trackers") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at") \
        .execute()
    return res.data or []


@router.post("")
def create_habit(body: HabitCreate):
    res = supabase.table("habit_trackers").insert({
        "user_id":   body.user_id,
        "name":      body.name,
        "color":     body.color,
        "icon":      body.icon,
        "frequency": body.frequency,
    }).execute()
    return res.data[0] if res.data else {}


@router.delete("/{habit_id}")
def delete_habit(habit_id: str):
    supabase.table("habit_trackers").delete().eq("id", habit_id).execute()
    return {"ok": True}


@router.post("/{habit_id}/log")
def log_habit(habit_id: str, body: HabitLog):
    target_date = body.log_date or date.today().isoformat()
    supabase.table("habit_logs").upsert(
        {"habit_id": habit_id, "user_id": body.user_id, "logged_date": target_date},
        on_conflict="habit_id,logged_date",
    ).execute()
    return {"ok": True, "date": target_date}


@router.delete("/{habit_id}/log")
def unlog_habit(habit_id: str, user_id: str, log_date: Optional[str] = None):
    target_date = log_date or date.today().isoformat()
    supabase.table("habit_logs") \
        .delete() \
        .eq("habit_id", habit_id) \
        .eq("user_id", user_id) \
        .eq("logged_date", target_date) \
        .execute()
    return {"ok": True}


@router.get("/{habit_id}/streak")
def get_streak(habit_id: str, user_id: str):
    """
    Returns current streak, today's completion status, and last-28-day heatmap.
    Streak = consecutive days with a log entry ending today (if done) or yesterday (if not).
    """
    start = (date.today() - timedelta(days=90)).isoformat()
    res = supabase.table("habit_logs") \
        .select("logged_date") \
        .eq("habit_id", habit_id) \
        .eq("user_id", user_id) \
        .gte("logged_date", start) \
        .execute()

    logged_dates = {r["logged_date"] for r in (res.data or [])}
    today = date.today()
    completed_today = today.isoformat() in logged_dates

    # Count streak backwards from today (if done) or yesterday
    check = today if completed_today else today - timedelta(days=1)
    streak = 0
    while check.isoformat() in logged_dates:
        streak += 1
        check -= timedelta(days=1)

    # Last 28 days for the heatmap
    last_28 = [
        {"date": (today - timedelta(days=i)).isoformat(),
         "done": (today - timedelta(days=i)).isoformat() in logged_dates}
        for i in range(27, -1, -1)
    ]

    return {
        "streak":          streak,
        "completed_today": completed_today,
        "last_28_days":    last_28,
        "total_logs":      len(logged_dates),
    }
