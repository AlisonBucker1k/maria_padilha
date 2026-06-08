import { NextRequest, NextResponse } from "next/server";

import { resincronizarCpfComGed } from "@/lib/sicredi-remigrar";

export const maxDuration = 300;

type RemigrarBody = {
  cpf?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RemigrarBody;
  const cpf = body.cpf?.trim() ?? "";

  if (!cpf) {
    return NextResponse.json(
      { success: false, message: "O campo cpf é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const result = await resincronizarCpfComGed(cpf);

    return NextResponse.json({
      success: true,
      message: result.message,
      output: result.output,
      data: result.data,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao iniciar resincronização com o GED.";

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
