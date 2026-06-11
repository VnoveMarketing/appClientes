import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { notifyContratoAssinado } from "@/lib/email/notifications";
import {
  hashDocumentContent,
  formatBrasiliaTimestamp,
  extractClientIp,
  extractClientPort,
  type AssinaturaEvidenciasPayload,
} from "@/lib/signature-audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as AssinaturaEvidenciasPayload;
    const {
      signatario_nome,
      signatario_cpf,
      signatario_email,
      signatario_telefone,
      signatario_cnpj,
      user_agent,
      geo_latitude,
      geo_longitude,
      geo_precisao,
      geo_fonte,
      assinatura_tipo,
      assinatura_conteudo,
      otp_token_id,
      otp_validado,
    } = body;

    if (!signatario_nome?.trim() || !signatario_cpf?.trim()) {
      return errorResponse("Nome completo e CPF do signatário são obrigatórios.");
    }

    if (!signatario_email?.trim()) {
      return errorResponse("E-mail do signatário é obrigatório para a trilha de auditoria.");
    }

    if (!assinatura_tipo || !["draw", "type"].includes(assinatura_tipo)) {
      return errorResponse("Tipo de assinatura inválido.");
    }

    if (!assinatura_conteudo?.trim()) {
      return errorResponse("Conteúdo da assinatura (desenho ou texto) é obrigatório.");
    }

    const supabase = getAdminSupabase();

    const { data: contrato, error: contratoError } = await supabase
      .from("contratos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (contratoError) return errorResponse(contratoError.message, 500);
    if (!contrato) return errorResponse("Contrato não encontrado", 404);

    if (contrato.status === "assinado") {
      return errorResponse("Contrato já assinado", 400);
    }

    const documentoHash = hashDocumentContent(contrato.conteudo_contrato ?? "");

    if (
      contrato.documento_hash_sha256 &&
      contrato.documento_hash_sha256 !== documentoHash
    ) {
      return errorResponse(
        "Integridade do documento comprometida. O conteúdo do contrato foi alterado após a geração.",
        409
      );
    }

    const assinadoEmUtc = new Date().toISOString();
    const assinadoEmBrasilia = formatBrasiliaTimestamp(assinadoEmUtc);
    const ipAddress = extractClientIp(request);
    const ipPorta = extractClientPort(request);

    const { error: evidenciasError } = await supabase.from("contrato_assinatura_evidencias").insert([
      {
        contrato_id: id,
        signatario_nome: signatario_nome.trim(),
        signatario_cpf: signatario_cpf.trim(),
        signatario_email: signatario_email.trim(),
        signatario_telefone: signatario_telefone?.trim() || null,
        signatario_cnpj: signatario_cnpj?.trim() || null,
        ip_address: ipAddress,
        ip_porta: ipPorta,
        user_agent: user_agent?.trim() || request.headers.get("user-agent") || null,
        geo_latitude: geo_latitude ?? null,
        geo_longitude: geo_longitude ?? null,
        geo_precisao: geo_precisao ?? null,
        geo_fonte: geo_fonte ?? null,
        documento_hash_sha256: documentoHash,
        assinado_em_utc: assinadoEmUtc,
        assinado_em_brasilia: assinadoEmBrasilia,
        assinatura_tipo,
        assinatura_conteudo: assinatura_conteudo.trim(),
        otp_token_id: otp_token_id ?? null,
        otp_validado: otp_validado ?? false,
      },
    ]);

    if (evidenciasError) return errorResponse(evidenciasError.message, 500);

    const { data: updated, error: updateError } = await supabase
      .from("contratos")
      .update({
        status: "assinado",
        assinado_em: assinadoEmUtc,
        documento_hash_sha256: documentoHash,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return errorResponse(updateError.message, 500);

    const { error: clienteError } = await supabase
      .from("clientes")
      .update({ status: "Ativa", assinatura: "active" })
      .eq("id", contrato.cliente_id);

    if (clienteError) return errorResponse(clienteError.message, 500);

    try {
      await notifyContratoAssinado(id, contrato.cliente_id, {
        email: signatario_email.trim(),
        nome: signatario_nome.trim(),
      });
    } catch (e) {
      console.error("[email] notifyContratoAssinado falhou:", e);
    }

    return jsonResponse(updated);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro interno", 500);
  }
}
