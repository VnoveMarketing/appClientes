"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Contrato, Proposta, ContratoAssinaturaEvidencias } from "@/lib/types";
import {
  buildContractContent,
  buildDetalhesFinanceiros,
  getContractFinancialValues,
} from "@/lib/contract-builder";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileCheck,
  Plus,
  Link2,
  FileSignature,
  DollarSign,
  Gavel,
  ShieldCheck,
} from "lucide-react";
import { useHasMounted, ClientDate } from "@/components/client-date";

function EvidenciaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-zinc-800/60 last:border-0">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-200 break-all">{value ?? "—"}</span>
    </div>
  );
}

function EvidenciasPanel({ evidencias }: { evidencias: ContratoAssinaturaEvidencias }) {
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

export default function ContratosPage() {
  const queryClient = useQueryClient();
  const hasMounted = useHasMounted();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPropostaId, setSelectedPropostaId] = useState("");

  // Form states for generating contract
  const [finalSetup, setFinalSetup] = useState("");
  const [finalMensal, setFinalMensal] = useState("");
  const [detalhesFinanceiros, setDetalhesFinanceiros] = useState("");
  const [conteudoContrato, setConteudoContrato] = useState("");
  const [evidenciasContratoId, setEvidenciasContratoId] = useState<string | null>(null);

  const { data: evidencias, isLoading: loadingEvidencias, error: evidenciasError } = useQuery({
    queryKey: ["contrato-evidencias", evidenciasContratoId],
    queryFn: () => dbService.getContratoEvidencias(evidenciasContratoId!),
    enabled: !!evidenciasContratoId,
    retry: false,
  });

  // TanStack Query fetching
  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["contratos"],
    queryFn: dbService.getContratos,
    enabled: hasMounted,
  });

  const { data: propostas = [] } = useQuery({
    queryKey: ["propostas"],
    queryFn: dbService.getPropostas,
    enabled: hasMounted,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: dbService.getClientes,
    enabled: hasMounted,
  });

  // Filter proposals that are accepted ('aceita') but do not have a contract yet
  const acceptedPropostasWithoutContract = propostas.filter(
    (p) =>
      p.status === "aceita" &&
      !contratos.some((c) => c.proposta_id === p.id)
  );

  // Mutations
  const generateContractMutation = useMutation({
    mutationFn: async (payload: {
      proposta_id: string;
      cliente_id: string;
      valor_final_setup: number;
      valor_final_mensal: number;
      detalhes_financeiros: string;
      conteudo_contrato: string;
      status: "pendente_assinatura";
    }) => {
      // 1. Add contract
      const contract = await dbService.addContrato(payload);
      // 2. Update proposal status to 'contrato_gerado'
      await dbService.updateProposta(payload.proposta_id, {
        status: "contrato_gerado",
      });
      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      closeModal();
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPropostaId("");
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getPropostaLabel = (prop: Proposta) => {
    const client = clientes.find((c) => c.id === prop.cliente_id);
    return `${client ? client.empresa : "Desconhecido"} - Mensalidade: ${formatBRL(prop.mensalidade)}`;
  };

  const selectedProposta = propostas.find((p) => p.id === selectedPropostaId);
  const propostaLabel = selectedProposta ? getPropostaLabel(selectedProposta) : null;

  const handlePropostaChange = (propId: string) => {
    setSelectedPropostaId(propId);
    const prop = propostas.find((p) => p.id === propId);
    if (prop) {
      const { valor_final_setup, valor_final_mensal } = getContractFinancialValues(prop);

      setFinalSetup(valor_final_setup.toString());
      setFinalMensal(valor_final_mensal.toString());
      setDetalhesFinanceiros(buildDetalhesFinanceiros(prop));

      const client = clientes.find((c) => c.id === prop.cliente_id);
      setConteudoContrato(
        buildContractContent(prop, {
          empresa: client?.empresa ?? "CONTRATANTE",
          cnpj: client?.cnpj,
          cidade: client?.cidade,
          estado: client?.estado,
          nome: client?.nome,
        })
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = propostas.find((p) => p.id === selectedPropostaId);
    if (!prop) return;

    generateContractMutation.mutate({
      proposta_id: prop.id,
      cliente_id: prop.cliente_id,
      valor_final_setup: parseFloat(finalSetup),
      valor_final_mensal: parseFloat(finalMensal),
      detalhes_financeiros: detalhesFinanceiros,
      conteudo_contrato: conteudoContrato,
      status: "pendente_assinatura",
    });
  };

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/contrato/${id}`;
    navigator.clipboard.writeText(link);
    alert("Link de assinatura digital copiado:\n" + link);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Contratos</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Validação de propostas aceitas e gestão de assinaturas jurídicas.
          </p>
        </div>
        {acceptedPropostasWithoutContract.length > 0 && (
          <Button
            onClick={() => {
              setIsModalOpen(true);
              // Pre-select first proposal if available
              if (acceptedPropostasWithoutContract[0]) {
                handlePropostaChange(acceptedPropostasWithoutContract[0].id);
              }
            }}
            className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-medium px-4 py-2 flex items-center gap-2 rounded-lg transition-all shadow-md shadow-[#09A3E9]/20"
          >
            <Plus className="size-4" />
            Gerar Contrato ({acceptedPropostasWithoutContract.length})
          </Button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-[#161616] border border-zinc-800/80 rounded-xl p-4 shadow-xl">
        {(!hasMounted || isLoading) ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Carregando contratos...
          </div>
        ) : contratos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
            <Gavel className="size-8 text-zinc-650" />
            <span className="text-sm">Nenhum contrato gerado.</span>
            {acceptedPropostasWithoutContract.length > 0 ? (
              <span className="text-xs text-zinc-600">Existem propostas prontas para geração de contrato.</span>
            ) : (
              <span className="text-xs text-zinc-600">Aguardando aceite de propostas por parte dos clientes.</span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-zinc-800 hover:bg-transparent">
                <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Cliente
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Faturamento Setup
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Mensalidade Recorrente
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Assinado em
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Criado em
                  </TableHead>
                  <TableHead className="text-right text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((contrato) => {
                  const client = clientes.find((c) => c.id === contrato.cliente_id);

                  return (
                    <TableRow
                      key={contrato.id}
                      className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors"
                    >
                      <TableCell className="font-semibold text-white">
                        {client ? client.empresa : "Empresa Desconhecida"}
                      </TableCell>
                      <TableCell className="text-zinc-300 font-medium">
                        {contrato.valor_final_setup === 0 ? (
                          <span className="text-zinc-500 italic text-xs">Isento</span>
                        ) : (
                          formatBRL(contrato.valor_final_setup)
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-300 font-semibold">
                        {formatBRL(contrato.valor_final_mensal)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2.5 rounded-full border ${
                            contrato.status === "assinado"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : contrato.status === "pendente_assinatura"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-zinc-800 text-zinc-500 border-zinc-700/50"
                          }`}
                        >
                          {contrato.status === "pendente_assinatura"
                            ? "pendente assinatura"
                            : contrato.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">
                        {contrato.assinado_em ? (
                          <ClientDate iso={contrato.assinado_em} />
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">
                        <ClientDate iso={contrato.created_at} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {contrato.status === "assinado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEvidenciasContratoId(contrato.id)}
                              className="h-7 text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <ShieldCheck className="size-3 mr-1" />
                              Trilha de Auditoria
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(contrato.id)}
                            className="h-7 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                          >
                            <Link2 className="size-3 mr-1" />
                            Link Assinatura
                          </Button>
                          <a
                            href={`/contrato/${contrato.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-[#09A3E9]/20 text-[#09A3E9] hover:bg-[#09A3E9]/10"
                            >
                              <FileSignature className="size-3 mr-1" />
                              Visualizar
                            </Button>
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Generate Contract Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-(--container-xl) max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck className="size-5 text-[#09A3E9]" />
                Gerar Contrato Oficial
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Valide os dados cadastrais da proposta aceita e gere o contrato para assinatura digital.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proposta" className="text-zinc-300 text-xs">Proposta Aceita *</Label>
                <Select
                  value={selectedPropostaId}
                  onValueChange={(value) => value && handlePropostaChange(value)}
                  required
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white text-sm">
                    <SelectValue placeholder="Selecione uma proposta aceita">
                      {propostaLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {acceptedPropostasWithoutContract.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {getPropostaLabel(p)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="finalSetup" className="text-zinc-300 text-xs">Valor Final Setup (R$)</Label>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded px-3 h-9">
                    <DollarSign className="size-4 text-zinc-500" />
                    <input
                      id="finalSetup"
                      type="number"
                      value={finalSetup}
                      onChange={(e) => setFinalSetup(e.target.value)}
                      required
                      className="bg-transparent border-none outline-none text-white text-sm w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="finalMensal" className="text-zinc-300 text-xs">Valor Final Mensalidade (R$)</Label>
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded px-3 h-9">
                    <DollarSign className="size-4 text-zinc-500" />
                    <input
                      id="finalMensal"
                      type="number"
                      value={finalMensal}
                      onChange={(e) => setFinalMensal(e.target.value)}
                      required
                      className="bg-transparent border-none outline-none text-white text-sm w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="detalhes" className="text-zinc-300 text-xs">Observações / Detalhes Financeiros</Label>
                <Input
                  id="detalhes"
                  value={detalhesFinanceiros}
                  onChange={(e) => setDetalhesFinanceiros(e.target.value)}
                  placeholder="Ex: Pagamento parcelado, condições bancárias..."
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conteudo" className="text-zinc-300 text-xs">Texto Jurídico do Contrato</Label>
                <textarea
                  id="conteudo"
                  value={conteudoContrato}
                  onChange={(e) => setConteudoContrato(e.target.value)}
                  required
                  rows={8}
                  className="bg-zinc-900 border border-zinc-800 rounded p-3 text-zinc-300 text-xs font-mono outline-none focus:border-[#09A3E9]/50 w-full"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                className="text-zinc-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={generateContractMutation.isPending}
                className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-medium rounded-lg"
              >
                {generateContractMutation.isPending ? "Gerando..." : "Gerar e Enviar para Assinatura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Trilha de Auditoria */}
      <Dialog
        open={!!evidenciasContratoId}
        onOpenChange={(open) => {
          if (!open) setEvidenciasContratoId(null);
        }}
      >
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-(--container-lg) max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-400" />
              Trilha de Auditoria
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Log de evidências da assinatura digital — validade jurídica e rastreabilidade.
            </DialogDescription>
          </DialogHeader>

          {loadingEvidencias && (
            <p className="text-sm text-zinc-500 py-8 text-center">Carregando evidências...</p>
          )}

          {evidenciasError && (
            <p className="text-sm text-rose-400 py-8 text-center">
              {evidenciasError instanceof Error
                ? evidenciasError.message
                : "Trilha de auditoria não encontrada para este contrato."}
            </p>
          )}

          {evidencias && <EvidenciasPanel evidencias={evidencias} />}

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setEvidenciasContratoId(null)}
              className="text-zinc-400 hover:text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
