import { NextRequest, NextResponse } from "next/server";

import { gravarRelatorioNaAgencia } from "@/lib/migracao-agencias";
import { exportarTabelaCsv } from "@/lib/sincronized-elements";

export const maxDuration = 300;

type ExportarBody = {
  agenciaCaminho?: string;
};

export async function POST(request: NextRequest) {
  let body: ExportarBody;
  try {
    body = (await request.json()) as ExportarBody;
  } catch {
    body = {};
  }

  const agenciaCaminho = body.agenciaCaminho?.trim() ?? "";

  if (!agenciaCaminho) {
    return NextResponse.json(
      { success: false, message: "O campo agenciaCaminho é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const { conteudo, total } = await exportarTabelaCsv();
    const arquivo = await gravarRelatorioNaAgencia(agenciaCaminho, conteudo);

    return NextResponse.json({
      success: true,
      total,
      nomeArquivo: arquivo.nomeArquivo,
      caminhoRelativo: arquivo.caminhoRelativo,
      message: `Relatório com ${total} registro(s) salvo em ${arquivo.nomeArquivo}.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao exportar o relatório.";

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
