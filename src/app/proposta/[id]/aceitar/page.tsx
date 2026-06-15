"use client";

import React, { useState, use, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService } from "@/lib/db-service";
import Link from "next/link";
import { AgencyLogo } from "@/components/agency-brand";
import { useRouter } from "next/navigation";
import { formatCnpjInput, isCnpjComplete, stripCnpj } from "@/lib/cnpj-brasil-api";
import {
  buildClienteDadosFromCnpjLookup,
  clienteTemCadastroCnpj,
} from "@/lib/cliente-cadastro";
import type { Cliente } from "@/lib/types";

type CnpjFormData = {
  empresa?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  ramo_atividade?: string;
  nome?: string;
};

export default function AceitarPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [empresaNome, setEmpresaNome] = useState("");
  const [emailCorporativo, setEmailCorporativo] = useState("");
  const [telefonePrincipal, setTelefonePrincipal] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ramoAtividade, setRamoAtividade] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [responsavelLegal, setResponsavelLegal] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupInfo, setLookupInfo] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const lastLookupRef = useRef<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-proposta", id],
    queryFn: () => dbService.getPublicPropostaWithCliente(id),
  });

  const proposta = data?.proposta;
  const client = data?.cliente;

  React.useEffect(() => {
    if (client) {
      setEmpresaNome(client.empresa || "");
      setEmailCorporativo(client.email || "");
      setTelefonePrincipal(client.telefone || "");
      setResponsavelLegal(client.nome || "");
      setCnpj(client.cnpj ? formatCnpjInput(client.cnpj) : "");
      if (client.cnpj) {
        lastLookupRef.current = stripCnpj(client.cnpj);
      }
      setRamoAtividade(client.ramo_atividade || "");
      setCidade(client.cidade || "");
      setEstado(client.estado || "");

      if (clienteTemCadastroCnpj(client)) {
        setLookupInfo("Dados carregados do cadastro salvo da empresa.");
      }
    }
  }, [client]);

  const applyCnpjData = (data: CnpjFormData) => {
    if (data.empresa) setEmpresaNome(data.empresa);
    if (data.cnpj) setCnpj(formatCnpjInput(data.cnpj));
    if (data.email) setEmailCorporativo(data.email);
    if (data.telefone) setTelefonePrincipal(data.telefone);
    if (data.cidade) setCidade(data.cidade);
    if (data.estado) setEstado(data.estado.slice(0, 2).toUpperCase());
    if (data.ramo_atividade) setRamoAtividade(data.ramo_atividade);
    if (data.nome) setResponsavelLegal(data.nome);
  };

  const applyClienteCadastro = (cadastro: Cliente) => {
    if (cadastro.empresa) setEmpresaNome(cadastro.empresa);
    if (cadastro.cnpj) setCnpj(formatCnpjInput(cadastro.cnpj));
    if (cadastro.email) setEmailCorporativo(cadastro.email);
    if (cadastro.telefone) setTelefonePrincipal(cadastro.telefone);
    if (cadastro.cidade) setCidade(cadastro.cidade);
    if (cadastro.estado) setEstado(cadastro.estado);
    if (cadastro.ramo_atividade) setRamoAtividade(cadastro.ramo_atividade);
    if (cadastro.nome) setResponsavelLegal(cadastro.nome);
  };

  const lookupCnpj = useCallback(
    async (value: string) => {
      const digits = stripCnpj(value);

      if (!isCnpjComplete(digits)) return;
      if (lastLookupRef.current === digits) return;

      if (client && clienteTemCadastroCnpj(client, digits)) {
        lastLookupRef.current = digits;
        applyClienteCadastro(client);
        setLookupError(null);
        setLookupInfo("Dados carregados do cadastro salvo da empresa.");
        return;
      }

      setLookupError(null);
      setLookupInfo(null);
      setIsLookingUp(true);

      try {
        const result = await dbService.lookupCnpj(digits);
        lastLookupRef.current = digits;
        applyCnpjData(result);

        await dbService.savePublicPropostaClienteDados(
          id,
          buildClienteDadosFromCnpjLookup(result)
        );
        queryClient.invalidateQueries({ queryKey: ["public-proposta", id] });

        if (result.situacao_cadastral) {
          setLookupInfo(
            `Dados carregados e salvos. Situação cadastral: ${result.situacao_cadastral}.`
          );
        } else {
          setLookupInfo("Dados da empresa carregados e salvos no cadastro.");
        }
      } catch (err) {
        lastLookupRef.current = "";
        setLookupError(
          err instanceof Error ? err.message : "Não foi possível consultar o CNPJ."
        );
      } finally {
        setIsLookingUp(false);
      }
    },
    [client, id, queryClient]
  );

  const handleCnpjChange = (value: string) => {
    const formatted = formatCnpjInput(value);
    setCnpj(formatted);
    setLookupError(null);
    setLookupInfo(null);

    const digits = stripCnpj(formatted);
    if (digits.length < 14) {
      lastLookupRef.current = "";
      return;
    }

    lookupCnpj(formatted);
  };

  const acceptMutation = useMutation({
    mutationFn: async (payload: {
      clientUpdates: {
        empresa: string;
        email: string;
        telefone: string;
        cnpj: string;
        ramo_atividade: string;
        cidade: string;
        estado: string;
        nome: string;
      };
    }) => {
      await dbService.acceptPublicProposta(id, payload.clientUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposta", id] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      router.push(`/proposta/${id}/sucesso`);
    },
  });

  if (isLoading) {
    return (
      <div className="prop-center-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="prop-spinner" />
          <span style={{ fontSize: 14 }}>Carregando formulário...</span>
        </div>
      </div>
    );
  }

  if (error || !proposta || !client) {
    return (
      <div className="prop-center-screen">
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <p className="prop-sec-title" style={{ fontSize: 36, marginBottom: 12 }}>
            ERRO AO <em>CARREGAR</em>
          </p>
          <p className="prop-sec-desc" style={{ fontSize: 14 }}>
            Dados da proposta ou cliente inválidos.
          </p>
          <Link href={`/proposta/${id}`} className="prop-btn prop-btn-ghost" style={{ marginTop: 24 }}>
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    acceptMutation.mutate({
      clientUpdates: {
        empresa: empresaNome,
        email: emailCorporativo,
        telefone: telefonePrincipal,
        cnpj,
        ramo_atividade: ramoAtividade,
        cidade,
        estado,
        nome: responsavelLegal,
      },
    });
  };

  return (
    <>
      <nav className="prop-nav">
        <Link href={`/proposta/${id}`} className="prop-nav-logo">
          <AgencyLogo height={32} />
        </Link>
        <span className="prop-nav-date">Aceite da proposta</span>
      </nav>

      <div className="prop-form-wrap">
        <Link href={`/proposta/${id}`} className="prop-back-link">
          ← Voltar para a proposta
        </Link>

        <div className="prop-form-card">
          <div className="prop-s-label">05 — Aceite</div>
          <h1 className="prop-form-title">
            CONCLUIR <em style={{ color: "var(--prop-gray-500)", fontStyle: "normal" }}>CADASTRO</em>
          </h1>
          <p className="prop-form-desc">
            Informe o CNPJ da empresa para buscar os dados automaticamente e confirme as
            informações antes de aceitar a proposta.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="prop-cnpj-lookup">
              <label htmlFor="cnpj" className="prop-field-label">
                CNPJ da empresa *
              </label>
              <input
                id="cnpj"
                required
                value={cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="prop-input"
                inputMode="numeric"
                autoComplete="off"
              />
              <p className="prop-upload-hint">
                Ao completar os 14 dígitos, os dados são carregados automaticamente. Se a empresa
                já foi consultada antes, usamos o cadastro salvo sem nova consulta na{" "}
                <a
                  href="https://brasilapi.com.br/docs#tag/CNPJ"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--prop-blue)" }}
                >
                  Brasil API
                </a>
                .
              </p>
              {isLookingUp && (
                <div className="prop-extracting-status" role="status" aria-live="polite">
                  <div className="prop-spinner" aria-hidden="true" />
                  <div className="prop-extracting-text">
                    <strong>Consultando CNPJ</strong>
                    Buscando razão social, endereço e demais dados da empresa...
                  </div>
                </div>
              )}
              {lookupInfo && !isLookingUp ? (
                <p className="prop-success-text">{lookupInfo}</p>
              ) : null}
              {lookupError && <p className="prop-error-text">{lookupError}</p>}
            </div>

            <div className={`prop-form-grid${isLookingUp ? " is-extracting" : ""}`}>
              <div className="prop-field">
                <label htmlFor="empresaNome" className="prop-field-label">
                  Nome da empresa *
                </label>
                <input
                  id="empresaNome"
                  required
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                  placeholder="Empresa Exemplo LTDA"
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="email" className="prop-field-label">
                  E-mail corporativo *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={emailCorporativo}
                  onChange={(e) => setEmailCorporativo(e.target.value)}
                  placeholder="financeiro@empresa.com"
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="telefone" className="prop-field-label">
                  Telefone principal *
                </label>
                <input
                  id="telefone"
                  required
                  value={telefonePrincipal}
                  onChange={(e) => setTelefonePrincipal(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="cidade" className="prop-field-label">
                  Cidade *
                </label>
                <input
                  id="cidade"
                  required
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Limeira"
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="estado" className="prop-field-label">
                  Estado *
                </label>
                <input
                  id="estado"
                  required
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="ramo" className="prop-field-label">
                  Ramo de atividade *
                </label>
                <input
                  id="ramo"
                  required
                  value={ramoAtividade}
                  onChange={(e) => setRamoAtividade(e.target.value)}
                  placeholder="Varejo, Tecnologia..."
                  className="prop-input"
                />
              </div>
              <div className="prop-field">
                <label htmlFor="responsavel" className="prop-field-label">
                  Representante legal *
                </label>
                <input
                  id="responsavel"
                  required
                  value={responsavelLegal}
                  onChange={(e) => setResponsavelLegal(e.target.value)}
                  placeholder="Nome do sócio / diretor"
                  className="prop-input"
                />
              </div>
            </div>

            <div className="prop-form-actions">
              <button
                type="submit"
                disabled={acceptMutation.isPending || isLookingUp}
                className="prop-btn prop-btn-blue"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {acceptMutation.isPending
                  ? "Confirmando aceite..."
                  : "Aceitar proposta e solicitar contrato"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <footer className="prop-footer">
        <div className="prop-footer-inner">
          <div className="prop-footer-copy prop-footer-brand">
            <AgencyLogo height={20} />
            <span>Limeira/SP</span>
          </div>
          <div className="prop-footer-copy">vnove.com.br</div>
        </div>
      </footer>
    </>
  );
}
