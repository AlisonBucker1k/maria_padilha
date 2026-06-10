import { AppNav } from "@/components/app-nav";
import { StoragePanel } from "@/components/storage-panel";
import { listarDiscos, navegarStorage } from "@/lib/storage";
import { resolveRemigrarStorageLocation } from "@/lib/sicredi-storage-base-path";

export const dynamic = "force-dynamic";

const DISCO_PADRAO = "user_files";

type SearchParams = Promise<{
  cpf?: string;
  disk?: string;
  path?: string;
}>;

async function resolverDestino(params: Awaited<SearchParams>): Promise<{
  disco: string;
  path: string;
  destaque: string;
}> {
  const cpf = params.cpf?.trim();

  if (cpf) {
    const { disk, basePath } = await resolveRemigrarStorageLocation(cpf);
    return { disco: disk, path: basePath, destaque: cpf };
  }

  return {
    disco: params.disk?.trim() || DISCO_PADRAO,
    path: params.path?.trim() ?? "",
    destaque: "",
  };
}

export default async function StoragePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  let discos: Awaited<ReturnType<typeof listarDiscos>> = [];
  let conteudo: Awaited<ReturnType<typeof navegarStorage>> | null = null;
  let erro: string | undefined;
  let discoInicial = DISCO_PADRAO;
  let destaque = "";

  try {
    const destino = await resolverDestino(params);
    discoInicial = destino.disco;
    destaque = destino.destaque;

    discos = await listarDiscos();
    conteudo = await navegarStorage(destino.disco, destino.path);
  } catch (error) {
    erro =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar o storage.";
  }

  return (
    <div className="min-h-full bg-slate-950">
      <AppNav />
      <StoragePanel
        discosIniciais={discos}
        conteudoInicial={conteudo}
        discoInicial={discoInicial}
        destaqueInicial={destaque}
        erroInicial={erro}
      />
    </div>
  );
}
