import { NextRequest } from "next/server";
import { requireContratosAccess, jsonResponse, errorResponse } from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const nome = body.nome?.trim();

  if (!nome) return errorResponse("Nome da categoria é obrigatório");

  const { data, error } = await auth.supabase
    .from("case_categorias")
    .update({ nome })
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const { error } = await auth.supabase.from("case_categorias").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
