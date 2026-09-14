import { useEffect } from 'react';

// Aviso nativo do navegador (09-08-2026, Bloco I do prompt de uma IA:
// "aviso ao tentar sair com mudança não salva") - beforeunload cobre
// fechar aba/atualizar página/digitar outra URL. Navegação DENTRO do app
// (botão Cancelar, clicar em outro item do menu) não passa por
// beforeunload - cada tela de Alterar decide isso na hora (geralmente um
// window.confirm antes de navigate(-1), ver aoCancelar em
// alterar-configuracao.tsx e afins - Usuário não usa mais este hook desde
// 13-09-2026, migrou pra modal e fecha por `aoFechar()`, sem navigate).
// Sem useBlocker do react-router de propósito: essa
// API exige montar um diálogo próprio pra cada bloqueio - pro escopo
// deste pedido (só avisar, não impedir a qualquer custo), os dois
// mecanismos nativos do browser resolvem sem componente extra.
export function useAvisoAlteracaoNaoSalva(sujo: boolean): void {
  useEffect(() => {
    if (!sujo) {
      return undefined;
    }
    const aoTentarFechar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', aoTentarFechar);
    return () => window.removeEventListener('beforeunload', aoTentarFechar);
  }, [sujo]);
}

// Extraído (14-09-2026, pedido do Lucas na auditoria de componentes) - a
// confirmação de "sair com alteração não salva?" (window.confirm com o
// MESMO texto) estava copiada em 7 lugares (cada `aoCancelar`/`fechar` de
// tela Alterar ou modal, ver comentário no topo do arquivo). Não virou um
// hook novo de propósito - continua sendo o CHAMADOR quem decide fechar ou
// não, esta função só evita reescrever a mesma frase/condição de novo:
//
//   const fechar = () => {
//     if (!confirmarSaida(sujo)) return;
//     aoFechar();
//   };
export function confirmarSaida(sujo: boolean): boolean {
  return !sujo || window.confirm('Você tem alterações não salvas. Sair mesmo assim?');
}
