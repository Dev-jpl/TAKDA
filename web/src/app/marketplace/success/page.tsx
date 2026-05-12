"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function MarketplaceSuccessPage() {
  const searchParams = useSearchParams();
  const [confirmed, setConfirmed] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [moduleName,setModuleName]= useState('');

  useEffect(() => {
    (async () => {
      const sessionId  = searchParams.get('session_id');
      const moduleId   = searchParams.get('id');

      if (sessionId) {
        // Confirm purchase (mock or real via Stripe webhook)
        await fetch(`${API}/payments/confirm-purchase?session_id=${encodeURIComponent(sessionId)}`, {
          method: 'POST',
        });
      }

      if (moduleId) {
        const res = await fetch(`${API}/marketplace/modules/${moduleId}`).catch(() => null);
        if (res?.ok) {
          const mod = await res.json();
          setModuleName(mod.name);

          // Install the module to a hub if user is logged in (free or paid)
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Module is now "purchased" — it can be installed freely from the marketplace page
          }
        }
      }

      setConfirmed(true);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="max-w-md mx-auto px-5 py-20 flex flex-col items-center gap-6 text-center">
      <div className="w-16 h-16 rounded-full bg-green-400/10 flex items-center justify-center">
        <CheckCircleIcon size={36} className="text-green-400" weight="fill" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {moduleName ? `${moduleName} unlocked!` : 'Purchase complete!'}
        </h1>
        <p className="text-sm text-text-tertiary mt-2 leading-relaxed">
          Your module is ready to install. Head to a hub and add it from the module picker.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Link href="/marketplace"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-modules-aly/10 text-modules-aly border border-modules-aly/20 hover:bg-modules-aly/20 transition-all">
          Back to Marketplace <ArrowRightIcon size={14} weight="bold" />
        </Link>
        <Link href="/spaces"
          className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
          Go to my spaces →
        </Link>
      </div>
    </main>
  );
}
