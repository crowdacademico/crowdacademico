import { useRef } from 'react';

export interface ParteTela<T extends string> {
  chave: T;
  rotulo: string;
}

// Filtro fixo no topo do corpo do modal, com cara de aba: "Geral" mostra tudo; cada outra opção mostra só aquela
// parte. As outras ficam escondidas (classe `hidden`), não desmontadas: a troca é instantânea e nada do que está sendo
// editado se perde. Trocar volta a rolagem para o topo, para a parte escolhida aparecer inteira.
export function FiltroPartes<T extends string>({
  partes,
  atual,
  aoEscolher,
}: {
  partes: ParteTela<T>[];
  atual: T;
  aoEscolher: (parte: T) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  return (
    <nav ref={ref} aria-label="Partes da tela" className="sticky -top-6 z-10 -mx-8 px-8 py-2 fundo-cartao border-b borda-padrao flex flex-wrap gap-1">
      {partes.map((parte) => (
        <button
          key={parte.chave}
          type="button"
          aria-pressed={atual === parte.chave}
          onClick={() => {
            aoEscolher(parte.chave);
            ref.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
          }}
          className={
            'paragrafo-destaque px-3 py-1.5 rounded-lg texto-herdado ' +
            (atual === parte.chave ? 'fundo-sutil texto-marca' : 'texto-fraco hover-texto-forte')
          }
        >
          {parte.rotulo}
        </button>
      ))}
    </nav>
  );
}
