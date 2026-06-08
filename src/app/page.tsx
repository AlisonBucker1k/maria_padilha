import { AppNav } from "@/components/app-nav";
import { CpfCnpjPanel } from "@/components/cpf-cnpj-panel";
import { listarCpfCnpjUnicos } from "@/lib/cpf-cnpj";

export const dynamic = "force-dynamic";

export default async function Home() {
  let registros: Awaited<ReturnType<typeof listarCpfCnpjUnicos>>["registros"] =
    [];
  let total = 0;
  let erro: string | undefined;

  try {
    const resultado = await listarCpfCnpjUnicos();
    registros = resultado.registros;
    total = resultado.total;
  } catch (error) {
    erro =
      error instanceof Error
        ? error.message
        : "Não foi possível conectar ao banco de dados.";
  }

  return (
    <div className="min-h-full bg-slate-100">
      <AppNav />
      <CpfCnpjPanel
        registrosIniciais={registros}
        totalInicial={total}
        erroInicial={erro}
      />
    </div>
  );
}
