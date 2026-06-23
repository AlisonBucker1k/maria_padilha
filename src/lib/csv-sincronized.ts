import { COLUNAS_SINCRONIZED, type LinhaSincronized } from "./migracao-agencias";

const DELIMITADOR = ";";

type Campo = { valor: string; aspas: boolean };

function tokenizar(conteudo: string): Campo[][] {
  const linhas: Campo[][] = [];
  let campoAtual = "";
  let campoComAspas = false;
  let dentroAspas = false;
  let linha: Campo[] = [];
  let campoIniciado = false;

  const finalizarCampo = () => {
    linha.push({ valor: campoAtual, aspas: campoComAspas });
    campoAtual = "";
    campoComAspas = false;
    campoIniciado = false;
  };

  const finalizarLinha = () => {
    finalizarCampo();
    linhas.push(linha);
    linha = [];
  };

  for (let i = 0; i < conteudo.length; i += 1) {
    const char = conteudo[i];

    if (dentroAspas) {
      if (char === '"') {
        if (conteudo[i + 1] === '"') {
          campoAtual += '"';
          i += 1;
        } else {
          dentroAspas = false;
        }
      } else {
        campoAtual += char;
      }
      continue;
    }

    if (char === '"' && !campoIniciado) {
      dentroAspas = true;
      campoComAspas = true;
      campoIniciado = true;
      continue;
    }

    if (char === DELIMITADOR) {
      finalizarCampo();
      continue;
    }

    if (char === "\r") continue;

    if (char === "\n") {
      finalizarLinha();
      continue;
    }

    campoIniciado = true;
    campoAtual += char;
  }

  if (campoIniciado || campoAtual !== "" || linha.length > 0) {
    finalizarLinha();
  }

  return linhas.filter(
    (l) => !(l.length === 1 && !l[0].aspas && l[0].valor.trim() === ""),
  );
}

function campoParaValor(campo: Campo): string | null {
  if (!campo.aspas && campo.valor.trim().toUpperCase() === "NULL") {
    return null;
  }
  return campo.valor;
}

function linhaEhCabecalho(linha: Campo[]): boolean {
  if (linha.length !== COLUNAS_SINCRONIZED.length) return false;

  const campos = linha.map((c) => c.valor.trim().toLowerCase());
  return campos.every(
    (coluna, indice) => coluna === COLUNAS_SINCRONIZED[indice].toLowerCase(),
  );
}

function linhaEhDado(linha: Campo[]): boolean {
  if (linha.length !== COLUNAS_SINCRONIZED.length) return false;
  return /^\d+$/.test(linha[0].valor.trim());
}

export function parseCsvSincronized(conteudo: string): LinhaSincronized[] {
  const conteudoNormalizado = conteudo.replace(/^\uFEFF/, "");
  const linhas = tokenizar(conteudoNormalizado);

  if (linhas.length === 0) {
    throw new Error("CSV vazio.");
  }

  const esperado = COLUNAS_SINCRONIZED.length;
  let inicio = 0;

  if (linhaEhCabecalho(linhas[0])) {
    inicio = 1;
  } else if (!linhaEhDado(linhas[0])) {
    const encontrado = linhas[0].map((c) => c.valor).join(";");
    throw new Error(
      `Cabeçalho do CSV inválido. Esperado: ${COLUNAS_SINCRONIZED.join(";")}. Encontrado: ${encontrado}`,
    );
  }

  const registros: LinhaSincronized[] = [];

  for (let i = inicio; i < linhas.length; i += 1) {
    const campos = linhas[i];

    if (campos.length !== esperado) {
      throw new Error(
        `Linha ${i + 1} possui ${campos.length} colunas (esperado ${esperado}).`,
      );
    }

    registros.push(campos.map(campoParaValor));
  }

  return registros;
}

function escaparCampo(valor: string | null): string {
  if (valor === null) return "NULL";
  return `"${String(valor).replace(/"/g, '""')}"`;
}

export function serializarCsvSincronized(linhas: LinhaSincronized[]): string {
  const cabecalho = COLUNAS_SINCRONIZED.map((c) => `"${c}"`).join(";");
  const corpo = linhas.map((linha) => linha.map(escaparCampo).join(";"));
  return [cabecalho, ...corpo].join("\r\n");
}
