"use client";

import { SpinnerIcon } from "@/components/ui/icons";

type Props = {
  cpfCnpj: string;
  pendentes: number;
  verificado: boolean;
  alternando: boolean;
  onToggle: (cpfCnpj: string, verificado: boolean) => void;
};

export function CpfCnpjVerificadoCell({
  cpfCnpj,
  pendentes,
  verificado,
  alternando,
  onToggle,
}: Props) {
  if (pendentes === 0) {
    return <span className="text-xs text-slate-600">—</span>;
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={verificado}
        disabled={alternando}
        onChange={(event) => onToggle(cpfCnpj, event.target.checked)}
        aria-label={`Marcar ${cpfCnpj} como verificado`}
        className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500 disabled:cursor-not-allowed"
      />
      {alternando ? <SpinnerIcon width={14} height={14} /> : null}
    </label>
  );
}
