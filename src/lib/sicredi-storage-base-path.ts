import { SICREDI_REMIGRAR_SEARCH_ROOTS } from "./sicredi-remigrar-roots";
import { syllosStorageFetch } from "./syllos-api";

export type RemigrarStorageLocation = {
  disk: string;
  basePath: string;
};

type BrowseResult = {
  data: {
    directories: Array<{ name: string; path: string }>;
  };
};

function cpfCandidates(cpf: string): string[] {
  const trimmed = cpf.trim();
  const digits = trimmed.replace(/\D/g, "");

  return Array.from(new Set([trimmed, digits].filter(Boolean)));
}

function normalizeBasePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^user_files\//, "")
    .replace(/^backup\//, "")
    .replace(/\/$/, "");
}

function getSearchRoots(): Array<{ disk: string; basePath: string }> {
  const roots = [...SICREDI_REMIGRAR_SEARCH_ROOTS];

  const envPath = process.env.SICREDI_REMIGRAR_BASE_PATH?.trim();
  if (envPath) {
    roots.unshift({
      disk: process.env.SICREDI_REMIGRAR_DISK?.trim() || "user_files",
      basePath: normalizeBasePath(envPath),
    });
  }

  return roots;
}

async function cpfExistsInRoot(
  disk: string,
  basePath: string,
  candidates: string[],
): Promise<boolean> {
  const params = new URLSearchParams({ disk, path: basePath });
  const result = await syllosStorageFetch<BrowseResult>("browse", params);

  return result.data.directories.some((directory) =>
    candidates.includes(directory.name),
  );
}

export async function resolveRemigrarStorageLocation(
  cpf: string,
): Promise<RemigrarStorageLocation> {
  const candidates = cpfCandidates(cpf);
  const roots = getSearchRoots();
  const batchSize = 8;
  const failures: string[] = [];

  for (let index = 0; index < roots.length; index += batchSize) {
    const batch = roots.slice(index, index + batchSize);
    const checks = await Promise.all(
      batch.map(async (root) => {
        try {
          const found = await cpfExistsInRoot(
            root.disk,
            root.basePath,
            candidates,
          );
          return found ? root : null;
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : "erro desconhecido";
          failures.push(`${root.disk}:${root.basePath} (${reason})`);
          return null;
        }
      }),
    );

    const match = checks.find((value) => value !== null);
    if (match) {
      return {
        disk: match.disk,
        basePath: normalizeBasePath(match.basePath),
      };
    }
  }

  const tried = roots.map((root) => `${root.disk}/${root.basePath}`).join("; ");
  const failureHint =
    failures.length > 0 ? ` Falhas de leitura: ${failures.slice(0, 3).join(" | ")}.` : "";

  throw new Error(
    `CPF/CNPJ "${cpf}" não encontrado em nenhuma das ${roots.length} raízes configuradas. ` +
      `Raízes: ${tried}.${failureHint}`,
  );
}

/** @deprecated Use resolveRemigrarStorageLocation */
export async function resolveRemigrarBasePath(cpf: string): Promise<string> {
  const location = await resolveRemigrarStorageLocation(cpf);
  return location.basePath;
}
