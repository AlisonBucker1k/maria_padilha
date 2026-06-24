import { NextRequest, NextResponse } from "next/server";

import { listarVerificadosSyllos } from "@/features/cpf-cnpj-verificados/api";
import { isCpfCnpjVerificadosEnabled } from "@/features/cpf-cnpj-verificados/config";

export async function GET(request: NextRequest) {
  if (!isCpfCnpjVerificadosEnabled()) {
    return NextResponse.json({
      success: true,
      data: { verificados: [] },
    });
  }

  const busca = request.nextUrl.searchParams.get("busca") ?? undefined;

  try {
    const verificados = await listarVerificadosSyllos(busca);

    return NextResponse.json({
      success: true,
      data: { verificados },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao listar verificados.";

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
