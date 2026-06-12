"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import type { UsuarioProfile, NivelPermissao } from "@/lib/types";
import {
  CONVITE_STATUS_LABELS,
  NIVEL_PERMISSAO_LABELS,
} from "@/lib/usuarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientDate } from "@/components/client-date";
import { Mail, Plus, UserCog, RefreshCw } from "lucide-react";

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [nivel, setNivel] = useState<NivelPermissao>("visualizar");

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: dbService.getUsuarios,
  });

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-usuario"],
    queryFn: dbService.getTiposUsuario,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return dbService.updateUsuario(editing.id, {
          full_name: fullName,
          tipo_usuario_id: tipoId,
          nivel_permissao: nivel,
        });
      }
      return dbService.convidarUsuario({
        email,
        full_name: fullName,
        tipo_usuario_id: tipoId,
        nivel_permissao: nivel,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setIsModalOpen(false);
      if (!editing && "message" in data) {
        alert(data.message ?? "Convite enviado.");
      }
    },
    onError: (e) => alert(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      dbService.updateUsuario(id, { ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  const reenviarMutation = useMutation({
    mutationFn: dbService.reenviarConviteUsuario,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      alert(data.message);
    },
    onError: (e) => alert(e instanceof Error ? e.message : "Erro ao reenviar"),
  });

  const openCreate = () => {
    setEditing(null);
    setFullName("");
    setEmail("");
    setTipoId(tipos.find((t) => t.ativo)?.id ?? "");
    setNivel("visualizar");
    setIsModalOpen(true);
  };

  const openEdit = (usuario: UsuarioProfile) => {
    setEditing(usuario);
    setFullName(usuario.full_name ?? "");
    setEmail(usuario.email);
    setTipoId(usuario.tipo_usuario_id ?? "");
    setNivel(usuario.nivel_permissao ?? "visualizar");
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <UserCog className="size-8 text-[#09A3E9]" />
            Usuários
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Cadastre usuários, defina tipo e permissão. O convite é enviado por e-mail via Supabase.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90"
        >
          <Plus className="size-4 mr-1" />
          Convidar usuário
        </Button>
      </div>

      <div className="bg-[#161616] border border-zinc-800/80 rounded-xl p-4 shadow-xl">
        {isLoading ? (
          <p className="text-center py-12 text-zinc-500 text-sm">Carregando usuários...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-center py-12 text-zinc-500 text-sm">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 text-xs uppercase">Nome</TableHead>
                  <TableHead className="text-zinc-400 text-xs uppercase">E-mail</TableHead>
                  <TableHead className="text-zinc-400 text-xs uppercase">Tipo</TableHead>
                  <TableHead className="text-zinc-400 text-xs uppercase">Nível</TableHead>
                  <TableHead className="text-zinc-400 text-xs uppercase">Status</TableHead>
                  <TableHead className="text-zinc-400 text-xs uppercase">Convite</TableHead>
                  <TableHead className="text-right text-zinc-400 text-xs uppercase">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id} className="border-zinc-800/60">
                    <TableCell className="font-semibold text-white">
                      {u.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-zinc-300">{u.email}</TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {u.tipo_usuario?.nome ?? u.role}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {u.nivel_permissao
                        ? NIVEL_PERMISSAO_LABELS[u.nivel_permissao]
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          u.ativo && u.convite_status === "aceito"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : u.convite_status === "pendente"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-zinc-800 text-zinc-500 border-zinc-700"
                        }`}
                      >
                        {!u.ativo ? "inativo" : CONVITE_STATUS_LABELS[u.convite_status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-xs">
                      {u.convite_enviado_em ? (
                        <ClientDate iso={u.convite_enviado_em} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-zinc-400 hover:text-white h-7 text-xs"
                          onClick={() => openEdit(u)}
                        >
                          Editar
                        </Button>
                        {u.convite_status === "pendente" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-amber-400 h-7 text-xs"
                            disabled={reenviarMutation.isPending}
                            onClick={() => reenviarMutation.mutate(u.id)}
                          >
                            <RefreshCw className="size-3 mr-1" />
                            Reenviar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 text-xs ${u.ativo ? "text-rose-400" : "text-emerald-400"}`}
                          onClick={() =>
                            toggleAtivoMutation.mutate({ id: u.id, ativo: !u.ativo })
                          }
                        >
                          {u.ativo ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              <DialogTitle className="flex items-center gap-2">
                <Mail className="size-5 text-[#09A3E9]" />
                {editing ? "Editar usuário" : "Convidar novo usuário"}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {editing
                  ? "Atualize tipo e nível de permissão do usuário."
                  : "Um e-mail de convite será enviado para o usuário definir a senha e ativar o acesso."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Nome completo *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              {!editing && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label>Tipo de usuário *</Label>
                <Select value={tipoId} onValueChange={(v) => v && setTipoId(v)} required>
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {tipos
                      .filter((t) => t.ativo)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Nível de permissão *</Label>
                <Select
                  value={nivel}
                  onValueChange={(v) => v && setNivel(v as NivelPermissao)}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {(Object.keys(NIVEL_PERMISSAO_LABELS) as NivelPermissao[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {NIVEL_PERMISSAO_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-[#09A3E9] text-white hover:bg-[#09A3E9]/90"
              >
                {saveMutation.isPending
                  ? "Enviando..."
                  : editing
                  ? "Salvar"
                  : "Enviar convite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
