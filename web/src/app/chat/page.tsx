"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatSessionPage from './[sessionId]/page';
import { coordinatorService } from '@/services/coordinator.service';
import { supabase } from '@/services/supabase';

export default function ChatEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLatest() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await coordinatorService.getSessions(user.id);
        } catch (e) {
          console.error('Failed to fetch sessions:', e);
        }
      }
      setLoading(false);
    }
    checkLatest();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-primary">
        <div className="w-8 h-8 border-4 border-modules-aly/30 border-t-modules-aly rounded-full animate-spin" />
      </div>
    );
  }

  return <ChatSessionPage />;
}
