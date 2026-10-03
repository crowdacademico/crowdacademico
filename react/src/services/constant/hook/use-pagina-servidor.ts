import { useEffect, useState } from 'react';
import { TAMANHOS_PAGINA } from '../../../components/pagination/tamanhos-pagina.constants';
import { TAMANHO_PAGINA_MAXIMO_API } from '../type/paginacao.type';
import type { TamanhoPagina } from '../../../components/pagination/tamanhos-pagina.constants';
import type { ResultadoPaginado } from '../type/paginacao.type';

// Lista paginada PELO SERVIDOR: pede só a página que aparece (?pagina=&tamanho=), para listas que podem ter milhares
// de linhas (comentários e denúncias de uma campanha). Devolve os dados da página e as props prontas do
// <RodapePaginacao>. "Todos" pede o teto do backend (500). `chave` muda quando a busca muda (outra campanha):
// volta para a página 1.
export function usePaginaServidor<T>(
  buscar: (pagina: number, tamanho: number) => Promise<ResultadoPaginado<T>>,
  chave: string,
  aoErrar: (erro: unknown) => void,
) {
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState<TamanhoPagina>(TAMANHOS_PAGINA[0]);
  const [resultado, setResultado] = useState<ResultadoPaginado<T> | null>(null);
  const [chaveAtual, setChaveAtual] = useState(chave);

  if (chave !== chaveAtual) {
    setChaveAtual(chave);
    setPagina(1);
  }

  useEffect(() => {
    buscar(pagina, tamanho === 'todos' ? TAMANHO_PAGINA_MAXIMO_API : tamanho)
      .then(setResultado)
      .catch(aoErrar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, pagina, tamanho]);

  const total = resultado?.total ?? 0;
  return {
    dados: resultado?.dados ?? null,
    total,
    rodape: {
      total,
      paginaAtual: pagina,
      totalPaginas: tamanho === 'todos' ? 1 : Math.max(1, Math.ceil(total / tamanho)),
      tamanhoPagina: tamanho,
      aoMudarPagina: setPagina,
      aoMudarTamanho: (novoTamanho: TamanhoPagina) => {
        setTamanho(novoTamanho);
        setPagina(1);
      },
    },
  };
}
