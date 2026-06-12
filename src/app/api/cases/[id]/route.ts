import { NextRequest } from "next/server";
import { requireContratosAccess, jsonResponse, errorResponse } from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.nome !== undefined) {
    const nome = body.nome?.trim();
    if (!nome) return errorResponse("Nome do case é obrigatório");
    updates.nome = nome;
  }
  if (body.imagem_url !== undefined) {
    if (!body.imagem_url?.trim()) return errorResponse("Imagem do case é obrigatória");
    updates.imagem_url = body.imagem_url.trim();
  }
  if (body.categoria_id !== undefined) {
    if (!body.categoria_id) return errorResponse("Categoria é obrigatória");
    updates.categoria_id = body.categoria_id;
  }
  if (body.link !== undefined) updates.link = body.link?.trim() || null;
  if (body.ordem !== undefined) updates.ordem = body.ordem;

  const { data, error } = await auth.supabase
    .from("cases")
    .update(updates)
    .eq("id", id)
    .select("*, case_categorias(id, nome)")
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const { error } = await auth.supabase.from("cases").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
