import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getAdminSupabase();

    const { data: contrato, error: fetchError } = await supabase
      .from("contratos")
      .select("id, status, assinatura_iniciada_em")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) return errorResponse(fetchError.message, 500);
    if (!contrato) return errorResponse("Contrato não encontrado", 404);
    if (contrato.status === "assinado" || contrato.status === "pendente_financeiro") {
      return jsonResponse({ assinatura_iniciada_em: contrato.assinatura_iniciada_em });
    }

    if (contrato.assinatura_iniciada_em) {
      return jsonResponse({ assinatura_iniciada_em: contrato.assinatura_iniciada_em });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("contratos")
      .update({ assinatura_iniciada_em: now })
      .eq("id", id)
      .select("id, assinatura_iniciada_em")
      .single();

    if (error) return errorResponse(error.message, 500);

    return jsonResponse({ assinatura_iniciada_em: data.assinatura_iniciada_em });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
