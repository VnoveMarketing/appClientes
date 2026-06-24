import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api/auth";
import { aceitarConviteUsuario, normalizeConviteToken } from "@/lib/convite";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = normalizeConviteToken(typeof body.token === "string" ? body.token : "");
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirm_password === "string" ? body.confirm_password : "";

    if (!token) {
      return errorResponse("Token de convite é obrigatório", 400);
    }

    if (!password || password.length < 8) {
      return errorResponse("A senha deve ter no mínimo 8 caracteres", 400);
    }

    if (password !== confirmPassword) {
      return errorResponse("As senhas não conferem", 400);
    }

    const result = await aceitarConviteUsuario({ token, password });

    return jsonResponse({
      success: true,
      message: "Conta ativada com sucesso. Você já pode fazer login.",
      email: result.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao aceitar convite";
    const status = message.includes("expirou")
      ? 410
      : message.includes("já foi aceito")
        ? 409
        : message.includes("inválido")
          ? 404
          : 400;

    return errorResponse(message, status);
  }
}
