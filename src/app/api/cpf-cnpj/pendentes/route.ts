import { NextRequest, NextResponse } from "next/server";

import { listarItensPendentes } from "@/lib/cpf-cnpj-pendentes";

export async function GET(request: NextRequest) {
  const cpf = request.nextUrl.searchParams.get("cpf")?.trim() ?? "";

  if (!cpf) {
    return NextResponse.json(
      { success: false, message: "O parâmetro cpf é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const resultado = await listarItensPendentes(cpf);

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao listar itens pendentes.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}
