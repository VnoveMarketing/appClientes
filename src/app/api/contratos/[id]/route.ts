import { NextRequest } from "next/server";
import { requireContratosAccess, jsonResponse, errorResponse } from "@/lib/api/auth";
import { hashDocumentContent } from "@/lib/signature-audit";
import type { Cliente } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("contratos")
    .select("*, clientes(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Contrato não encontrado", 404);

  const { clientes, ...contrato } = data as Record<string, unknown> & {
    clientes: Cliente | null;
  };

  return jsonResponse({ contrato, cliente: clientes });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const { data: existing, error: fetchError } = await auth.supabase
    .from("contratos")
    .select("status, conteudo_contrato")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return errorResponse(fetchError.message, 500);
  if (!existing) return errorResponse("Contrato não encontrado", 404);

  const body = await request.json();
  const allowedFields = [
    "valor_final_setup",
    "valor_final_mensal",
    "detalhes_financeiros",
    "conteudo_contrato",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("Nenhum campo válido para atualização");
  }

  if (existing.status !== "pendente_financeiro") {
    return errorResponse(
      "Somente contratos aguardando revisão financeira podem ser editados",
      400
    );
  }

  if (typeof updates.conteudo_contrato === "string") {
    updates.documento_hash_sha256 = hashDocumentContent(updates.conteudo_contrato);
  }

  const { data, error } = await auth.supabase
    .from("contratos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data);
}
