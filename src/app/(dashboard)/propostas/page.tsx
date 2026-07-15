"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Proposta } from "@/lib/types";
import { normalizeEscopo, type EscopoItemRef } from "@/lib/escopo";
import { entregaveisToEscopo } from "@/lib/tipos-servico";
import { syncLegacyFinancialFields, SETUP_DESCRICAO_CHAVE, tipoServicoTemCampoSetup, getDescontoInicialLabel, getDescontoMensalidadeLabel, resolvePropostaValoresFinanceiros } from "@/lib/proposta-campos";
import {
  computeCampoCalculado,
  enrichCamposValoresComCalculados,
  formatCalculatedCurrency,
} from "@/lib/campo-calculado";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientDate } from "@/components/client-date";
import {
  MoreHorizontal,
  Plus,
  Trash,
  Link2,
  Edit2,
  Trash2,
  Eye,
  Menu,
  Mail,
  Loader2,
} from "lucide-react";

export default function PropostasPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [tipoServicoId, setTipoServicoId] = useState("");
  const [camposValores, setCamposValores] = useState<Record<string, string>>({});
  const [descontoSetup, setDescontoSetup] = useState("0");
  const [descontoMensalidade, setDescontoMensalidade] = useState("0");
  const [condicaoDescricao, setCondicaoDescricao] = useState("");
  const [escopo, setEscopo] = useState<EscopoItemRef[]>([]);
  const [escopoDescricaoAdicional, setEscopoDescricaoAdicional] = useState("");
  const [novoItemNome, setNovoItemNome] = useState("");
  const [novaItemDescricao, setNovaItemDescricao] = useState("");
  const [isAddingEscopo, setIsAddingEscopo] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ["propostas"],
    queryFn: dbService.getPropostas,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: dbService.getClientes,
  });

  const { data: tiposServico = [] } = useQuery({
    queryKey: ["tipos-servico"],
    queryFn: dbService.getTiposServico,
  });

  const selectedTipo = useMemo(
    () => tiposServico.find((t) => t.id === tipoServicoId),
    [tiposServico, tipoServicoId]
  );

  const selectedCliente = clientes.find((c) => c.id === clienteId);
  const clienteLabel = selectedCliente
    ? `${selectedCliente.empresa} (${selectedCliente.nome})`
    : null;

  const tipoLabel = selectedTipo?.nome ?? null;

  const addMutation = useMutation({
    mutationFn: dbService.addProposta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Proposta> }) =>
      dbService.updateProposta(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dbService.deleteProposta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const applyTipoServico = (tipoId: string) => {
    const tipo = tiposServico.find((t) => t.id === tipoId);
    if (!tipo) return;

    const initialCampos: Record<string, string> = {};
    for (const campo of tipo.campos ?? []) {
      initialCampos[campo.chave] = camposValores[campo.chave] ?? "";
    }
    if (tipoServicoTemCampoSetup(tipo.campos)) {
      initialCampos[SETUP_DESCRICAO_CHAVE] = camposValores[SETUP_DESCRICAO_CHAVE] ?? "";
    }
    setCamposValores(initialCampos);
    setEscopo(entregaveisToEscopo(tipo.entregaveis ?? []));
  };

  const handleTipoChange = (tipoId: string) => {
    setTipoServicoId(tipoId);
    applyTipoServico(tipoId);
  };

  const resetForm = () => {
    setClienteId("");
    setTipoServicoId("");
    setCamposValores({});
    setDescontoSetup("0");
    setDescontoMensalidade("0");
    setCondicaoDescricao("");
    setEscopo([]);
    setEscopoDescricaoAdicional("");
    setNovoItemNome("");
    setNovaItemDescricao("");
  };

  const openAddModal = () => {
    setSelectedProposta(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (proposta: Proposta) => {
    setSelectedProposta(proposta);
    setClienteId(proposta.cliente_id);
    setTipoServicoId(proposta.tipo_servico_id ?? "");
    setCamposValores(
      Object.fromEntries(
        Object.entries(proposta.campos_valores ?? {}).map(([k, v]) => [k, String(v ?? "")])
      )
    );
    setDescontoSetup(proposta.desconto_setup.toString());
    setDescontoMensalidade(proposta.desconto_mensalidade.toString());
    setCondicaoDescricao(proposta.condicao_descricao || "");
    setEscopo(normalizeEscopo(proposta.escopo));
    setEscopoDescricaoAdicional(proposta.escopo_descricao_adicional ?? "");
    setNovoItemNome("");
    setNovaItemDescricao("");
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleAddEscopoItem = async () => {
    if (!novoItemNome.trim() || !tipoServicoId) return;

    setIsAddingEscopo(true);
    try {
      const saved = await dbService.addEntregavelTipo(tipoServicoId, {
        nome: novoItemNome.trim(),
        descricao: novaItemDescricao.trim(),
        ordem: escopo.length,
      });

      setEscopo([
        ...escopo,
        {
          nome: saved.nome,
          descricao: saved.descricao,
          entregavel_id: saved.id,
        } as EscopoItemRef & { entregavel_id?: string },
      ]);
      setNovoItemNome("");
      setNovaItemDescricao("");
      queryClient.invalidateQueries({ queryKey: ["tipos-servico"] });
    } finally {
      setIsAddingEscopo(false);
    }
  };

  const handleRemoveEscopoItem = (index: number) => {
    setEscopo(escopo.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipoServicoId) {
      alert("Selecione um tipo de serviço.");
      return;
    }

    const camposNumericos = enrichCamposValoresComCalculados(
      selectedTipo?.campos ?? [],
      Object.fromEntries(
        Object.entries(camposValores).map(([k, v]) => [k, v === "" ? null : Number(v) || v])
      )
    );

    const financial = syncLegacyFinancialFields(camposNumericos);

    const payload = {
      cliente_id: clienteId,
      tipo_servico_id: tipoServicoId,
      campos_valores: camposNumericos,
      setup: financial.setup,
      mensalidade: financial.mensalidade,
      desconto_setup: parseFloat(descontoSetup),
      desconto_mensalidade: parseFloat(descontoMensalidade),
      duracao: financial.duracao,
      condicao_descricao: condicaoDescricao,
      escopo,
      escopo_descricao_adicional: escopoDescricaoAdicional,
      status: (selectedProposta ? selectedProposta.status : "pendente") as Proposta["status"],
    };

    if (selectedProposta) {
      updateMutation.mutate({ id: selectedProposta.id, updates: payload });
    } else {
      addMutation.mutate(payload as Omit<Proposta, "id" | "created_at">);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir esta proposta comercial?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/proposta/${id}`;
    navigator.clipboard.writeText(link);
    alert("Link da proposta copiado para a área de transferência:\n" + link);
  };

  const handleSendEmail = async (proposta: Proposta) => {
    const client = clientes.find((c) => c.id === proposta.cliente_id);
    if (!client?.email) {
      alert("Este cliente não possui e-mail cadastrado. Atualize o cadastro do cliente antes de enviar.");
      return;
    }

    if (!confirm(`Enviar proposta por e-mail para ${client.email}?`)) return;

    setSendingEmailId(proposta.id);
    try {
      await dbService.enviarPropostaEmail(proposta.id);
      alert(`E-mail enviado para ${client.email}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Falha ao enviar e-mail");
    } finally {
      setSendingEmailId(null);
    }
  };

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const previewValores = useMemo(() => {
    if (!selectedTipo) return null;

    const camposNumericos = enrichCamposValoresComCalculados(
      selectedTipo.campos ?? [],
      Object.fromEntries(
        Object.entries(camposValores).map(([k, v]) => [k, v === "" ? null : Number(v) || v])
      )
    );
    const financial = syncLegacyFinancialFields(camposNumericos);

    return resolvePropostaValoresFinanceiros(
      {
        setup: financial.setup,
        mensalidade: financial.mensalidade,
        desconto_setup: parseFloat(descontoSetup) || 0,
        desconto_mensalidade: parseFloat(descontoMensalidade) || 0,
        duracao: financial.duracao,
        campos_valores: camposNumericos,
      },
      selectedTipo.campos
    );
  }, [selectedTipo, camposValores, descontoSetup, descontoMensalidade]);

  const getTipoNome = (id?: string | null) =>
    tiposServico.find((t) => t.id === id)?.nome ?? "—";

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Propostas</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie e compartilhe propostas comerciais personalizadas.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-medium px-4 py-2 flex items-center gap-2 rounded-lg transition-all shadow-md shadow-[#09A3E9]/20"
        >
          <Plus className="size-4" />
          Nova Proposta
        </Button>
      </div>

      <div className="bg-[#161616] border border-zinc-800/80 rounded-xl p-4 shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Carregando propostas...
          </div>
        ) : propostas.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Nenhuma proposta comercial cadastrada.
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
                    Tipo
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Mensalidade
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Setup
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Criada em
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostas.map((proposta) => {
                  const client = clientes.find((c) => c.id === proposta.cliente_id);
                  const tipo = tiposServico.find((t) => t.id === proposta.tipo_servico_id);
                  const resolved = resolvePropostaValoresFinanceiros(proposta, tipo?.campos);
                  const isSetupIsento = resolved.isSetupIsento;

                  return (
                    <TableRow
                      key={proposta.id}
                      className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors"
                    >
                      <TableCell className="font-semibold text-white">
                        {client ? client.empresa : "Empresa Desconhecida"}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">
                        {getTipoNome(proposta.tipo_servico_id)}
                      </TableCell>
                      <TableCell>
                        <span className="text-emerald-400 font-bold">
                          {formatBRL(resolved.parcelaFinal)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isSetupIsento ? (
                          <span className="text-zinc-400 font-medium text-xs bg-zinc-800 border border-zinc-700/80 px-2 py-0.5 rounded w-fit">
                            ISENTO
                          </span>
                        ) : resolved.valorInicialBruto > 0 ? (
                          <span className="font-semibold text-zinc-300">
                            {formatBRL(resolved.valorInicialFinal)}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2.5 rounded-full border w-fit ${
                              proposta.status === "aceita"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : proposta.status === "contrato_gerado"
                                ? "bg-[#09A3E9]/10 text-[#09A3E9] border-[#09A3E9]/20"
                                : proposta.status === "em_analise"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700/50"
                            }`}
                          >
                            {proposta.status === "contrato_gerado" ? "contrato" : proposta.status}
                          </span>
                          {proposta.visualizada_em ? (
                            <span className="text-[11px] font-medium text-sky-400/90 leading-tight">
                              Proposta visualizada ·{" "}
                              <ClientDate iso={proposta.visualizada_em} className="text-sky-400/90" />
                            </span>
                          ) : null}
                          {proposta.aceita_em ? (
                            <span className="text-[11px] font-medium text-emerald-400/90 leading-tight">
                              Proposta aceita ·{" "}
                              <ClientDate iso={proposta.aceita_em} className="text-emerald-400/90" />
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">
                        {new Date(proposta.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="bg-[#1c1c1e] border border-zinc-800 text-zinc-200">
                            <DropdownMenuItem
                              onClick={() => handleSendEmail(proposta)}
                              disabled={sendingEmailId === proposta.id}
                              className="focus:bg-[#09A3E9]/10 focus:text-white cursor-pointer gap-2"
                            >
                              <Mail className="size-3.5" />
                              {sendingEmailId === proposta.id ? "Enviando..." : "Enviar por E-mail"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyLink(proposta.id)}
                              className="focus:bg-[#09A3E9]/10 focus:text-white cursor-pointer gap-2"
                            >
                              <Link2 className="size-3.5" />
                              Copiar Link de Aceite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(`/proposta/${proposta.id}`, "_blank")}
                              className="focus:bg-[#09A3E9]/10 focus:text-white cursor-pointer gap-2"
                            >
                              <Eye className="size-3.5" />
                              Visualizar Proposta
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditModal(proposta)}
                              className="focus:bg-[#09A3E9]/10 focus:text-white cursor-pointer gap-2"
                            >
                              <Edit2 className="size-3.5" />
                              Alterar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(proposta.id)}
                              className="focus:bg-rose-500/10 focus:text-rose-400 text-rose-400 cursor-pointer gap-2"
                            >
                              <Trash2 className="size-3.5" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} preventOutsideDismiss>
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-(--container-xl) max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">
                {selectedProposta ? "Editar Proposta" : "Nova Proposta"}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Selecione o cliente e o tipo de serviço para carregar campos e entregáveis.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cliente">
                    Nome do cliente *
                  </Label>
                  <Select value={clienteId} onValueChange={(v) => v && setClienteId(v)} required>
                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white text-sm">
                      <SelectValue placeholder="Selecione um cliente">{clienteLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.empresa} ({c.nome})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tipoServico">
                    Tipo de serviço *
                  </Label>
                  <Select
                    value={tipoServicoId}
                    onValueChange={(v) => v && handleTipoChange(v)}
                    required
                  >
                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white text-sm">
                      <SelectValue placeholder="Selecione o tipo">{tipoLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {tiposServico.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedTipo && (
                        <>
                          <div className="border-t border-zinc-800/80 pt-3">
                            <h3 className="text-sm font-semibold text-white mb-3">
                              Tipo de serviço — {selectedTipo.nome}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[...(selectedTipo.campos ?? [])]
                                .sort((a, b) => a.ordem - b.ordem)
                                .map((campo) => {
                                if (campo.tipo_campo === "calculated") {
                                  const valorExibicao = previewValores?.valoresExibicao[campo.chave];
                                  const valor =
                                    valorExibicao != null && valorExibicao !== ""
                                      ? Number(valorExibicao)
                                      : computeCampoCalculado(campo, camposValores);
                                  const temDesconto =
                                    (parseFloat(descontoSetup) || 0) > 0 ||
                                    (parseFloat(descontoMensalidade) || 0) > 0;
                                  const valorBruto = computeCampoCalculado(campo, camposValores);
                                  return (
                                    <div key={campo.chave} className="flex flex-col gap-1.5">
                                      <Label>{campo.label}</Label>
                                      <div className="h-9 flex items-center px-3 rounded-lg border border-[#09A3E9]/30 bg-[#09A3E9]/5 text-[#09A3E9] font-semibold text-sm">
                                        {formatCalculatedCurrency(valor)}
                                      </div>
                                      {temDesconto &&
                                      valorBruto != null &&
                                      valor != null &&
                                      valorBruto !== valor ? (
                                        <span className="text-[10px] text-zinc-500 line-through">
                                          Bruto: {formatCalculatedCurrency(valorBruto)}
                                        </span>
                                      ) : null}
                                      <span className="text-[10px] text-zinc-500">
                                        Calculado automaticamente
                                        {campo.calculo?.operacao === "multiply"
                                          ? " (multiplicação dos campos)"
                                          : campo.calculo?.operacao === "divide"
                                          ? " (valor total ÷ número de parcelas)"
                                          : campo.calculo?.operacao === "add"
                                          ? " (soma dos campos)"
                                          : ""}
                                      </span>
                                    </div>
                                  );
                                }

                                return (
                                  <React.Fragment key={campo.chave}>
                                    <div className="flex flex-col gap-1.5">
                                      <Label>
                                        {campo.label}
                                        {campo.obrigatorio ? " *" : ""}
                                      </Label>
                                      <Input
                                        type={campo.tipo_campo === "text" ? "text" : "number"}
                                        required={campo.obrigatorio}
                                        value={camposValores[campo.chave] ?? ""}
                                        onChange={(e) =>
                                          setCamposValores({
                                            ...camposValores,
                                            [campo.chave]: e.target.value,
                                          })
                                        }
                                        placeholder={campo.placeholder}
                                        className="bg-zinc-900 border-zinc-800 text-zinc-100"
                                      />
                                    </div>
                                    {campo.chave === "setup" &&
                                    tipoServicoTemCampoSetup(selectedTipo.campos) ? (
                                      <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <Label htmlFor="setup-descricao">Descrição do setup</Label>
                                        <textarea
                                          id="setup-descricao"
                                          value={camposValores[SETUP_DESCRICAO_CHAVE] ?? ""}
                                          onChange={(e) =>
                                            setCamposValores({
                                              ...camposValores,
                                              [SETUP_DESCRICAO_CHAVE]: e.target.value,
                                            })
                                          }
                                          placeholder="Descreva o que está incluso na etapa de setup..."
                                          rows={3}
                                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#09A3E9]/40"
                                        />
                                      </div>
                                    ) : null}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
        
                          <div className="border-t border-zinc-800/80 pt-3">
                            <h3 className="text-sm font-semibold text-white mb-3">Condições Especiais</h3>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <Label>{getDescontoInicialLabel(selectedTipo.campos)}</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={descontoSetup}
                                  onChange={(e) => setDescontoSetup(e.target.value)}
                                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label>{getDescontoMensalidadeLabel(selectedTipo.campos)}</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={descontoMensalidade}
                                  onChange={(e) => setDescontoMensalidade(e.target.value)}
                                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label>Descrição da condição</Label>
                                <Input
                                  value={condicaoDescricao}
                                  onChange={(e) => setCondicaoDescricao(e.target.value)}
                                  placeholder="Ex: 50% nos 3 primeiros meses"
                                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                                />
                              </div>
                            </div>
                            {previewValores &&
                            ((parseFloat(descontoSetup) || 0) > 0 ||
                              (parseFloat(descontoMensalidade) || 0) > 0) ? (
                              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                                <span className="font-medium text-zinc-300">Prévia com descontos: </span>
                                {previewValores.valorInicialBruto > 0 ? (
                                  <>
                                    {getDescontoInicialLabel(selectedTipo.campos).replace(" (%)", "")}{" "}
                                    {formatBRL(previewValores.valorInicialFinal)}
                                  </>
                                ) : null}
                                {previewValores.parcelaFinal > 0 ? (
                                  <>
                                    {previewValores.valorInicialBruto > 0 ? " · " : null}
                                    {getDescontoMensalidadeLabel(selectedTipo.campos).replace(" (%)", "")}{" "}
                                    {formatBRL(previewValores.parcelaFinal)}
                                  </>
                                ) : null}
                                {previewValores.duracao > 0 && previewValores.parcelaFinal > 0 ? (
                                  <>
                                    {" "}
                                    · total do contrato {formatBRL(previewValores.valorTotalContrato)}
                                  </>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
        
                          <div className="border-t border-zinc-800/80 pt-3">
                            <div className="mb-3">
                              <h3 className="text-sm font-semibold text-white">Escopo da Solução</h3>
                              <p className="text-xs text-zinc-400">
                                Entregáveis do tipo &quot;{selectedTipo.nome}&quot; — novos itens são salvos no cadastro do tipo
                              </p>
                            </div>
        
                            <div className="grid gap-3 mb-4 p-3 border border-zinc-800 rounded-lg bg-zinc-950">
                              <div className="flex flex-col gap-1.5">
                                <Label>Nome do item *</Label>
                                <Input
                                  placeholder="Ex: CRM, Integrações..."
                                  value={novoItemNome}
                                  onChange={(e) => setNovoItemNome(e.target.value)}
                                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label>Descrição do entregável</Label>
                                <textarea
                                  placeholder="Descreva o que está incluso..."
                                  value={novaItemDescricao}
                                  onChange={(e) => setNovaItemDescricao(e.target.value)}
                                  rows={2}
                                  className="bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-zinc-100 text-sm outline-none focus:border-[#09A3E9]/50 w-full resize-y font-[family-name:var(--font-inter)]"
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={handleAddEscopoItem}
                                disabled={isAddingEscopo || !novoItemNome.trim()}
                                size="sm"
                                className="w-fit bg-zinc-800 hover:bg-zinc-700 text-white text-xs border border-zinc-700"
                              >
                                {isAddingEscopo ? "Salvando..." : "+ Adicionar item ao escopo"}
                              </Button>
                            </div>
        
                            <div className="grid gap-2 border border-zinc-800 rounded-lg p-3 bg-zinc-950">
                              {escopo.length === 0 ? (
                                <p className="text-xs text-zinc-500 text-center py-4">
                                  Nenhum entregável. Adicione itens ou cadastre no tipo de serviço.
                                </p>
                              ) : (
                                escopo.map((item, idx) => (
                                  <div
                                    key={`${item.nome}-${idx}`}
                                    className="flex items-start justify-between bg-zinc-900 border border-zinc-800/80 rounded px-3 py-2"
                                  >
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      <Menu className="size-3 text-zinc-500 mt-1 shrink-0" />
                                      <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-xs font-semibold text-zinc-200">{item.nome}</span>
                                        {item.descricao ? (
                                          <span className="text-[11px] text-zinc-500 leading-relaxed">
                                            {item.descricao}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => handleRemoveEscopoItem(idx)}
                                      className="h-6 w-6 p-0 text-zinc-500 hover:text-rose-400 shrink-0"
                                    >
                                      <Trash className="size-3" />
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </>
               )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="escopoDescricaoAdicional">
                  Descrição adicional do escopo
                </Label>
                <textarea
                  id="escopoDescricaoAdicional"
                  value={escopoDescricaoAdicional}
                  onChange={(e) => setEscopoDescricaoAdicional(e.target.value)}
                  placeholder="Detalhes gerais do escopo..."
                  rows={2}
                  className="bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-zinc-100 text-sm outline-none focus:border-[#09A3E9]/50 w-full resize-y font-[family-name:var(--font-inter)]"
                />
              </div>

            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                disabled={addMutation.isPending || updateMutation.isPending}
                className="text-zinc-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!tipoServicoId || addMutation.isPending || updateMutation.isPending}
                className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-medium rounded-lg"
              >
                {addMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    {selectedProposta ? "Salvando..." : "Salvando proposta..."}
                  </>
                ) : selectedProposta ? (
                  "Salvar Alterações"
                ) : (
                  "Salvar Proposta"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
