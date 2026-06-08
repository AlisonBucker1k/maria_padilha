export function normalizeApiBaseUrl(url: string): string {
  let base = url.trim().replace(/\/$/, "");

  if (base.endsWith("/api")) {
    base = base.slice(0, -4);
  }

  return base;
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ response: Response; json: T }> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "erro de rede";
    throw new Error(
      `Não foi possível conectar em ${url}. Verifique SYLLOS_API_URL / SICREDI_API_URL e sua rede. (${reason})`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!isJson) {
    const snippet = (await response.text()).slice(0, 120);
    throw new Error(
      `Resposta inválida de ${url} (HTTP ${response.status}). Esperado JSON. Início: ${snippet}`,
    );
  }

  const json = (await response.json()) as T;

  return { response, json };
}
