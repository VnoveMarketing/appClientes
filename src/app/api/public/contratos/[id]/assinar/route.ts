import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { notifyContratoAssinado } from "@/lib/email/notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getAdminSupabase();

    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (contratoError) return errorResponse(contratoError.message, 500);
    if (!contrato) return errorResponse("Contrato não encontrado", 404);

    if (contrato.status === "assinado") {
      return errorResponse("Contrato já assinado", 400);
    }

    const assinadoEm = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("contratos")
      .update({ status: "assinado", assinado_em: assinadoEm })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return errorResponse(updateError.message, 500);

    const { error: clienteError } = await supabase
      .from("clientes")
      .update({ status: "Ativa", assinatura: "active" })
      .eq("id", contrato.cliente_id);

    if (clienteError) return errorResponse(clienteError.message, 500);

    notifyContratoAssinado(id, contrato.cliente_id).catch(console.error);

    return jsonResponse(updated);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
