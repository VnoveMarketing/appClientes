import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import {
  notifyPropostaAceita,
  notifyPropostaAceitaCliente,
  notifyContratoDisponivelRevisaoFinanceiro,
} from "@/lib/email/notifications";
import { generateContractFromProposta } from "@/lib/auto-contract";
import { validarDadosAceiteProposta } from "@/lib/cliente-cadastro";

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
        representante_cpf: string;
        representante_email: string;
        endereco_rua: string;
        endereco_numero: string;
        endereco_complemento: string;
        cep: string;
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

    const validationError = validarDadosAceiteProposta(clientUpdates);
    if (validationError) {
      return errorResponse(validationError, 400);
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

    const aceitaEm = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("propostas")
      .update({ status: "aceita", aceita_em: aceitaEm })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return errorResponse(updateError.message, 500);

    try {
      await notifyPropostaAceita(id, proposta.cliente_id);
    } catch (e) {
      console.error("[email] notifyPropostaAceita falhou:", e);
    }

    const clienteContato = {
      email: updatedCliente?.email ?? clientUpdates.email,
      nome: updatedCliente?.nome ?? clientUpdates.nome,
      empresa: updatedCliente?.empresa ?? clientUpdates.empresa,
    };

    try {
      await notifyPropostaAceitaCliente(id, clienteContato);
    } catch (e) {
      console.error("[email] notifyPropostaAceitaCliente falhou:", e);
    }

    const contrato = await generateContractFromProposta(
      supabase,
      updated,
      updatedCliente ?? clientUpdates
    );

    try {
      await notifyContratoDisponivelRevisaoFinanceiro(
        contrato.id,
        proposta.cliente_id
      );
    } catch (e) {
      console.error("[email] notifyContratoDisponivelRevisaoFinanceiro falhou:", e);
    }

    return jsonResponse({ proposta: updated, contrato });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
