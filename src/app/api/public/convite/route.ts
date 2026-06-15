import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getProfileByConviteToken } from "@/lib/convite";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return errorResponse("Token de convite é obrigatório", 400);
  }

  try {
    const resolved = await getProfileByConviteToken(token);

    if (!resolved) {
      return errorResponse("Convite inválido ou não encontrado", 404);
    }

    if (resolved.invalidReason === "already_accepted") {
      return errorResponse("Este convite já foi aceito. Faça login com sua senha.", 409);
    }

    if (resolved.invalidReason === "expired") {
      return errorResponse("Este convite expirou. Solicite um novo convite ao administrador.", 410);
    }

    const tipoRaw = resolved.profile.tipos_usuario as { nome: string } | { nome: string }[] | null;
    const tipo = Array.isArray(tipoRaw) ? tipoRaw[0] ?? null : tipoRaw;

    return jsonResponse({
      email: resolved.profile.email,
      full_name: resolved.profile.full_name,
      tipo_nome: tipo?.nome ?? null,
      expira_em: resolved.profile.convite_expira_em,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao validar convite";
    return errorResponse(message, 500);
  }
}
