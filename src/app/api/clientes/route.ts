import { NextRequest, NextResponse } from "next/server";
import { requireClientesAccess, jsonResponse, errorResponse } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireClientesAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireClientesAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const {
    nome,
    email,
    telefone,
    empresa,
    status,
    assinatura,
    ramo_atividade,
    cnpj,
    cidade,
    estado,
    cor_principal,
    categoria_case_id,
    cases_incluir_ids,
    cases_excluir_ids,
  } = body;

  if (!nome || !email || !telefone || !empresa) {
    return errorResponse("Campos obrigatórios: nome, email, telefone, empresa");
  }

  const { data, error } = await auth.supabase
    .from("clientes")
    .insert([
      {
        nome,
        email,
        telefone,
        empresa,
        status: status ?? "Ativa",
        assinatura: assinatura ?? "active",
        ramo_atividade: ramo_atividade ?? null,
        cnpj: cnpj ?? null,
        cidade: cidade ?? null,
        estado: estado ?? null,
        cor_principal: cor_principal ?? null,
        categoria_case_id: categoria_case_id ?? null,
        cases_incluir_ids: Array.isArray(cases_incluir_ids) ? cases_incluir_ids : [],
        cases_excluir_ids: Array.isArray(cases_excluir_ids) ? cases_excluir_ids : [],
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}
