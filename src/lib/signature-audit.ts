import { createHash } from "crypto";

export function hashDocumentContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function formatBrasiliaTimestamp(isoUtc: string): string {
  return new Date(isoUtc).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export type AssinaturaEvidenciasPayload = {
  signatario_nome: string;
  signatario_cpf: string;
  signatario_email?: string;
  signatario_telefone?: string;
  signatario_cnpj?: string;
  user_agent?: string;
  geo_latitude?: number | null;
  geo_longitude?: number | null;
  geo_precisao?: number | null;
  geo_fonte?: string | null;
  assinatura_tipo: "draw" | "type";
  assinatura_conteudo?: string;
  otp_token_id?: string | null;
  otp_validado?: boolean;
};

export type ContratoAssinaturaEvidencias = {
  id: string;
  contrato_id: string;
  signatario_nome: string;
  signatario_cpf: string;
  signatario_email: string | null;
  signatario_telefone: string | null;
  signatario_cnpj: string | null;
  ip_address: string | null;
  ip_porta: string | null;
  user_agent: string | null;
  geo_latitude: number | null;
  geo_longitude: number | null;
  geo_precisao: number | null;
  geo_fonte: string | null;
  documento_hash_sha256: string;
  assinado_em_utc: string;
  assinado_em_brasilia: string;
  assinatura_tipo: "draw" | "type";
  assinatura_conteudo: string | null;
  otp_token_id: string | null;
  otp_validado: boolean;
  created_at: string;
};

export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "desconhecido";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "desconhecido";
}

export function extractClientPort(request: Request): string | null {
  return request.headers.get("x-forwarded-port");
}
