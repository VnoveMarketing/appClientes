import { NextRequest } from "next/server";
import { requireAdmin, jsonResponse, errorResponse } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("permissoes")
    .select("*")
    .order("modulo")
    .order("nome");

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { chave, nome, descricao, modulo } = body;

  if (!chave?.trim() || !nome?.trim() || !modulo?.trim()) {
    return errorResponse("Chave, nome e módulo são obrigatórios");
  }

  const { data, error } = await auth.supabase
    .from("permissoes")
    .insert([
      {
        chave: chave.trim().toLowerCase(),
        nome: nome.trim(),
        descricao: descricao?.trim() ?? "",
        modulo: modulo.trim().toLowerCase(),
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}
