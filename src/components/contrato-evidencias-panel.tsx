"use client";

import type { ContratoAssinaturaEvidencias } from "@/lib/types";
import { ClientDate } from "@/components/client-date";

function EvidenciaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-zinc-800/60 last:border-0">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-200 break-all">{value ?? "—"}</span>
    </div>
  );
}

export function ContratoEvidenciasPanel({
  evidencias,
}: {
  evidencias: ContratoAssinaturaEvidencias;
}) {
  const geoLabel =
    evidencias.geo_latitude != null && evidencias.geo_longitude != null
      ? `${evidencias.geo_latitude.toFixed(6)}, ${evidencias.geo_longitude.toFixed(6)}${
          evidencias.geo_precisao != null ? ` (±${Math.round(evidencias.geo_precisao)}m)` : ""
        }`
      : null;

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
        <h4 className="text-xs font-semibold text-[#09A3E9] uppercase tracking-wider mb-2">
          1. Identificação do signatário
        </h4>
        <EvidenciaRow label="Nome completo" value={evidencias.signatario_nome} />
        <EvidenciaRow label="CPF" value={evidencias.signatario_cpf} />
        <EvidenciaRow label="E-mail" value={evidencias.signatario_email} />
        <EvidenciaRow label="Telefone" value={evidencias.signatario_telefone} />
        <EvidenciaRow label="CNPJ" value={evidencias.signatario_cnpj} />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
        <h4 className="text-xs font-semibold text-[#09A3E9] uppercase tracking-wider mb-2">
          2. Autenticação e rastreabilidade
        </h4>
        <EvidenciaRow label="Endereço IP" value={evidencias.ip_address} />
        <EvidenciaRow label="Porta lógica" value={evidencias.ip_porta} />
        <EvidenciaRow label="User-Agent" value={evidencias.user_agent} />
        <EvidenciaRow
          label="Geolocalização"
          value={
            geoLabel ? (
              <>
                {geoLabel}
                {evidencias.geo_fonte ? (
                  <span className="text-zinc-500 text-xs ml-1">({evidencias.geo_fonte})</span>
                ) : null}
              </>
            ) : (
              "Não registrada"
            )
          }
        />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
        <h4 className="text-xs font-semibold text-[#09A3E9] uppercase tracking-wider mb-2">
          3. Integridade e temporalidade
        </h4>
        <EvidenciaRow
          label="Hash SHA-256 do documento"
          value={
            <code className="text-[11px] font-mono text-emerald-400/90">
              {evidencias.documento_hash_sha256}
            </code>
          }
        />
        <EvidenciaRow label="Assinado em (Brasília)" value={evidencias.assinado_em_brasilia} />
        <EvidenciaRow
          label="Assinado em (UTC)"
          value={<ClientDate iso={evidencias.assinado_em_utc} />}
        />
        <EvidenciaRow
          label="OTP validado"
          value={
            evidencias.otp_token_id
              ? evidencias.otp_validado
                ? `Sim — token ${evidencias.otp_token_id}`
                : `Não — token ${evidencias.otp_token_id}`
              : "Não aplicável"
          }
        />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
        <h4 className="text-xs font-semibold text-[#09A3E9] uppercase tracking-wider mb-2">
          Assinatura registrada
        </h4>
        <EvidenciaRow
          label="Tipo"
          value={evidencias.assinatura_tipo === "draw" ? "Desenho digital" : "Texto digitado"}
        />
        {evidencias.assinatura_tipo === "draw" &&
        evidencias.assinatura_conteudo?.startsWith("data:image") ? (
          <div className="mt-2 p-2 bg-white rounded border border-zinc-700 inline-block">
            <img
              src={evidencias.assinatura_conteudo}
              alt="Assinatura digital"
              className="max-h-20 object-contain"
            />
          </div>
        ) : evidencias.assinatura_conteudo ? (
          <EvidenciaRow label="Texto assinado" value={evidencias.assinatura_conteudo} />
        ) : null}
      </div>
    </div>
  );
}
