import { useEffect, useRef, useState } from 'react';

// Botão dividido ("split button", 21-11-2026): o clique principal faz a ação padrão e a seta ao lado abre as outras
// opções (padrão de mercado: o "Merge" do GitHub, o "Fazer download" do Google Docs). Primeiro uso: Exportar meus
// dados (HTML no clique principal; JSON na seta). O menu segue o visual do menu do perfil do pesquisador e fecha ao
// clicar fora, com Esc ou ao escolher.
export interface OpcaoBotaoDividido {
  rotulo: string;
  descricao?: string;
  icone: string;
  aoEscolher: () => void;
}

interface BotaoDivididoProps {
  rotulo: string;
  icone?: string;
  aoClicar: () => void;
  opcoes: OpcaoBotaoDividido[];
  desabilitado?: boolean;
  // Nome da seta para o leitor de tela (ex.: "Outros formatos").
  rotuloOpcoes: string;
}

export function BotaoDividido({ rotulo, icone, aoClicar, opcoes, desabilitado = false, rotuloOpcoes }: BotaoDivididoProps) {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (evento: MouseEvent) => {
      if (caixaRef.current && !caixaRef.current.contains(evento.target as Node)) setAberto(false);
    };
    const fecharEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, [aberto]);

  return (
    <div ref={caixaRef} className="botao-dividido relative inline-flex">
      <button type="button" className="btn btn-secondary botao-dividido__principal" onClick={aoClicar} disabled={desabilitado}>
        {icone && <i className={`fa-solid ${icone}`} aria-hidden="true"></i>} {rotulo}
      </button>
      <button
        type="button"
        className="btn btn-secondary botao-dividido__seta"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={rotuloOpcoes}
        disabled={desabilitado}
        onClick={() => setAberto((atual) => !atual)}
      >
        <i className={`fa-solid fa-chevron-down transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true"></i>
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-64 fundo-cartao border borda-padrao rounded-xl shadow-xl py-1.5 z-30 overflow-hidden">
          {opcoes.map((opcao) => (
            <button
              key={opcao.rotulo}
              type="button"
              role="menuitem"
              className="flex w-full items-start gap-3 px-4 py-2.5 text-sm text-left texto-padrao hover-fundo-sutil transition-colors"
              onClick={() => {
                setAberto(false);
                opcao.aoEscolher();
              }}
            >
              <i className={`fa-solid ${opcao.icone} w-4 mt-0.5 text-center texto-fraco`} aria-hidden="true"></i>
              <span>
                <span className="block enfase">{opcao.rotulo}</span>
                {opcao.descricao && <span className="block legenda texto-fraco">{opcao.descricao}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
