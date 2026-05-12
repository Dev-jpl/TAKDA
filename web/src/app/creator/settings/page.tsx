"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CaretLeftIcon, CheckCircleIcon, CircleIcon, ArrowRightIcon,
  LockIcon, CurrencyDollarIcon, WarningIcon,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CreatorSettingsPage() {
  const searchParams = useSearchParams();
  const [userId,    setUserId]    = useState<string | null>(null);
  const [status,    setStatus]    = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [onboarding,setOnboarding]= useState(false);
  const [toast,     setToast]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const res = await fetch(`${API}/payments/connect/status?user_id=${user.id}`);
      if (res.ok) setStatus(await res.json());
      setLoading(false);
    })();

    // Show toast from Stripe redirect
    if (searchParams.get('stripe') === 'connected') {
      setToast('Stripe account connected!');
      setTimeout(() => setToast(null), 4000);
    }
    if (searchParams.get('stripe') === 'refresh') {
      setToast('Onboarding expired — please try again.');
      setTimeout(() => setToast(null), 4000);
    }
  }, []);

  const handleConnect = async () => {
    if (!userId) return;
    setOnboarding(true);
    try {
      const res = await fetch(`${API}/payments/connect/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setOnboarding(false);
      setToast('Something went wrong. Please try again.');
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  const connected = status?.connected && status?.onboarded;
  const isMock    = status?.mock;

  return (
    <main className="max-w-xl mx-auto px-5 py-10 flex flex-col gap-6">
      <Link href="/creator" className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-primary transition-colors w-fit">
        <CaretLeftIcon size={13} /> Creator
      </Link>

      <div>
        <h1 className="text-xl font-bold text-text-primary">Creator Settings</h1>
        <p className="text-xs text-text-tertiary mt-1">Manage payouts and creator account settings.</p>
      </div>

      {toast && (
        <div className="px-4 py-2.5 bg-modules-aly/10 border border-modules-aly/20 rounded-xl text-sm text-modules-aly">
          {toast}
        </div>
      )}

      {/* Stripe Connect card */}
      <div className="bg-background-secondary border border-border-primary rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-background-tertiary flex items-center justify-center">
              <CurrencyDollarIcon size={20} className="text-text-tertiary" weight="duotone" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Stripe Payouts</p>
              <p className="text-[11px] text-text-tertiary">Receive 70% of each module sale</p>
            </div>
          </div>
          {connected
            ? <CheckCircleIcon size={20} className="text-green-400" weight="fill" />
            : <CircleIcon size={20} className="text-text-tertiary/30" />
          }
        </div>

        {connected ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-4 py-3 bg-background-primary border border-border-primary rounded-xl">
              <span className="text-xs text-text-secondary">Total earnings</span>
              <span className="text-sm font-bold text-text-primary">
                ₱{(status?.total_earnings ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {isMock && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-400/5 border border-yellow-400/20 rounded-xl">
                <WarningIcon size={13} className="text-yellow-400 shrink-0" />
                <p className="text-[11px] text-yellow-400">
                  Mock mode — set <code className="font-mono">STRIPE_SECRET_KEY</code> in .env for real payouts.
                </p>
              </div>
            )}
            <button onClick={handleConnect}
              className="text-[11px] text-text-tertiary hover:text-text-primary transition-colors text-center mt-1">
              Re-connect or update bank account →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-tertiary leading-relaxed">
              Connect a Stripe account to receive payouts when users purchase your modules.
              TAKDA takes a 30% platform fee; you receive 70%.
            </p>
            <button
              onClick={handleConnect}
              disabled={onboarding}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold text-white bg-modules-aly hover:opacity-90 transition-all disabled:opacity-50"
            >
              {onboarding
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Connecting…</>
                : <><LockIcon size={14} weight="bold" /> Connect Stripe</>
              }
            </button>
            <p className="text-[10px] text-text-tertiary/60 text-center">
              {isMock ? 'Running in mock mode — no real Stripe account needed for testing.' : 'You\'ll be redirected to Stripe to complete onboarding.'}
            </p>
          </div>
        )}
      </div>

      {/* Helpful links */}
      <div className="flex flex-col gap-2">
        <Link href="/creator/analytics"
          className="flex items-center justify-between px-4 py-3 bg-background-secondary border border-border-primary rounded-xl hover:border-border-primary/60 transition-colors">
          <span className="text-sm text-text-primary">View analytics</span>
          <ArrowRightIcon size={14} className="text-text-tertiary" />
        </Link>
        <Link href="/creator"
          className="flex items-center justify-between px-4 py-3 bg-background-secondary border border-border-primary rounded-xl hover:border-border-primary/60 transition-colors">
          <span className="text-sm text-text-primary">My modules</span>
          <ArrowRightIcon size={14} className="text-text-tertiary" />
        </Link>
      </div>
    </main>
  );
}
