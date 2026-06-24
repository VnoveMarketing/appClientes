"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ConviteAcceptView } from "@/components/convite-accept-view";

function ConviteQueryPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  return <ConviteAcceptView rawToken={token} />;
}

export default function ConvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0B0B] text-zinc-100 flex items-center justify-center">
          <p className="text-sm text-zinc-400">Carregando convite...</p>
        </div>
      }
    >
      <ConviteQueryPage />
    </Suspense>
  );
}
