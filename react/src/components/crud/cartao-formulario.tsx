// Casca compartilhada de Criar/Alterar/Excluir: ícone circular + título + subtítulo + cartão branco, usada por
// todas as páginas de formulário (nenhum modal usa este componente: os modais usam `ModalFicha`, ver
// modal-usuario.tsx/modal-criar-usuario.tsx). Extraída pelo mesmo motivo de FichaConsulta: um lugar só para
// ajustar o visual do "cartão de formulário" inteiro do painel.
//
// É uma página normal: sem centralização vertical, sem trava de altura, rodapé `sticky bottom-0` (mesmo padrão
// Notion/Linear) para manter Salvar/Cancelar visível. Não usa medida nem comportamento de MODAL (`max-w-md`,
// `min-h-[...] flex items-center justify-center`, `max-h-[...] overflow-hidden`): um formulário como Alterar
// Usuário, com várias seções, ficaria mais estreito que Consultar (FichaConsulta, max-w-2xl) e cortado em
// altura, com a sensação de "empilhado e confuso".
//
// `largura`: só existe UMA medida, 'media' (max-w-2xl, MESMA largura de FichaConsulta: consistência visual
// entre Consultar e um Alterar/Criar/Excluir simples de 1-2 campos). Não há opção 'larga': Alterar Usuário é
// modal (usa `ModalFicha`, sempre max-w-5xl fixo, sem prop de largura), e "opção não usada em componente
// compartilhado é convite, não segurança" (alguém escolheria sem saber que nunca foi testada em tela de
// formulário nenhuma). Se um formulário precisar de largura maior, é só recriar a entrada.
//
// `CartaoFormulario` (só 'media') e `CampoFicha` ('cheia') têm cada um sua própria prop `largura`, com
// vocabulário PRÓPRIO e independente: não confundir um com o outro por analogia.
//
// `variante="perigo"` é só o ícone (vermelho, para Excluir): o resto do cartão é idêntico, não é um componente
// "de exclusão" separado.
import type { ReactNode } from 'react';

type VarianteIcone = 'padrao' | 'perigo';

const VARIANTES_ICONE: Record<VarianteIcone, string> = {
  padrao: 'fundo-marca text-white',
  perigo: 'fundo-erro texto-erro',
};

interface CartaoFormularioProps {
  icone: string;
  titulo: string;
  subtitulo?: string;
  variante?: VarianteIcone;
  rodape?: ReactNode;
  children?: ReactNode;
}

export function CartaoFormulario({
  icone,
  titulo,
  subtitulo,
  variante = 'padrao',
  rodape,
  children,
}: CartaoFormularioProps) {
  return (
    <div className="p-4 sm:p-8 fundo-pagina">
      <div className="mx-auto w-full max-w-2xl">
        {/* SEM overflow-hidden no cartão inteiro: overflow-hidden cria um contexto de scroll que o `sticky`
            do rodapé não atravessa (ele nunca gruda). Cada pedaço arredonda o PRÓPRIO canto
            (`rounded-t-3xl`/`rounded-b-3xl`) em vez de depender de recorte do pai (mesma lição do artefato
            de cantinho de toast-provider/admin-sidebar). */}
        <div className="fundo-cartao rounded-3xl shadow-2xl border borda-forte">
          <div className="p-10 text-center border-b borda-padrao fundo-sutil rounded-t-3xl">
            <div
              className={
                'w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl mb-5 shadow-lg ' +
                VARIANTES_ICONE[variante]
              }
            >
              <i className={'fa-solid ' + icone}></i>
            </div>
            <h2 className="titulo-pagina mb-2">{titulo}</h2>
            {subtitulo && <p className="text-sm texto-padrao font-medium">{subtitulo}</p>}
          </div>

          {children}

          {rodape && (
            <div className="p-6 border-t borda-padrao fundo-cartao rounded-b-3xl sticky bottom-0">
              {rodape}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
