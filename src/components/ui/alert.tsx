"use client";

import { AlertIcon, CheckIcon, CloseIcon } from "./icons";

type AlertVariant = "success" | "error";

type Props = {
  variant: AlertVariant;
  children: React.ReactNode;
  onDismiss?: () => void;
};

const estilos: Record<
  AlertVariant,
  { container: string; icon: string; close: string }
> = {
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: "text-emerald-600",
    close: "text-emerald-700 hover:bg-emerald-100",
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-800",
    icon: "text-red-600",
    close: "text-red-700 hover:bg-red-100",
  },
};

export function Alert({ variant, children, onDismiss }: Props) {
  const estilo = estilos[variant];
  const Icone = variant === "success" ? CheckIcon : AlertIcon;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${estilo.container}`}
    >
      <Icone className={`mt-0.5 shrink-0 ${estilo.icon}`} />
      <div className="flex-1 leading-relaxed">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar aviso"
          className={`-mr-1 -mt-1 shrink-0 cursor-pointer rounded-md p-1 transition-colors ${estilo.close}`}
        >
          <CloseIcon width={16} height={16} />
        </button>
      ) : null}
    </div>
  );
}
