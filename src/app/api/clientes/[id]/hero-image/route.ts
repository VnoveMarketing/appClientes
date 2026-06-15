import { NextRequest } from "next/server";
import { requireClientesAccess, jsonResponse, errorResponse } from "@/lib/api/auth";
import { getAdminSupabase } from "@/lib/api/admin-db";
import { uploadPropostaAsset } from "@/lib/storage-upload";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

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

    const ext = ALLOWED_EXTENSIONS[file.type];
    if (!ext) {
      return errorResponse("Use PNG, JPG ou WEBP para a imagem de fundo");
    }

    const path = `clientes/${id}/hero.${ext}`;
    const hero_image_url = await uploadPropostaAsset(file, path);

    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from("clientes")
      .update({ hero_image_url })
      .eq("id", id)
      .select()
      .single();

    if (error) return errorResponse(error.message, 500);
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Erro no upload", 500);
  }
}
