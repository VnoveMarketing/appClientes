import { NextRequest } from "next/server";
import {
  requireClientesAccess,
  requireContratosAccess,
  jsonResponse,
  errorResponse,
} from "@/lib/api/auth";

export async function GET() {
  const auth = await requireClientesAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("case_categorias")
    .select("*")
    .order("nome");

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const nome = body.nome?.trim();

  if (!nome) return errorResponse("Nome da categoria é obrigatório");

  const { data, error } = await auth.supabase
    .from("case_categorias")
    .insert([{ nome }])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}
