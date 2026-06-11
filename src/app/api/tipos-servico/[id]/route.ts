import { NextRequest } from "next/server";
import {
  requirePropostasAccess,
  requireContratosAccess,
  requireDeleteAccess,
  jsonResponse,
  errorResponse,
} from "@/lib/api/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const { data: tipo, error } = await auth.supabase
    .from("tipos_servico")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!tipo) return errorResponse("Tipo de serviço não encontrado", 404);

  const { data: campos } = await auth.supabase
    .from("tipo_servico_campos")
    .select("*")
    .eq("tipo_servico_id", id)
    .order("ordem");

  const { data: entregaveis } = await auth.supabase
    .from("tipo_servico_entregaveis")
    .select("*")
    .eq("tipo_servico_id", id)
    .order("ordem");

  return jsonResponse({ ...tipo, campos: campos ?? [], entregaveis: entregaveis ?? [] });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireContratosAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { nome, descricao, campos, entregaveis } = body as {
    nome?: string;
    descricao?: string;
    campos?: Array<{
      id?: string;
      chave: string;
      label: string;
      tipo_campo?: string;
      ordem?: number;
      obrigatorio?: boolean;
      placeholder?: string;
      calculo?: { operacao: string; operandos: string[] } | null;
    }>;
    entregaveis?: Array<{
      id?: string;
      nome: string;
      descricao?: string;
      ordem?: number;
    }>;
  };

  const updates: Record<string, string> = {};
  if (nome !== undefined) updates.nome = nome.trim();
  if (descricao !== undefined) updates.descricao = descricao.trim();

  if (Object.keys(updates).length) {
    const { error } = await auth.supabase.from("tipos_servico").update(updates).eq("id", id);
    if (error) return errorResponse(error.message, 500);
  }

  if (campos !== undefined) {
    await auth.supabase.from("tipo_servico_campos").delete().eq("tipo_servico_id", id);
    if (campos.length) {
      const { error: camposError } = await auth.supabase.from("tipo_servico_campos").insert(
        campos.map((c, idx) => ({
          tipo_servico_id: id,
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
  }

  if (entregaveis !== undefined) {
    await auth.supabase.from("tipo_servico_entregaveis").delete().eq("tipo_servico_id", id);
    if (entregaveis.length) {
      const { error: entError } = await auth.supabase.from("tipo_servico_entregaveis").insert(
        entregaveis.map((e, idx) => ({
          tipo_servico_id: id,
          nome: e.nome.trim(),
          descricao: e.descricao?.trim() ?? "",
          ordem: e.ordem ?? idx,
        }))
      );
      if (entError) return errorResponse(entError.message, 500);
    }
  }

  const { data: tipo } = await auth.supabase.from("tipos_servico").select("*").eq("id", id).single();
  const { data: tipoCampos } = await auth.supabase
    .from("tipo_servico_campos")
    .select("*")
    .eq("tipo_servico_id", id)
    .order("ordem");
  const { data: tipoEntregaveis } = await auth.supabase
    .from("tipo_servico_entregaveis")
    .select("*")
    .eq("tipo_servico_id", id)
    .order("ordem");

  return jsonResponse({
    ...tipo,
    campos: tipoCampos ?? [],
    entregaveis: tipoEntregaveis ?? [],
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireDeleteAccess();
  if ("error" in auth) return auth.error;

  const { error } = await auth.supabase.from("tipos_servico").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ success: true });
}
