// Casca compartilhada de Criar/Alterar/Excluir (09-08-2026) - era a MESMA
// estrutura (ícone circular + título + subtítulo + cartão branco
// centralizado) copiada e colada em 7 arquivos (criar/alterar/excluir-
// usuario, alterar-papel, criar/alterar/excluir-configuracao), já
// levemente divergente entre eles (algumas com border-slate-200, outras
// não escurecidas). Os 3 de usuário não existem mais como arquivo próprio
// (13-09-2026, migraram pra modal - ver modal-usuario.tsx/modal-criar-
// usuario.tsx, que usam `ModalFicha`, não este componente) - hoje são 14
// consumidores, todos página de verdade (nenhum modal usa este componente).
// Extraído aqui pelo mesmo motivo de FichaConsulta -
// "mesmo estilo que já usei em Consultar" (pedido do Lucas): um lugar só
// pra ajustar o visual do "cartão de formulário" inteiro do painel.
//
// REFEITO (10-08-2026, rodada de IA "embelezar o painel" - causa raiz
// do "Alterar parece um monte de card empilhado, confuso"): a versão
// anterior tinha `max-w-md` (448px) + `min-h-[...] flex items-center
// justify-center` + `max-h-[...] overflow-hidden` - MEDIDA E COMPORTAMENTO
// DE MODAL (centralizado na tela, altura travada com scroll próprio),
// mesmo sendo usado como PÁGINA em todo lugar (nenhum dos 7 usos é um
// modal de verdade). Um formulário como Alterar Usuário, com várias
// seções, ficava 33% mais estreito que Consultar (FichaConsulta,
// max-w-2xl) e ainda cortado em altura - daí a sensação de "empilhado e
// confuso". Agora é uma página normal: sem centralização vertical, sem
// trava de altura, rodapé `sticky bottom-0` (mesmo padrão Notion/Linear)
// em vez de "flex-column com scroll interno" pra manter Salvar/Cancelar
// visível.
//
// `largura` - só existe UMA medida hoje (09-08-2026: 'media', max-w-2xl,
// MESMA largura de FichaConsulta - consistência visual entre Consultar e
// um Alterar/Criar/Excluir simples de 1-2 campos). Chegou a existir uma
// 2ª medida ('larga', max-w-5xl) só pra Alterar Usuário - REMOVIDA
// (13-09-2026, achado do Lucas numa auditoria de otimização): Alterar
// Usuário virou modal nesse mesmo dia (usa `ModalFicha`, que é sempre
// max-w-5xl fixo, sem prop de largura nenhuma) e ficou como opção sem
// nenhum consumidor - "opção não usada em componente compartilhado é
// convite, não seguro" (alguém escolheria sem saber que nunca foi testada
// em tela de formulário nenhuma). Se um formulário precisar de largura
// maior de novo, voltar é só recriar a entrada.
//
// Nota (mesma auditoria): `CartaoFormulario` (só 'media' hoje) e
// `CampoFicha` ('cheia') têm cada um sua própria prop `largura`, com
// vocabulário PRÓPRIO e independente - não confundir um com o outro por
// analogia.
//
// `variante="perigo"` é só o ícone (vermelho, pra Excluir) - o resto do
// cartão é idêntico, não é um componente "de exclusão" separado.
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
        {/* SEM overflow-hidden no cartão inteiro (10-08-2026, achado
            corrigindo o mesmo problema em ficha-consulta.tsx) -
            overflow-hidden cria um contexto de scroll que o `sticky` do
            rodapé não atravessa (ele simplesmente nunca gruda). Cada
            pedaço arredonda o PRÓPRIO canto (`rounded-t-3xl`/
            `rounded-b-3xl`) em vez de depender de recorte do pai - mesma
            lição do artefato de cantinho já corrigido em toast-provider/
            admin-sidebar nesta sessão. */}
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
