import { normalizeApiBaseUrl } from "./http";

export function getSicrediApiConfig(): { baseUrl: string; token: string } {
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

export function getSicrediAuthHeaders(): HeadersInit {
  const { token } = getSicrediApiConfig();

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}
