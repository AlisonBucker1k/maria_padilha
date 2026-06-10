import { listarMotivosPendentesPorDocumento } from "./cpf-cnpj-motivos";
import { fetchJson, normalizeApiBaseUrl } from "./http";

export type MotivoPendencia = {
  motivo: string;
  quantidade: number;
};

export type CpfCnpjResumo = {
  cpf_cnpj: string;
  total_registros: number;
  arquivos: number;
  pastas: number;
  migrados: number;
  pendentes: number;
  motivos_pendentes: MotivoPendencia[];
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

  const motivosPorDocumento = await carregarMotivosPendentes(busca).catch(
    () => new Map<string, MotivoPendencia[]>(),
  );

  const registros = json.data.registros.map((registro) => {
    const motivos = motivosPorDocumento.get(registro.cpf_cnpj);

    return {
      ...registro,
      motivos_pendentes:
        motivos ??
        (registro.pendentes > 0
          ? [
              {
                motivo: "Aguardando migração ao GED",
                quantidade: registro.pendentes,
              },
            ]
          : []),
    };
  });

  return {
    total: json.data.total,
    registros,
  };
}

async function carregarMotivosPendentes(
  busca?: string,
): Promise<Map<string, MotivoPendencia[]>> {
  return listarMotivosPendentesPorDocumento(busca);
}
