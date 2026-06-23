"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AlvoImportacao,
  MigracaoImportarModal,
} from "@/components/migracao-importar-modal";
import { Alert } from "@/components/ui/alert";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FileIcon,
  FolderIcon,
  RefreshIcon,
  SpinnerIcon,
} from "@/components/ui/icons";

type ArquivoAgencia = {
  nomeRelativo: string;
  caminhoRelativo: string;
  tamanho: number;
};

type Agencia = {
  nome: string;
  caminhoRelativo: string;
  arquivos: ArquivoAgencia[];
};

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MigracaoAgenciasPanel() {
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [totalNaTabela, setTotalNaTabela] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<AlvoImportacao | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/migracao/agencias", {
        cache: "no-store",
      });
      const json = await resposta.json();

      if (!resposta.ok || !json.success) {
        throw new Error(json.message ?? "Falha ao listar agências.");
      }

      setAgencias(json.agencias ?? []);
      setTotalNaTabela(json.totalNaTabela ?? null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao listar agências.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function aoImportar() {
    const nome = alvo?.arquivoNome ?? "";
    setAlvo(null);
    setSucesso(`Importação de "${nome}" concluída com sucesso.`);
    carregar();
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Migração de agências
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Importa os CSVs para a tabela{" "}
            <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">
              sincronized_elements
            </code>
            . Cada importação limpa a tabela antes de inserir.
            {totalNaTabela !== null ? (
              <>
                {" "}
                Registros atuais:{" "}
                <strong className="text-slate-200">{totalNaTabela}</strong>.
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={carregar}
          disabled={carregando}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {carregando ? (
            <SpinnerIcon width={16} height={16} />
          ) : (
            <RefreshIcon width={16} height={16} />
          )}
          Atualizar
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {erro ? (
          <Alert variant="error" onDismiss={() => setErro("")}>
            {erro}
          </Alert>
        ) : null}
        {sucesso ? (
          <Alert variant="success" onDismiss={() => setSucesso("")}>
            {sucesso}
          </Alert>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {carregando && agencias.length === 0 ? (
          <p className="text-sm text-slate-500">Carregando agências…</p>
        ) : null}

        {!carregando && agencias.length === 0 && !erro ? (
          <p className="text-sm text-slate-500">
            Nenhuma agência encontrada em public/agencias_restantes.
          </p>
        ) : null}

        {agencias.map((agencia) => {
          const aberta = expandida === agencia.caminhoRelativo;

          return (
            <div
              key={agencia.caminhoRelativo}
              className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandida(aberta ? null : agencia.caminhoRelativo)
                }
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/60"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                  <FolderIcon
                    width={18}
                    height={18}
                    className="text-emerald-400"
                  />
                  {agencia.nome}
                  <span className="text-xs font-normal text-slate-500">
                    ({agencia.arquivos.length} CSV)
                  </span>
                </span>
                {aberta ? (
                  <ChevronUpIcon
                    width={18}
                    height={18}
                    className="text-slate-400"
                  />
                ) : (
                  <ChevronDownIcon
                    width={18}
                    height={18}
                    className="text-slate-400"
                  />
                )}
              </button>

              {aberta ? (
                <ul className="divide-y divide-slate-800 border-t border-slate-800">
                  {agencia.arquivos.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-slate-500">
                      Nenhum CSV nesta agência.
                    </li>
                  ) : (
                    agencia.arquivos.map((arquivo) => (
                      <li
                        key={arquivo.caminhoRelativo}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm text-slate-300">
                          <FileIcon
                            width={16}
                            height={16}
                            className="shrink-0 text-slate-500"
                          />
                          <span className="break-all">
                            {arquivo.nomeRelativo}
                          </span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {formatarTamanho(arquivo.tamanho)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAlvo({
                              agenciaNome: agencia.nome,
                              agenciaCaminho: agencia.caminhoRelativo,
                              arquivoNome: arquivo.nomeRelativo,
                              arquivoCaminho: arquivo.caminhoRelativo,
                            })
                          }
                          className="shrink-0 cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                        >
                          Importar
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      {alvo ? (
        <MigracaoImportarModal
          alvo={alvo}
          onFechar={() => setAlvo(null)}
          onImportado={aoImportar}
        />
      ) : null}
    </section>
  );
}
