import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import {
  fetchBrasilApiCnpj,
  isCnpjComplete,
  isCnpjValid,
  mapBrasilApiCnpjToForm,
  enrichCnpjLookupWithCep,
  stripCnpj,
  type BrasilApiCnpjResponse,
} from "@/lib/cnpj-brasil-api";

type RouteContext = { params: Promise<{ cnpj: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { cnpj } = await context.params;
  const digits = stripCnpj(cnpj);

  if (!isCnpjComplete(digits)) {
    return errorResponse("Informe um CNPJ válido com 14 dígitos", 400);
  }

  if (!isCnpjValid(digits)) {
    return errorResponse("CNPJ inválido. Verifique os dígitos informados.", 400);
  }

  try {
    const response = await fetchBrasilApiCnpj(digits);

    if (response.status === 404) {
      return errorResponse("CNPJ não encontrado na Receita Federal", 404);
    }

    if (response.status === 400) {
      return errorResponse("CNPJ inválido. Verifique os dígitos informados.", 400);
    }

    if (!response.ok) {
      console.error("[cnpj] Brasil API error:", response.status, digits);
      return errorResponse(
        response.status === 403
          ? "Consulta de CNPJ bloqueada pelo serviço externo. Tente novamente em instantes."
          : "Não foi possível consultar o CNPJ no momento. Tente novamente.",
        502
      );
    }

    const data = (await response.json()) as BrasilApiCnpjResponse;
    const mapped = mapBrasilApiCnpjToForm(data);
    const enriched = await enrichCnpjLookupWithCep(mapped);
    return jsonResponse(enriched);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao consultar CNPJ";
    console.error("[cnpj] lookup failed:", message);
    return errorResponse(message, 500);
  }
}
