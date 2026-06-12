"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import type { Permissao } from "@/lib/types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit2, KeyRound } from "lucide-react";

export default function PermissoesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Permissao | null>(null);
  const [chave, setChave] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modulo, setModulo] = useState("");

  const { data: permissoes = [], isLoading } = useQuery({
    queryKey: ["permissoes"],
    queryFn: dbService.getPermissoes,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { chave, nome, descricao, modulo };
      if (editing) return dbService.updatePermissao(editing.id, payload);
      return dbService.addPermissao(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes"] });
      queryClient.invalidateQueries({ queryKey: ["tipos-usuario"] });
      setIsModalOpen(false);
    },
    onError: (e) => alert(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: dbService.deletePermissao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes"] });
      queryClient.invalidateQueries({ queryKey: ["tipos-usuario"] });
    },
    onError: (e) => alert(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const openCreate = () => {
    setEditing(null);
    setChave("");
    setNome("");
    setDescricao("");
    setModulo("");
    setIsModalOpen(true);
  };

  const openEdit = (p: Permissao) => {
    setEditing(p);
    setChave(p.chave);
    setNome(p.nome);
    setDescricao(p.descricao);
    setModulo(p.modulo);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <KeyRound className="size-8 text-[#09A3E9]" />
            Permissões
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Catálogo de módulos e ações vinculados aos tipos de usuário.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90">
          <Plus className="size-4 mr-1" />
          Nova permissão
        </Button>
      </div>

      <div className="bg-[#161616] border border-zinc-800/80 rounded-xl p-4">
        {isLoading ? (
          <p className="text-center py-12 text-zinc-500 text-sm">Carregando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400 text-xs uppercase">Chave</TableHead>
                <TableHead className="text-zinc-400 text-xs uppercase">Nome</TableHead>
                <TableHead className="text-zinc-400 text-xs uppercase">Módulo</TableHead>
                <TableHead className="text-zinc-400 text-xs uppercase">Descrição</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissoes.map((p) => (
                <TableRow key={p.id} className="border-zinc-800/60">
                  <TableCell className="font-mono text-sm text-[#09A3E9]">{p.chave}</TableCell>
                  <TableCell className="font-medium text-white">{p.nome}</TableCell>
                  <TableCell className="text-zinc-400 text-sm">{p.modulo}</TableCell>
                  <TableCell className="text-zinc-500 text-sm">{p.descricao || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-rose-400"
                        onClick={() => {
                          if (confirm(`Excluir permissão "${p.nome}"?`))
                            deleteMutation.mutate(p.id);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Editar permissão" : "Nova permissão"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label>Chave *</Label>
                <Input
                  value={chave}
                  onChange={(e) => setChave(e.target.value)}
                  required
                  placeholder="ex: relatorios"
                  className="bg-zinc-900 border-zinc-800 font-mono"
                />
              </div>
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
                <Label>Módulo *</Label>
                <Input
                  value={modulo}
                  onChange={(e) => setModulo(e.target.value)}
                  required
                  placeholder="ex: configuracoes"
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
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-[#09A3E9] text-white">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
