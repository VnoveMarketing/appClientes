import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export type UserRole = "admin" | "financeiro" | "consultor";

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type AuthSuccess = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  user: { id: string; email?: string };
  role: UserRole;
};

type AuthError = { error: NextResponse };

async function getAuthenticatedUser(): Promise<AuthSuccess | AuthError> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: errorResponse("Não autenticado", 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, convite_status, ativo")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: errorResponse(profileError.message, 500) };
  }

  if (!profile?.role) {
    return { error: errorResponse("Acesso negado", 403) };
  }

  if (!profile.ativo) {
    return {
      error: errorResponse("Sua conta está inativa. Contate o administrador.", 403),
    };
  }

  if (profile.convite_status !== "aceito") {
    return {
      error: errorResponse(
        "Acesso não ativado. Aceite o convite recebido por e-mail e crie sua senha.",
        403
      ),
    };
  }

  return {
    supabase,
    userId: user.id,
    user,
    role: profile.role as UserRole,
  };
}

function denyAccess(): AuthError {
  return { error: errorResponse("Acesso negado", 403) };
}

export async function requireAuth() {
  return getAuthenticatedUser();
}

export async function requireAdmin() {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return auth;
  if (auth.role !== "admin") return denyAccess();
  return auth;
}

export async function requireClientesAccess() {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return auth;
  if (!["admin", "financeiro", "consultor"].includes(auth.role)) return denyAccess();
  return auth;
}

export async function requirePropostasAccess() {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return auth;
  if (!["admin", "financeiro", "consultor"].includes(auth.role)) return denyAccess();
  return auth;
}

export async function requireContratosAccess() {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return auth;
  if (!["admin", "financeiro"].includes(auth.role)) return denyAccess();
  return auth;
}

export async function requireDeleteAccess() {
  const auth = await getAuthenticatedUser();
  if ("error" in auth) return auth;
  if (!["admin", "financeiro"].includes(auth.role)) return denyAccess();
  return auth;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  consultor: "Consultor",
};
