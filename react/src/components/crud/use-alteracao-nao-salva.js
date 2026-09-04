import { useEffect } from 'react';

// Aviso nativo do navegador (09-08-2026, Bloco I do prompt do Claude Web:
// "aviso ao tentar sair com mudança não salva") - beforeunload cobre
// fechar aba/atualizar página/digitar outra URL. Navegação DENTRO do app
// (botão Cancelar, clicar em outro item do menu) não passa por
// beforeunload - cada tela de Alterar decide isso na hora (geralmente um
// window.confirm antes de navigate(-1), ver aoCancelar em
// alterar-usuario.jsx). Sem useBlocker do react-router de propósito: essa
// API exige montar um diálogo próprio pra cada bloqueio - pro escopo
// deste pedido (só avisar, não impedir a qualquer custo), os dois
// mecanismos nativos do browser resolvem sem componente extra.
export function useAvisoAlteracaoNaoSalva(sujo) {
  useEffect(() => {
    if (!sujo) {
      return undefined;
    }
    const aoTentarFechar = (evento) => {
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', aoTentarFechar);
    return () => window.removeEventListener('beforeunload', aoTentarFechar);
  }, [sujo]);
}
