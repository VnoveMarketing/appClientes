import { NextRequest } from "next/server";
import { requirePropostasAccess, jsonResponse, errorResponse } from "@/lib/api/auth";
import { notifyPropostaPronta } from "@/lib/email/notifications";

export async function GET() {
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("propostas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const {
    cliente_id,
    setup,
    mensalidade,
    desconto_setup,
    desconto_mensalidade,
    duracao,
    condicao_descricao,
    escopo,
    escopo_descricao_adicional,
    status,
  } = body;

  if (
    !cliente_id ||
    setup == null ||
    mensalidade == null ||
    duracao == null ||
    Number.isNaN(Number(setup)) ||
    Number.isNaN(Number(mensalidade)) ||
    Number.isNaN(Number(duracao))
  ) {
    return errorResponse("Campos obrigatórios incompletos");
  }

  const { data, error } = await auth.supabase
    .from("propostas")
    .insert([
      {
        cliente_id,
        setup,
        mensalidade,
        desconto_setup: desconto_setup ?? 0,
        desconto_mensalidade: desconto_mensalidade ?? 0,
        duracao,
        condicao_descricao: condicao_descricao?.trim() || "Nenhuma",
        escopo: escopo ?? [],
        escopo_descricao_adicional: escopo_descricao_adicional?.trim() ?? "",
        status: status ?? "pendente",
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  notifyPropostaPronta(data.id, data.cliente_id).catch(console.error);

  return jsonResponse(data, 201);
}
