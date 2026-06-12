import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { getAppUrl } from "@/lib/email/resend";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data: profile, error: profileError } = await auth.supabase
    .from("profiles")
    .select("*, tipos_usuario(slug)")
    .eq("id", id)
    .maybeSingle();

  if (profileError) return errorResponse(profileError.message, 500);
  if (!profile) return errorResponse("Usuário não encontrado", 404);

  if (profile.convite_status === "aceito") {
    return errorResponse("Este usuário já aceitou o convite e está ativo", 400);
  }

  const tipo = profile.tipos_usuario as { slug: string } | null;
  const admin = getAdminSupabase();
  const now = new Date().toISOString();

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(profile.email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/clientes`,
    data: {
      full_name: profile.full_name ?? profile.email,
      role: profile.role ?? tipo?.slug ?? "consultor",
      tipo_usuario_id: profile.tipo_usuario_id,
      nivel_permissao: profile.nivel_permissao,
    },
  });

  if (inviteError) return errorResponse(inviteError.message, 400);

  await admin
    .from("profiles")
    .update({ convite_enviado_em: now, convite_status: "pendente" })
    .eq("id", id);

  return jsonResponse({ success: true, message: "Convite reenviado por e-mail." });
}
