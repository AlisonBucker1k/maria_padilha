import type { RowDataPacket } from "mysql2";

import { getDbPool } from "./db";

const MOTIVO_AGUARDANDO = "Aguardando migração ao GED";
const LIMITE_ITENS = 500;

export type ItemPendente = {
  id: number;
  name: string;
  path: string;
  type: string;
  motivo: string;
};

type ItemPendenteRow = RowDataPacket & {
  id: number;
  name: string;
  path: string;
  type: string;
  motivo: string;
};

export async function listarItensPendentes(
  cpfCnpj: string,
): Promise<{ total: number; itens: ItemPendente[] }> {
  const documento = cpfCnpj.trim();

  if (!documento) {
    return { total: 0, itens: [] };
  }

  const pool = getDbPool();

  const [countRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS total
      FROM sincronized_elements
      WHERE migrated = 0
        AND cpf_cnpj = ?
    `,
    [documento],
  );

  const total = Number(countRows[0]?.total ?? 0);

  if (total === 0) {
    return { total: 0, itens: [] };
  }

  const [rows] = await pool.query<ItemPendenteRow[]>(
    `
      SELECT
        id,
        name,
        path,
        type,
        COALESCE(
          NULLIF(TRIM(error_reason), ''),
          ?
        ) AS motivo
      FROM sincronized_elements
      WHERE migrated = 0
        AND cpf_cnpj = ?
      ORDER BY
        CASE type WHEN 'file' THEN 0 ELSE 1 END,
        path ASC
      LIMIT ?
    `,
    [MOTIVO_AGUARDANDO, documento, LIMITE_ITENS],
  );

  return {
    total,
    itens: rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      path: row.path,
      type: row.type,
      motivo: row.motivo,
    })),
  };
}
