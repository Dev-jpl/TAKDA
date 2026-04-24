from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
import calendar
import asyncio
from database import supabase

router = APIRouter(prefix="/addons", tags=["addons"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class InstallAddonBody(BaseModel):
    hub_id: str
    user_id: str
    type: str
    config: dict = {}

class UpdateAddonConfigBody(BaseModel):
    config: dict

class LogFoodBody(BaseModel):
    user_id: str
    food_name: str
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    meal_type: str = "meal"
    logged_at: Optional[str] = None

class LogExpenseBody(BaseModel):
    user_id: str
    amount: float
    item: Optional[str] = None
    merchant: Optional[str] = None
    category: str = "General"
    currency: str = "PHP"
    date: Optional[str] = None


# ── Addon CRUD ────────────────────────────────────────────────────────────────

@router.get("/{hub_id}")
async def list_addons(hub_id: str):
    """List all addons installed on a hub."""
    res = supabase.table("hub_addons").select("*").eq("hub_id", hub_id).order("created_at").execute()
    return res.data


@router.post("")
async def install_addon(body: InstallAddonBody):
    """Install an addon on a hub (idempotent — returns existing if already installed)."""
    # Check if already installed
    existing = supabase.table("hub_addons") \
        .select("*").eq("hub_id", body.hub_id).eq("type", body.type).execute()
    if existing.data:
        return existing.data[0]

    res = supabase.table("hub_addons").insert({
        "hub_id": body.hub_id,
        "user_id": body.user_id,
        "type": body.type,
        "config": body.config,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to install addon")
    return res.data[0]


@router.patch("/{addon_id}/config")
async def update_addon_config(addon_id: str, body: UpdateAddonConfigBody):
    """Update an addon's config (e.g. calorie goal)."""
    supabase.table("hub_addons").update({"config": body.config}).eq("id", addon_id).execute()
    return {"status": "success"}


@router.delete("/{addon_id}")
async def uninstall_addon(addon_id: str):
    """Uninstall an addon from a hub (data is NOT deleted)."""
    supabase.table("hub_addons").delete().eq("id", addon_id).execute()
    return {"status": "success"}


# ── Calorie Counter logs ──────────────────────────────────────────────────────

@router.get("/{hub_id}/calorie_counter/logs")
async def get_calorie_logs(hub_id: str, date: Optional[str] = Query(None), user_id: Optional[str] = Query(None), limit: Optional[int] = Query(None)):
    """Get food logs for a hub using module system."""
    # Get module def
    def_res = supabase.table("module_definitions").select("id").eq("slug", "calorie_counter").execute()
    if not def_res.data:
        return []
    def_id = def_res.data[0]["id"]

    print(f"[get_calorie_logs] hub_id={hub_id}, date={date}, user_id={user_id}")
    q = supabase.table("module_entries").select("*").eq("module_def_id", def_id)
    
    # Match specific hub if provided, else consolidate
    if hub_id and hub_id != "null" and hub_id != "all":
        q = q.eq("hub_id", hub_id)
    
    if user_id:
        q = q.eq("user_id", user_id)
    
    if date:
        q = q.filter("data->>logged_at", "like", f"{date}%")
    
    res = q.order("created_at", desc=True).execute()
    print(f"[get_calorie_logs] Found {len(res.data) if res.data else 0} entries")
    # Fetch both modern and legacy logs
    # Using a helper to fetch legacy data
    async def fetch_legacy():
        try:
            l_q = supabase.table("food_logs").select("*")
            if hub_id and hub_id != "null" and hub_id != "all":
                l_q = l_q.eq("hub_id", hub_id)
            if user_id:
                l_q = l_q.eq("user_id", user_id)
            if date:
                try:
                    start_dt = datetime.strptime(date, "%Y-%m-%d")
                    end_dt = start_dt + timedelta(days=1)
                    l_q = l_q.gte("logged_at", start_dt.isoformat()).lt("logged_at", end_dt.isoformat())
                except ValueError:
                    pass
            # run in thread since execute() is blocking
            l_res = await asyncio.to_thread(l_q.order("logged_at", desc=True).execute)
            return l_res.data if l_res.data else []
        except Exception as e:
            print(f"Legacy food_logs query failed: {e}")
            return []

    # Prepare entries from modern logs
    entries = []
    if res.data:
        entries = [{"id": r["id"], **r["data"], "created_at": r["created_at"], "user_id": r["user_id"], "hub_id": r["hub_id"]} for r in res.data]

    # Fetch legacy in parallel with entries preparation (simulated)
    legacy_data = await fetch_legacy()
    entries.extend(legacy_data)

    # Sort combined entries by logged_at descending
    entries.sort(key=lambda x: x.get("logged_at", ""), reverse=True)

    return entries


@router.post("/{hub_id}/calorie_counter/logs")
async def log_food(hub_id: str, body: LogFoodBody):
    """Log a food entry using module system."""
    def_res = supabase.table("module_definitions").select("id").eq("slug", "calorie_counter").execute()
    if not def_res.data:
        raise HTTPException(status_code=404, detail="Module not found")
    def_id = def_res.data[0]["id"]

    data = {
        "food_name": body.food_name,
        "calories": body.calories,
        "protein_g": body.protein_g,
        "carbs_g": body.carbs_g,
        "fat_g": body.fat_g,
        "meal_type": body.meal_type,
        "logged_at": body.logged_at or datetime.now().isoformat(),
    }

    res = supabase.table("module_entries").insert({
        "module_def_id": def_id,
        "hub_id": hub_id,
        "user_id": body.user_id,
        "data": data
    }).execute()
    
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to log food")
    
    r = res.data[0]
    return {"id": r["id"], **r["data"], "created_at": r["created_at"], "user_id": r["user_id"], "hub_id": r["hub_id"]}


@router.delete("/calorie_counter/logs/{log_id}")
async def delete_food_log(log_id: str):
    """Delete a food log entry from module_entries."""
    supabase.table("module_entries").delete().eq("id", log_id).execute()
    return {"status": "success"}


# ── Expense Tracker logs ──────────────────────────────────────────────────────

@router.get("/{hub_id}/expense_tracker/logs")
async def get_expense_logs(hub_id: str, month: Optional[str] = Query(None), user_id: Optional[str] = Query(None)):
    """Get expense logs for a hub using module system."""
    def_res = supabase.table("module_definitions").select("id").eq("slug", "expense_tracker").execute()
    if not def_res.data:
        return []
    def_id = def_res.data[0]["id"]

    print(f"[get_expense_logs] hub_id={hub_id}, month={month}, user_id={user_id}")
    q = supabase.table("module_entries").select("*").eq("module_def_id", def_id)
    
    # Match specific hub if provided, else consolidate
    if hub_id and hub_id != "null" and hub_id != "all":
        q = q.eq("hub_id", hub_id)
    
    if user_id:
        q = q.eq("user_id", user_id)
    
    if month:
        q = q.filter("data->>date", "like", f"{month}%")

    res = q.order("created_at", desc=True).execute()
    print(f"[get_expense_logs] Found {len(res.data) if res.data else 0} entries")
    
    entries = []
    if res.data:
        entries = [{"id": r["id"], **r["data"], "created_at": r["created_at"], "user_id": r["user_id"], "hub_id": r["hub_id"]} for r in res.data]

    # Also fetch legacy expenses to merge
    try:
        legacy_q = supabase.table("expenses").select("*")
        if hub_id and hub_id != "null" and hub_id != "all":
            legacy_q = legacy_q.eq("hub_id", hub_id)
        if user_id:
            legacy_q = legacy_q.eq("user_id", user_id)
        if month:
            legacy_q = legacy_q.filter("date", "like", f"{month}%")
        legacy_res = legacy_q.order("date", desc=True).execute()
        if legacy_res.data:
            entries.extend(legacy_res.data)
    except Exception as e:
        print(f"Legacy expenses query failed: {e}")

    # Sort by date descending
    entries.sort(key=lambda x: x.get("date", ""), reverse=True)

    return entries


@router.post("/{hub_id}/expense_tracker/logs")
async def log_expense(hub_id: str, body: LogExpenseBody):
    """Log an expense using module system."""
    def_res = supabase.table("module_definitions").select("id").eq("slug", "expense_tracker").execute()
    if not def_res.data:
        raise HTTPException(status_code=404, detail="Module not found")
    def_id = def_res.data[0]["id"]

    data = {
        "amount": body.amount,
        "item": body.item,
        "merchant": body.merchant,
        "category": body.category,
        "currency": body.currency,
        "date": body.date or datetime.now().date().isoformat(),
    }

    res = supabase.table("module_entries").insert({
        "module_def_id": def_id,
        "hub_id": hub_id,
        "user_id": body.user_id,
        "data": data
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to log expense")
    
    r = res.data[0]
    return {"id": r["id"], **r["data"], "created_at": r["created_at"], "user_id": r["user_id"], "hub_id": r["hub_id"]}


@router.delete("/expense_tracker/logs/{expense_id}")
async def delete_expense(expense_id: str):
    """Delete an expense log from module_entries."""
    supabase.table("module_entries").delete().eq("id", expense_id).execute()
    return {"status": "success"}


# ── Sleep Tracker logs ────────────────────────────────────────────────────────

@router.get("/{hub_id}/sleep_tracker/logs")
async def get_sleep_logs(hub_id: str, limit: Optional[int] = Query(None)):
    """Get sleep logs for a hub. Returns empty list until sleep_logs table is created."""
    return []


# ── Workout Log logs ──────────────────────────────────────────────────────────

@router.get("/{hub_id}/workout_log/logs")
async def get_workout_logs(hub_id: str, limit: Optional[int] = Query(None)):
    """Get workout logs for a hub. Returns empty list until workout_logs table is created."""
    return []
