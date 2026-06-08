export type RemigrarSearchRoot = {
  disk: string;
  basePath: string;
};

/**
 * Raízes onde pastas CPF/CNPJ são filhas diretas (o sufixo /* indica isso).
 * Ordem: user_files primeiro (produção), depois backup.
 */
export const SICREDI_REMIGRAR_SEARCH_ROOTS: RemigrarSearchRoot[] = [
  // disk: user_files
  {
    disk: "user_files",
    basePath: "empresas/sicrediserrana0167-ag11NovaR/digitalizacao/ASSOCIADOS ATIVOS",
  },
  {
    disk: "user_files",
    basePath: "empresas/sicrediserrana0167-ag31Gari/digitalizacao/ASSOCIADOS ATIVOS",
  },
  {
    disk: "user_files",
    basePath: "empresas/sicrediserrana0167-ag09tupandi/digitalizacao/ASSOCIADOS ATIVOS",
  },
  {
    disk: "user_files",
    basePath: "empresas/ag06ivotramontina/digitalizacao/ASSOCIADOS ATIVOS",
  },
  {
    disk: "user_files",
    basePath: "empresas/sicrediserrana0167-ag27barmau/digitalizacao/ASSOCIADOS ATIVOS",
  },
  {
    disk: "user_files",
    basePath: "empresas/monte_belo/digitalizacao/ASSOCIADOS ATIVOS",
  },

  // disk: backup
  { disk: "backup", basePath: "sicrediserrana/AG 07 BOM PRINCIPIO" },
  { disk: "backup", basePath: "sicrediserrana/AG 12 FAGUNDES VARELA" },
  { disk: "backup", basePath: "sicrediserrana/AG 34 AGRO BENTO" },
  {
    disk: "backup",
    basePath: "sicrediserrana/AG 18 FLORES DA CUNHA - SAO GOTARDO",
  },
  { disk: "backup", basePath: "sicrediserrana/AG 16 FLORES DA CUNHA" },
  { disk: "backup", basePath: "sicrediserrana/AG 26 BARÃO" },
  { disk: "backup", basePath: "sicrediserrana/AG 20 NOVA PADUA" },
  {
    disk: "backup",
    basePath: "sicrediserrana0167-ag10bento/digitalizacao/ASSOCIADOS ATIVOS",
  },
  {
    disk: "backup",
    basePath: "sicrediserrana0167-ag10bento/digitalizacao_old/ASSOCIADOS ATIVOS",
  },
  { disk: "backup", basePath: "sicrediserrana0167-ag10bento/migracao" },
  { disk: "backup", basePath: "sicrediserrana0167-ag16floresc/digitalizacao" },
  { disk: "backup", basePath: "sicrediserrana0167-ag30CaBar/digitalizacao" },
  { disk: "backup", basePath: "sicrediserrana0167-ag19Cpilar/digitalizacao" },
  { disk: "backup", basePath: "sicrediserrana0167-ag39fc/digitalizacao" },
  { disk: "backup", basePath: "serrana-27barmau/ASSOCIADOS ATIVOS" },
  {
    disk: "backup",
    basePath: "sicrediserrana0167-ag19Cpilar/digitalizacao/ASSOCIADOS ATIVOS",
  },
];
