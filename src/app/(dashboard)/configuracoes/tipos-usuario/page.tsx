"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import type { TipoUsuario, NivelPermissao, Permissao } from "@/lib/types";
import { NIVEL_PERMISSAO_LABELS, NIVEL_PERMISSAO_OPTIONS } from "@/lib/usuarios";
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
import { Plus, Trash2, Edit2, Shield } from "lucide-react";

type PermissaoDraft = { permissao_id: string; nivel: NivelPermissao };

export default function TiposUsuarioPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TipoUsuario | null>(null);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ordem, setOrdem] = useState("0");
  const [permissoesDraft, setPermissoesDraft] = useState<PermissaoDraft[]>([]);

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tipos-usuario"],
    queryFn: dbService.getTiposUsuario,
  });

  const { data: permissoes = [] } = useQuery({
    queryKey: ["permissoes"],
    queryFn: dbService.getPermissoes,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome,
        slug,
        descricao,
        ordem: parseInt(ordem, 10) || 0,
        permissoes: permissoesDraft.filter((p) => p.permissao_id),
      };
      if (editing) return dbService.updateTipoUsuario(editing.id, payload);
      return dbService.addTipoUsuario(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-usuario"] });
      setIsModalOpen(false);
    },
    onError: (e) => alert(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: dbService.deleteTipoUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tipos-usuario"] }),
    onError: (e) => alert(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setSlug("");
    setDescricao("");
    setOrdem("0");
    setPermissoesDraft(
      permissoes.map((p) => ({ permissao_id: p.id, nivel: "visualizar" as NivelPermissao }))
    );
    setIsModalOpen(true);
  };

  const openEdit = (tipo: TipoUsuario) => {
    setEditing(tipo);
    setNome(tipo.nome);
    setSlug(tipo.slug);
    setDescricao(tipo.descricao);
    setOrdem(String(tipo.ordem));
    const existing = tipo.permissoes ?? [];
    setPermissoesDraft(
      permissoes.map((p) => {
        const found = existing.find((e) => e.permissao_id === p.id);
        return { permissao_id: p.id, nivel: found?.nivel ?? "visualizar" };
      })
    );
    setIsModalOpen(true);
  };

  const updatePermissaoNivel = (permissaoId: string, nivel: NivelPermissao) => {
    setPermissoesDraft((prev) =>
      prev.map((p) => (p.permissao_id === permissaoId ? { ...p, nivel } : p))
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Shield className="size-8 text-[#09A3E9]" />
            Tipos de Usuário
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Perfis de acesso (Administrador, Financeiro, Consultor…) com permissões padrão por módulo.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90">
          <Plus className="size-4 mr-1" />
          Novo tipo
        </Button>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Carregando...</p>
        ) : (
          tipos.map((tipo) => (
            <div
              key={tipo.id}
              className="bg-[#161616] border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{tipo.nome}</h3>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                    {tipo.slug}
                  </span>
                  {!tipo.ativo && (
                    <span className="text-[10px] text-rose-400 uppercase">inativo</span>
                  )}
                </div>
                {tipo.descricao && (
                  <p className="text-sm text-zinc-400 mt-1">{tipo.descricao}</p>
                )}
                <p className="text-xs text-zinc-500 mt-2">
                  {(tipo.permissoes ?? []).length} permissões configuradas
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-zinc-700"
                  onClick={() => openEdit(tipo)}
                >
                  <Edit2 className="size-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-400"
                  onClick={() => {
                    if (confirm(`Excluir tipo "${tipo.nome}"?`)) deleteMutation.mutate(tipo.id);
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Editar tipo" : "Novo tipo de usuário"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Nome *</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Slug *</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    placeholder="ex: financeiro"
                    className="bg-zinc-900 border-zinc-800 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Descrição</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>

              <div className="border-t border-zinc-800 pt-3">
                <Label className="mb-2 block">Permissões padrão do tipo</Label>
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {permissoes.map((p: Permissao) => {
                    const draft = permissoesDraft.find((d) => d.permissao_id === p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 p-2 rounded bg-zinc-950 border border-zinc-800"
                      >
                        <div>
                          <span className="text-sm text-zinc-200">{p.nome}</span>
                          <span className="text-[10px] text-zinc-500 ml-2">{p.modulo}</span>
                        </div>
                        <Select
                          value={draft?.nivel ?? "visualizar"}
                          onValueChange={(v) =>
                            v && updatePermissaoNivel(p.id, v as NivelPermissao)
                          }
                        >
                          <SelectTrigger className="w-28 h-8 bg-zinc-900 border-zinc-800 text-xs">
                            <SelectValue>
                              {NIVEL_PERMISSAO_LABELS[draft?.nivel ?? "visualizar"]}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            {NIVEL_PERMISSAO_OPTIONS.map((k) => (
                              <SelectItem key={k} value={k}>
                                {NIVEL_PERMISSAO_LABELS[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-[#09A3E9] text-white"
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
