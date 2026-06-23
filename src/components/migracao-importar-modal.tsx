"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import {
  AlertIcon,
  CloseIcon,
  DownloadIcon,
  SpinnerIcon,
} from "@/components/ui/icons";

export type AlvoImportacao = {
  agenciaNome: string;
  agenciaCaminho: string;
  arquivoNome: string;
  arquivoCaminho: string;
};

type Props = {
  alvo: AlvoImportacao;
  onFechar: () => void;
  onImportado: () => void;
};

export function MigracaoImportarModal({ alvo, onFechar, onImportado }: Props) {
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [exportou, setExportou] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const ocupado = exportando || importando;

  async function exportarRelatorio() {
    setExportando(true);
    setErro("");
    setAviso("");

    try {
      const resposta = await fetch("/api/migracao/exportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agenciaCaminho: alvo.agenciaCaminho }),
      });
      const json = await resposta.json();

      if (!resposta.ok || !json.success) {
        throw new Error(json.message ?? "Falha ao exportar o relatório.");
      }

      setExportou(true);
      setAviso(json.message ?? "Relatório exportado.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao exportar o relatório.");
    } finally {
      setExportando(false);
    }
  }

  async function importar() {
    setImportando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/migracao/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminhoRelativo: alvo.arquivoCaminho }),
      });
      const json = await resposta.json();

      if (!resposta.ok || !json.success) {
        throw new Error(json.message ?? "Falha ao importar o CSV.");
      }

      onImportado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao importar o CSV.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Importar agência
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">{alvo.agenciaNome}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={ocupado}
            aria-label="Fechar"
            className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            <div className="flex items-start gap-2">
              <AlertIcon
                width={18}
                height={18}
                className="mt-0.5 shrink-0 text-amber-400"
              />
              <div className="leading-relaxed">
                A importação irá <strong>limpar toda a tabela</strong>{" "}
                <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">
                  sincronized_elements
                </code>{" "}
                e inserir os dados de{" "}
                <strong className="break-all">{alvo.arquivoNome}</strong>.
                {!exportou ? (
                  <>
                    <br />
                    Recomendamos exportar o relatório do estado atual antes de
                    importar.
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {erro ? (
            <Alert variant="error" onDismiss={() => setErro("")}>
              {erro}
            </Alert>
          ) : null}

          {aviso ? (
            <Alert variant="success" onDismiss={() => setAviso("")}>
              {aviso}
            </Alert>
          ) : null}

          <button
            type="button"
            onClick={exportarRelatorio}
            disabled={ocupado}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportando ? (
              <SpinnerIcon width={16} height={16} />
            ) : (
              <DownloadIcon width={16} height={16} />
            )}
            {exportou
              ? "Exportar relatório novamente"
              : "Exportar relatório (opcional, salva na pasta da agência)"}
          </button>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onFechar}
            disabled={ocupado}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={importar}
            disabled={ocupado}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importando ? <SpinnerIcon width={16} height={16} /> : null}
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}
