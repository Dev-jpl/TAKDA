from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from database import supabase

router = APIRouter(prefix="/modules", tags=["modules"])


class ModuleEntryCreate(BaseModel):
    user_id: str
    hub_id: Optional[str] = None
    data: dict[str, Any]


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


class ModuleDefinitionUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    schema_fields: Optional[list[dict[str, Any]]] = None
    layout: Optional[dict[str, Any]] = None
    is_global: Optional[bool] = None
    is_private: Optional[bool] = None
    aly_config: Optional[dict[str, Any]] = None


@router.get("/definitions")
async def get_module_definitions(user_id: Optional[str] = None):
    """Get module definitions visible to the caller:
    global modules + any modules the caller owns (private or published)."""
    query = supabase.table("module_definitions").select("*")
    if user_id:
        # Global OR caller's own modules
        query = query.or_(f"is_global.eq.true,user_id.eq.{user_id}")
    else:
        query = query.eq("is_global", True)
    res = query.execute()
    return res.data


@router.post("/definitions")
async def create_module_definition(body: ModuleDefinitionCreate):
    res = supabase.table("module_definitions").insert({
        "user_id":    body.user_id,
        "slug":       body.slug,
        "name":       body.name,
        "description": body.description,
        "schema":     body.schema_fields,
        "layout":     body.layout,
        "is_global":  body.is_global,
        "is_private": body.is_private,
        "aly_config": body.aly_config or {},
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create module definition")
    return res.data[0]


@router.put("/definitions/{def_id}")
async def update_module_definition(def_id: str, body: ModuleDefinitionUpdate):
    updates: dict[str, Any] = {}
    if body.slug        is not None: updates["slug"]       = body.slug
    if body.name        is not None: updates["name"]       = body.name
    if body.description is not None: updates["description"]= body.description
    if body.schema_fields is not None: updates["schema"]   = body.schema_fields
    if body.layout      is not None: updates["layout"]     = body.layout
    if body.is_global   is not None: updates["is_global"]  = body.is_global
    if body.is_private  is not None: updates["is_private"] = body.is_private
    if body.aly_config  is not None: updates["aly_config"] = body.aly_config
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = supabase.table("module_definitions").update(updates).eq("id", def_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to update module definition")
    return res.data[0]


@router.delete("/definitions/{def_id}")
async def delete_module_definition(def_id: str):
    supabase.table("module_definitions").delete().eq("id", def_id).execute()
    return {"deleted": True}


@router.get("/{def_id}/entries")
async def get_module_entries(def_id: str, hub_id: Optional[str] = None, user_id: Optional[str] = None):
    query = supabase.table("module_entries").select("*").eq("module_def_id", def_id)
    if hub_id and hub_id not in ("null", "all"):
        query = query.eq("hub_id", hub_id)
    if user_id:
        query = query.eq("user_id", user_id)
    res = query.order("created_at", desc=True).execute()
    return res.data


@router.post("/{def_id}/entries")
async def create_module_entry(def_id: str, body: ModuleEntryCreate):
    row: dict[str, Any] = {
        "module_def_id": def_id,
        "user_id":       body.user_id,
        "data":          body.data,
    }
    if body.hub_id:
        row["hub_id"] = body.hub_id
    res = supabase.table("module_entries").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create module entry")
    return res.data[0]


@router.delete("/entries/{entry_id}")
async def delete_module_entry(entry_id: str):
    supabase.table("module_entries").delete().eq("id", entry_id).execute()
    return {"status": "success"}
