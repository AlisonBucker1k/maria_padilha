import { NextRequest, NextResponse } from "next/server";

import { listarCpfCnpjUnicos } from "@/lib/cpf-cnpj";

export async function GET(request: NextRequest) {
  const busca = request.nextUrl.searchParams.get("busca") ?? undefined;

  try {
    const resultado = await listarCpfCnpjUnicos(busca);

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao consultar o banco.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
