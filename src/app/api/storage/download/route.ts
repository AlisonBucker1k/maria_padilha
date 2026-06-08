import { NextRequest, NextResponse } from "next/server";

import {
  getSyllosStorageAuthHeaders,
  getSyllosStorageDownloadUrl,
} from "@/lib/syllos-api";

export async function GET(request: NextRequest) {
  const disk = request.nextUrl.searchParams.get("disk");
  const path = request.nextUrl.searchParams.get("path");

  if (!disk || !path) {
    return NextResponse.json(
      { success: false, message: "Parâmetros disk e path são obrigatórios." },
      { status: 400 },
    );
  }

  try {
    const url = await getSyllosStorageDownloadUrl(disk, path);
    const headers = await getSyllosStorageAuthHeaders();

    const response = await fetch(url, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const json = await response.json();
        return NextResponse.json(
          {
            success: false,
            message:
              (json as { message?: string }).message ??
              "Falha ao baixar o arquivo.",
          },
          { status: response.status },
        );
      }

      const hint =
        response.status === 404
          ? " O endpoint /api/scripts/storage/download ainda não está publicado no servidor Syllos."
          : "";

      return NextResponse.json(
        {
          success: false,
          message: `Falha ao baixar o arquivo (${response.status}).${hint}`,
        },
        { status: response.status },
      );
    }

    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");
    const contentLength = response.headers.get("content-length");

    if (contentType) responseHeaders.set("content-type", contentType);
    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition);
    } else {
      const fileName = path.split("/").pop() ?? "arquivo";
      responseHeaders.set(
        "content-disposition",
        `attachment; filename="${fileName}"`,
      );
    }
    if (contentLength) responseHeaders.set("content-length", contentLength);

    return new NextResponse(response.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao baixar o arquivo.";

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
