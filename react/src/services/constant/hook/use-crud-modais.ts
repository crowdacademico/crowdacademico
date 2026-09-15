import { useState } from 'react';

// Extraído (14-09-2026, contra-prompt Claude Web) - as 8 telas de listagem
// do painel repetiam o MESMO bloco de estado (criando/alterando/
// consultando/excluindo/chaveRecarga+recarregar), só com nomes diferentes
// (`alterando`, `idAlterando`, `termoAlterando` - sintoma de padrão não
// extraído). Pelo teste-de-prop do `generic-table.tsx` isto NÃO pertence
// ao `GenericTable` (uma tela sem tabela nenhuma poderia ter modais), mas
// é compartilhado o bastante pra virar hook.
//
// Guarda o OBJETO inteiro (T), nunca só o id - quem chama extrai o id na
// hora de passar pro modal, se o modal só precisar disso (ex.:
// `ModalAlterarUsuario` quer `idUsuario`; `ModalExcluirUsuario` quer o
// objeto inteiro). Guardar o objeto sempre, em vez de decidir por tela, é
// o que permite usar o MESMO hook nos dois casos sem duplicar estado.
export function useCrudModais<T>() {
  const [criando, setCriando] = useState(false);
  const [alterando, setAlterando] = useState<T | null>(null);
  const [consultando, setConsultando] = useState<T | null>(null);
  const [excluindo, setExcluindo] = useState<T | null>(null);
  // Incrementar isto muda a IDENTIDADE da função `listar` (useCallback no
  // componente pai) sem mudar o que ela faz - é assim que se força o
  // `useEffect` interno de `GenericTable` a buscar de novo depois que um
  // modal altera dado (`GenericTable` não expõe um "recarregar" próprio,
  // de propósito: quem decide QUANDO recarregar é sempre o componente
  // pai, não a tabela genérica).
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  return {
    criando,
    abrirCriando: () => setCriando(true),
    fecharCriando: () => setCriando(false),
    alterando,
    setAlterando,
    fecharAlterando: () => setAlterando(null),
    consultando,
    setConsultando,
    fecharConsultando: () => setConsultando(null),
    excluindo,
    setExcluindo,
    fecharExcluindo: () => setExcluindo(null),
    chaveRecarga,
    recarregar,
    // Pronto pra espalhar em `acoes` do GenericTable quando a tela usa as
    // 3 ações de verdade (Alterar/Consultar/Excluir) - telas com menos
    // ações montam o objeto próprio só com as chaves que têm handler.
    acoesCompletas: {
      alterar: setAlterando,
      consultar: setConsultando,
      excluir: setExcluindo,
    },
  };
}
