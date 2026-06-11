import { NextRequest } from "next/server";
import { requireContratosAccess, jsonResponse, errorResponse } from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { nome, descricao, ordem } = body as {
    nome?: string;
    descricao?: string;
    ordem?: number;
  };

  if (!nome?.trim()) return errorResponse("Nome do entregável é obrigatório");

  const { count } = await auth.supabase
    .from("tipo_servico_entregaveis")
    .select("*", { count: "exact", head: true })
    .eq("tipo_servico_id", id);

  const { data, error } = await auth.supabase
    .from("tipo_servico_entregaveis")
    .insert([
      {
        tipo_servico_id: id,
        nome: nome.trim(),
        descricao: descricao?.trim() ?? "",
        ordem: ordem ?? (count ?? 0),
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const entregavelId = new URL(request.url).searchParams.get("entregavelId");
  if (!entregavelId) return errorResponse("entregavelId é obrigatório");

  const { error } = await auth.supabase
    .from("tipo_servico_entregaveis")
    .delete()
    .eq("id", entregavelId)
    .eq("tipo_servico_id", id);

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
