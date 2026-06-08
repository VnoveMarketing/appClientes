import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("propostas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
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
    status,
  } = body;

  if (!cliente_id || setup == null || mensalidade == null || !duracao || !condicao_descricao) {
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
        condicao_descricao,
        escopo: escopo ?? [],
        status: status ?? "pendente",
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}
