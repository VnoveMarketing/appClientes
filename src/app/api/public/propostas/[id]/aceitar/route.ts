import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getAdminSupabase();
    const body = await request.json();
    const { clientUpdates } = body as {
      clientUpdates: {
        empresa: string;
        email: string;
        telefone: string;
        cnpj: string;
        ramo_atividade: string;
        cidade: string;
        estado: string;
        nome: string;
      };
    };

    const { data: proposta, error: propostaError } = await supabase
      .from("propostas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (propostaError) return errorResponse(propostaError.message, 500);
    if (!proposta) return errorResponse("Proposta não encontrada", 404);

    if (!["pendente", "em_analise"].includes(proposta.status)) {
      return errorResponse("Proposta não pode ser aceita neste status", 400);
    }

    const { error: clienteError } = await supabase
      .from("clientes")
      .update(clientUpdates)
      .eq("id", proposta.cliente_id);

    if (clienteError) return errorResponse(clienteError.message, 500);

    const { data: updated, error: updateError } = await supabase
      .from("propostas")
      .update({ status: "aceita" })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return errorResponse(updateError.message, 500);
    return jsonResponse(updated);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
