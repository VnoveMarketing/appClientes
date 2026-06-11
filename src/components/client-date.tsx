"use client";

import { useEffect, useState } from "react";

export function useHasMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

type ClientDateProps = {
  iso: string;
  timeZone?: string;
  className?: string;
  suffix?: string;
};

export function ClientDate({ iso, timeZone, className, suffix }: ClientDateProps) {
  const mounted = useHasMounted();

  if (!mounted) {
    return <span className={className}>—</span>;
  }

  const formatted = new Date(iso).toLocaleString("pt-BR", {
    timeZone: timeZone ?? undefined,
  });

  return (
    <span className={className} suppressHydrationWarning>
      {formatted}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}
