import { NextRequest } from "next/server";
import {
  requirePropostasAccess,
  jsonResponse,
  errorResponse,
} from "@/lib/api/auth";

export async function GET() {
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("escopo_itens")
    .select("*")
    .order("nome", { ascending: true });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { nome, descricao } = body as { nome?: string; descricao?: string };

  if (!nome?.trim()) {
    return errorResponse("Nome do item de escopo é obrigatório");
  }

  const { data, error } = await auth.supabase
    .from("escopo_itens")
    .upsert(
      [
        {
          nome: nome.trim(),
          descricao: descricao?.trim() ?? "",
        },
      ],
      { onConflict: "nome" }
    )
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}
