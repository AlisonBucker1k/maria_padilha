import { NextRequest, NextResponse } from "next/server";

import {
  renomearSincronizedElements,
  reverterSincronizedElements,
} from "@/lib/sicredi-folder-rename";
import { resolveSicrediPrefixesFromStoragePath } from "@/lib/sicredi-path-prefix";
import { syllosStoragePost } from "@/lib/syllos-api";

type RenameBody = {
  disk?: string;
  path?: string;
  new_name?: string;
};

type StorageRenameResponse = {
  message: string;
  data: {
    disk: string;
    old_path: string;
    new_path: string;
    old_name: string;
    new_name: string;
    merged?: boolean;
    action?: "merged" | "renamed";
  };
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RenameBody;
  const disk = body.disk ?? "user_files";
  const path = body.path?.trim() ?? "";
  const newName = body.new_name?.trim() ?? "";

  if (!path || !newName) {
    return NextResponse.json(
      { success: false, message: "Os campos path e new_name são obrigatórios." },
      { status: 400 },
    );
  }

  const { oldPrefix, newPrefix } = resolveSicrediPrefixesFromStoragePath(
    path,
    newName,
  );

  try {
    const dbResult = await renomearSincronizedElements(path, newName);

    if (dbResult.updated === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Nenhum registro em sincronized_elements para o prefixo "${oldPrefix}". O storage não foi alterado.`,
          data: {
            sicredi_prefixes: { old_prefix: oldPrefix, new_prefix: newPrefix },
            database: dbResult,
          },
        },
        { status: 422 },
      );
    }

    try {
      const storageResult = await syllosStoragePost<StorageRenameResponse>(
        "rename",
        {
          disk,
          path,
          new_name: newName,
        },
      );

      return NextResponse.json({
        success: true,
        message: "Pasta renomeada no storage e em sincronized_elements.",
        data: {
          storage: storageResult.data,
          database: dbResult,
          sicredi_prefixes: {
            old_prefix: dbResult.old_prefix,
            new_prefix: dbResult.new_prefix,
          },
        },
      });
    } catch (storageError) {
      await reverterSincronizedElements(oldPrefix, newPrefix).catch(
        () => undefined,
      );
      throw storageError;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao renomear a pasta.";

    return NextResponse.json(
      {
        success: false,
        message,
        data: {
          sicredi_prefixes: { old_prefix: oldPrefix, new_prefix: newPrefix },
        },
      },
      { status: 500 },
    );
  }
}
