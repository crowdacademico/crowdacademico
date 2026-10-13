import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Dica } from '../layout/tooltip';

// Ícone + texto (escondido via CSS quando a coluna aperta) + dica de hover: um botão da coluna Ações. Só
// `<button>`: a variante `<Link to=...>` (páginas de verdade, `rotaBase`) não tem consumidor desde que a
// migração CRUD→Modal terminou.
// 'escolher': confirmar/salvar (ex.: Salvar da edição na linha, components/crud/tabelas/tabela-editavel.tsx).
// 'aviso' e 'erro': ícone nessas cores (ex.: o cadeado do Upgrade; o coração e a bandeira do Campo de Testes).
type VarianteAcaoLinha = 'alterar' | 'excluir' | 'escolher' | 'aviso' | 'erro' | 'neutra';

interface AcaoLinhaProps {
  rotulo: string;
  icone: string;
  variante?: VarianteAcaoLinha;
  onClick?: () => void;
  // Motivo de a ação não se aplicar a esta linha: o botão fica apagado, não reage ao clique e a dica mostra o motivo.
  indisponivel?: string;
  // Ícone vazado (fa-regular), ex.: coração de Seguir; e só o ícone, sem o texto (coluna própria, ColunaAcao).
  vazado?: boolean;
  soIcone?: boolean;
}

const CLASSE_VARIANTE: Record<VarianteAcaoLinha, string> = {
  alterar: ' crud-tabela__acao--alterar',
  excluir: ' crud-tabela__acao--excluir',
  escolher: ' crud-tabela__acao--escolher',
  aviso: ' crud-tabela__acao--aviso',
  erro: ' crud-tabela__acao--erro',
  neutra: '',
};

// Largura máxima da bolha (.dica__bolha, 16rem) + uma folga da borda da tela.
const LARGURA_BOLHA_PX = 256 + 8;

export function AcaoLinha({ rotulo, icone, variante = 'neutra', onClick, indisponivel, vazado, soIcone }: AcaoLinhaProps) {
  // Motivo de indisponível: frase longa que a caixa da tabela (que rola de lado) cortava. Por isso essa bolha é
  // desenhada fora da tabela, direto no <body>, fixa na tela, acima do botão e alinhada pela direita dele (sem
  // passar da borda esquerda da tela). A dica curta ("Alterar") continua a de CSS puro.
  const [posicao, setPosicao] = useState<{ topo: number; direita: number } | null>(null);
  const abrir = (elemento: HTMLElement) => {
    if (!indisponivel) return;
    const caixa = elemento.getBoundingClientRect();
    setPosicao({ topo: caixa.top - 8, direita: Math.max(caixa.right, LARGURA_BOLHA_PX) });
  };
  const fechar = () => setPosicao(null);

  const className =
    'crud-tabela__acao' +
    (indisponivel ? '' : ' dica') +
    CLASSE_VARIANTE[variante] +
    (indisponivel ? ' crud-tabela__acao--indisponivel' : '');

  // aria-disabled (não disabled): continua focável pelo teclado, para a dica com o motivo aparecer.
  return (
    <button
      type="button"
      className={className}
      onClick={indisponivel ? undefined : onClick}
      onMouseEnter={(evento) => abrir(evento.currentTarget)}
      onFocus={(evento) => abrir(evento.currentTarget)}
      onMouseLeave={fechar}
      onBlur={fechar}
      aria-label={indisponivel ? `${rotulo}: ${indisponivel}` : rotulo}
      aria-disabled={indisponivel ? true : undefined}
    >
      <i className={`${vazado ? 'fa-regular' : 'fa-solid'} ${icone}`} aria-hidden="true"></i>
      {!soIcone && <span className="crud-tabela__acao-texto">{rotulo}</span>}
      {!indisponivel && <Dica texto={rotulo} curta />}
      {indisponivel &&
        posicao &&
        createPortal(
          <span
            className="dica__bolha dica__bolha--solta"
            aria-hidden="true"
            style={{ top: posicao.topo, left: posicao.direita }}
          >
            {indisponivel}
          </span>,
          document.body,
        )}
    </button>
  );
}
