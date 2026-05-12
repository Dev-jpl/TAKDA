"""
payments.py — Stripe checkout + Connect for the TAKDA creator economy.

LIVE MODE:  set STRIPE_SECRET_KEY in .env → real Stripe sessions are created.
MOCK MODE:  STRIPE_SECRET_KEY absent/empty → returns a mock URL so the rest of
            the app works in development without a Stripe account.

Stripe credentials needed for live mode (add to .env):
  STRIPE_SECRET_KEY        sk_live_... or sk_test_...
  STRIPE_WEBHOOK_SECRET    whsec_...
  FRONTEND_URL             https://app.takda.io
"""

import os
import uuid
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional
from database import supabase

router = APIRouter(prefix="/payments", tags=["payments"])

STRIPE_SECRET_KEY     = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL          = os.getenv("FRONTEND_URL", "http://localhost:3000")
TAKDA_FEE_PERCENT     = 0.30   # 30% platform fee


def _stripe():
    """Return the stripe module, configured with the secret key."""
    try:
        import stripe as _stripe_lib
        _stripe_lib.api_key = STRIPE_SECRET_KEY
        return _stripe_lib
    except ImportError:
        return None


def _live_mode() -> bool:
    return bool(STRIPE_SECRET_KEY)


# ── Models ────────────────────────────────────────────────────────────────────

class CheckoutSessionBody(BaseModel):
    module_def_id: str
    user_id:       str

class ConnectOnboardBody(BaseModel):
    user_id: str

class RatingBody(BaseModel):
    user_id: str
    rating:  int
    review:  Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_module(module_def_id: str) -> dict:
    res = supabase.table("module_definitions") \
        .select("id,name,price,user_id,slug") \
        .eq("id", module_def_id) \
        .maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Module not found")
    return res.data


def _get_creator_stripe_id(creator_user_id: str) -> Optional[str]:
    res = supabase.table("creator_profiles") \
        .select("stripe_connect_id") \
        .eq("id", creator_user_id) \
        .maybe_single().execute()
    return (res.data or {}).get("stripe_connect_id")


def _record_transaction(user_id: str, module_def_id: str, price: float, session_id: str):
    supabase.table("transactions").insert({
        "user_id":                user_id,
        "module_def_id":          module_def_id,
        "amount_gross":           price,
        "amount_takda_fee":       round(price * TAKDA_FEE_PERCENT, 2),
        "amount_creator_payout":  round(price * (1 - TAKDA_FEE_PERCENT), 2),
        "stripe_session_id":      session_id,
        "status":                 "pending",
    }).execute()


# ── Checkout ──────────────────────────────────────────────────────────────────

@router.post("/create-checkout-session")
async def create_checkout_session(body: CheckoutSessionBody):
    """
    Create a Stripe Checkout session (or mock one in dev).
    Free modules skip checkout entirely and return a direct success URL.
    """
    module = _get_module(body.module_def_id)
    price  = float(module.get("price") or 0)

    # Free module — install directly, no checkout needed
    if price <= 0:
        return {"url": f"{FRONTEND_URL}/marketplace/success?id={body.module_def_id}", "free": True}

    if _live_mode():
        stripe = _stripe()
        if not stripe:
            raise HTTPException(status_code=500, detail="stripe package not installed. Run: pip install stripe")

        # Get creator's Stripe Connect account for split payments
        creator_stripe_id = _get_creator_stripe_id(module["user_id"])

        amount_cents   = int(price * 100)
        fee_cents      = int(amount_cents * TAKDA_FEE_PERCENT)

        session_kwargs = dict(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency":     "php",
                    "unit_amount":  amount_cents,
                    "product_data": {"name": module["name"]},
                },
                "quantity": 1,
            }],
            success_url=f"{FRONTEND_URL}/marketplace/success?session_id={{CHECKOUT_SESSION_ID}}&id={body.module_def_id}",
            cancel_url=f"{FRONTEND_URL}/marketplace/{module['slug']}",
            metadata={"module_def_id": body.module_def_id, "user_id": body.user_id},
        )

        if creator_stripe_id:
            session_kwargs["payment_intent_data"] = {
                "application_fee_amount": fee_cents,
                "transfer_data": {"destination": creator_stripe_id},
            }

        session = stripe.checkout.Session.create(**session_kwargs)
        _record_transaction(body.user_id, body.module_def_id, price, session.id)
        return {"url": session.url}

    else:
        # ── MOCK MODE (no Stripe credentials) ────────────────────────────────
        mock_id = f"mock_cs_{uuid.uuid4()}"
        _record_transaction(body.user_id, body.module_def_id, price, mock_id)
        return {
            "url":      f"{FRONTEND_URL}/marketplace/success?session_id={mock_id}&id={body.module_def_id}",
            "mock":     True,
            "note":     "Set STRIPE_SECRET_KEY in .env to use real Stripe",
        }


# ── Webhook (live mode only) ──────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe sends POST /payments/webhook on checkout.session.completed.
    Verifies the signature, marks the transaction complete, and installs the module.
    Ignored in mock mode (purchase is confirmed via /confirm-purchase instead).
    """
    if not _live_mode():
        return {"received": True, "mock": True}

    stripe = _stripe()
    payload = await request.body()
    sig     = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    if event["type"] == "checkout.session.completed":
        session      = event["data"]["object"]
        session_id   = session["id"]
        meta         = session.get("metadata", {})
        module_def_id = meta.get("module_def_id")
        user_id       = meta.get("user_id")

        _complete_purchase(session_id, module_def_id, user_id)

    return {"received": True}


# ── Confirm purchase (mock / dev flow) ────────────────────────────────────────

@router.post("/confirm-purchase")
async def confirm_purchase(session_id: str):
    """
    Called by the frontend after redirect from Stripe success URL.
    In live mode, the webhook handles this — this is just a fallback / dev convenience.
    """
    res = supabase.table("transactions") \
        .select("*") \
        .eq("stripe_session_id", session_id) \
        .maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx = res.data
    if tx["status"] == "completed":
        return {"status": "already_completed"}

    _complete_purchase(session_id, tx["module_def_id"], tx["user_id"])
    return {"status": "success"}


def _complete_purchase(session_id: str, module_def_id: str, user_id: str):
    """Mark transaction complete and credit the creator."""
    supabase.table("transactions") \
        .update({"status": "completed"}) \
        .eq("stripe_session_id", session_id) \
        .execute()

    # Credit creator earnings
    module_res = supabase.table("module_definitions") \
        .select("user_id") \
        .eq("id", module_def_id) \
        .maybe_single().execute()

    if module_res.data and module_res.data.get("user_id"):
        tx_res = supabase.table("transactions") \
            .select("amount_creator_payout") \
            .eq("stripe_session_id", session_id) \
            .maybe_single().execute()
        payout = float((tx_res.data or {}).get("amount_creator_payout", 0))
        if payout > 0:
            supabase.rpc("increment_creator_earnings", {
                "creator_id": module_res.data["user_id"],
                "amount":     payout,
            }).execute()


# ── Stripe Connect onboarding ─────────────────────────────────────────────────

@router.post("/connect/onboard")
async def stripe_connect_onboard(body: ConnectOnboardBody):
    """
    Start Stripe Connect Express onboarding for a creator.
    Returns an onboarding URL the creator visits to link their bank account.

    Live mode:  creates a real Stripe Express account + onboarding link.
    Mock mode:  returns a placeholder URL so the UI flow works without credentials.
    """
    if _live_mode():
        stripe = _stripe()
        if not stripe:
            raise HTTPException(status_code=500, detail="stripe package not installed")

        # Create or reuse a Connect account
        existing = supabase.table("creator_profiles") \
            .select("stripe_connect_id") \
            .eq("id", body.user_id) \
            .maybe_single().execute()
        stripe_account_id = (existing.data or {}).get("stripe_connect_id")

        if not stripe_account_id:
            account = stripe.Account.create(type="express", country="PH")
            stripe_account_id = account.id
            supabase.table("creator_profiles").upsert({
                "id":               body.user_id,
                "stripe_connect_id":stripe_account_id,
            }).execute()

        link = stripe.AccountLink.create(
            account=stripe_account_id,
            refresh_url=f"{FRONTEND_URL}/creator/settings?stripe=refresh",
            return_url=f"{FRONTEND_URL}/creator/settings?stripe=connected",
            type="account_onboarding",
        )
        return {"url": link.url}

    else:
        # Mock — upsert a fake connect ID so the UI sees "connected"
        mock_id = f"mock_acct_{body.user_id[:8]}"
        supabase.table("creator_profiles").upsert({
            "id":               body.user_id,
            "stripe_connect_id":mock_id,
        }).execute()
        return {
            "url":  f"{FRONTEND_URL}/creator/settings?stripe=connected&mock=1",
            "mock": True,
            "note": "Set STRIPE_SECRET_KEY in .env to use real Stripe Connect",
        }


@router.get("/connect/status")
async def stripe_connect_status(user_id: str):
    """Check whether a creator has connected their Stripe account."""
    res = supabase.table("creator_profiles") \
        .select("stripe_connect_id, total_earnings") \
        .eq("id", user_id) \
        .maybe_single().execute()
    data    = res.data or {}
    conn_id = data.get("stripe_connect_id")

    if not conn_id:
        return {"connected": False, "total_earnings": 0.0}

    is_mock = str(conn_id).startswith("mock_")

    if _live_mode() and not is_mock:
        stripe = _stripe()
        try:
            account  = stripe.Account.retrieve(conn_id)
            charges  = account.get("charges_enabled", False)
            payouts  = account.get("payouts_enabled", False)
            onboarded = charges and payouts
        except Exception:
            onboarded = False
    else:
        onboarded = True   # mock mode — assume complete

    return {
        "connected":      bool(conn_id),
        "onboarded":      onboarded,
        "total_earnings": float(data.get("total_earnings") or 0),
        "mock":           is_mock,
    }
