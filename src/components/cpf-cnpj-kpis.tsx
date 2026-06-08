import type { ComponentType, SVGProps } from "react";

import {
  CheckIcon,
  ClockIcon,
  DatabaseIcon,
  FileIcon,
} from "@/components/ui/icons";

type Kpi = {
  label: string;
  valor: number;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  tom: "neutro" | "ambar" | "verde";
};

const tons: Record<Kpi["tom"], { icon: string; valor: string }> = {
  neutro: { icon: "bg-blue-50 text-blue-700", valor: "text-slate-900" },
  ambar: { icon: "bg-amber-50 text-amber-700", valor: "text-amber-700" },
  verde: { icon: "bg-emerald-50 text-emerald-700", valor: "text-emerald-700" },
};

type Props = {
  total: number;
  arquivos: number;
  pendentes: number;
  concluidos: number;
};

export function CpfCnpjKpis({ total, arquivos, pendentes, concluidos }: Props) {
  const cards: Kpi[] = [
    { label: "CPF/CNPJ únicos", valor: total, Icon: DatabaseIcon, tom: "neutro" },
    { label: "Arquivos", valor: arquivos, Icon: FileIcon, tom: "neutro" },
    { label: "Pendentes", valor: pendentes, Icon: ClockIcon, tom: "ambar" },
    { label: "Concluídos", valor: concluidos, Icon: CheckIcon, tom: "verde" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const tom = tons[card.tom];

        return (
          <article
            key={card.label}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tom.icon}`}
            >
              <card.Icon width={22} height={22} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-500">{card.label}</p>
              <p className={`mt-0.5 text-2xl font-semibold ${tom.valor}`}>
                {card.valor.toLocaleString("pt-BR")}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
