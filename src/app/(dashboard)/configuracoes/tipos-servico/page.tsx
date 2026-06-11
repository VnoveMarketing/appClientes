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
import { Plus, Trash2, Edit2, Layers } from "lucide-react";

type CampoDraft = Omit<TipoServicoCampo, "id" | "tipo_servico_id">;
type EntregavelDraft = Omit<TipoServicoEntregavel, "id" | "tipo_servico_id">;

const emptyCampo = (): CampoDraft => ({
  chave: "",
  label: "",
  tipo_campo: "currency",
  ordem: 0,
  obrigatorio: true,
  placeholder: "",
  calculo: null,
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
  const [campos, setCampos] = useState<CampoDraft[]>([emptyCampo()]);
  const [entregaveis, setEntregaveis] = useState<EntregavelDraft[]>([]);

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tipos-servico"],
    queryFn: dbService.getTiposServico,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome,
        descricao,
        campos: campos.filter((c) => c.chave.trim() && c.label.trim()),
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
        ? tipo.campos.map(
            ({ chave, label, tipo_campo, ordem, obrigatorio, placeholder, calculo }) => ({
              chave,
              label,
              tipo_campo,
              ordem,
              obrigatorio,
              placeholder,
              calculo: calculo ?? null,
            })
          )
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
                <Label className="text-xs text-zinc-300">Nome *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Fee Mensal"
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-zinc-300">Descrição</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Campos do tipo</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCampos([...campos, { ...emptyCampo(), ordem: campos.length }])}
                >
                  + Campo
                </Button>
              </div>
              <div className="grid gap-2">
                {campos.map((campo, idx) => (
                  <div key={idx} className="p-2 rounded bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-2">
                        <Label className="text-[10px] text-zinc-500">Chave</Label>
                        <Input
                          value={campo.chave}
                          onChange={(e) => {
                            const next = [...campos];
                            next[idx] = { ...campo, chave: e.target.value };
                            setCampos(next);
                          }}
                          placeholder="valor_total"
                          className="bg-zinc-900 border-zinc-800 h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-[10px] text-zinc-500">Label</Label>
                        <Input
                          value={campo.label}
                          onChange={(e) => {
                            const next = [...campos];
                            next[idx] = { ...campo, label: e.target.value };
                            setCampos(next);
                          }}
                          placeholder="Valor total"
                          className="bg-zinc-900 border-zinc-800 h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px] text-zinc-500">Tipo</Label>
                        <Select
                          value={campo.tipo_campo}
                          onValueChange={(v) => {
                            if (!v) return;
                            const next = [...campos];
                            next[idx] = {
                              ...campo,
                              tipo_campo: v as CampoDraft["tipo_campo"],
                              obrigatorio: v === "calculated" ? false : campo.obrigatorio,
                              calculo:
                                v === "calculated"
                                  ? campo.calculo ?? {
                                      operacao: "multiply",
                                      operandos: [],
                                    }
                                  : null,
                            };
                            setCampos(next);
                          }}
                        >
                          <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-xs">
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
                      <div className="col-span-4">
                        {campo.tipo_campo !== "calculated" ? (
                          <>
                            <Label className="text-[10px] text-zinc-500">Placeholder</Label>
                            <Input
                              value={campo.placeholder}
                              onChange={(e) => {
                                const next = [...campos];
                                next[idx] = { ...campo, placeholder: e.target.value };
                                setCampos(next);
                              }}
                              className="bg-zinc-900 border-zinc-800 h-8 text-xs"
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
                          onClick={() => setCampos(campos.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {campo.tipo_campo === "calculated" && (
                      <div className="grid grid-cols-12 gap-2 items-end pl-1">
                        <div className="col-span-3">
                          <Label className="text-[10px] text-zinc-500">Operação</Label>
                          <Select
                            value={campo.calculo?.operacao ?? "multiply"}
                            onValueChange={(v) => {
                              if (!v) return;
                              const next = [...campos];
                              next[idx] = {
                                ...campo,
                                calculo: {
                                  operacao: v as "multiply" | "add",
                                  operandos: campo.calculo?.operandos ?? [],
                                },
                              };
                              setCampos(next);
                            }}
                          >
                            <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              <SelectItem value="multiply">Multiplicar (A × B)</SelectItem>
                              <SelectItem value="add">Somar (A + B + …)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-8">
                          <Label className="text-[10px] text-zinc-500">
                            Campos operandos (chaves separadas por vírgula)
                          </Label>
                          <Input
                            value={(campo.calculo?.operandos ?? []).join(", ")}
                            onChange={(e) => {
                              const operandos = e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const next = [...campos];
                              next[idx] = {
                                ...campo,
                                calculo: {
                                  operacao: campo.calculo?.operacao ?? "multiply",
                                  operandos,
                                },
                              };
                              setCampos(next);
                            }}
                            placeholder="numero_parcelas, valor_parcela"
                            className="bg-zinc-900 border-zinc-800 h-8 text-xs font-mono"
                          />
                        </div>
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
                        className="bg-zinc-900 border-zinc-800 h-8 text-xs"
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
                        className="bg-zinc-900 border-zinc-800 h-8 text-xs"
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
