"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Contrato, Proposta, ContratoAssinaturaEvidencias } from "@/lib/types";
import {
  getDescontoInicialLabel,
  getDescontoMensalidadeLabel,
  resolvePropostaValoresFinanceiros,
} from "@/lib/proposta-campos";
import {
  buildContractContent,
  buildContractContentResolved,
  buildDetalhesFinanceiros,
  getContractFinancialValues,
  normalizeContractText,
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
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { useHasMounted, ClientDate } from "@/components/client-date";
import { ContratoEvidenciasPanel } from "@/components/contrato-evidencias-panel";

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
  const [revisaoContrato, setRevisaoContrato] = useState<Contrato | null>(null);
  const [revisaoSetup, setRevisaoSetup] = useState("");
  const [revisaoMensal, setRevisaoMensal] = useState("");
  const [revisaoDetalhes, setRevisaoDetalhes] = useState("");
  const [revisaoConteudo, setRevisaoConteudo] = useState("");
  const [revisaoDescontoSetup, setRevisaoDescontoSetup] = useState("");
  const [revisaoDescontoMensalidade, setRevisaoDescontoMensalidade] = useState("");
  const [revisaoCondicaoDescricao, setRevisaoCondicaoDescricao] = useState("");

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

  const { data: contratoModelos = [] } = useQuery({
    queryKey: ["contrato-modelos"],
    queryFn: dbService.getContratoModelos,
    enabled: hasMounted,
  });

  const { data: tiposServico = [] } = useQuery({
    queryKey: ["tipos-servico"],
    queryFn: dbService.getTiposServico,
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
      status: "pendente_financeiro";
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

  const getCamposForProposta = (proposta?: Proposta) => {
    if (!proposta?.tipo_servico_id) return undefined;
    return tiposServico.find((t) => t.id === proposta.tipo_servico_id)?.campos;
  };

  const getValorInicialContratoLabel = (proposta?: Proposta) => {
    const campos = getCamposForProposta(proposta);
    const label = getDescontoInicialLabel(campos).replace(" (%)", "");
    if (label.includes("valor total")) return "Valor final do projeto (R$)";
    if (label.includes("setup")) return "Valor final do setup (R$)";
    return "Valor final inicial (R$)";
  };

  const getValorRecorrenteContratoLabel = (proposta?: Proposta) => {
    const campos = getCamposForProposta(proposta);
    const label = getDescontoMensalidadeLabel(campos).replace(" (%)", "");
    return `Valor final da ${label.toLowerCase()} (R$)`;
  };

  const getPropostaLabel = (prop: Proposta) => {
    const client = clientes.find((c) => c.id === prop.cliente_id);
    const tipo = tiposServico.find((t) => t.id === prop.tipo_servico_id);
    const resolved = resolvePropostaValoresFinanceiros(prop, tipo?.campos);
    return `${client ? client.empresa : "Desconhecido"} - Parcela: ${formatBRL(resolved.parcelaFinal)}`;
  };

  const selectedProposta = propostas.find((p) => p.id === selectedPropostaId);
  const propostaLabel = selectedProposta ? getPropostaLabel(selectedProposta) : null;

  const handlePropostaChange = (propId: string) => {
    setSelectedPropostaId(propId);
    const prop = propostas.find((p) => p.id === propId);
    if (prop) {
      const tipoServico = tiposServico.find((t) => t.id === prop.tipo_servico_id);
      const { valor_final_setup, valor_final_mensal } = getContractFinancialValues(
        prop,
        tipoServico?.campos
      );

      setFinalSetup(valor_final_setup.toString());
      setFinalMensal(valor_final_mensal.toString());
      setDetalhesFinanceiros(buildDetalhesFinanceiros(prop));

      const client = clientes.find((c) => c.id === prop.cliente_id);
      setConteudoContrato(
        buildContractContent(
          prop,
          {
            empresa: client?.empresa ?? "CONTRATANTE",
            cnpj: client?.cnpj,
            cidade: client?.cidade,
            estado: client?.estado,
            nome: client?.nome,
          },
          { campos: tipoServico?.campos }
        )
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
      status: "pendente_financeiro",
    });
  };

  const revisarMutation = useMutation({
    mutationFn: async () => {
      if (!revisaoContrato) return;

      const proposta = propostas.find((p) => p.id === revisaoContrato.proposta_id);
      if (proposta) {
        await dbService.updateProposta(revisaoContrato.proposta_id, {
          desconto_setup: parseFloat(revisaoDescontoSetup) || 0,
          desconto_mensalidade: parseFloat(revisaoDescontoMensalidade) || 0,
          condicao_descricao: revisaoCondicaoDescricao.trim() || "Nenhuma",
        });
      }

      const conteudoAtualizado = revisaoValoresAlterados()
        ? rebuildRevisaoConteudo()
        : revisaoConteudo;

      const contratoAtualizado = await dbService.revisarContrato(revisaoContrato.id, {
        valor_final_setup: parseFloat(revisaoSetup),
        valor_final_mensal: parseFloat(revisaoMensal),
        detalhes_financeiros: revisaoDetalhes,
        conteudo_contrato: conteudoAtualizado,
      });

      return { contratoAtualizado, conteudoAtualizado };
    },
    onSuccess: (result) => {
      if (result?.conteudoAtualizado) {
        setRevisaoConteudo(result.conteudoAtualizado);
      }
      if (result?.contratoAtualizado) {
        setRevisaoContrato(result.contratoAtualizado);
      }
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
    },
  });

  const liberarMutation = useMutation({
    mutationFn: (contratoId: string) => dbService.liberarContratoAssinatura(contratoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      setRevisaoContrato(null);
      alert("Contrato liberado! O cliente receberá o e-mail para assinatura.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (contratoId: string) => dbService.deleteContrato(contratoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      setRevisaoContrato(null);
      setEvidenciasContratoId(null);
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : "Não foi possível excluir o contrato.");
    },
  });

  const openRevisaoModal = (contrato: Contrato) => {
    const proposta = propostas.find((p) => p.id === contrato.proposta_id);

    setRevisaoContrato(contrato);
    setRevisaoSetup(String(contrato.valor_final_setup));
    setRevisaoMensal(String(contrato.valor_final_mensal));
    setRevisaoDetalhes(contrato.detalhes_financeiros);
    setRevisaoConteudo(normalizeContractText(contrato.conteudo_contrato));
    setRevisaoDescontoSetup(String(proposta?.desconto_setup ?? 0));
    setRevisaoDescontoMensalidade(String(proposta?.desconto_mensalidade ?? 0));
    setRevisaoCondicaoDescricao(
      proposta?.condicao_descricao && proposta.condicao_descricao !== "Nenhuma"
        ? proposta.condicao_descricao
        : ""
    );
  };

  const getRevisaoProposta = () =>
    revisaoContrato ? propostas.find((p) => p.id === revisaoContrato.proposta_id) : undefined;

  const getRevisaoPropostaAtualizada = () => {
    const proposta = getRevisaoProposta();
    if (!proposta) return undefined;

    return {
      ...proposta,
      desconto_setup: parseFloat(revisaoDescontoSetup) || 0,
      desconto_mensalidade: parseFloat(revisaoDescontoMensalidade) || 0,
      condicao_descricao: revisaoCondicaoDescricao.trim() || "Nenhuma",
    };
  };

  const revisaoValoresAlterados = () => {
    if (!revisaoContrato) return false;

    const proposta = getRevisaoProposta();
    const setupAtual = parseFloat(revisaoSetup);
    const mensalAtual = parseFloat(revisaoMensal);
    const descontoSetupAtual = parseFloat(revisaoDescontoSetup) || 0;
    const descontoMensalAtual = parseFloat(revisaoDescontoMensalidade) || 0;
    const condicaoAtual = revisaoCondicaoDescricao.trim() || "Nenhuma";
    const condicaoOriginal =
      proposta?.condicao_descricao && proposta.condicao_descricao !== "Nenhuma"
        ? proposta.condicao_descricao.trim()
        : "Nenhuma";

    return (
      setupAtual !== revisaoContrato.valor_final_setup ||
      mensalAtual !== revisaoContrato.valor_final_mensal ||
      descontoSetupAtual !== (proposta?.desconto_setup ?? 0) ||
      descontoMensalAtual !== (proposta?.desconto_mensalidade ?? 0) ||
      condicaoAtual !== condicaoOriginal ||
      revisaoDetalhes !== revisaoContrato.detalhes_financeiros
    );
  };

  const rebuildRevisaoConteudo = () => {
    const proposta = getRevisaoPropostaAtualizada();
    if (!proposta || !revisaoContrato) return revisaoConteudo;

    const cliente = clientes.find((c) => c.id === revisaoContrato.cliente_id);
    const tipoServico = proposta.tipo_servico_id
      ? tiposServico.find((t) => t.id === proposta.tipo_servico_id)
      : undefined;
    const modeloAtivo = contratoModelos.find((m) => m.ativo);

    return buildContractContentResolved(
      proposta,
      {
        empresa: cliente?.empresa ?? "CONTRATANTE",
        cnpj: cliente?.cnpj,
        cidade: cliente?.cidade,
        estado: cliente?.estado,
        nome: cliente?.nome,
      },
      {
        template: modeloAtivo?.conteudo_template,
        tipoServicoNome: tipoServico?.nome ?? null,
        campos: tipoServico?.campos?.map((campo) => ({
          chave: campo.chave,
          label: campo.label,
          tipo_campo: campo.tipo_campo,
        })),
        valorSetup: parseFloat(revisaoSetup),
        valorMensal: parseFloat(revisaoMensal),
      }
    );
  };

  const applyRevisaoDescontos = (
    descontoSetup: number,
    descontoMensalidade: number,
    condicaoDescricao?: string
  ) => {
    const proposta = getRevisaoProposta();
    if (!proposta) return;

    const tipoServico = proposta.tipo_servico_id
      ? tiposServico.find((t) => t.id === proposta.tipo_servico_id)
      : undefined;

    const { valor_final_setup, valor_final_mensal } = getContractFinancialValues(
      {
        ...proposta,
        desconto_setup: descontoSetup,
        desconto_mensalidade: descontoMensalidade,
      },
      tipoServico?.campos
    );

    setRevisaoSetup(String(valor_final_setup));
    setRevisaoMensal(String(valor_final_mensal));

    if (condicaoDescricao !== undefined) {
      setRevisaoDetalhes(
        buildDetalhesFinanceiros({
          ...proposta,
          condicao_descricao: condicaoDescricao.trim() || "Nenhuma",
        })
      );
    }
  };

  const handleRevisaoDescontoSetupChange = (value: string) => {
    setRevisaoDescontoSetup(value);
    applyRevisaoDescontos(parseFloat(value) || 0, parseFloat(revisaoDescontoMensalidade) || 0);
  };

  const handleRevisaoDescontoMensalidadeChange = (value: string) => {
    setRevisaoDescontoMensalidade(value);
    applyRevisaoDescontos(parseFloat(revisaoDescontoSetup) || 0, parseFloat(value) || 0);
  };

  const handleRevisaoCondicaoChange = (value: string) => {
    setRevisaoCondicaoDescricao(value);
    applyRevisaoDescontos(
      parseFloat(revisaoDescontoSetup) || 0,
      parseFloat(revisaoDescontoMensalidade) || 0,
      value
    );
  };

  const handleSalvarRevisao = async (e: React.FormEvent) => {
    e.preventDefault();
    const valoresAlterados = revisaoValoresAlterados();
    await revisarMutation.mutateAsync();
    alert(
      valoresAlterados
        ? "Alterações salvas. O texto do contrato foi atualizado com os novos valores."
        : "Alterações salvas."
    );
  };

  const handleLiberarAssinatura = async () => {
    if (!revisaoContrato) return;
    if (
      !confirm(
        "Liberar contrato para assinatura do cliente? Um e-mail será enviado automaticamente."
      )
    ) {
      return;
    }
    if (revisarMutation.isPending) return;
    await revisarMutation.mutateAsync().catch(() => {});
    liberarMutation.mutate(revisaoContrato.id);
  };

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/contrato/${id}`;
    navigator.clipboard.writeText(link);
    alert("Link de assinatura digital copiado:\n" + link);
  };

  const handleDeleteContrato = (contrato: Contrato) => {
    const client = clientes.find((c) => c.id === contrato.cliente_id);
    const empresa = client?.empresa ?? "este cliente";

    if (contrato.status === "assinado") {
      alert("Contratos assinados não podem ser excluídos.");
      return;
    }

    const mensagem =
      contrato.status === "pendente_assinatura"
        ? `Excluir o contrato de "${empresa}"?\n\nO link de assinatura deixará de funcionar e a proposta voltará para o status "aceita".`
        : `Excluir o contrato de "${empresa}"?\n\nA proposta voltará para o status "aceita" e poderá gerar um novo contrato.`;

    if (!confirm(mensagem)) return;

    deleteMutation.mutate(contrato.id);
  };

  const revisaoPropostaAtual = getRevisaoProposta();
  const revisaoCamposAtual = getCamposForProposta(revisaoPropostaAtual);
  const revisaoValoresResolvidos = revisaoPropostaAtual
    ? resolvePropostaValoresFinanceiros(revisaoPropostaAtual, revisaoCamposAtual)
    : null;

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
                        <div className="flex flex-col gap-1.5">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2.5 rounded-full border w-fit ${
                              contrato.status === "assinado"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : contrato.status === "pendente_assinatura"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : contrato.status === "pendente_financeiro"
                                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700/50"
                            }`}
                          >
                            {contrato.status === "pendente_assinatura"
                              ? "pendente assinatura"
                              : contrato.status === "pendente_financeiro"
                              ? "aguardando revisão"
                              : contrato.status}
                          </Badge>
                          {contrato.assinatura_iniciada_em ? (
                            <span className="text-[11px] font-medium text-violet-400/90 leading-tight">
                              Assinatura iniciada ·{" "}
                              <ClientDate
                                iso={contrato.assinatura_iniciada_em}
                                className="text-violet-400/90"
                              />
                            </span>
                          ) : null}
                        </div>
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
                          {contrato.status === "pendente_financeiro" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRevisaoModal(contrato)}
                              className="h-7 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                            >
                              <Pencil className="size-3 mr-1" />
                              Revisar e editar
                            </Button>
                          )}
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
                          {contrato.status !== "pendente_financeiro" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyLink(contrato.id)}
                              className="h-7 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            >
                              <Link2 className="size-3 mr-1" />
                              Link Assinatura
                            </Button>
                          )}
                          <a
                            href={`/contrato/${contrato.id}?painel=admin`}
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
                          {contrato.status !== "assinado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteContrato(contrato)}
                              disabled={deleteMutation.isPending}
                              className="h-7 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="size-3 mr-1" />
                              Excluir
                            </Button>
                          )}
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
                <Label htmlFor="proposta">Proposta Aceita *</Label>
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
                  <Label htmlFor="finalSetup">{getValorInicialContratoLabel(selectedProposta)}</Label>
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
                  <Label htmlFor="finalMensal">{getValorRecorrenteContratoLabel(selectedProposta)}</Label>
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
                <Label htmlFor="detalhes">Observações / Detalhes Financeiros</Label>
                <Input
                  id="detalhes"
                  value={detalhesFinanceiros}
                  onChange={(e) => setDetalhesFinanceiros(e.target.value)}
                  placeholder="Ex: Pagamento parcelado, condições bancárias..."
                  className="bg-zinc-900 border-zinc-800 text-white text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conteudo">Texto Jurídico do Contrato</Label>
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
                {generateContractMutation.isPending ? "Gerando..." : "Gerar para Revisão Financeira"}
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

          {evidencias && <ContratoEvidenciasPanel evidencias={evidencias} />}

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

      {/* Revisão financeira */}
      <Dialog
        open={!!revisaoContrato}
        onOpenChange={(open) => {
          if (!open) setRevisaoContrato(null);
        }}
      >
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-(--container-xl) max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSalvarRevisao}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Pencil className="size-5 text-violet-400" />
                Revisar contrato
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Edite o contrato antes de liberar para assinatura do cliente. Após validar, use
                &quot;Liberar para assinatura&quot; para enviar o e-mail ao cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="revisaoSetup">
                    {getValorInicialContratoLabel(revisaoPropostaAtual)}
                  </Label>
                  <Input
                    id="revisaoSetup"
                    type="number"
                    value={revisaoSetup}
                    onChange={(e) => setRevisaoSetup(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="revisaoMensal">
                    {getValorRecorrenteContratoLabel(revisaoPropostaAtual)}
                  </Label>
                  <Input
                    id="revisaoMensal"
                    type="number"
                    value={revisaoMensal}
                    onChange={(e) => setRevisaoMensal(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Condições especiais</h3>
                {revisaoValoresResolvidos ? (
                  <p className="text-xs text-zinc-500 mb-3">
                    Valores base (sem desconto):
                    {revisaoValoresResolvidos.valorInicialBruto > 0
                      ? ` ${getDescontoInicialLabel(revisaoCamposAtual).replace(" (%)", "").toLowerCase()} ${formatBRL(revisaoValoresResolvidos.valorInicialBruto)}`
                      : ""}
                    {revisaoValoresResolvidos.parcelaBruta > 0
                      ? ` · ${getDescontoMensalidadeLabel(revisaoCamposAtual).replace(" (%)", "").toLowerCase()} ${formatBRL(revisaoValoresResolvidos.parcelaBruta)}`
                      : ""}
                  </p>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="revisaoDescontoSetup">
                      {getDescontoInicialLabel(revisaoCamposAtual)}
                    </Label>
                    <Input
                      id="revisaoDescontoSetup"
                      type="number"
                      min="0"
                      max="100"
                      value={revisaoDescontoSetup}
                      onChange={(e) => handleRevisaoDescontoSetupChange(e.target.value)}
                      className="bg-zinc-900 border-zinc-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="revisaoDescontoMensalidade">
                      {getDescontoMensalidadeLabel(revisaoCamposAtual)}
                    </Label>
                    <Input
                      id="revisaoDescontoMensalidade"
                      type="number"
                      min="0"
                      max="100"
                      value={revisaoDescontoMensalidade}
                      onChange={(e) => handleRevisaoDescontoMensalidadeChange(e.target.value)}
                      className="bg-zinc-900 border-zinc-800"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="revisaoCondicaoDescricao">Descrição da condição</Label>
                    <Input
                      id="revisaoCondicaoDescricao"
                      value={revisaoCondicaoDescricao}
                      onChange={(e) => handleRevisaoCondicaoChange(e.target.value)}
                      placeholder="Ex: 50% nos 3 primeiros meses"
                      className="bg-zinc-900 border-zinc-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="revisaoDetalhes">Detalhes financeiros</Label>
                <Input
                  id="revisaoDetalhes"
                  value={revisaoDetalhes}
                  onChange={(e) => setRevisaoDetalhes(e.target.value)}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="revisaoConteudo">Texto do contrato</Label>
                <textarea
                  id="revisaoConteudo"
                  value={revisaoConteudo}
                  onChange={(e) => setRevisaoConteudo(e.target.value)}
                  required
                  rows={12}
                  className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-zinc-100 text-sm outline-none focus:border-[#09A3E9]/50 w-full font-mono"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2 flex-wrap">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRevisaoContrato(null)}
                className="text-zinc-400 hover:text-white"
              >
                Fechar
              </Button>
              <Button
                type="submit"
                disabled={revisarMutation.isPending}
                variant="outline"
                className="border-zinc-700"
              >
                {revisarMutation.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
              <Button
                type="button"
                disabled={liberarMutation.isPending || revisarMutation.isPending}
                onClick={handleLiberarAssinatura}
                className="bg-emerald-600 hover:bg-emerald-600/90 text-white"
              >
                <Send className="size-4 mr-1" />
                {liberarMutation.isPending ? "Liberando..." : "Liberar para assinatura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
