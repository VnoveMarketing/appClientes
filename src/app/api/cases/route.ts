import { NextRequest } from "next/server";
import {
  requirePropostasAccess,
  requireContratosAccess,
  jsonResponse,
  errorResponse,
} from "@/lib/api/auth";
import { getCaseCodigoErrorMessage } from "@/lib/case-codigo";
import { resolveCaseCodigoForSave } from "@/lib/case-codigo-service";

export async function GET(request: NextRequest) {
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const categoriaId = request.nextUrl.searchParams.get("categoria_id");

  let query = auth.supabase
    .from("cases")
    .select("*, case_categorias(id, nome)")
    .order("ordem")
    .order("created_at", { ascending: false });

  if (categoriaId) {
    query = query.eq("categoria_id", categoriaId);
  }

  const { data, error } = await query;
  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { nome, imagem_url, categoria_id, link, ordem, codigo } = body;

  if (!nome?.trim()) return errorResponse("Nome do case é obrigatório");
  if (!imagem_url?.trim()) return errorResponse("Imagem do case é obrigatória");
  if (!categoria_id) return errorResponse("Categoria é obrigatória");

  const codigoResolved = await resolveCaseCodigoForSave(auth.supabase, {
    nome: nome.trim(),
    codigo,
  });

  if ("error" in codigoResolved) {
    return errorResponse(codigoResolved.error, 409);
  }

  const { data, error } = await auth.supabase
    .from("cases")
    .insert([
      {
        nome: nome.trim(),
        imagem_url: imagem_url.trim(),
        categoria_id,
        link: link?.trim() || null,
        ordem: typeof ordem === "number" ? ordem : 0,
        codigo: codigoResolved.codigo,
      },
    ])
    .select("*, case_categorias(id, nome)")
    .single();

  if (error) return errorResponse(getCaseCodigoErrorMessage(error), 500);
  return jsonResponse(data, 201);
}
