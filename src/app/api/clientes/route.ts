import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("clientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { nome, email, telefone, empresa, status, assinatura, ramo_atividade, cnpj, cidade, estado } = body;

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
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}
