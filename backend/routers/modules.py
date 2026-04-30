from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from database import supabase

router = APIRouter(prefix="/modules", tags=["modules"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class ModuleEntryCreate(BaseModel):
    user_id: str
    hub_id: Optional[str] = None
    data: dict[str, Any]
    schema_key: Optional[str] = "default"


class ModuleDefinitionCreate(BaseModel):
    user_id: str
    slug: str
    name: str
    description: Optional[str] = None
    schema_fields: list[dict[str, Any]]
    layout: dict[str, Any]
    is_global: bool = False
    is_private: bool = True
    aly_config: Optional[dict[str, Any]] = None
    ui_definition: Optional[dict[str, Any]] = None
    status: Optional[str] = None
    # V2 fields
    schemas: Optional[dict[str, Any]] = None
    computed_properties: Optional[list[dict[str, Any]]] = None
    behaviors: Optional[dict[str, Any]] = None
    mobile_config: Optional[dict[str, Any]] = None
    web_config: Optional[dict[str, Any]] = None
    category: Optional[str] = None
    icon_name: Optional[str] = None
    brand_color: Optional[str] = None


class ModuleDefinitionUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    schema_fields: Optional[list[dict[str, Any]]] = None
    layout: Optional[dict[str, Any]] = None
    is_global: Optional[bool] = None
    is_private: Optional[bool] = None
    aly_config: Optional[dict[str, Any]] = None
    ui_definition: Optional[dict[str, Any]] = None
    status: Optional[str] = None
    # V2 fields
    schemas: Optional[dict[str, Any]] = None
    computed_properties: Optional[list[dict[str, Any]]] = None
    behaviors: Optional[dict[str, Any]] = None
    mobile_config: Optional[dict[str, Any]] = None
    web_config: Optional[dict[str, Any]] = None
    category: Optional[str] = None
    icon_name: Optional[str] = None
    brand_color: Optional[str] = None


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Definition endpoints ──────────────────────────────────────────────────────

@router.get("/definitions")
async def get_module_definitions(user_id: Optional[str] = None):
    query = supabase.table("module_definitions").select("*")
    if user_id:
        query = query.or_(f"is_global.eq.true,user_id.eq.{user_id}")
    else:
        query = query.eq("is_global", True)
    res = query.execute()
    return res.data


@router.get("/definitions/{def_id}")
async def get_module_definition(def_id: str):
    res = supabase.table("module_definitions").select("*").eq("id", def_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Module definition not found")
    return res.data


@router.post("/definitions")
async def create_module_definition(body: ModuleDefinitionCreate):
    res = supabase.table("module_definitions").insert({
        "user_id":             body.user_id,
        "slug":                body.slug,
        "name":                body.name,
        "description":         body.description,
        "schema":              body.schema_fields,
        "layout":              body.layout,
        "is_global":           body.is_global,
        "is_private":          body.is_private,
        "aly_config":          body.aly_config or {},
        "ui_definition":       body.ui_definition,
        "status":              body.status or "draft",
        "schemas":             body.schemas or {},
        "computed_properties": body.computed_properties or [],
        "behaviors":           body.behaviors or {},
        "mobile_config":       body.mobile_config or {},
        "web_config":          body.web_config or {},
        "category":            body.category,
        "icon_name":           body.icon_name,
        "brand_color":         body.brand_color,
        "version":             1,
        "updated_at":          _utcnow(),
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create module definition")
    return res.data[0]


@router.put("/definitions/{def_id}")
async def update_module_definition(def_id: str, body: ModuleDefinitionUpdate):
    updates: dict[str, Any] = {"updated_at": _utcnow()}
    if body.slug               is not None: updates["slug"]                = body.slug
    if body.name               is not None: updates["name"]                = body.name
    if body.description        is not None: updates["description"]         = body.description
    if body.schema_fields      is not None: updates["schema"]              = body.schema_fields
    if body.layout             is not None: updates["layout"]              = body.layout
    if body.is_global          is not None: updates["is_global"]           = body.is_global
    if body.is_private         is not None: updates["is_private"]          = body.is_private
    if body.aly_config         is not None: updates["aly_config"]          = body.aly_config
    if body.ui_definition      is not None: updates["ui_definition"]       = body.ui_definition
    if body.status             is not None: updates["status"]              = body.status
    if body.schemas            is not None: updates["schemas"]             = body.schemas
    if body.computed_properties is not None: updates["computed_properties"] = body.computed_properties
    if body.behaviors          is not None: updates["behaviors"]           = body.behaviors
    if body.mobile_config      is not None: updates["mobile_config"]       = body.mobile_config
    if body.web_config         is not None: updates["web_config"]          = body.web_config
    if body.category           is not None: updates["category"]            = body.category
    if body.icon_name          is not None: updates["icon_name"]           = body.icon_name
    if body.brand_color        is not None: updates["brand_color"]         = body.brand_color
    if len(updates) == 1:  # only updated_at
        raise HTTPException(status_code=400, detail="No fields to update")
    res = supabase.table("module_definitions").update(updates).eq("id", def_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update module definition")
    return res.data[0]


@router.patch("/definitions/{def_id}/autosave")
async def autosave_module_definition(def_id: str, body: dict[str, Any]):
    allowed = {
        'name', 'description', 'schema', 'schemas', 'layout', 'aly_config',
        'ui_definition', 'computed_properties', 'behaviors', 'mobile_config',
        'web_config', 'category', 'icon_name', 'brand_color', 'slug',
    }
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return {"ok": True}
    updates["updated_at"] = _utcnow()
    res = supabase.table("module_definitions").update(updates).eq("id", def_id).execute()
    return {"ok": bool(res.data)}


@router.post("/definitions/{def_id}/publish")
async def publish_module_definition(def_id: str, body: dict[str, Any]):
    visibility = body.get("visibility", "private")
    res = supabase.table("module_definitions").select("version").eq("id", def_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Not found")
    new_version = (res.data.get("version") or 1) + 1
    updates = {
        "status":     "published",
        "version":    new_version,
        "is_private": visibility == "private",
        "is_global":  visibility == "public",
        "updated_at": _utcnow(),
    }
    result = supabase.table("module_definitions").update(updates).eq("id", def_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/definitions/{def_id}")
async def delete_module_definition(def_id: str):
    supabase.table("module_definitions").delete().eq("id", def_id).execute()
    return {"deleted": True}


# ── Entry endpoints ───────────────────────────────────────────────────────────

@router.get("/{def_id}/entries")
async def get_module_entries(
    def_id: str,
    hub_id:     Optional[str] = None,
    user_id:    Optional[str] = None,
    schema_key: Optional[str] = None,
    limit:      int = 50,
    offset:     int = 0,
):
    query = supabase.table("module_entries").select("*").eq("module_def_id", def_id)
    if hub_id and hub_id not in ("null", "all"):
        query = query.eq("hub_id", hub_id)
    if user_id:
        query = query.eq("user_id", user_id)
    if schema_key and schema_key != "all":
        query = query.eq("schema_key", schema_key)
    res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return res.data


@router.post("/{def_id}/entries")
async def create_module_entry(def_id: str, body: ModuleEntryCreate):
    row: dict[str, Any] = {
        "module_def_id": def_id,
        "user_id":       body.user_id,
        "data":          body.data,
        "schema_key":    body.schema_key or "default",
    }
    if body.hub_id:
        row["hub_id"] = body.hub_id
    res = supabase.table("module_entries").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create module entry")
    return res.data[0]


@router.put("/{def_id}/entries/{entry_id}")
async def update_module_entry(def_id: str, entry_id: str, body: ModuleEntryCreate):
    updates: dict[str, Any] = {"data": body.data}
    if body.hub_id is not None:
        updates["hub_id"] = body.hub_id
    res = (
        supabase.table("module_entries")
        .update(updates)
        .eq("id", entry_id)
        .eq("user_id", body.user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Entry not found or not authorized")
    return res.data[0]


@router.delete("/entries/{entry_id}")
async def delete_module_entry(entry_id: str):
    supabase.table("module_entries").delete().eq("id", entry_id).execute()
    return {"status": "success"}
