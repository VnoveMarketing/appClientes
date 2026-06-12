import { NextRequest } from "next/server";
import { requireClientesAccess, jsonResponse, errorResponse } from "@/lib/api/auth";
import { uploadPropostaAsset } from "@/lib/storage-upload";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireClientesAccess();
  if ("error" in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Arquivo não enviado");
    }

    if (file.type !== "image/png") {
      return errorResponse("O logo do cliente deve ser PNG");
    }

    const path = `clientes/${id}/logo.png`;
    const logo_url = await uploadPropostaAsset(file, path);

    const { data, error } = await auth.supabase
      .from("clientes")
      .update({ logo_url })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro no upload", 500);
  }
}
