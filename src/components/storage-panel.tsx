"use client";

import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  DownloadIcon,
  FileIcon,
  FolderIcon,
  RefreshIcon,
  SearchIcon,
  SpinnerIcon,
} from "@/components/ui/icons";
import type {
  StorageBrowseResult,
  StorageDisk,
  StorageEntry,
} from "@/lib/storage";

const COLUNAS = ["Nome", "Tipo", "Tamanho", "Modificado", "Caminho", "Ações"];

type Props = {
  discosIniciais: StorageDisk[];
  conteudoInicial: StorageBrowseResult | null;
  discoInicial: string;
  destaqueInicial?: string;
  erroInicial?: string;
};

function formatarTamanho(bytes?: number | null): string {
  if (bytes == null) return "—";

  const unidades = ["B", "KB", "MB", "GB", "TB"];
  let valor = bytes;
  let indice = 0;

  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }

  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unidades[indice]}`;
}

function montarBreadcrumb(path: string): Array<{ label: string; value: string }> {
  if (!path) {
    return [{ label: "raiz", value: "" }];
  }

  const partes = path.split("/");
  const itens = [{ label: "raiz", value: "" }];

  partes.forEach((parte, index) => {
    itens.push({
      label: parte,
      value: partes.slice(0, index + 1).join("/"),
    });
  });

  return itens;
}

function extrairNomeArquivo(
  contentDisposition: string | null,
  fallback: string,
): string {
  if (!contentDisposition) return fallback;

  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(contentDisposition);
  if (!match?.[1]) return fallback;

  try {
    return decodeURIComponent(match[1].replace(/"/g, ""));
  } catch {
    return match[1].replace(/"/g, "");
  }
}

export function StoragePanel({
  discosIniciais,
  conteudoInicial,
  discoInicial,
  destaqueInicial,
  erroInicial,
}: Props) {
  const [discos] = useState(discosIniciais);
  const [disco, setDisco] = useState(discoInicial);
  const [conteudo, setConteudo] = useState(conteudoInicial);
  const [carregando, setCarregando] = useState(false);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState(erroInicial ?? "");
  const [filtro, setFiltro] = useState(destaqueInicial ?? "");

  const breadcrumb = useMemo(
    () => montarBreadcrumb(conteudo?.path ?? ""),
    [conteudo?.path],
  );

  const todasEntradas = useMemo(() => {
    if (!conteudo) return [] as StorageEntry[];

    return [...conteudo.directories, ...conteudo.files];
  }, [conteudo]);

  const filtroNormalizado = filtro.trim().toLowerCase();

  const entradas = useMemo(() => {
    if (!filtroNormalizado) return todasEntradas;

    return todasEntradas.filter((item) =>
      item.name.toLowerCase().includes(filtroNormalizado),
    );
  }, [todasEntradas, filtroNormalizado]);

  const destaqueAtivo = (destaqueInicial ?? "").trim().toLowerCase();

  function ehDestaque(item: StorageEntry): boolean {
    return destaqueAtivo !== "" && item.name.toLowerCase() === destaqueAtivo;
  }

  async function carregar(discoSelecionado: string, path = "") {
    setCarregando(true);
    setErro("");
    setSucesso("");
    setFiltro("");

    try {
      const params = new URLSearchParams({ disk: discoSelecionado });
      if (path) params.set("path", path);

      const response = await fetch(`/api/storage?${params.toString()}`);
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Falha ao carregar o storage.");
      }

      setDisco(discoSelecionado);
      setConteudo(json.data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Erro inesperado ao carregar o storage.";
      setErro(message);
    } finally {
      setCarregando(false);
    }
  }

  async function baixarArquivo(caminho: string, nome: string) {
    setBaixando(caminho);
    setErro("");

    try {
      const params = new URLSearchParams({ disk: disco, path: caminho });
      const response = await fetch(`/api/storage/download?${params.toString()}`);

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
          (json as { message?: string } | null)?.message ??
            `Falha ao baixar "${nome}".`,
        );
      }

      const blob = await response.blob();
      const nomeArquivo = extrairNomeArquivo(
        response.headers.get("content-disposition"),
        nome,
      );
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = nomeArquivo;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : `Falha ao baixar "${nome}".`;
      setErro(message);
    } finally {
      setBaixando(null);
    }
  }

  async function renomearPasta(caminho: string, nomeAtual: string) {
    const novoNome = window.prompt(
      `Novo nome para a pasta "${nomeAtual}":`,
      nomeAtual,
    );

    if (!novoNome) return;

    const nomeLimpo = novoNome.trim();

    if (!nomeLimpo || nomeLimpo === nomeAtual) {
      setErro("Informe um nome diferente do atual.");
      return;
    }

    setRenomeando(caminho);
    setErro("");
    setSucesso("");

    try {
      const response = await fetch("/api/storage/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disk: disco,
          path: caminho,
          new_name: nomeLimpo,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Falha ao renomear a pasta.");
      }

      const registros = json.data?.database?.updated ?? 0;
      const prefixoAntigo = json.data?.sicredi_prefixes?.old_prefix;
      const prefixoNovo = json.data?.sicredi_prefixes?.new_prefix;
      const mesclada =
        json.data?.storage?.merged === true || json.data?.database?.merged === true;
      const conflitos = json.data?.database?.conflicts_removed ?? 0;

      setSucesso(
        mesclada
          ? `Pasta mesclada em "${nomeLimpo}". ${registros} registro(s) em sincronized_elements (${prefixoAntigo} → ${prefixoNovo})${conflitos > 0 ? `, ${conflitos} conflito(s) resolvido(s)` : ""}.`
          : `Pasta renomeada para "${nomeLimpo}". ${registros} registro(s) atualizado(s) em sincronized_elements (${prefixoAntigo} → ${prefixoNovo}).`,
      );

      await carregar(disco, conteudo?.path ?? "");
    } catch (renameError) {
      const message =
        renameError instanceof Error
          ? renameError.message
          : "Erro inesperado ao renomear a pasta.";
      setErro(message);
    } finally {
      setRenomeando(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-slate-800 pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-400">
          syllos_2021_backend
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-50">
          Explorador de Storage
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Navegue pelos discos configurados em{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
            config/filesystems.php
          </code>
          , incluindo <strong>user_files</strong>, digitalização e S3.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <label htmlFor="disco" className="text-sm font-medium text-slate-300">
          Disco
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <select
            id="disco"
            value={disco}
            onChange={(event) => carregar(event.target.value)}
            disabled={carregando}
            className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none ring-emerald-500 transition focus:ring-2 sm:max-w-sm"
          >
            {discos.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} ({item.driver})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => carregar(disco, conteudo?.path ?? "")}
            disabled={carregando}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {carregando ? (
              <SpinnerIcon width={16} height={16} />
            ) : (
              <RefreshIcon width={16} height={16} />
            )}
            {carregando ? "Carregando..." : "Atualizar"}
          </button>
        </div>
      </section>

      {conteudo ? (
        <section className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
          {breadcrumb.map((item, index) => (
            <div key={item.value} className="flex items-center gap-2">
              {index > 0 ? <span>/</span> : null}
              <button
                type="button"
                onClick={() => carregar(disco, item.value)}
                className="cursor-pointer rounded px-1.5 py-0.5 font-medium text-emerald-400 transition-colors hover:bg-slate-800"
              >
                {item.label}
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {conteudo ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <label htmlFor="filtro-pasta" className="text-sm font-medium text-slate-300">
            Filtrar nesta pasta
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full">
              <SearchIcon
                width={18}
                height={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                id="filtro-pasta"
                type="search"
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                placeholder="Filtrar por nome (ex.: CPF/CNPJ)..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-3 text-sm text-slate-100 outline-none ring-emerald-500 transition placeholder:text-slate-500 focus:ring-2"
              />
            </div>
            {filtro ? (
              <button
                type="button"
                onClick={() => setFiltro("")}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                Limpar filtro
              </button>
            ) : null}
          </div>
          {filtroNormalizado ? (
            <p className="mt-2 text-xs text-slate-400">
              {entradas.length} de {todasEntradas.length} item(ns) correspondem ao filtro.
            </p>
          ) : null}
        </section>
      ) : null}

      {sucesso ? (
        <Alert variant="success" onDismiss={() => setSucesso("")}>
          {sucesso}
        </Alert>
      ) : null}

      {erro ? (
        <Alert variant="error" onDismiss={() => setErro("")}>
          {erro}
        </Alert>
      ) : null}

      {conteudo ? (
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Disco", valor: conteudo.disk },
            { label: "Pastas", valor: conteudo.totals.directories },
            { label: "Arquivos", valor: conteudo.totals.files },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm"
            >
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">
                {typeof card.valor === "number"
                  ? card.valor.toLocaleString("pt-BR")
                  : card.valor}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-800/80">
              <tr>
                {COLUNAS.map((coluna) => (
                  <th
                    key={coluna}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {carregando ? (
                <TableSkeleton columns={COLUNAS.length} />
              ) : entradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUNAS.length}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <p className="font-medium text-slate-300">
                      {filtroNormalizado
                        ? "Nenhum item corresponde ao filtro."
                        : "Diretório vazio."}
                    </p>
                    {filtroNormalizado ? (
                      <p className="mt-1 text-sm">
                        Ajuste o termo do filtro acima.
                      </p>
                    ) : null}
                  </td>
                </tr>
              ) : (
                entradas.map((item) => (
                  <tr
                    key={`${item.type}-${item.path}`}
                    className={
                      ehDestaque(item)
                        ? "bg-amber-950/40 ring-1 ring-inset ring-amber-800/60 hover:bg-amber-950/60"
                        : "hover:bg-slate-800/50"
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {item.type === "directory" ? (
                        <button
                          type="button"
                          onClick={() => carregar(disco, item.path)}
                          className="inline-flex cursor-pointer items-center gap-2 text-left text-emerald-400 transition-colors hover:underline"
                        >
                          <FolderIcon
                            width={16}
                            height={16}
                            className="shrink-0 text-amber-400"
                          />
                          {item.name}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => baixarArquivo(item.path, item.name)}
                          disabled={baixando === item.path}
                          className="inline-flex cursor-pointer items-center gap-2 text-left text-emerald-400 transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FileIcon
                            width={16}
                            height={16}
                            className="shrink-0 text-slate-500"
                          />
                          {baixando === item.path ? "Baixando..." : item.name}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.type === "directory"
                            ? "bg-amber-950/60 text-amber-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.type === "directory" ? "Pasta" : "Arquivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatarTamanho(item.size)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.modified_at ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {item.path}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {item.type === "file" ? (
                          <button
                            type="button"
                            onClick={() => baixarArquivo(item.path, item.name)}
                            disabled={baixando === item.path}
                            aria-label={`Baixar ${item.name}`}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/50 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {baixando === item.path ? (
                              <SpinnerIcon width={14} height={14} />
                            ) : (
                              <DownloadIcon width={14} height={14} />
                            )}
                            {baixando === item.path ? "Baixando..." : "Baixar"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => renomearPasta(item.path, item.name)}
                            disabled={renomeando === item.path}
                            aria-label={`Renomear pasta ${item.name}`}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-800/60 bg-amber-950/50 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {renomeando === item.path ? (
                              <SpinnerIcon width={14} height={14} />
                            ) : null}
                            {renomeando === item.path
                              ? "Renomeando..."
                              : "Renomear"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
