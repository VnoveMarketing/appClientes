import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { notifyPropostaAceita, notifyContratoProntoAssinatura } from "@/lib/email/notifications";
import { generateContractFromProposta } from "@/lib/auto-contract";

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

    const { data: updatedCliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", proposta.cliente_id)
      .single();

    const { data: updated, error: updateError } = await supabase
      .from("propostas")
      .update({ status: "aceita" })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return errorResponse(updateError.message, 500);

    notifyPropostaAceita(id, proposta.cliente_id).catch(console.error);

    const contrato = await generateContractFromProposta(
      supabase,
      updated,
      updatedCliente ?? clientUpdates
    );

    notifyContratoProntoAssinatura(contrato.id, proposta.cliente_id).catch(console.error);

    return jsonResponse({ proposta: updated, contrato });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
