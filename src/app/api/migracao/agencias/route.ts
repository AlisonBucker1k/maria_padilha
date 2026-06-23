import { NextResponse } from "next/server";

import { listarAgencias } from "@/lib/migracao-agencias";
import { contarElementos } from "@/lib/sincronized-elements";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agencias = await listarAgencias();

    let totalNaTabela: number | null = null;
    try {
      totalNaTabela = await contarElementos();
    } catch {
      totalNaTabela = null;
    }

    return NextResponse.json({ success: true, agencias, totalNaTabela });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível listar as agências.";

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
