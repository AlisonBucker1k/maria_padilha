import { fetchJson, normalizeApiBaseUrl } from "./http";
import { resolveRemigrarStorageLocation } from "./sicredi-storage-base-path";
import { getSyllosConfig, resolveToken } from "./syllos-api";

type SyllosSyncDiretoResponse = {
  success?: boolean;
  message: string;
  output?: string;
  data: {
    cpf: string;
    command_path?: string;
    disk: string;
    cpfs_found: number;
    files_found: number;
    jobs_dispatched: number;
    dry_run: boolean;
  };
};

export type RemigrarResult = {
  message: string;
  output?: string;
  data: {
    cpf: string;
    command_path: string;
    disk: string;
    cpfs_found: number;
    files_found: number;
    jobs_dispatched: number;
    dry_run: boolean;
  };
};

function getSicrediConfig(): { baseUrl: string; token: string } {
  const rawUrl = process.env.SICREDI_API_URL;
  const baseUrl = rawUrl ? normalizeApiBaseUrl(rawUrl) : "";
  const token = process.env.SICREDI_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "SICREDI_API_URL e SICREDI_API_TOKEN são obrigatórios para resincronizar com o GED.",
    );
  }

  return { baseUrl, token };
}

function getSyncThreads(): number {
  const threads = Number(
    process.env.SICREDI_SYNC_THREADS ??
      process.env.SICREDI_REMIGRAR_THREADS ??
      "20",
  );
  return Number.isFinite(threads) && threads > 0 ? threads : 20;
}

function formatSyncDiretoPath(
  disk: string,
  basePath: string,
  document: string,
): string {
  const normalizedBase = basePath.replace(/\\/g, "/").replace(/\/$/, "");
  const normalizedDocument = document.trim().replace(/\\/g, "/").replace(/\/$/, "");
  return `${disk}/${normalizedBase}/${normalizedDocument}`;
}

/**
 * Dispara no Syllos o equivalente a:
 * php artisan sicredi:sync-direto "user_files/empresas/.../ASSOCIADOS ATIVOS/04814552000194"
 *   --base-url=... --token=... --threads=20
 */
export async function resincronizarCpfComGed(cpf: string): Promise<RemigrarResult> {
  const cleanCpf = cpf.trim();
  const { baseUrl, token } = getSicrediConfig();
  const threads = getSyncThreads();
  const { disk, basePath } = await resolveRemigrarStorageLocation(cleanCpf);
  const commandPath = formatSyncDiretoPath(disk, basePath, cleanCpf);

  const syllosConfig = getSyllosConfig();
  const syllosToken = await resolveToken(syllosConfig);
  const params = new URLSearchParams();

  if (syllosConfig.mode === "scripts") {
    params.set("pass", syllosConfig.scriptsPass ?? "");
  }

  const query = params.toString();
  const url = `${syllosConfig.baseUrl}/api/scripts/sicredi/sync-direto${query ? `?${query}` : ""}`;

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (syllosConfig.mode === "token") {
    headers.Authorization = `Bearer ${syllosToken}`;
  }

  const { response, json } = await fetchJson<SyllosSyncDiretoResponse>(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      cpf: cleanCpf,
      path: commandPath,
      base_url: baseUrl,
      token,
      threads,
    }),
    cache: "no-store",
  });

  if (!response.ok || json.success === false) {
    const detail = json.output?.trim() || json.message;
    throw new Error(
      detail ||
        `Falha ao executar sicredi:sync-direto no servidor Syllos (HTTP ${response.status}). ` +
          `Comando: sicredi:sync-direto "${commandPath}" --threads=${threads}`,
    );
  }

  return {
    message: json.message,
    output: json.output,
    data: {
      cpf: json.data.cpf,
      command_path: json.data.command_path ?? commandPath,
      disk: json.data.disk,
      cpfs_found: json.data.cpfs_found,
      files_found: json.data.files_found,
      jobs_dispatched: json.data.jobs_dispatched,
      dry_run: json.data.dry_run,
    },
  };
}
