import os
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")


# ── Models ────────────────────────────────────────────────────────────────────

class RatingBody(BaseModel):
    user_id: str
    rating:  int          # 1–5
    review:  Optional[str] = None


# ── Module detail ─────────────────────────────────────────────────────────────

@router.get("/modules/{slug}")
async def get_module_detail(slug: str):
    """Return full module definition by slug for the detail page."""
    res = supabase.table("module_definitions") \
        .select("*, user:user_profiles(display_name, avatar_url)") \
        .eq("slug", slug) \
        .maybe_single() \
        .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Module not found")
    return res.data


# ── Ratings ───────────────────────────────────────────────────────────────────

@router.get("/modules/{slug}/ratings")
async def get_ratings(slug: str, limit: int = 20, offset: int = 0):
    """Return paginated ratings for a module."""
    # Resolve def ID from slug
    def_res = supabase.table("module_definitions") \
        .select("id, avg_rating, rating_count") \
        .eq("slug", slug) \
        .maybe_single() \
        .execute()
    if not def_res.data:
        raise HTTPException(status_code=404, detail="Module not found")

    def_id = def_res.data["id"]

    # Fetch reviews with reviewer display_name
    reviews_res = supabase.table("module_ratings") \
        .select("id, rating, review, created_at, user:user_profiles(display_name, avatar_url)") \
        .eq("module_def_id", def_id) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()

    return {
        "avg_rating":   def_res.data.get("avg_rating"),
        "rating_count": def_res.data.get("rating_count", 0),
        "reviews":      reviews_res.data or [],
    }


@router.post("/modules/{slug}/rate")
async def rate_module(slug: str, body: RatingBody):
    """Upsert a rating for a module. Trigger recalculates avg_rating automatically."""
    if not 1 <= body.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    def_res = supabase.table("module_definitions") \
        .select("id") \
        .eq("slug", slug) \
        .maybe_single() \
        .execute()
    if not def_res.data:
        raise HTTPException(status_code=404, detail="Module not found")

    def_id = def_res.data["id"]

    result = supabase.table("module_ratings").upsert({
        "module_def_id": def_id,
        "user_id":       body.user_id,
        "rating":        body.rating,
        "review":        body.review,
        "updated_at":    "now()",
    }, on_conflict="module_def_id,user_id").execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save rating")

    # Re-fetch updated stats (trigger may take a moment; return optimistic)
    return {
        "status": "ok",
        "rating": body.rating,
        "review": body.review,
    }


@router.delete("/modules/{slug}/rate")
async def delete_rating(slug: str, user_id: str):
    """Remove a user's rating for a module."""
    def_res = supabase.table("module_definitions") \
        .select("id") \
        .eq("slug", slug) \
        .maybe_single() \
        .execute()
    if not def_res.data:
        raise HTTPException(status_code=404, detail="Module not found")

    supabase.table("module_ratings") \
        .delete() \
        .eq("module_def_id", def_res.data["id"]) \
        .eq("user_id", user_id) \
        .execute()

    return {"status": "deleted"}


# ── Creator profile ───────────────────────────────────────────────────────────

@router.get("/creators/{user_id}")
async def get_creator_profile(user_id: str):
    """Return a creator's public profile and their published modules."""
    profile_res = supabase.table("user_profiles") \
        .select("id, display_name, avatar_url, context_bio") \
        .eq("id", user_id) \
        .maybe_single() \
        .execute()

    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Creator not found")

    modules_res = supabase.table("module_definitions") \
        .select("id, slug, name, description, brand_color, avg_rating, rating_count, version, updated_at, category") \
        .eq("user_id", user_id) \
        .eq("status", "published") \
        .eq("is_private", False) \
        .order("updated_at", desc=True) \
        .execute()

    return {
        "profile": profile_res.data,
        "modules": modules_res.data or [],
    }


# ── Creator analytics ─────────────────────────────────────────────────────────

@router.get("/analytics/creator/{user_id}")
async def get_creator_analytics(user_id: str):
    """
    Analytics for a creator's dashboard.
    Returns per-module install counts, revenue, and rating stats.
    """
    # Get all modules by this creator
    mods_res = supabase.table("module_definitions") \
        .select("id, slug, name, brand_color, status, avg_rating, rating_count, version") \
        .eq("user_id", user_id) \
        .execute()
    modules = mods_res.data or []

    if not modules:
        return {"modules": [], "totals": {"installs": 0, "revenue": 0.0, "modules": 0}}

    slugs  = [m["slug"] for m in modules]
    def_ids = [m["id"]  for m in modules]

    # Install counts via hub_addons
    installs_res = supabase.table("hub_addons") \
        .select("type") \
        .in_("type", slugs) \
        .execute()
    install_counts: dict[str, int] = {}
    for row in (installs_res.data or []):
        install_counts[row["type"]] = install_counts.get(row["type"], 0) + 1

    # Completed revenue per module
    revenue_res = supabase.table("transactions") \
        .select("module_def_id, amount_creator_payout") \
        .in_("module_def_id", def_ids) \
        .eq("status", "completed") \
        .execute()
    revenue_map: dict[str, float] = {}
    for row in (revenue_res.data or []):
        mid = row["module_def_id"]
        revenue_map[mid] = revenue_map.get(mid, 0.0) + float(row.get("amount_creator_payout") or 0)

    # Enrich each module
    enriched = []
    total_installs = 0
    total_revenue  = 0.0
    for m in modules:
        installs = install_counts.get(m["slug"], 0)
        revenue  = revenue_map.get(m["id"], 0.0)
        total_installs += installs
        total_revenue  += revenue
        enriched.append({
            **m,
            "install_count": installs,
            "revenue":       round(revenue, 2),
        })

    return {
        "modules": enriched,
        "totals": {
            "installs": total_installs,
            "revenue":  round(total_revenue, 2),
            "modules":  len(modules),
        },
    }


# ── Admin review queue ────────────────────────────────────────────────────────

def _require_admin(admin_key: Optional[str]):
    if not ADMIN_SECRET:
        return  # no admin secret configured → open (dev mode)
    if admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin key")


@router.get("/admin/review-queue")
async def get_review_queue(x_admin_key: Optional[str] = Header(None)):
    """Return modules pending admin review before public listing."""
    _require_admin(x_admin_key)
    res = supabase.table("module_definitions") \
        .select("id, slug, name, description, status, version, created_at, updated_at, "
                "user:user_profiles(display_name)") \
        .eq("status", "pending_review") \
        .order("created_at") \
        .execute()
    return res.data or []


@router.post("/admin/review/{module_id}")
async def review_module(
    module_id:     str,
    action:        str,              # 'approve' | 'reject'
    reason:        Optional[str] = None,
    x_admin_key:   Optional[str] = Header(None),
):
    """Approve or reject a module in the review queue."""
    _require_admin(x_admin_key)
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    new_status = "published" if action == "approve" else "draft"
    update: dict = {"status": new_status}
    if reason:
        update["admin_notes"] = reason

    res = supabase.table("module_definitions") \
        .update(update) \
        .eq("id", module_id) \
        .execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Module not found")

    return {"status": new_status, "module_id": module_id}
