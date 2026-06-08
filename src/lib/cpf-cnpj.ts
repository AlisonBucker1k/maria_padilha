import { fetchJson, normalizeApiBaseUrl } from "./http";

export type CpfCnpjResumo = {
  cpf_cnpj: string;
  total_registros: number;
  arquivos: number;
  pastas: number;
  migrados: number;
  pendentes: number;
};

type ApiResponse = {
  message: string;
  errors: string[];
  data: {
    total: number;
    registros: CpfCnpjResumo[];
  };
};

function getApiConfig(): { baseUrl: string; token: string } {
  const rawUrl = process.env.SICREDI_API_URL;
  const baseUrl = rawUrl ? normalizeApiBaseUrl(rawUrl) : "";
  const token = process.env.SICREDI_API_TOKEN;

  if (!baseUrl) {
    throw new Error(
      "SICREDI_API_URL não configurada. Defina a URL da API iguana-sicredi no .env.local.",
    );
  }

  if (!token) {
    throw new Error(
      "SICREDI_API_TOKEN não configurado. Gere um token via POST /api/login.",
    );
  }

  return { baseUrl, token };
}

export async function listarCpfCnpjUnicos(
  busca?: string,
): Promise<{ total: number; registros: CpfCnpjResumo[] }> {
  const { baseUrl, token } = getApiConfig();
  const params = new URLSearchParams();

  if (busca?.trim()) {
    params.set("busca", busca.trim());
  }

  const query = params.toString();
  const url = `${baseUrl}/api/cpf-cnpj${query ? `?${query}` : ""}`;

  const { response, json } = await fetchJson<ApiResponse & { message?: string }>(
    url,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      json.message ??
        `Falha na API (${response.status}). Verifique URL e token.`,
    );
  }

  return {
    total: json.data.total,
    registros: json.data.registros,
  };
}
