"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { UserRole } from "@/lib/api/auth";

export type AuthUser = {
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  roleLabel: string;
};

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.email) {
          setUser({
            name: data.name ?? "Usuário",
            email: data.email,
            avatar: "",
            role: data.role,
            roleLabel: data.roleLabel ?? data.role,
          });
        }
      })
      .catch(() => setUser(null));
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

export function canAccessContratos(role?: UserRole) {
  return role === "admin" || role === "financeiro";
}
