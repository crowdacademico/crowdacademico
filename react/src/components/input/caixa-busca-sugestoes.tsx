import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Campo } from './campo';
import { useFecharAoClicarFora } from '../../services/constant/hook/use-fechar-ao-clicar-fora';

export interface SugestaoBusca {
  id: number;
  texto: string;
  // Aparece na lista, mas não dá para escolher (ex.: pesquisador suspenso); `extra` diz o porquê.
  desabilitada?: boolean;
  extra?: ReactNode;
}

interface CaixaBuscaSugestoesProps {
  rotulo: string;
  dica?: ReactNode;
  placeholder: string;
  valor: string;
  // A cada tecla: quem chama atualiza o texto e desfaz a escolha anterior (digitar invalida a escolha).
  aoDigitar: (texto: string) => void;
  // Já filtradas por quem chama (cada tela busca em campos diferentes).
  sugestoes: SugestaoBusca[];
  aoEscolher: (sugestao: SugestaoBusca) => void;
  className?: string;
}

// Caixa de busca com lista de sugestões ("ID: 12  Nome"): um só <input>, sempre. O texto mostrado é o item
// escolhido; focar reabre a lista já filtrada por ele, e a escolha vale até clicar em outra sugestão ou digitar.
// A lista abre ao focar ou digitar e fecha ao escolher ou clicar fora (por mousedown, não por blur: o blur
// fecharia antes do clique na sugestão completar).
export function CaixaBuscaSugestoes({
  rotulo,
  dica,
  placeholder,
  valor,
  aoDigitar,
  sugestoes,
  aoEscolher,
  className = '',
}: CaixaBuscaSugestoesProps) {
  const [aberta, setAberta] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useFecharAoClicarFora(ref, aberta, () => setAberta(false));

  return (
    <div className={className} ref={ref}>
      <Campo rotulo={rotulo} dica={dica}>
        {({ atributos }) => (
          <div className="relative">
            <input
              {...atributos}
              type="text"
              value={valor}
              onChange={(evento) => {
                aoDigitar(evento.target.value);
                setAberta(true);
              }}
              onFocus={() => setAberta(true)}
              placeholder={placeholder}
              className="input-padrao"
              autoComplete="off"
            />
            {aberta && sugestoes.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
                {sugestoes.map((sugestao) => (
                  <button
                    key={sugestao.id}
                    type="button"
                    disabled={sugestao.desabilitada}
                    onClick={() => {
                      if (sugestao.desabilitada) return;
                      aoEscolher(sugestao);
                      setAberta(false);
                    }}
                    className={
                      'w-full text-left px-3 py-2 text-sm border-b borda-padrao last:border-b-0 flex items-center justify-between gap-2 ' +
                      (sugestao.desabilitada ? 'opacity-60 cursor-not-allowed' : 'hover-fundo-marca-suave')
                    }
                  >
                    <span className="texto-forte inline-flex items-baseline">
                      <span className="inline-block w-16 shrink-0 tabular-nums">ID: {sugestao.id}</span>
                      <span>{sugestao.texto}</span>
                    </span>
                    {sugestao.extra}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Campo>
    </div>
  );
}
