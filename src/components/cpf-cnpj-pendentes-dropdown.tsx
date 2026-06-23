"use client";

import { useState } from "react";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  FileIcon,
  FolderIcon,
  SpinnerIcon,
} from "@/components/ui/icons";
import type { ItemPendente } from "@/lib/cpf-cnpj-pendentes";

type Props = {
  cpfCnpj: string;
  totalPendentes: number;
};

function rotuloTipo(type: string): string {
  return type === "file" ? "Arquivo" : "Pasta";
}

export function CpfCnpjPendentesDropdown({ cpfCnpj, totalPendentes }: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [itens, setItens] = useState<ItemPendente[] | null>(null);
  const [total, setTotal] = useState(totalPendentes);
  const [erro, setErro] = useState("");

  async function alternar() {
    const proximoEstado = !aberto;
    setAberto(proximoEstado);

    if (!proximoEstado || itens !== null) return;

    setCarregando(true);
    setErro("");

    try {
      const response = await fetch(
        `/api/cpf-cnpj/pendentes?cpf=${encodeURIComponent(cpfCnpj)}`,
      );
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Falha ao carregar itens pendentes.");
      }

      setItens(json.data.itens);
      setTotal(json.data.total);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Erro ao carregar itens pendentes.";
      setErro(message);
      setAberto(false);
    } finally {
      setCarregando(false);
    }
  }

  const excedeuLimite = total > (itens?.length ?? 0);

  return (
    <div className="mt-2 min-w-[12rem]">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={`pendentes-${cpfCnpj}`}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-800/60 bg-amber-950/40 px-2.5 py-1 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-900/50"
      >
        {carregando ? (
          <SpinnerIcon width={14} height={14} />
        ) : aberto ? (
          <ChevronUpIcon width={14} height={14} />
        ) : (
          <ChevronDownIcon width={14} height={14} />
        )}
        {aberto ? "Ocultar itens" : `Ver ${totalPendentes.toLocaleString("pt-BR")} item(ns)`}
      </button>

      {aberto ? (
        <div
          id={`pendentes-${cpfCnpj}`}
          className="mt-2 w-full max-w-md rounded-lg border border-slate-700 bg-slate-950/80"
        >
          {carregando ? (
            <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-400">
              <SpinnerIcon width={14} height={14} />
              Carregando itens pendentes...
            </div>
          ) : erro ? (
            <p className="px-3 py-3 text-xs text-red-300">{erro}</p>
          ) : itens && itens.length > 0 ? (
            <>
              <ul className="max-h-64 overflow-y-auto divide-y divide-slate-800">
                {itens.map((item) => (
                  <li key={item.id} className="px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      {item.type === "file" ? (
                        <FileIcon
                          width={14}
                          height={14}
                          className="mt-0.5 shrink-0 text-slate-500"
                        />
                      ) : (
                        <FolderIcon
                          width={14}
                          height={14}
                          className="mt-0.5 shrink-0 text-amber-400"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-xs font-medium text-slate-100"
                          title={item.name}
                        >
                          {item.name}
                        </p>
                        <p
                          className="mt-0.5 truncate font-mono text-[11px] text-slate-500"
                          title={item.path}
                        >
                          {item.path}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-amber-300/90">
                          {item.motivo}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        {rotuloTipo(item.type)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {excedeuLimite ? (
                <p className="border-t border-slate-800 px-3 py-2 text-[11px] text-slate-500">
                  Exibindo {itens.length.toLocaleString("pt-BR")} de{" "}
                  {total.toLocaleString("pt-BR")} itens.
                </p>
              ) : null}
            </>
          ) : (
            <p className="px-3 py-3 text-xs text-slate-400">
              Nenhum item pendente encontrado.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
