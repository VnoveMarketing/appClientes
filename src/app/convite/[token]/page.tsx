"use client";

import React, { use } from "react";
import { ConviteAcceptView } from "@/components/convite-accept-view";

export default function ConviteTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return <ConviteAcceptView rawToken={decodeURIComponent(token)} />;
}
