import { NextRequest, NextResponse } from "next/server";

import { parseCsvSincronized } from "@/lib/csv-sincronized";
import { lerCsvValidado } from "@/lib/migracao-agencias";
import { substituirElementos } from "@/lib/sincronized-elements";

export const maxDuration = 300;

type ImportarBody = {
  caminhoRelativo?: string;
};

export async function POST(request: NextRequest) {
  let body: ImportarBody;
  try {
    body = (await request.json()) as ImportarBody;
  } catch {
    body = {};
  }

  const caminhoRelativo = body.caminhoRelativo?.trim() ?? "";

  if (!caminhoRelativo) {
    return NextResponse.json(
      { success: false, message: "O campo caminhoRelativo é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const conteudo = await lerCsvValidado(caminhoRelativo);
    const linhas = parseCsvSincronized(conteudo);

    if (linhas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "O CSV não possui registros para importar.",
        },
        { status: 400 },
      );
    }

    const { inseridos, totalFinal } = await substituirElementos(linhas);

    return NextResponse.json({
      success: true,
      inseridos,
      totalFinal,
      message: `Tabela limpa e ${inseridos} registro(s) importados (total atual: ${totalFinal}).`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao importar o CSV da agência.";

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
