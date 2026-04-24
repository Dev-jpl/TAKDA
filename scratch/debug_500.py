import os
import sys
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.getcwd() + '/backend')

from database import supabase

def test_query():
    hub_id = "64cdbf30-cd85-4fe0-9723-5293ecaf713a"
    date = "2026-04-23"
    
    # Simulate get_calorie_logs
    def_res = supabase.table("module_definitions").select("id").eq("slug", "calorie_counter").execute()
    print(f"Def Res: {def_res.data}")
    if not def_res.data:
        return
    def_id = def_res.data[0]["id"]

    try:
        q = supabase.table("module_entries").select("*").eq("module_def_id", def_id)
        if hub_id and hub_id != "null":
            q = q.or_(f"hub_id.eq.{hub_id},hub_id.is.null")
        
        user_id = None # Try with None first
        if user_id:
            q = q.eq("user_id", user_id)

        if date:
            q = q.filter("data->>logged_at", "like", f"{date}%")
            
        res = q.order("created_at", desc=True).execute()
        print(f"Entries Res: {len(res.data)} entries found")
    except Exception as e:
        print(f"Error in Entries Query: {e}")

    try:
        legacy_q = supabase.table("food_logs").select("*")
        if hub_id and hub_id != "null":
            legacy_q = legacy_q.or_(f"hub_id.eq.{hub_id},hub_id.is.null")
        
        if date:
            start_dt = datetime.strptime(date, "%Y-%m-%d")
            end_dt = start_dt + timedelta(days=1)
            legacy_q = legacy_q.gte("logged_at", start_dt.isoformat()).lt("logged_at", end_dt.isoformat())
            
        legacy_res = legacy_q.order("logged_at", desc=True).execute()
        print(f"Legacy Res: {len(legacy_res.data)} entries found")
    except Exception as e:
        print(f"Error in Legacy Query: {e}")

if __name__ == "__main__":
    test_query()
