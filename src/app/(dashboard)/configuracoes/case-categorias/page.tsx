"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import type { CaseCategoria } from "@/lib/types";
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
import { Plus, Trash2, Edit2, Tags } from "lucide-react";

export default function CaseCategoriasPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CaseCategoria | null>(null);
  const [nome, setNome] = useState("");

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ["case-categorias"],
    queryFn: dbService.getCaseCategorias,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { nome: nome.trim() };
      if (editing) return dbService.updateCaseCategoria(editing.id, payload);
      return dbService.addCaseCategoria(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-categorias"] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dbService.deleteCaseCategoria,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["case-categorias"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setIsModalOpen(true);
  };

  const openEdit = (item: CaseCategoria) => {
    setEditing(item);
    setNome(item.nome);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Categorias de Cases</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Agrupe os cases exibidos nas propostas comerciais por segmento ou tipo de cliente.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90 font-medium px-4 py-2 flex items-center gap-2 rounded-lg"
        >
          <Plus className="size-4" />
          Nova categoria
        </Button>
      </div>

      <div className="bg-[#161616] border border-zinc-800/80 rounded-xl p-4 shadow-xl">
        {isLoading ? (
          <p className="text-sm text-zinc-500 py-8 text-center">Carregando categorias...</p>
        ) : categorias.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="grid gap-3">
            {categorias.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Tags className="size-4 text-[#09A3E9]" />
                  <span className="font-medium text-white">{cat.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-zinc-700 text-zinc-300"
                    onClick={() => openEdit(cat)}
                  >
                    <Edit2 className="size-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => {
                      if (confirm("Excluir esta categoria? Cases vinculados também serão removidos.")) {
                        deleteMutation.mutate(cat.id);
                      }
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
        <DialogContent className="bg-[#161616] border border-zinc-800 text-white sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="cat-nome">Nome</Label>
              <Input
                id="cat-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Ex.: E-commerce, Indústria, Saúde"
                className="mt-1.5 bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#09A3E9] text-white" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
