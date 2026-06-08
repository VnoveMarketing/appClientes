"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function useAuthUser() {
  const [user, setUser] = useState<{ name: string; email: string; avatar: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getClaims().then(({ data }) => {
      const claims = data?.claims;
      if (claims?.email) {
        setUser({
          name: (claims.user_metadata as { full_name?: string })?.full_name ?? "Administrador",
          email: String(claims.email),
          avatar: "",
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUser({
          name: session.user.user_metadata?.full_name ?? "Administrador",
          email: session.user.email,
          avatar: "",
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}

export function useLogout() {
  const router = useRouter();

  return async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
}
