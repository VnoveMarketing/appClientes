import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requirePropostasAccess,
  requireContratosAccess,
  jsonResponse,
  errorResponse,
} from "@/lib/api/auth";

async function loadTiposWithRelations(supabase: SupabaseClient) {
  const { data: tipos, error } = await supabase
    .from("tipos_servico")
    .select("*")
    .order("nome");

  if (error) throw new Error(error.message);

  const { data: campos, error: camposError } = await supabase
    .from("tipo_servico_campos")
    .select("*")
    .order("ordem");

  if (camposError) throw new Error(camposError.message);

  const { data: entregaveis, error: entregError } = await supabase
    .from("tipo_servico_entregaveis")
    .select("*")
    .order("ordem");

  if (entregError) throw new Error(entregError.message);

  return (tipos ?? []).map((tipo) => ({
    ...tipo,
    campos: (campos ?? []).filter((c) => c.tipo_servico_id === tipo.id),
    entregaveis: (entregaveis ?? []).filter((e) => e.tipo_servico_id === tipo.id),
  }));
}

export async function GET() {
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  try {
    const data = await loadTiposWithRelations(auth.supabase);
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro ao listar tipos", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { nome, descricao, campos, entregaveis } = body as {
    nome?: string;
    descricao?: string;
      campos?: Array<{
      chave: string;
      label: string;
      tipo_campo?: string;
      ordem?: number;
      obrigatorio?: boolean;
      placeholder?: string;
      calculo?: { operacao: string; operandos: string[] } | null;
    }>;
    entregaveis?: Array<{ nome: string; descricao?: string; ordem?: number }>;
  };

  if (!nome?.trim()) return errorResponse("Nome do tipo é obrigatório");

  const { data: tipo, error } = await auth.supabase
    .from("tipos_servico")
    .insert([{ nome: nome.trim(), descricao: descricao?.trim() ?? "" }])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  if (campos?.length) {
    const { error: camposError } = await auth.supabase.from("tipo_servico_campos").insert(
      campos.map((c, idx) => ({
        tipo_servico_id: tipo.id,
        chave: c.chave.trim(),
        label: c.label.trim(),
        tipo_campo: c.tipo_campo ?? "text",
        ordem: c.ordem ?? idx,
        obrigatorio: c.tipo_campo === "calculated" ? false : (c.obrigatorio ?? true),
        placeholder: c.placeholder ?? "",
        calculo: c.tipo_campo === "calculated" ? c.calculo ?? null : null,
      }))
    );
    if (camposError) return errorResponse(camposError.message, 500);
  }

  if (entregaveis?.length) {
    const { error: entError } = await auth.supabase.from("tipo_servico_entregaveis").insert(
      entregaveis.map((e, idx) => ({
        tipo_servico_id: tipo.id,
        nome: e.nome.trim(),
        descricao: e.descricao?.trim() ?? "",
        ordem: e.ordem ?? idx,
      }))
    );
    if (entError) return errorResponse(entError.message, 500);
  }

  const { data: full } = await auth.supabase
    .from("tipos_servico")
    .select("*")
    .eq("id", tipo.id)
    .single();

  const { data: tipoCampos } = await auth.supabase
    .from("tipo_servico_campos")
    .select("*")
    .eq("tipo_servico_id", tipo.id)
    .order("ordem");

  const { data: tipoEntregaveis } = await auth.supabase
    .from("tipo_servico_entregaveis")
    .select("*")
    .eq("tipo_servico_id", tipo.id)
    .order("ordem");

  return jsonResponse(
    { ...full, campos: tipoCampos ?? [], entregaveis: tipoEntregaveis ?? [] },
    201
  );
}
