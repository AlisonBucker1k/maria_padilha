import { promises as fs } from "node:fs";
import path from "node:path";

export const COLUNAS_SINCRONIZED = [
  "id",
  "parent_id",
  "parent_sicredi_id",
  "name",
  "path",
  "type",
  "cpf_cnpj",
  "root",
  "migrated",
  "migrated_id",
  "error_reason",
  "created_at",
  "updated_at",
] as const;

export type LinhaSincronized = (string | null)[];

export type ArquivoAgencia = {
  nomeRelativo: string;
  caminhoRelativo: string;
  tamanho: number;
};

export type Agencia = {
  nome: string;
  caminhoRelativo: string;
  arquivos: ArquivoAgencia[];
};

const PASTA_BASE = path.join(process.cwd(), "public", "agencias_restantes");

function paraPosix(valor: string): string {
  return valor.split(path.sep).join("/");
}

async function listarCsvRecursivo(
  diretorio: string,
  prefixoRelativo: string,
): Promise<ArquivoAgencia[]> {
  const entradas = await fs.readdir(diretorio, { withFileTypes: true });
  const arquivos: ArquivoAgencia[] = [];

  for (const entrada of entradas) {
    const caminhoAbsoluto = path.join(diretorio, entrada.name);
    const relativo = prefixoRelativo
      ? `${prefixoRelativo}/${entrada.name}`
      : entrada.name;

    if (entrada.isDirectory()) {
      const internos = await listarCsvRecursivo(caminhoAbsoluto, relativo);
      arquivos.push(...internos);
      continue;
    }

    if (entrada.isFile() && entrada.name.toLowerCase().endsWith(".csv")) {
      const stats = await fs.stat(caminhoAbsoluto);
      arquivos.push({
        nomeRelativo: relativo,
        caminhoRelativo: paraPosix(path.relative(PASTA_BASE, caminhoAbsoluto)),
        tamanho: stats.size,
      });
    }
  }

  return arquivos;
}

export async function listarAgencias(): Promise<Agencia[]> {
  const entradas = await fs.readdir(PASTA_BASE, { withFileTypes: true });
  const agencias: Agencia[] = [];

  for (const entrada of entradas) {
    if (!entrada.isDirectory()) continue;

    const caminhoAbsoluto = path.join(PASTA_BASE, entrada.name);
    const arquivos = await listarCsvRecursivo(caminhoAbsoluto, entrada.name);

    agencias.push({
      nome: entrada.name,
      caminhoRelativo: paraPosix(entrada.name),
      arquivos: arquivos.sort((a, b) =>
        a.nomeRelativo.localeCompare(b.nomeRelativo, "pt-BR"),
      ),
    });
  }

  return agencias.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function resolverCaminhoSeguro(caminhoRelativo: string): string {
  const normalizado = path.normalize(caminhoRelativo).replace(/^([/\\])+/, "");
  const absoluto = path.resolve(PASTA_BASE, normalizado);
  const baseComSep = PASTA_BASE.endsWith(path.sep)
    ? PASTA_BASE
    : `${PASTA_BASE}${path.sep}`;

  if (absoluto !== PASTA_BASE && !absoluto.startsWith(baseComSep)) {
    throw new Error("Caminho de arquivo inválido (fora da pasta permitida).");
  }

  return absoluto;
}

export async function lerCsvValidado(caminhoRelativo: string): Promise<string> {
  const absoluto = resolverCaminhoSeguro(caminhoRelativo);

  if (!absoluto.toLowerCase().endsWith(".csv")) {
    throw new Error("Apenas arquivos .csv podem ser importados.");
  }

  return fs.readFile(absoluto, "utf8");
}

export async function gravarRelatorioNaAgencia(
  agenciaCaminhoRelativo: string,
  conteudo: string,
): Promise<{ nomeArquivo: string; caminhoRelativo: string }> {
  const pastaAbsoluta = resolverCaminhoSeguro(agenciaCaminhoRelativo);
  const stats = await fs.stat(pastaAbsoluta).catch(() => null);

  if (!stats?.isDirectory()) {
    throw new Error("Pasta da agência não encontrada.");
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const nomeArquivo = `relatorio_sincronized_elements_${timestamp}.csv`;
  const destinoAbsoluto = path.join(pastaAbsoluta, nomeArquivo);

  await fs.writeFile(destinoAbsoluto, conteudo, "utf8");

  return {
    nomeArquivo,
    caminhoRelativo: paraPosix(path.relative(PASTA_BASE, destinoAbsoluto)),
  };
}
