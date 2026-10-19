import { useState } from 'react';
import { createPortal } from 'react-dom';

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
  // Motivo de a ação não se aplicar a esta linha: o botão fica apagado, não reage ao clique e a dica mostra o nome da
  // ação e, embaixo, o motivo.
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
  // A dica (o nome da ação, e o motivo quando ela está indisponível) é desenhada fora da tabela, direto no <body>, fixa na
  // tela, acima do botão e alinhada pela direita dele (sem passar da borda esquerda da tela): a caixa da tabela, que
  // rola de lado, cortava a bolha e ganhava uma barra de rolagem quando o ícone não era o último da coluna.
  const [posicao, setPosicao] = useState<{ topo: number; direita: number } | null>(null);
  const abrir = (elemento: HTMLElement) => {
    const caixa = elemento.getBoundingClientRect();
    setPosicao({ topo: caixa.top - 8, direita: Math.max(caixa.right, LARGURA_BOLHA_PX) });
  };
  const fechar = () => setPosicao(null);

  const className =
    'crud-tabela__acao' +
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
      {posicao &&
        createPortal(
          <span
            className={'dica__bolha dica__bolha--solta' + (indisponivel ? '' : ' dica__bolha--curta')}
            aria-hidden="true"
            style={{ top: posicao.topo, left: posicao.direita }}
          >
            {indisponivel ? `${rotulo}

${indisponivel}` : rotulo}
          </span>,
          document.body,
        )}
    </button>
  );
}
