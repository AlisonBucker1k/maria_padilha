import { fetchJson, normalizeApiBaseUrl } from "./http";

type SyllosConfig = {
  baseUrl: string;
  mode: "token" | "scripts";
  token?: string;
  scriptsPass?: string;
};

type LoginResponse = {
  type: string;
  payload?: {
    authData?: {
      access_token?: string;
    };
  };
  message?: string;
};

let cachedToken: string | null = null;

export function getSyllosConfig(): SyllosConfig {
  const baseUrl = process.env.SYLLOS_API_URL;

  if (!baseUrl) {
    throw new Error(
      "SYLLOS_API_URL não configurada. Exemplo: https://api.syllosdoc.com",
    );
  }

  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);

  const scriptsPass = process.env.SYLLOS_SCRIPTS_PASS?.trim();
  if (scriptsPass) {
    return {
      baseUrl: normalizedBaseUrl,
      mode: "scripts",
      scriptsPass,
    };
  }

  const token = process.env.SYLLOS_API_TOKEN?.trim();
  if (token) {
    return {
      baseUrl: normalizedBaseUrl,
      mode: "token",
      token,
    };
  }

  throw new Error(
    "Configure SYLLOS_SCRIPTS_PASS (recomendado) ou SYLLOS_API_TOKEN no .env.local.",
  );
}

async function loginWithCredentials(baseUrl: string): Promise<string> {
  const username = process.env.SYLLOS_API_USER?.trim();
  const password = process.env.SYLLOS_API_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error(
      "SYLLOS_API_TOKEN inválido. Use o access_token do POST /api/login ou configure SYLLOS_API_USER + SYLLOS_API_PASSWORD.",
    );
  }

  const { response, json } = await fetchJson<LoginResponse>(
    `${baseUrl}/api/login`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    },
  );

  if (json.type === "error") {
    throw new Error(
      json.message ?? "Usuário ou senha inválidos na API Syllos.",
    );
  }

  const accessToken = json.payload?.authData?.access_token;

  if (!response.ok || !accessToken) {
    throw new Error(
      json.message ??
        "Falha no login da API Syllos. Prefira SYLLOS_SCRIPTS_PASS ou verifique usuário/senha admin.",
    );
  }

  return accessToken;
}

function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3;
}

export async function resolveToken(config: SyllosConfig): Promise<string> {
  if (config.mode === "scripts") {
    return "";
  }

  const token = config.token ?? "";

  if (looksLikeJwt(token)) {
    return token;
  }

  if (cachedToken) {
    return cachedToken;
  }

  if (process.env.SYLLOS_API_USER && process.env.SYLLOS_API_PASSWORD) {
    cachedToken = await loginWithCredentials(config.baseUrl);
    return cachedToken;
  }

  throw new Error(
    "SYLLOS_API_TOKEN inválido. Não use JWT_KEY do .env do backend. Configure SYLLOS_SCRIPTS_PASS ou um access_token real do POST /api/login.",
  );
}

export function buildStoragePath(
  config: SyllosConfig,
  suffix: string,
  query?: URLSearchParams,
): string {
  const params = new URLSearchParams(query);

  if (config.mode === "scripts") {
    params.set("pass", config.scriptsPass ?? "");
    return `/api/scripts/storage/${suffix}?${params.toString()}`;
  }

  const queryString = params.toString();
  return `/api/admin/storage/${suffix}${queryString ? `?${queryString}` : ""}`;
}

export async function getSyllosStorageDownloadUrl(
  disk: string,
  path: string,
): Promise<string> {
  const config = getSyllosConfig();
  const params = new URLSearchParams({ disk, path });
  const relativePath = buildStoragePath(config, "download", params);
  return `${config.baseUrl}${relativePath}`;
}

export async function getSyllosStorageAuthHeaders(): Promise<HeadersInit> {
  const config = getSyllosConfig();
  const headers: HeadersInit = {};

  if (config.mode === "token") {
    const token = await resolveToken(config);
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function syllosStoragePost<T>(
  suffix: "rename",
  body: Record<string, string>,
): Promise<T> {
  const config = getSyllosConfig();
  const token = await resolveToken(config);
  const params = new URLSearchParams();

  if (config.mode === "scripts") {
    params.set("pass", config.scriptsPass ?? "");
  }

  const query = params.toString();
  const path = `/api/${config.mode === "scripts" ? "scripts" : "admin"}/storage/${suffix}${query ? `?${query}` : ""}`;
  const url = `${config.baseUrl}${path}`;

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (config.mode === "token") {
    headers.Authorization = `Bearer ${token}`;
  }

  const { response, json } = await fetchJson<T & { message?: string }>(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      (json as { message?: string }).message ??
        `Falha na API Syllos (${response.status}) em ${path}`,
    );
  }

  return json;
}

export async function syllosStorageFetch<T>(
  suffix: "disks" | "browse",
  query?: URLSearchParams,
): Promise<T> {
  const config = getSyllosConfig();
  const token = await resolveToken(config);
  const path = buildStoragePath(config, suffix, query);
  const url = `${config.baseUrl}${path}`;

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (config.mode === "token") {
    headers.Authorization = `Bearer ${token}`;
  }

  const { response, json } = await fetchJson<T & { message?: string }>(url, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const message =
      (json as { message?: string }).message ??
      `Falha na API Syllos (${response.status}) em ${path}`;

    if (response.status === 404) {
      throw new Error(
        `${message} — publique as rotas /api/scripts/storage no servidor ou use SYLLOS_API_URL=http://127.0.0.1:8000 com php artisan serve.`,
      );
    }

    if (response.status >= 500) {
      throw new Error(
        `${message} — erro no backend Syllos. Use SYLLOS_SCRIPTS_PASS em vez de login JWT.`,
      );
    }

    throw new Error(message);
  }

  return json;
}
