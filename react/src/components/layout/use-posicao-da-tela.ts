import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

// DS-108: página nova abre no topo. Mudou o caminho por um clique (link, menu, botão), a tela volta ao topo; no Voltar e
// no Avançar do navegador (POP), quem decide a posição é o próprio navegador. Só o caminho conta: filtro, busca e
// página da tabela mudam a URL sem mudar o caminho e não mexem na posição.
export function useTopoAoTrocarDePagina() {
  const { pathname } = useLocation();
  const tipo = useNavigationType();
  const anterior = useRef(pathname);

  useLayoutEffect(() => {
    if (anterior.current === pathname) return;
    anterior.current = pathname;
    if (tipo !== 'POP') window.scrollTo({ top: 0, left: 0 });
  }, [pathname, tipo]);
}

// DS-109: o que fica preso no topo ao rolar (cabeçalho e trilha "Início > ...", marcados com data-topo-fixo) tem a
// altura medida pelo navegador e guardada em --altura-topo-fixo (3-base.css). Medida, não escrita à mão: o A+/A- e a
// quebra de linha mudam a altura. Quem precisa ficar logo abaixo deles (o menu lateral do painel) usa o token.
export function useAlturaTopoFixo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const medir = () => {
      const fundo = Math.max(
        0,
        ...[...document.querySelectorAll<HTMLElement>('[data-topo-fixo]')].map(
          (elemento) => (Number.parseFloat(getComputedStyle(elemento).top) || 0) + elemento.offsetHeight,
        ),
      );
      document.documentElement.style.setProperty('--altura-topo-fixo', `${fundo}px`);
    };
    medir();
    const observador = new ResizeObserver(medir);
    document.querySelectorAll('[data-topo-fixo]').forEach((elemento) => observador.observe(elemento));
    return () => observador.disconnect();
  }, [pathname]);
}
