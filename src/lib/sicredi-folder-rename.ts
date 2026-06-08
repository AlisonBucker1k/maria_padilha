import { fetchJson, normalizeApiBaseUrl } from "./http";
import { resolveSicrediPrefixesFromStoragePath } from "./sicredi-path-prefix";

type RenameResponse = {
  message: string;
  errors: string[];
  data: {
    old_prefix: string;
    new_prefix: string;
    updated: number;
    elements: Array<{
      id: number;
      path: string;
      name: string;
      cpf_cnpj: string;
      type: string;
    }>;
  };
};

function getSicrediConfig(): { baseUrl: string; token: string } {
  const rawUrl = process.env.SICREDI_API_URL;
  const baseUrl = rawUrl ? normalizeApiBaseUrl(rawUrl) : "";
  const token = process.env.SICREDI_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error(
      "SICREDI_API_URL e SICREDI_API_TOKEN são obrigatórios para renomear sincronized_elements.",
    );
  }

  return { baseUrl, token };
}

async function renomearPorPrefixos(
  oldPrefix: string,
  newPrefix: string,
): Promise<RenameResponse["data"]> {
  const { baseUrl, token } = getSicrediConfig();

  const { response, json } = await fetchJson<RenameResponse>(
    `${baseUrl}/api/sincronizar/renomear-pasta`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_prefix: oldPrefix,
        new_prefix: newPrefix,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(json.message ?? "Falha ao atualizar sincronized_elements.");
  }

  return json.data;
}

export async function renomearSincronizedElements(
  storagePath: string,
  newName: string,
): Promise<RenameResponse["data"]> {
  const { oldPrefix, newPrefix } = resolveSicrediPrefixesFromStoragePath(
    storagePath,
    newName,
  );

  return renomearPorPrefixos(oldPrefix, newPrefix);
}

export async function reverterSincronizedElements(
  oldPrefix: string,
  newPrefix: string,
): Promise<void> {
  await renomearPorPrefixos(newPrefix, oldPrefix);
}
