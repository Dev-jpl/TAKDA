from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/vault", tags=["vault"])

# ── Models ────────────────────────────────────────────────────────────────────

class VaultItemCreate(BaseModel):
    user_id: str
    content: str
    content_type: str = "text"

class AcceptBody(BaseModel):
    hub_id: str
    module: str = "track"   # target module slug; 'track' → tasks table

class VaultItemUpdate(BaseModel):
    content: str

# ── Keyword signals for auto-routing ─────────────────────────────────────────

_FOOD_KEYWORDS = {"calorie", "calories", "kcal", "food", "meal", "ate", "lunch",
                  "dinner", "breakfast", "snack", "protein", "carb", "fat", "ate"}
_EXPENSE_KEYWORDS = {"spent", "expense", "bought", "paid", "cost", "purchase",
                     "money", "piso", "peso", "php", "₱"}

def _detect_module_slug(content: str, explicit_module: str) -> str:
    """
    Determine which module to route the vault item to.
    Uses the explicit module override when set, otherwise infers from content.
    """
    if explicit_module and explicit_module != "track":
        return explicit_module

    lower = content.lower()
    if any(k in lower for k in _FOOD_KEYWORDS):
        return "calorie_counter"
    if any(k in lower for k in _EXPENSE_KEYWORDS):
        return "expense_tracker"
    # Default: task
    return "track"


def _get_module_def_id(slug: str) -> Optional[str]:
    res = supabase.table("module_definitions") \
        .select("id") \
        .eq("slug", slug) \
        .limit(1) \
        .execute()
    return res.data[0]["id"] if res.data else None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/{user_id}")
async def get_vault_items(user_id: str, status: Optional[str] = None):
    q = supabase.table("vault_items") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    return q.execute().data or []


@router.post("/")
async def create_vault_item(body: VaultItemCreate):
    res = supabase.table("vault_items").insert({
        "user_id": body.user_id,
        "content": body.content,
        "content_type": body.content_type,
        "status": "unprocessed",
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create vault item")
    return res.data[0]


@router.patch("/{item_id}")
async def update_vault_item(item_id: str, body: VaultItemUpdate):
    res = supabase.table("vault_items").update({
        "content": body.content,
        "updated_at": "now()",
    }).eq("id", item_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return res.data[0]


@router.patch("/{item_id}/accept")
async def accept_suggestion(item_id: str, body: AcceptBody):
    # Mark the vault item as processed
    res = supabase.table("vault_items").update({
        "status": "processed",
        "updated_at": "now()",
    }).eq("id", item_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Item not found")

    item    = res.data[0]
    user_id = item["user_id"]
    content = item.get("content", "")

    # Determine routing target
    slug = _detect_module_slug(content, body.module)

    if slug == "track":
        # Create a task
        supabase.table("tasks").insert({
            "user_id": user_id,
            "hub_id":  body.hub_id,
            "title":   content[:200],
            "status":  "todo",
            "priority":"low",
        }).execute()

    elif slug in ("calorie_counter", "expense_tracker"):
        # Route to module_entries
        def_id = _get_module_def_id(slug)
        if def_id:
            # Build a minimal data payload from the content string
            data: dict = {"note": content}
            supabase.table("module_entries").insert({
                "module_def_id": def_id,
                "user_id":       user_id,
                "hub_id":        body.hub_id,
                "data":          data,
                "schema_key":    "default",
            }).execute()
        else:
            # Fallback: annotation
            supabase.table("annotations").insert({
                "user_id":  user_id,
                "hub_id":   body.hub_id,
                "content":  content,
                "category": "general",
            }).execute()

    else:
        # Unknown custom module slug — try to route to module_entries
        def_id = _get_module_def_id(slug)
        if def_id:
            supabase.table("module_entries").insert({
                "module_def_id": def_id,
                "user_id":       user_id,
                "hub_id":        body.hub_id,
                "data":          {"note": content},
                "schema_key":    "default",
            }).execute()
        else:
            # Final fallback: annotation
            supabase.table("annotations").insert({
                "user_id":  user_id,
                "hub_id":   body.hub_id,
                "content":  content,
                "category": "general",
            }).execute()

    return {"status": "accepted", "id": item_id, "routed_to": slug}


@router.patch("/{item_id}/dismiss")
async def dismiss_suggestion(item_id: str):
    res = supabase.table("vault_items").update({
        "status": "dismissed",
        "updated_at": "now()",
    }).eq("id", item_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "dismissed", "id": item_id}


@router.delete("/{item_id}")
async def delete_vault_item(item_id: str):
    supabase.table("vault_items").delete().eq("id", item_id).execute()
    return {"status": "deleted", "id": item_id}
