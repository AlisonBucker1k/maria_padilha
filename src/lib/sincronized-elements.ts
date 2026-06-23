import { fetchJson } from "./http";
import type { LinhaSincronized } from "./migracao-agencias";
import {
  getSicrediApiConfig,
  getSicrediAuthHeaders,
} from "./sicredi-api-config";

type ApiEnvelope<T> = {
  message?: string;
  errors?: string[];
  data?: T;
};

function extrairErro(json: ApiEnvelope<unknown>, fallback: string): string {
  return json.message ?? fallback;
}

async function chamarApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { baseUrl } = getSicrediApiConfig();
  const { response, json } = await fetchJson<ApiEnvelope<T>>(
    `${baseUrl}${path}`,
    {
      ...init,
      headers: {
        ...getSicrediAuthHeaders(),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Rota /api/migracao/sincronized-elements não encontrada no servidor. Publique a versão atualizada do iguana-sicredi em 54.233.57.196.",
      );
    }

    throw new Error(extrairErro(json, `Falha na API (${response.status}).`));
  }

  if (!json.data) {
    throw new Error(extrairErro(json, "Resposta inválida da API."));
  }

  return json.data;
}

export async function contarElementos(): Promise<number> {
  const data = await chamarApi<{ total: number }>(
    "/api/migracao/sincronized-elements/contagem",
  );
  return Number(data.total ?? 0);
}

export async function exportarTabelaCsv(): Promise<{
  conteudo: string;
  total: number;
}> {
  return chamarApi<{ conteudo: string; total: number }>(
    "/api/migracao/sincronized-elements/exportar",
  );
}

export async function substituirElementos(linhas: LinhaSincronized[]): Promise<{
  inseridos: number;
  totalFinal: number;
}> {
  return chamarApi<{ inseridos: number; totalFinal: number }>(
    "/api/migracao/sincronized-elements/importar",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ linhas }),
    },
  );
}
