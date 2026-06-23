import type { RowDataPacket } from "mysql2";

import { getDbPool } from "./db";

export type MotivoPendencia = {
  motivo: string;
  quantidade: number;
};

const MOTIVO_AGUARDANDO = "Aguardando migração ao GED";

type MotivoRow = RowDataPacket & {
  cpf_cnpj: string;
  motivo: string;
  quantidade: number;
};

export async function listarMotivosPendentesPorDocumento(
  busca?: string,
): Promise<Map<string, MotivoPendencia[]>> {
  const pool = getDbPool();
  const params: string[] = [];
  let filtroBusca = "";

  if (busca?.trim()) {
    filtroBusca = " AND cpf_cnpj LIKE ?";
    params.push(`%${busca.trim()}%`);
  }

  const [rows] = await pool.query<MotivoRow[]>(
    `
      SELECT
        cpf_cnpj,
        COALESCE(
          NULLIF(TRIM(error_reason), ''),
          ?
        ) AS motivo,
        COUNT(*) AS quantidade
      FROM sincronized_elements
      WHERE migrated = 0
        AND cpf_cnpj IS NOT NULL
        AND cpf_cnpj != ''
        ${filtroBusca}
      GROUP BY cpf_cnpj, motivo
      ORDER BY cpf_cnpj, quantidade DESC
    `,
    [MOTIVO_AGUARDANDO, ...params],
  );

  const mapa = new Map<string, MotivoPendencia[]>();

  for (const row of rows) {
    const lista = mapa.get(row.cpf_cnpj) ?? [];
    lista.push({
      motivo: row.motivo,
      quantidade: Number(row.quantidade),
    });
    mapa.set(row.cpf_cnpj, lista);
  }

  return mapa;
}
