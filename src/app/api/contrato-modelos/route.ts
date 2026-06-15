import { NextRequest } from "next/server";
import {
  requireContratosAccess,
  requirePropostasAccess,
  jsonResponse,
  errorResponse,
} from "@/lib/api/auth";
import { normalizeContractText } from "@/lib/contract-builder";

export async function GET() {
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("contrato_modelos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const {
    nome,
    conteudo_template,
    arquivo_url,
    arquivo_nome,
    mime_type,
    ativo,
  } = body as {
    nome?: string;
    conteudo_template?: string;
    arquivo_url?: string | null;
    arquivo_nome?: string | null;
    mime_type?: string | null;
    ativo?: boolean;
  };

  if (!nome?.trim()) return errorResponse("Nome do modelo é obrigatório");

  if (ativo) {
    await auth.supabase.from("contrato_modelos").update({ ativo: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data, error } = await auth.supabase
    .from("contrato_modelos")
    .insert([
      {
        nome: nome.trim(),
        conteudo_template: normalizeContractText(conteudo_template?.trim() ?? ""),
        arquivo_url: arquivo_url ?? null,
        arquivo_nome: arquivo_nome ?? null,
        mime_type: mime_type ?? null,
        ativo: ativo ?? false,
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data, 201);
}
