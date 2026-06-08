import { NextRequest, NextResponse } from "next/server";

import { navegarStorage } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const disk = request.nextUrl.searchParams.get("disk") ?? "user_files";
  const path = request.nextUrl.searchParams.get("path") ?? "";

  try {
    const resultado = await navegarStorage(disk, path);

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao consultar o storage.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
