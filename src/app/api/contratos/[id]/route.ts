import { NextRequest } from "next/server";
import { requireContratosAccess, jsonResponse, errorResponse } from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("contratos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Contrato não encontrado", 404);
  return jsonResponse(data);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { data, error } = await auth.supabase
    .from("contratos")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data);
}
