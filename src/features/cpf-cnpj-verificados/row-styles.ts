export function classeLinhaCpfCnpj(
  concluido: boolean,
  verificado: boolean,
): string {
  if (verificado) {
    return "bg-orange-950/35 hover:bg-orange-950/55";
  }

  if (concluido) {
    return "bg-emerald-950/30 hover:bg-emerald-950/50";
  }

  return "hover:bg-slate-800/50";
}

export function classeTextoCpfCnpj(
  concluido: boolean,
  verificado: boolean,
  padrao: string,
): string {
  if (verificado) {
    return "text-orange-300";
  }

  if (concluido) {
    return "text-emerald-300";
  }

  return padrao;
}

export function classeTextoSecundarioCpfCnpj(
  concluido: boolean,
  verificado: boolean,
): string {
  if (verificado) {
    return "text-orange-500";
  }

  if (concluido) {
    return "text-emerald-500";
  }

  return "text-slate-500";
}
