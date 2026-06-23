import { NextRequest } from "next/server";
import { requirePropostasAccess, jsonResponse, errorResponse } from "@/lib/api/auth";
import { notifyPropostaPronta } from "@/lib/email/notifications";
import { syncLegacyFinancialFields } from "@/lib/proposta-campos";
import { gerarIdentificadorProposta } from "@/lib/proposta-identificador";

export async function GET() {
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("propostas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return jsonResponse(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requirePropostasAccess();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const {
    cliente_id,
    tipo_servico_id,
    campos_valores,
    setup,
    mensalidade,
    desconto_setup,
    desconto_mensalidade,
    duracao,
    condicao_descricao,
    escopo,
    escopo_descricao_adicional,
    status,
  } = body;

  if (!cliente_id || !tipo_servico_id) {
    return errorResponse("Cliente e tipo de serviço são obrigatórios");
  }

  const financial = syncLegacyFinancialFields(campos_valores ?? {}, {
    setup: setup != null ? Number(setup) : undefined,
    mensalidade: mensalidade != null ? Number(mensalidade) : undefined,
    duracao: duracao != null ? Number(duracao) : undefined,
  });

  const identificador = await gerarIdentificadorProposta(auth.supabase);

  const { data, error } = await auth.supabase
    .from("propostas")
    .insert([
      {
        identificador,
        cliente_id,
        tipo_servico_id,
        campos_valores: campos_valores ?? {},
        setup: financial.setup,
        mensalidade: financial.mensalidade,
        desconto_setup: desconto_setup ?? 0,
        desconto_mensalidade: desconto_mensalidade ?? 0,
        duracao: financial.duracao,
        condicao_descricao: condicao_descricao?.trim() || "Nenhuma",
        escopo: escopo ?? [],
        escopo_descricao_adicional: escopo_descricao_adicional?.trim() ?? "",
        status: status ?? "pendente",
      },
    ])
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  try {
    const result = await notifyPropostaPronta(data.id, data.cliente_id);
    if (result && !result.ok) {
      console.error("[email] notifyPropostaPronta:", result.error);
    }
  } catch (e) {
    console.error("[email] notifyPropostaPronta falhou:", e);
  }

  return jsonResponse(data, 201);
}
