// Rodapé de modal e de formulário: botão secundário (Cancelar, Voltar, Fechar) + ações (Salvar, Criar, Confirmar
// exclusão...). Enquanto `ocupado`, a ação fica desabilitada e mostra `rotuloOcupado` ("Salvando..."). Sem
// `acao`, sobra só o botão secundário, à direita, com a largura de um botão de dupla (rodapé "Fechar" do Consultar). Mais de uma ação (ex.:
// Salvar e Enviar para aprovação): passe uma lista; ficam na ordem dada, depois do secundário.
//
// `formulario`: o botão de ação vira `type="submit"` e submete o `<form>` com esse id, mesmo que o form viva
// fora do rodapé (o rodapé do ModalFicha fica fora do `<form>`). Sem ele, é um botão comum que chama `aoClicar`.
export interface AcaoRodape {
  rotulo: string;
  rotuloOcupado?: string;
  ocupado?: boolean;
  desabilitado?: boolean;
  aoClicar?: () => void;
  formulario?: string;
  perigo?: boolean;
}

interface RodapeAcoesProps {
  aoCancelar: () => void;
  rotuloCancelar?: string;
  acao?: AcaoRodape | AcaoRodape[];
  // Largura máxima do conjunto, alinhado à direita: 'sm' é o padrão dos modais; 'md' para rótulo de ação longo;
  // 'xl' para três botões; 'cheia' ocupa o espaço todo (rodapé de página).
  largura?: 'sm' | 'md' | 'xl' | 'cheia';
}

const CLASSE_LARGURA = {
  sm: ' max-w-(--largura-rodape-acoes) ml-auto',
  md: ' max-w-(--largura-rodape-acoes-media) ml-auto',
  xl: ' max-w-(--largura-rodape-acoes-larga) ml-auto',
  cheia: '',
};

export function RodapeAcoes({ aoCancelar, rotuloCancelar = 'Cancelar', acao, largura = 'sm' }: RodapeAcoesProps) {
  const acoes = Array.isArray(acao) ? acao : acao ? [acao] : [];
  // Botão sozinho: mesma largura de um botão de dupla (metade direita da mesma caixa). Esticado ele ocupava o
  // rodapé inteiro; só do tamanho do texto, ficava miúdo perto dos outros rodapés.
  if (acoes.length === 0) {
    return (
      // Grade de 2 colunas com o mesmo espaço entre elas do rodapé de dupla: o botão na 2ª coluna sai com a largura
      // exata de um botão de dupla, sem medida escrita à mão.
      <div className={'grid grid-cols-2 gap-3' + CLASSE_LARGURA[largura]}>
        <button type="button" onClick={aoCancelar} className="btn btn-secondary col-start-2">
          {rotuloCancelar}
        </button>
      </div>
    );
  }
  return (
    <div className={'flex gap-3' + CLASSE_LARGURA[largura]}>
      <button type="button" onClick={aoCancelar} className="btn btn-secondary flex-1">
        {rotuloCancelar}
      </button>
      {acoes.map((item) => (
        <button
          key={item.rotulo}
          type={item.formulario ? 'submit' : 'button'}
          {...(item.formulario ? { form: item.formulario } : {})}
          onClick={item.aoClicar}
          disabled={item.ocupado || item.desabilitado}
          className={'btn flex-1 ' + (item.perigo ? 'btn-danger' : 'btn-primary')}
        >
          {item.ocupado && item.rotuloOcupado ? item.rotuloOcupado : item.rotulo}
        </button>
      ))}
    </div>
  );
}
