import {
  SICREDI_REMIGRAR_BACKUP_ROOTS,
  SICREDI_REMIGRAR_USER_FILES_ROOTS,
} from "./sicredi-remigrar-roots-data";

export type RemigrarSearchRoot = {
  disk: string;
  basePath: string;
};

/**
 * Raízes onde pastas CPF/CNPJ são filhas diretas.
 * Ordem: user_files (produção) primeiro, depois backup.
 *
 * user_files: empresas/{pasta}/digitalizacao/ASSOCIADOS ATIVOS
 * backup: caminhos legados de migração manual
 */
export const SICREDI_REMIGRAR_SEARCH_ROOTS: RemigrarSearchRoot[] = [
  ...SICREDI_REMIGRAR_USER_FILES_ROOTS,
  ...SICREDI_REMIGRAR_BACKUP_ROOTS,
];
