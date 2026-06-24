"use client";

import { useCallback, useEffect, useState } from "react";

import type { CpfCnpjResumo } from "@/lib/cpf-cnpj";

import { mergeVerificadoFlag, normalizarCpfCnpj } from "./api";
import { isCpfCnpjVerificadosEnabled } from "./config";
import { cpfCnpjEstaVerificado } from "./normalize";

export type CpfCnpjComVerificado = CpfCnpjResumo & { verificado: boolean };

export function useCpfCnpjVerificados(registros: CpfCnpjResumo[]) {
  const enabled = isCpfCnpjVerificadosEnabled();
  const [verificados, setVerificados] = useState<Set<string>>(new Set());
  const [alternando, setAlternando] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const sincronizarVerificados = useCallback(async () => {
    if (!enabled) {
      setVerificados(new Set());
      return;
    }

    try {
      const response = await fetch("/api/features/cpf-cnpj-verificados", {
        cache: "no-store",
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Falha ao carregar verificados.");
      }

      const lista = (json.data?.verificados ?? []) as { cpf_cnpj: string }[];
      setVerificados(new Set(lista.map((item) => item.cpf_cnpj)));
      setErro("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao carregar verificados.";
      setErro(message);
    }
  }, [enabled]);

  useEffect(() => {
    void sincronizarVerificados();
  }, [sincronizarVerificados]);

  const registrosComVerificado: CpfCnpjComVerificado[] = enabled
    ? mergeVerificadoFlag(
        registros,
        [...verificados].map((cpf_cnpj) => ({
          cpf_cnpj,
          verificado_em: "",
        })),
      )
    : registros.map((registro) => ({ ...registro, verificado: false }));

  const alternarVerificado = useCallback(
    async (cpfCnpj: string, marcar: boolean) => {
      if (!enabled) return;

      const documento = normalizarCpfCnpj(cpfCnpj);
      if (!documento) return;

      setAlternando(cpfCnpj);
      setErro("");

      let anterior: Set<string> | null = null;

      setVerificados((atual) => {
        anterior = new Set(atual);
        const proximo = new Set(atual);

        if (marcar) {
          proximo.add(documento);
        } else {
          for (const item of [...proximo]) {
            if (cpfCnpjEstaVerificado(cpfCnpj, [item])) {
              proximo.delete(item);
            }
          }
        }

        return proximo;
      });

      try {
        const response = await fetch(
          "/api/features/cpf-cnpj-verificados/toggle",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cpf_cnpj: documento, verificado: marcar }),
          },
        );
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.message ?? "Falha ao atualizar verificação.");
        }

        await sincronizarVerificados();
      } catch (error) {
        if (anterior) {
          setVerificados(anterior);
        }

        const message =
          error instanceof Error
            ? error.message
            : "Erro ao atualizar verificação.";
        setErro(message);
      } finally {
        setAlternando(null);
      }
    },
    [enabled, sincronizarVerificados],
  );

  return {
    enabled,
    registrosComVerificado,
    alternando,
    alternarVerificado,
    erroVerificados: erro,
    limparErroVerificados: () => setErro(""),
    recarregarVerificados: sincronizarVerificados,
  };
}
