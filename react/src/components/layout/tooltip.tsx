// Primitivo único de dica de hover do sistema (une o que era `Tooltip`/`.tooltip__texto` e
// `.crud-tabela__acao-dica`, quase idênticos). Dois contratos diferentes usam o MESMO mecanismo visual: dar
// nome a um controle (`Dica`, soltada dentro de qualquer gatilho com a classe `dica`) e o ícone "ⓘ" avulso
// (`Tooltip`, que por dentro é só um gatilho `.dica--info` + `<Dica>`).
//
// A bolha (`Dica`) é SEMPRE `aria-hidden`: `role="tooltip"` sem `aria-describedby` apontando para ele é inerte
// (nenhum leitor de tela faz nada com isso), então a role não volta sem esse par. O nome acessível mora no
// GATILHO (`aria-label` ou texto visível), nunca na bolha: por isso o texto da dica quase sempre É o nome do
// controle ("Encerrar sessão"), não uma descrição adicional dele.
interface DicaProps {
  texto: string;
  baixo?: boolean;
  curta?: boolean;
}

export function Dica({ texto, baixo, curta }: DicaProps) {
  const classe = 'dica__bolha' + (baixo ? ' dica__bolha--baixo' : '') + (curta ? ' dica__bolha--curta' : '');
  return (
    <span className={classe} aria-hidden="true">
      {texto}
    </span>
  );
}

// `baixo`: abre a dica PARA BAIXO em vez de para cima (padrão); usar quando o ícone fica perto do topo de um
// cartão com `overflow-hidden` (ex.: cabeçalho de grupo), senão a dica nasce cortada pela borda arredondada do
// cartão, que corta qualquer coisa acima do ícone.
//
// `aoClicar`: quando passado, o ícone vira um `<button>` clicável (cursor de ponteiro, não de "?"), o hover
// continua mostrando só `texto` (ex.: "Saiba mais", curto de propósito), e o clique dispara `aoClicar`,
// normalmente para abrir um `ModalDetalhe` com a explicação de verdade (explicação grande demais para caber num
// tooltip), organizada em parágrafos/seções.
interface TooltipProps {
  texto: string;
  baixo?: boolean;
  aoClicar?: () => void;
}

export function Tooltip({ texto, baixo = false, aoClicar }: TooltipProps) {
  const classe = 'dica dica--info' + (aoClicar ? ' dica--clicavel' : '');
  const Elemento = aoClicar ? 'button' : 'span';

  return (
    <Elemento
      type={aoClicar ? 'button' : undefined}
      className={classe}
      tabIndex={aoClicar ? undefined : 0}
      role={aoClicar ? undefined : 'note'}
      onClick={aoClicar}
      aria-label={texto}
    >
      <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
      <Dica texto={texto} baixo={baixo} />
    </Elemento>
  );
}
