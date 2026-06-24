/**
 * FEATURE: cpf-cnpj-verificados
 * Desative com NEXT_PUBLIC_CPF_CNPJ_VERIFICADOS=false no .env.local
 */
export function isCpfCnpjVerificadosEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_CPF_CNPJ_VERIFICADOS;

  if (raw === undefined || raw.trim() === "") {
    return true;
  }

  return raw.trim().toLowerCase() === "true" || raw.trim() === "1";
}

export const CPF_CNPJ_VERIFICADOS_COLUNA = "Verificado" as const;
