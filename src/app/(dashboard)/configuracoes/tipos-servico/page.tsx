"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import type { TipoServico, TipoServicoCampo, TipoServicoEntregavel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, Layers, ChevronUp, ChevronDown } from "lucide-react";
import {
  formatOperandosText,
  parseOperandosText,
  type CampoCalculo,
} from "@/lib/campo-calculado";

type CampoCalculoDraft = CampoCalculo & { operandosText?: string };

type CampoDraft = Omit<TipoServicoCampo, "id" | "tipo_servico_id" | "calculo"> & {
  calculo: CampoCalculoDraft | null;
};
type CampoDraftRow = CampoDraft & { draftId: string };
type EntregavelDraft = Omit<TipoServicoEntregavel, "id" | "tipo_servico_id">;

function createDraftId() {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}-${Math.random()}`;
}

function reorderCampos(
  campos: CampoDraftRow[],
  fromIndex: number,
  toIndex: number
): CampoDraftRow[] {
  const next = [...campos];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return campos;
  next.splice(toIndex, 0, moved);
  return next.map((campo, index) => ({ ...campo, ordem: index }));
}

const emptyCampo = (): CampoDraftRow => ({
  chave: "",
  label: "",
  tipo_campo: "currency",
  ordem: 0,
  obrigatorio: true,
  placeholder: "",
  calculo: null,
  draftId: createDraftId(),
});

const emptyEntregavel = (): EntregavelDraft => ({
  nome: "",
  descricao: "",
  ordem: 0,
});

export default function TiposServicoPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TipoServico | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [campos, setCampos] = useState<CampoDraftRow[]>([emptyCampo()]);
  const [entregaveis, setEntregaveis] = useState<EntregavelDraft[]>([]);

  const patchCampo = (draftId: string, patch: Partial<CampoDraft>) => {
    setCampos((current) =>
      current.map((c) => (c.draftId === draftId ? { ...c, ...patch } : c))
    );
  };

  const moveCampo = (draftId: string, direction: -1 | 1) => {
    setCampos((current) => {
      const index = current.findIndex((c) => c.draftId === draftId);
      if (index < 0) return current;
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      return reorderCampos(current, index, target);
    });
  };

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tipos-servico"],
    queryFn: dbService.getTiposServico,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome,
        descricao,
        campos: campos
          .filter((c) => c.chave.trim() && c.label.trim())
          .map(({ draftId: _draftId, calculo, ...c }, idx) => ({
            ...c,
            ordem: idx,
            calculo: calculo
              ? {
                  operacao: calculo.operacao,
                  operandos: parseOperandosText(
                    calculo.operandosText ?? formatOperandosText(calculo.operandos)
                  ),
                }
              : null,
          })),
        entregaveis: entregaveis.filter((e) => e.nome.trim()),
      };
      if (editing) return dbService.updateTipoServico(editing.id, payload);
      return dbService.addTipoServico(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-servico"] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dbService.deleteTipoServico,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tipos-servico"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setCampos([emptyCampo()]);
    setEntregaveis([]);
    setIsModalOpen(true);
  };

  const openEdit = (tipo: TipoServico) => {
    setEditing(tipo);
    setNome(tipo.nome);
    setDescricao(tipo.descricao);
    setCampos(
      tipo.campos?.length
        ? [...tipo.campos]
            .sort((a, b) => a.ordem - b.ordem)
            .map(({ id, tipo_servico_id: _tipoServicoId, ...campo }, index) => ({
              ...campo,
              calculo: campo.calculo
                ? {
                    ...campo.calculo,
                    operandosText: formatOperandosText(campo.calculo.operandos),
                  }
                : null,
              ordem: index,
              draftId: id,
            }))
        : [emptyCampo()]
    );
    setEntregaveis(
      tipo.entregaveis?.map(({ nome, descricao, ordem }) => ({ nome, descricao, ordem })) ?? []
    );
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Tipos de Serviço</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Cadastre tipos de projeto, campos dinâmicos e entregáveis padrão.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90">
          <Plus className="size-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      <div className="bg-[#161616] border border-zinc-800/80 rounded-xl p-4 shadow-xl">
        {isLoading ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Carregando...</p>
        ) : tipos.length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Nenhum tipo cadastrado.</p>
        ) : (
          <div className="grid gap-3">
            {tipos.map((tipo) => (
              <div
                key={tipo.id}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-950/50"
              >
                <div className="flex gap-3 min-w-0">
                  <Layers className="size-5 text-[#09A3E9] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white">{tipo.nome}</h3>
                    {tipo.descricao && (
                      <p className="text-xs text-zinc-500 mt-1">{tipo.descricao}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] uppercase tracking-wider bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                        {tipo.campos?.length ?? 0} campos
                      </span>
                      <span className="text-[10px] uppercase tracking-wider bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                        {tipo.entregaveis?.length ?? 0} entregáveis
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(tipo)}>
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300"
                    onClick={() => {
                      if (confirm(`Excluir tipo "${tipo.nome}"?`)) deleteMutation.mutate(tipo.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-(--container-xl) max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Tipo" : "Novo Tipo de Serviço"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Nome *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Fee Mensal"
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Descrição</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold">Campos do tipo</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCampos((current) => [
                      ...current,
                      { ...emptyCampo(), ordem: current.length },
                    ])
                  }
                >
                  + Campo
                </Button>
              </div>
              <p className="text-xs text-zinc-500 mb-3">
                Use as setas para alterar a ordem dos campos na proposta.
              </p>
              <div className="grid gap-2">
                {campos.map((campo, idx) => (
                  <div
                    key={campo.draftId}
                    className="p-2 rounded bg-zinc-950 border border-zinc-800 space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-1 flex flex-col items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                          disabled={idx === 0}
                          onClick={() => moveCampo(campo.draftId, -1)}
                          aria-label="Mover campo para cima"
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <span className="text-[10px] text-zinc-500 font-medium">{idx + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                          disabled={idx === campos.length - 1}
                          onClick={() => moveCampo(campo.draftId, 1)}
                          aria-label="Mover campo para baixo"
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-zinc-300">Chave</Label>
                        <Input
                          value={campo.chave}
                          onChange={(e) => patchCampo(campo.draftId, { chave: e.target.value })}
                          placeholder="valor_total"
                          className="bg-zinc-900 border-zinc-800 h-9 text-sm text-zinc-100"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs text-zinc-300">Label</Label>
                        <Input
                          value={campo.label}
                          onChange={(e) => patchCampo(campo.draftId, { label: e.target.value })}
                          placeholder="Valor total"
                          className="bg-zinc-900 border-zinc-800 h-9 text-sm text-zinc-100"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-zinc-300">Tipo</Label>
                        <Select
                          value={campo.tipo_campo}
                          onValueChange={(v) => {
                            if (!v) return;
                            patchCampo(campo.draftId, {
                              tipo_campo: v as CampoDraft["tipo_campo"],
                              obrigatorio: v === "calculated" ? false : campo.obrigatorio,
                              calculo:
                                v === "calculated"
                                  ? campo.calculo ?? { operacao: "multiply", operandos: [] }
                                  : null,
                            });
                          }}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9 text-sm text-zinc-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="currency">Moeda</SelectItem>
                            <SelectItem value="number">Número</SelectItem>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="percent">Percentual</SelectItem>
                            <SelectItem value="calculated">Calculado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        {campo.tipo_campo !== "calculated" ? (
                          <>
                            <Label className="text-xs text-zinc-300">Placeholder</Label>
                            <Input
                              value={campo.placeholder}
                              onChange={(e) =>
                                patchCampo(campo.draftId, { placeholder: e.target.value })
                              }
                              className="bg-zinc-900 border-zinc-800 h-9 text-sm text-zinc-100"
                            />
                          </>
                        ) : (
                          <span className="text-[10px] text-zinc-500 block h-8 flex items-center">
                            Campo somente leitura na proposta
                          </span>
                        )}
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-rose-400"
                          onClick={() =>
                            setCampos((current) =>
                              current
                                .filter((c) => c.draftId !== campo.draftId)
                                .map((c, index) => ({ ...c, ordem: index }))
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {campo.tipo_campo === "calculated" && (
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-1" aria-hidden />
                        <div className="col-span-2">
                          <Label className="text-xs text-zinc-300">Operação</Label>
                          <Select
                            value={campo.calculo?.operacao ?? "multiply"}
                            onValueChange={(v) => {
                              if (!v) return;
                              patchCampo(campo.draftId, {
                                calculo: {
                                  operacao: v as "multiply" | "add" | "divide",
                                  operandos: campo.calculo?.operandos ?? [],
                                  operandosText: campo.calculo?.operandosText,
                                },
                              });
                            }}
                          >
                            <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9 text-sm text-zinc-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              <SelectItem value="multiply">Multiplicar (A × B)</SelectItem>
                              <SelectItem value="add">Somar (A + B + …)</SelectItem>
                              <SelectItem value="divide">Dividir (A ÷ B)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-8">
                          <Label className="text-xs text-zinc-300">
                            {campo.calculo?.operacao === "divide"
                              ? "Operandos (dividendo, divisor)"
                              : "Campos operandos (chaves separadas por vírgula)"}
                          </Label>
                          <Input
                            value={
                              campo.calculo?.operandosText ??
                              formatOperandosText(campo.calculo?.operandos ?? [])
                            }
                            onChange={(e) => {
                              const operandosText = e.target.value;
                              patchCampo(campo.draftId, {
                                calculo: {
                                  operacao: campo.calculo?.operacao ?? "multiply",
                                  operandos: parseOperandosText(operandosText),
                                  operandosText,
                                },
                              });
                            }}
                            placeholder={
                              campo.calculo?.operacao === "divide"
                                ? "valor_total, numero_parcelas"
                                : "numero_parcelas, valor_parcela"
                            }
                            className="bg-zinc-900 border-zinc-800 h-8 text-xs font-mono"
                          />
                        </div>
                        <div className="col-span-1" aria-hidden />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Entregáveis padrão</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEntregaveis([...entregaveis, { ...emptyEntregavel(), ordem: entregaveis.length }])
                  }
                >
                  + Entregável
                </Button>
              </div>
              <div className="grid gap-2">
                {entregaveis.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2 rounded bg-zinc-950 border border-zinc-800">
                    <div className="col-span-4">
                      <Input
                        value={item.nome}
                        onChange={(e) => {
                          const next = [...entregaveis];
                          next[idx] = { ...item, nome: e.target.value };
                          setEntregaveis(next);
                        }}
                        placeholder="Nome do entregável"
                        className="bg-zinc-900 border-zinc-800 h-9 text-sm text-zinc-100"
                      />
                    </div>
                    <div className="col-span-7">
                      <Input
                        value={item.descricao}
                        onChange={(e) => {
                          const next = [...entregaveis];
                          next[idx] = { ...item, descricao: e.target.value };
                          setEntregaveis(next);
                        }}
                        placeholder="Descrição"
                        className="bg-zinc-900 border-zinc-800 h-9 text-sm text-zinc-100"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-400"
                        onClick={() => setEntregaveis(entregaveis.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!nome.trim() || saveMutation.isPending}
              className="bg-[#09A3E9] text-white"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
