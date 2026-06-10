"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import { Proposta } from "@/lib/types";
import {
  normalizeEscopo,
  type EscopoItemRef,
  type EscopoItemCatalog,
} from "@/lib/escopo";
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
import {
  MoreHorizontal,
  Plus,
  Trash,
  Link2,
  Edit2,
  Trash2,
  Eye,
  Menu,
} from "lucide-react";
import Link from "next/link";

const DEFAULT_ESCOPO_NAMES = [
  "CRM",
  "Funis de vendas",
  "Chat ao vivo",
  "API oficial do Whatsapp",
  "Automação de fluxos",
  "Integrações",
];

function buildDefaultEscopo(catalog: EscopoItemCatalog[]): EscopoItemRef[] {
  return DEFAULT_ESCOPO_NAMES.map((nome) => {
    const found = catalog.find((c) => c.nome === nome);
    return found
      ? { nome: found.nome, descricao: found.descricao, escopo_item_id: found.id }
      : { nome, descricao: "" };
  });
}

export default function PropostasPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<Proposta | null>(null);

  // Form states
  const [clienteId, setClienteId] = useState("");
  const [setup, setSetup] = useState("");
  const [mensalidade, setMensalidade] = useState("");
  const [descontoSetup, setDescontoSetup] = useState("0");
  const [descontoMensalidade, setDescontoMensalidade] = useState("0");
  const [duracao, setDuracao] = useState("12");
  const [condicaoDescricao, setCondicaoDescricao] = useState("");
  const [escopo, setEscopo] = useState<EscopoItemRef[]>([]);
  const [escopoDescricaoAdicional, setEscopoDescricaoAdicional] = useState("");
  const [novoItemNome, setNovoItemNome] = useState("");
  const [novaItemDescricao, setNovaItemDescricao] = useState("");
  const [isAddingEscopo, setIsAddingEscopo] = useState(false);

  // TanStack Query fetching
  const { data: propostas = [], isLoading } = useQuery({
    queryKey: ["propostas"],
    queryFn: dbService.getPropostas,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: dbService.getClientes,
  });

  const { data: escopoCatalog = [] } = useQuery({
    queryKey: ["escopo-itens"],
    queryFn: dbService.getEscopoItens,
  });

  const selectedCliente = clientes.find((c) => c.id === clienteId);
  const clienteLabel = selectedCliente
    ? `${selectedCliente.empresa} (${selectedCliente.nome})`
    : null;

  // Mutations
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

  const openAddModal = () => {
    setSelectedProposta(null);
    setClienteId("");
    setSetup("9500");
    setMensalidade("2987");
    setDescontoSetup("0");
    setDescontoMensalidade("0");
    setDuracao("12");
    setCondicaoDescricao("");
    setEscopo(buildDefaultEscopo(escopoCatalog));
    setEscopoDescricaoAdicional("");
    setNovoItemNome("");
    setNovaItemDescricao("");
    setIsModalOpen(true);
  };

  const openEditModal = (proposta: Proposta) => {
    setSelectedProposta(proposta);
    setClienteId(proposta.cliente_id);
    setSetup(proposta.setup.toString());
    setMensalidade(proposta.mensalidade.toString());
    setDescontoSetup(proposta.desconto_setup.toString());
    setDescontoMensalidade(proposta.desconto_mensalidade.toString());
    setDuracao(proposta.duracao.toString());
    setCondicaoDescricao(proposta.condicao_descricao || "");
    setEscopo(normalizeEscopo(proposta.escopo));
    setEscopoDescricaoAdicional(proposta.escopo_descricao_adicional ?? "");
    setNovoItemNome("");
    setNovaItemDescricao("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleAddEscopoItem = async () => {
    if (!novoItemNome.trim()) return;

    setIsAddingEscopo(true);
    try {
      const saved = await dbService.addEscopoItem({
        nome: novoItemNome.trim(),
        descricao: novaItemDescricao.trim(),
      });

      setEscopo([
        ...escopo,
        {
          nome: saved.nome,
          descricao: saved.descricao,
          escopo_item_id: saved.id,
        },
      ]);
      setNovoItemNome("");
      setNovaItemDescricao("");
      queryClient.invalidateQueries({ queryKey: ["escopo-itens"] });
    } finally {
      setIsAddingEscopo(false);
    }
  };

  const handleRemoveEscopoItem = (index: number) => {
    setEscopo(escopo.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      cliente_id: clienteId,
      setup: parseFloat(setup),
      mensalidade: parseFloat(mensalidade),
      desconto_setup: parseFloat(descontoSetup),
      desconto_mensalidade: parseFloat(descontoMensalidade),
      duracao: parseInt(duracao),
      condicao_descricao: condicaoDescricao,
      escopo,
      escopo_descricao_adicional: escopoDescricaoAdicional,
      status: (selectedProposta ? selectedProposta.status : "pendente") as any,
    };

    if (selectedProposta) {
      updateMutation.mutate({ id: selectedProposta.id, updates: payload });
    } else {
      addMutation.mutate(payload);
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

  // Helper: format currency
  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Helper: calculate discounted value
  const calcDiscount = (val: number, pct: number) => {
    return val - (val * pct) / 100;
  };

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      {/* Header */}
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

      {/* Table Section */}
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
                    Mensalidade
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Setup
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Duração (Meses)
                  </TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    Condições Especiais
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
                  const isSetupIsento = proposta.desconto_setup === 100;

                  return (
                    <TableRow
                      key={proposta.id}
                      className="border-b border-zinc-800/60 hover:bg-zinc-800/20 transition-colors"
                    >
                      <TableCell className="font-semibold text-white">
                        {client ? client.empresa : "Empresa Desconhecida"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-bold">
                            {formatBRL(calcDiscount(proposta.mensalidade, proposta.desconto_mensalidade))}
                          </span>
                          {proposta.desconto_mensalidade > 0 && (
                            <span className="text-zinc-500 line-through text-xs">
                              {formatBRL(proposta.mensalidade)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-zinc-300">
                          {isSetupIsento ? (
                            <span className="text-zinc-400 font-medium text-xs bg-zinc-800 border border-zinc-700/80 px-2 py-0.5 rounded w-fit">
                              ISENTO
                            </span>
                          ) : (
                            <span className="font-semibold">
                              {formatBRL(calcDiscount(proposta.setup, proposta.desconto_setup))}
                            </span>
                          )}
                          {proposta.desconto_setup > 0 && !isSetupIsento && (
                            <span className="text-zinc-500 line-through text-xs">
                              {formatBRL(proposta.setup)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-300 text-sm font-medium">
                        {proposta.duracao === 0 ? "Sem prazo" : `${proposta.duracao} meses`}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs max-w-xs truncate">
                        {proposta.condicao_descricao || "Nenhuma"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2.5 rounded-full border ${
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

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-(--container-xl) max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">
                {selectedProposta ? "Editar Proposta" : "Nova Proposta"}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Preencha os dados para gerar uma proposta comercial personalizada.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cliente" className="text-zinc-300 text-xs">Nome do cliente *</Label>
                <Select value={clienteId} onValueChange={(v) => v && setClienteId(v)} required>
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white text-sm">
                    <SelectValue placeholder="Selecione um cliente">
                      {clienteLabel}
                    </SelectValue>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="setup" className="text-zinc-300 text-xs">Setup (R$)</Label>
                  <Input
                    id="setup"
                    type="number"
                    value={setup}
                    onChange={(e) => setSetup(e.target.value)}
                    required
                    placeholder="Ex: 9500"
                    className="bg-zinc-900 border-zinc-800 text-white text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mensalidade" className="text-zinc-300 text-xs">Mensalidade (R$)</Label>
                  <Input
                    id="mensalidade"
                    type="number"
                    value={mensalidade}
                    onChange={(e) => setMensalidade(e.target.value)}
                    required
                    placeholder="Ex: 2987"
                    className="bg-zinc-900 border-zinc-800 text-white text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800/80 my-2 pt-3">
                <h3 className="text-sm font-semibold text-white mb-3">Condições Especiais</h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Defina os descontos de entrada. O cálculo será aplicado automaticamente na proposta.
                </p>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="descontoSetup" className="text-zinc-300 text-xs">Desconto no setup (%)</Label>
                    <Input
                      id="descontoSetup"
                      type="number"
                      min="0"
                      max="100"
                      value={descontoSetup}
                      onChange={(e) => setDescontoSetup(e.target.value)}
                      placeholder="Ex: 100"
                      className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    />
                    <span className="text-[10px] text-zinc-500">0 = sem desconto, 100 = isento</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="descontoMensalidade" className="text-zinc-300 text-xs">Desconto mensalidade (%)</Label>
                    <Input
                      id="descontoMensalidade"
                      type="number"
                      min="0"
                      max="100"
                      value={descontoMensalidade}
                      onChange={(e) => setDescontoMensalidade(e.target.value)}
                      placeholder="Ex: 50"
                      className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    />
                    <span className="text-[10px] text-zinc-500">0 = sem desconto</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="duracao" className="text-zinc-300 text-xs">Duração (meses)</Label>
                    <Input
                      id="duracao"
                      type="number"
                      value={duracao}
                      onChange={(e) => setDuracao(e.target.value)}
                      placeholder="Ex: 3"
                      className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    />
                    <span className="text-[10px] text-zinc-500">0 = sem prazo</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-4">
                  <Label htmlFor="condicaoDescricao" className="text-zinc-300 text-xs">Descrição da condição (opcional)</Label>
                  <Input
                    id="condicaoDescricao"
                    value={condicaoDescricao}
                    onChange={(e) => setCondicaoDescricao(e.target.value)}
                    placeholder="Ex: 100% isenção de Setup + 50% de desconto por 3 meses"
                    className="bg-zinc-900 border-zinc-800 text-white text-sm"
                  />
                  <span className="text-[10px] text-zinc-500">Texto livre exibido como destaque na proposta, além do cálculo automático.</span>
                </div>
              </div>

              <div className="border-t border-zinc-800/80 my-2 pt-3">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-white">Escopo da Solução</h3>
                  <p className="text-xs text-zinc-400">Itens incluídos na proposta e no contrato</p>
                </div>

                <div className="grid gap-3 mb-4 p-3 border border-zinc-800 rounded-lg bg-zinc-950">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-zinc-300 text-xs">Nome do item *</Label>
                    <Input
                      placeholder="Ex: CRM, Integrações..."
                      value={novoItemNome}
                      onChange={(e) => setNovoItemNome(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-white text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-zinc-300 text-xs">Descrição do entregável</Label>
                    <textarea
                      placeholder="Descreva o que está incluso neste item..."
                      value={novaItemDescricao}
                      onChange={(e) => setNovaItemDescricao(e.target.value)}
                      rows={3}
                      className="bg-zinc-900 border border-zinc-800 rounded-md p-2 text-white text-sm outline-none focus:border-[#09A3E9]/50 w-full resize-y"
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

                <div className="grid gap-2 border border-zinc-800 rounded-lg p-3 bg-zinc-950 mb-4">
                  {escopo.map((item, idx) => (
                    <div
                      key={`${item.nome}-${idx}`}
                      className="flex items-start justify-between bg-zinc-900 border border-zinc-800/80 rounded px-3 py-2"
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Menu className="size-3 text-zinc-500 mt-1 shrink-0" />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs font-semibold text-zinc-200">{item.nome}</span>
                          {item.descricao ? (
                            <span className="text-[11px] text-zinc-500 leading-relaxed">{item.descricao}</span>
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
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="escopoDescricaoAdicional" className="text-zinc-300 text-xs">
                    Descrição adicional do escopo (opcional)
                  </Label>
                  <textarea
                    id="escopoDescricaoAdicional"
                    value={escopoDescricaoAdicional}
                    onChange={(e) => setEscopoDescricaoAdicional(e.target.value)}
                    placeholder="Detalhes gerais do escopo que aparecerão na cláusula primeira do contrato..."
                    rows={3}
                    className="bg-zinc-900 border border-zinc-800 rounded-md p-2 text-white text-sm outline-none focus:border-[#09A3E9]/50 w-full resize-y"
                  />
                </div>
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
                className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-medium rounded-lg"
              >
                {selectedProposta ? "Salvar Alterações" : "Salvar Proposta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
