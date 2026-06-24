# Feature: cpf-cnpj-verificados

Marca CPF/CNPJ com pendências como verificado (linha laranja). Toda a lógica fica nesta pasta.

## Desativar sem remover

```env
NEXT_PUBLIC_CPF_CNPJ_VERIFICADOS=false
CPF_CNPJ_VERIFICADOS_ENABLED=false   # no syllos_2021_backend
```

## Remover completamente

1. Defina as flags acima como `false`
2. Apague esta pasta: `src/features/cpf-cnpj-verificados/`
3. Apague `src/app/api/features/cpf-cnpj-verificados/`
4. Em `src/components/cpf-cnpj-panel.tsx`, remova o bloco marcado com `FEATURE: cpf-cnpj-verificados`
5. Siga o README em `syllos_2021_backend/app/Infrastructure/Features/CpfCnpjVerificados/`
