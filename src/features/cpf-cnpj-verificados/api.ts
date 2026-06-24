import { fetchJson } from "@/lib/http";
import { getSyllosConfig, resolveToken } from "@/lib/syllos-api";

import { isCpfCnpjVerificadosEnabled } from "./config";
import { cpfCnpjEstaVerificado, normalizarCpfCnpj } from "./normalize";

export type VerificadoRegistro = {
  cpf_cnpj: string;
  verificado_em: string;
};

type ListResponse = {
  success?: boolean;
  message?: string;
  data?: {
    verificados: VerificadoRegistro[];
  };
};

type ToggleResponse = {
  success?: boolean;
  message?: string;
};

function buildSyllosUrl(suffix: string): string {
  const config = getSyllosConfig();
  const params = new URLSearchParams();

  if (config.mode === "scripts") {
    params.set("pass", config.scriptsPass ?? "");
  }

  const query = params.toString();
  return `${config.baseUrl}/api/scripts/sicredi/cpf-cnpj-verificados/${suffix}${query ? `?${query}` : ""}`;
}

async function syllosHeaders(): Promise<HeadersInit> {
  const config = getSyllosConfig();
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (config.mode === "token") {
    headers.Authorization = `Bearer ${await resolveToken(config)}`;
  }

  return headers;
}

export async function listarVerificadosSyllos(
  busca?: string,
): Promise<VerificadoRegistro[]> {
  if (!isCpfCnpjVerificadosEnabled()) {
    return [];
  }

  const config = getSyllosConfig();
  const scriptsParams = new URLSearchParams();

  if (config.mode === "scripts") {
    scriptsParams.set("pass", config.scriptsPass ?? "");
  }

  if (busca?.trim()) {
    scriptsParams.set("busca", busca.trim());
  }

  const query = scriptsParams.toString();
  const url = `${config.baseUrl}/api/scripts/sicredi/cpf-cnpj-verificados${query ? `?${query}` : ""}`;

  const { response, json } = await fetchJson<ListResponse>(url, {
    headers: await syllosHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }

    throw new Error(json.message ?? "Falha ao listar verificados.");
  }

  return json.data?.verificados ?? [];
}

export async function alternarVerificadoSyllos(
  cpfCnpj: string,
  verificado: boolean,
): Promise<void> {
  if (!isCpfCnpjVerificadosEnabled()) {
    return;
  }

  const url = buildSyllosUrl("toggle");
  const { response, json } = await fetchJson<ToggleResponse>(url, {
    method: "POST",
    headers: await syllosHeaders(),
    body: JSON.stringify({ cpf_cnpj: cpfCnpj, verificado }),
    cache: "no-store",
  });

  if (!response.ok || json.success === false) {
    throw new Error(json.message ?? "Falha ao atualizar verificação.");
  }
}

export function mergeVerificadoFlag<T extends { cpf_cnpj: string }>(
  registros: T[],
  verificados: VerificadoRegistro[],
): Array<T & { verificado: boolean }> {
  const chaves = verificados.map((item) => item.cpf_cnpj);

  return registros.map((registro) => ({
    ...registro,
    verificado: cpfCnpjEstaVerificado(registro.cpf_cnpj, chaves),
  }));
}

export { normalizarCpfCnpj };
