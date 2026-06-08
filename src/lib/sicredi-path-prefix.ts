function normalizePrefix(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function isStrictCpfCnpjFolderName(name: string): boolean {
  const digitsOnly = name.replace(/\D/g, "");
  return (
    (digitsOnly.length === 11 || digitsOnly.length === 14) &&
    digitsOnly.length === name.length
  );
}

/**
 * Localiza a pasta CPF/CNPJ no caminho do storage.
 * Usa o segmento numérico mais à direita (mesma lógica do sicredi:sync-direto).
 */
function findCpfRootSegmentIndex(parts: string[]): number | null {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (/^\d+$/.test(parts[index])) {
      return index;
    }
  }

  for (let index = 0; index < parts.length; index += 1) {
    if (isStrictCpfCnpjFolderName(parts[index])) {
      return index;
    }
  }

  return null;
}

function parentPath(value: string): string | null {
  const parts = value.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return null;
  }
  return parts.slice(0, -1).join("/");
}

/**
 * Converte o caminho da pasta no storage (ex: empresas/.../123/sub)
 * para os prefixos usados em sincronized_elements (ex: 123/sub → 321/sub).
 */
export function resolveSicrediPrefixesFromStoragePath(
  storageFolderPath: string,
  newName: string,
): { oldPrefix: string; newPrefix: string } {
  const normalized = normalizePrefix(storageFolderPath);
  const cleanNewName = newName.trim().replace(/[/\\]/g, "");
  const parts = normalized.split("/").filter(Boolean);
  const cpfIndex = findCpfRootSegmentIndex(parts);

  if (cpfIndex !== null) {
    const sicrediParts = parts.slice(cpfIndex);
    const oldPrefix = sicrediParts.join("/");
    const parentParts = sicrediParts.slice(0, -1);
    const newPrefix =
      parentParts.length === 0
        ? cleanNewName
        : `${parentParts.join("/")}/${cleanNewName}`;

    return { oldPrefix, newPrefix };
  }

  const parent = parentPath(normalized);
  const newPrefix = parent === null ? cleanNewName : `${parent}/${cleanNewName}`;

  return { oldPrefix: normalized, newPrefix };
}
