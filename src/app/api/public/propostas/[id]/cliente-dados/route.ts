import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { buildClienteDadosFromCnpjLookup, type ClienteCadastroPublico } from "@/lib/cliente-cadastro";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_FIELDS = [
  "empresa",
  "email",
  "telefone",
  "cnpj",
  "ramo_atividade",
  "cidade",
  "estado",
  "nome",
] as const;

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const supabase = getAdminSupabase();
    const body = (await request.json()) as ClienteCadastroPublico;

    const { data: proposta, error: propostaError } = await supabase
      .from("propostas")
      .select("cliente_id, status")
      .eq("id", id)
      .maybeSingle();

    if (propostaError) return errorResponse(propostaError.message, 500);
    if (!proposta) return errorResponse("Proposta não encontrada", 404);

    if (!["pendente", "em_analise"].includes(proposta.status)) {
      return errorResponse("Esta proposta não permite atualização de dados", 400);
    }

    const updates = buildClienteDadosFromCnpjLookup(body);
    const payload: Record<string, string> = {};

    for (const field of ALLOWED_FIELDS) {
      const value = updates[field];
      if (typeof value === "string" && value.trim()) {
        payload[field] = value.trim();
      }
    }

    if (Object.keys(payload).length === 0) {
      return errorResponse("Nenhum dado válido para salvar", 400);
    }

    const { data, error } = await supabase
      .from("clientes")
      .update(payload)
      .eq("id", proposta.cliente_id)
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);

    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar dados do cliente";
    return errorResponse(message, 500);
  }
}
