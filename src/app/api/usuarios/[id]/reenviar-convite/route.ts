import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { provisionUsuarioConvite } from "@/lib/convite";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const supabase = getAdminSupabase();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*, tipos_usuario(slug, nome)")
    .eq("id", id)
    .maybeSingle();

  if (profileError) return errorResponse(profileError.message, 500);
  if (!profile) return errorResponse("Usuário não encontrado", 404);

  if (profile.convite_status === "aceito") {
    return errorResponse("Este usuário já aceitou o convite e está ativo", 400);
  }

  const tipo = profile.tipos_usuario as { slug: string; nome: string } | null;

  if (!profile.tipo_usuario_id) {
    return errorResponse("Usuário sem tipo configurado", 400);
  }

  try {
    const result = await provisionUsuarioConvite({
      email: profile.email,
      full_name: profile.full_name ?? profile.email,
      tipo_usuario_id: profile.tipo_usuario_id,
      tipo_slug: profile.role ?? tipo?.slug ?? "consultor",
      tipo_nome: tipo?.nome ?? "Usuário",
    });

    if (!result.emailSent) {
      return errorResponse(
        `Não foi possível reenviar o e-mail: ${result.emailError ?? "erro desconhecido"}`,
        500
      );
    }

    return jsonResponse({
      success: true,
      message: "Convite reenviado por e-mail com link para aceitar e criar senha.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao reenviar convite";
    return errorResponse(message, 400);
  }
}
