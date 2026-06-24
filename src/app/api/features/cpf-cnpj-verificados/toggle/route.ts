import { NextRequest, NextResponse } from "next/server";

import { alternarVerificadoSyllos } from "@/features/cpf-cnpj-verificados/api";
import { isCpfCnpjVerificadosEnabled } from "@/features/cpf-cnpj-verificados/config";

type ToggleBody = {
  cpf_cnpj?: string;
  verificado?: boolean;
};

export async function POST(request: NextRequest) {
  if (!isCpfCnpjVerificadosEnabled()) {
    return NextResponse.json(
      { success: false, message: "Feature desabilitada." },
      { status: 404 },
    );
  }

  const body = (await request.json()) as ToggleBody;
  const cpfCnpj = body.cpf_cnpj?.trim() ?? "";

  if (!cpfCnpj) {
    return NextResponse.json(
      { success: false, message: "O campo cpf_cnpj é obrigatório." },
      { status: 400 },
    );
  }

  const verificado = Boolean(body.verificado);

  try {
    await alternarVerificadoSyllos(cpfCnpj, verificado);

    return NextResponse.json({
      success: true,
      message: verificado
        ? "CPF/CNPJ marcado como verificado."
        : "Marcação removida.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar verificação.";

    return NextResponse.json({ success: false, message }, { status: 422 });
  }
}
