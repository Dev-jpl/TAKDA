"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ModuleEditorRoot() {
  const router = useRouter();
  const params = useParams<{ moduleId: string }>();
  useEffect(() => {
    router.replace(`/creator/${params.moduleId}/schema`);
  }, [router, params.moduleId]);
  return (
    <div className="flex items-center justify-center h-full">
      <span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );
}
