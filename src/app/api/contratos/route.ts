import { NextRequest } from "next/server";
import { requireContratosAccess, jsonResponse, errorResponse } from "@/lib/api/auth";
import { hashDocumentContent } from "@/lib/signature-audit";

export async function GET() {
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("contratos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const {
    proposta_id,
    cliente_id,
    status,
    valor_final_setup,
    valor_final_mensal,
    detalhes_financeiros,
    conteudo_contrato,
  } = body;

  if (!proposta_id || !cliente_id || valor_final_setup == null || valor_final_mensal == null || !detalhes_financeiros || !conteudo_contrato) {
    return errorResponse("Campos obrigatórios incompletos");
  }

  const { data, error } = await auth.supabase
    .from("contratos")
    .insert([
      {
        proposta_id,
        cliente_id,
        status: status ?? "pendente_financeiro",
        valor_final_setup,
        valor_final_mensal,
        detalhes_financeiros,
        conteudo_contrato,
        documento_hash_sha256: hashDocumentContent(conteudo_contrato),
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(data, 201);
}
