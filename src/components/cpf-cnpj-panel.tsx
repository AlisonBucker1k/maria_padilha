"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CpfCnpjKpis } from "@/components/cpf-cnpj-kpis";
import { Alert } from "@/components/ui/alert";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  CheckIcon,
  DownloadIcon,
  RefreshIcon,
  SearchIcon,
  SpinnerIcon,
} from "@/components/ui/icons";
import type { CpfCnpjResumo } from "@/lib/cpf-cnpj";

type Props = {
  registrosIniciais: CpfCnpjResumo[];
  totalInicial: number;
  erroInicial?: string;
};

const COLUNAS = [
  "CPF/CNPJ",
  "Total",
  "Arquivos",
  "Pastas",
  "Migrados",
  "Pendentes",
  "Status",
  "Ações",
];

function formatarDocumento(valor: string): string {
  const digitos = valor.replace(/\D/g, "");

  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digitos.length === 14) {
    return digitos.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }

  return valor;
}

function exportarCsv(registros: CpfCnpjResumo[]): void {
  const cabecalho = [
    "cpf_cnpj",
    "total_registros",
    "arquivos",
    "pastas",
    "migrados",
    "pendentes",
  ];

  const linhas = registros.map((item) =>
    [
      item.cpf_cnpj,
      item.total_registros,
      item.arquivos,
      item.pastas,
      item.migrados,
      item.pendentes,
    ].join(","),
  );

  const conteudo = [cabecalho.join(","), ...linhas].join("\n");
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `cpf_cnpj_unicos_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function CpfCnpjPanel({
  registrosIniciais,
  totalInicial,
  erroInicial,
}: Props) {
  const [busca, setBusca] = useState("");
  const [registros, setRegistros] = useState(registrosIniciais);
  const [total, setTotal] = useState(totalInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(erroInicial ?? "");
  const [sucesso, setSucesso] = useState("");
  const [remigrando, setRemigrando] = useState<string | null>(null);
  const [remigrandoTodos, setRemigrandoTodos] = useState(false);
  const [progressoLote, setProgressoLote] = useState<{
    atual: number;
    total: number;
  } | null>(null);
  const [acompanhando, setAcompanhando] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const primeiraRenderizacao = useRef(true);
  const buscaRef = useRef(busca);

  useEffect(() => {
    buscaRef.current = busca;
  }, [busca]);

  const registrosExibicao = useMemo(
    () =>
      [...registros].sort((left, right) => {
        if (left.pendentes === 0 && right.pendentes > 0) return 1;
        if (left.pendentes > 0 && right.pendentes === 0) return -1;
        return left.cpf_cnpj.localeCompare(right.cpf_cnpj);
      }),
    [registros],
  );

  const totaisGerais = useMemo(
    () =>
      registros.reduce(
        (acc, item) => ({
          registros: acc.registros + item.total_registros,
          arquivos: acc.arquivos + item.arquivos,
          pendentes: acc.pendentes + item.pendentes,
          concluidos: acc.concluidos + (item.pendentes === 0 ? 1 : 0),
        }),
        { registros: 0, arquivos: 0, pendentes: 0, concluidos: 0 },
      ),
    [registros],
  );

  const totalComPendencias = useMemo(
    () => registros.filter((item) => item.pendentes > 0).length,
    [registros],
  );

  const sincronizacaoEmAndamento = remigrandoTodos || remigrando !== null;

  async function executarSyncDireto(cpf: string): Promise<void> {
    const response = await fetch("/api/cpf-cnpj/remigrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf }),
    });

    const json = await response.json();

    if (!response.ok || !json.success) {
      throw new Error(json.message ?? "Falha ao iniciar resincronização.");
    }
  }

  async function resincronizarComGed(cpf: string) {
    const confirmar = window.confirm(
      `Sincronizar com o GED Sicredi a pasta de ${formatarDocumento(cpf)} via sync-direto?`,
    );

    if (!confirmar) return;

    setRemigrando(cpf);
    setErro("");
    setSucesso("");

    try {
      await executarSyncDireto(cpf);
      setSucesso(
        `Sincronização iniciada para ${formatarDocumento(cpf)} via sync-direto. Acompanhando o andamento automaticamente.`,
      );
      setAcompanhando(true);
      void recarregarRegistros();
    } catch (resyncError) {
      const message =
        resyncError instanceof Error
          ? resyncError.message
          : "Erro inesperado ao resincronizar com o GED.";
      setErro(message);
    } finally {
      setRemigrando(null);
    }
  }

  async function resincronizarTodosComGed() {
    const comPendentes = registros.filter((item) => item.pendentes > 0);

    if (comPendentes.length === 0) {
      setErro("Nenhum CPF/CNPJ com pendências na lista atual.");
      setSucesso("");
      return;
    }

    const confirmar = window.confirm(
      `Sincronizar ${comPendentes.length} CPF/CNPJ com pendências via sync-direto?\n\n` +
        "Cada documento será enfileirado no servidor Syllos (fila storage).",
    );

    if (!confirmar) return;

    setRemigrandoTodos(true);
    setProgressoLote({ atual: 0, total: comPendentes.length });
    setErro("");
    setSucesso("");

    let sucessoCount = 0;
    const falhas: string[] = [];

    for (let index = 0; index < comPendentes.length; index += 1) {
      const item = comPendentes[index];
      setProgressoLote({ atual: index + 1, total: comPendentes.length });

      try {
        await executarSyncDireto(item.cpf_cnpj);
        sucessoCount += 1;
      } catch (resyncError) {
        const message =
          resyncError instanceof Error
            ? resyncError.message
            : "Erro inesperado";
        falhas.push(`${formatarDocumento(item.cpf_cnpj)}: ${message}`);
      }
    }

    setSucesso(
      `Lote concluído: ${sucessoCount} de ${comPendentes.length} sincronização(ões) iniciada(s) na fila storage. Acompanhando o andamento automaticamente.`,
    );

    if (falhas.length > 0) {
      setErro(
        `${falhas.length} falha(s): ${falhas.slice(0, 3).join(" | ")}` +
          (falhas.length > 3 ? ` (+${falhas.length - 3})` : ""),
      );
    }

    setRemigrandoTodos(false);
    setProgressoLote(null);

    if (sucessoCount > 0) {
      setAcompanhando(true);
      void recarregarRegistros();
    }
  }

  async function aplicarBusca(valor: string) {
    setCarregando(true);
    setErro("");

    try {
      const params = valor.trim()
        ? `?busca=${encodeURIComponent(valor.trim())}`
        : "";
      const response = await fetch(`/api/cpf-cnpj${params}`);
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Falha ao buscar registros.");
      }

      setRegistros(json.data.registros);
      setTotal(json.data.total);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Erro inesperado ao buscar registros.";
      setErro(message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }

    const timer = setTimeout(() => aplicarBusca(busca), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const recarregarRegistros = useCallback(async () => {
    try {
      const valor = buscaRef.current.trim();
      const params = valor ? `?busca=${encodeURIComponent(valor)}` : "";
      const response = await fetch(`/api/cpf-cnpj${params}`);
      const json = await response.json();

      if (response.ok && json.success) {
        setRegistros(json.data.registros);
        setTotal(json.data.total);
        setUltimaAtualizacao(new Date());
      }
    } catch {
      // silencioso: o acompanhamento não deve quebrar por uma falha pontual de rede
    }
  }, []);

  useEffect(() => {
    if (!acompanhando) return;

    const intervalo = setInterval(recarregarRegistros, 5000);
    const limite = setTimeout(() => setAcompanhando(false), 10 * 60 * 1000);

    return () => {
      clearInterval(intervalo);
      clearTimeout(limite);
    };
  }, [acompanhando, recarregarRegistros]);

  useEffect(() => {
    if (acompanhando && registros.length > 0 && totalComPendencias === 0) {
      setAcompanhando(false);
      setSucesso("Sincronização concluída — nenhuma pendência restante.");
    }
  }, [acompanhando, registros.length, totalComPendencias]);

  const progressoPercent = progressoLote
    ? Math.round((progressoLote.atual / progressoLote.total) * 100)
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
            Sicredi · Migração
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            CPF/CNPJ únicos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Documentos distintos em{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              sincronized_elements
            </code>
            . Clique no documento para abrir a pasta no Storage.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resincronizarTodosComGed}
            disabled={totalComPendencias === 0 || sincronizacaoEmAndamento}
            title={
              totalComPendencias === 0
                ? "Nenhum documento com pendências"
                : `Sincronizar ${totalComPendencias} documento(s) com pendências`
            }
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {remigrandoTodos ? (
              <SpinnerIcon width={16} height={16} />
            ) : (
              <RefreshIcon width={16} height={16} />
            )}
            {remigrandoTodos
              ? progressoLote
                ? `Resincronizando ${progressoLote.atual}/${progressoLote.total}...`
                : "Resincronizando..."
              : `Resincronizar todos${
                  totalComPendencias > 0 ? ` (${totalComPendencias})` : ""
                }`}
          </button>
          <button
            type="button"
            onClick={() => exportarCsv(registros)}
            disabled={registros.length === 0 || sincronizacaoEmAndamento}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DownloadIcon width={16} height={16} />
            Exportar CSV
          </button>
        </div>
      </header>

      {progressoLote ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm font-medium text-blue-900">
            <span>Resincronizando em lote...</span>
            <span>
              {progressoLote.atual} / {progressoLote.total}
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-100"
            role="progressbar"
            aria-valuenow={progressoPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressoPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      {acompanhando ? (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-blue-900">
            <SpinnerIcon width={18} height={18} className="text-blue-600" />
            <div>
              <p className="font-medium">
                Acompanhando o andamento (atualiza a cada 5s)
              </p>
              <p className="text-xs text-blue-700">
                {totalComPendencias > 0
                  ? `${totalComPendencias} documento(s) ainda com pendências · ${totaisGerais.pendentes.toLocaleString("pt-BR")} arquivo(s) pendente(s)`
                  : "Processando..."}
                {ultimaAtualizacao
                  ? ` · última atualização ${ultimaAtualizacao.toLocaleTimeString("pt-BR")}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={recarregarRegistros}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-100"
            >
              <RefreshIcon width={14} height={14} />
              Atualizar agora
            </button>
            <button
              type="button"
              onClick={() => setAcompanhando(false)}
              className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Parar acompanhamento
            </button>
          </div>
        </div>
      ) : null}

      <CpfCnpjKpis
        total={total}
        arquivos={totaisGerais.arquivos}
        pendentes={totaisGerais.pendentes}
        concluidos={totaisGerais.concluidos}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="busca" className="text-sm font-medium text-slate-700">
          Buscar CPF/CNPJ
        </label>
        <div className="relative mt-2">
          <SearchIcon
            width={18}
            height={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id="busca"
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Digite o documento — a busca é automática..."
            aria-label="Buscar por CPF ou CNPJ"
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-10 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
          />
          {carregando ? (
            <SpinnerIcon
              width={18}
              height={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600"
            />
          ) : null}
        </div>
      </section>

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

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {COLUNAS.map((coluna) => (
                  <th
                    key={coluna}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando && registros.length === 0 ? (
                <TableSkeleton columns={COLUNAS.length} />
              ) : registrosExibicao.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUNAS.length}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <p className="font-medium text-slate-700">
                      Nenhum CPF/CNPJ encontrado.
                    </p>
                    <p className="mt-1 text-sm">
                      {busca
                        ? "Tente outro termo de busca ou limpe o filtro."
                        : "Nenhum registro disponível no momento."}
                    </p>
                  </td>
                </tr>
              ) : (
                registrosExibicao.map((item) => {
                  const concluido = item.pendentes === 0;
                  const processando = remigrando === item.cpf_cnpj;

                  return (
                    <tr
                      key={item.cpf_cnpj}
                      className={
                        concluido
                          ? "bg-emerald-50/60 hover:bg-emerald-100/70"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td
                        className={`px-4 py-3 font-mono ${concluido ? "text-emerald-900" : "text-slate-900"}`}
                      >
                        <a
                          href={`/storage?cpf=${encodeURIComponent(item.cpf_cnpj)}`}
                          title="Abrir a pasta no explorador de Storage para renomear"
                          className="group inline-flex cursor-pointer flex-col rounded px-1 py-0.5 transition-colors hover:bg-blue-50"
                        >
                          <span className="font-medium text-blue-700 group-hover:underline">
                            {formatarDocumento(item.cpf_cnpj)}
                          </span>
                          <span
                            className={`text-xs ${concluido ? "text-emerald-700" : "text-slate-500"}`}
                          >
                            {item.cpf_cnpj}
                          </span>
                        </a>
                      </td>
                      <td
                        className={`px-4 py-3 ${concluido ? "text-emerald-800" : "text-slate-700"}`}
                      >
                        {item.total_registros.toLocaleString("pt-BR")}
                      </td>
                      <td
                        className={`px-4 py-3 ${concluido ? "text-emerald-800" : "text-slate-700"}`}
                      >
                        {item.arquivos.toLocaleString("pt-BR")}
                      </td>
                      <td
                        className={`px-4 py-3 ${concluido ? "text-emerald-800" : "text-slate-700"}`}
                      >
                        {item.pastas.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-700">
                        {item.migrados.toLocaleString("pt-BR")}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${concluido ? "text-emerald-600" : "text-amber-700"}`}
                      >
                        {item.pendentes.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        {concluido ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            <CheckIcon width={14} height={14} />
                            Concluído
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                            {item.pendentes.toLocaleString("pt-BR")} pendente(s)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => resincronizarComGed(item.cpf_cnpj)}
                          disabled={
                            item.pendentes === 0 ||
                            processando ||
                            sincronizacaoEmAndamento
                          }
                          aria-label={`Resincronizar ${formatarDocumento(item.cpf_cnpj)} com o GED`}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processando ? (
                            <SpinnerIcon width={14} height={14} />
                          ) : (
                            <RefreshIcon width={14} height={14} />
                          )}
                          {processando ? "Enviando..." : "Resincronizar GED"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
