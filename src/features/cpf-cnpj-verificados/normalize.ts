/** Chave estável para comparar CPF/CNPJ (só dígitos). */
export function normalizarCpfCnpj(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function chavesCpfCnpjEquivalentes(
  left: string,
  right: string,
): boolean {
  const a = normalizarCpfCnpj(left);
  const b = normalizarCpfCnpj(right);

  if (a === b) return true;

  // Pastas no storage às vezes truncam zero à esquerda (ex: 0100552307 vs 01005523070)
  if (a.length !== b.length) {
    const [menor, maior] = a.length < b.length ? [a, b] : [b, a];
    return maior.endsWith(menor) || menor.endsWith(maior);
  }

  return false;
}

export function cpfCnpjEstaVerificado(
  cpfCnpj: string,
  verificados: Iterable<string>,
): boolean {
  for (const item of verificados) {
    if (chavesCpfCnpjEquivalentes(cpfCnpj, item)) {
      return true;
    }
  }

  return false;
}
