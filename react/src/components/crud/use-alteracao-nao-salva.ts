import { useEffect } from 'react';

// Aviso nativo do navegador ("aviso ao tentar sair com mudança não salva"): beforeunload cobre fechar
// aba/atualizar página/digitar outra URL. Navegação DENTRO do app (botão Cancelar, clicar em outro item do
// menu) não passa por beforeunload: cada tela de Alterar decide isso na hora (geralmente um window.confirm
// antes de navigate(-1), ver aoCancelar em alterar-configuracao.tsx e afins; os modais fecham por `aoFechar()`,
// sem navigate). Sem useBlocker do react-router de propósito: essa API exige montar um diálogo próprio para
// cada bloqueio; para o escopo (só avisar, não impedir a qualquer custo), os dois mecanismos nativos do browser
// resolvem sem componente extra.
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

// A confirmação de "sair com alteração não salva?" (window.confirm com o MESMO texto). Modal usa
// `useFecharComAviso` (abaixo), que já chama esta; ela fica solta para quem não é modal, como o "Cancelar" da
// Minha Conta, que volta para a tela anterior.
export function confirmarSaida(sujo: boolean): boolean {
  return !sujo || window.confirm('Você tem alterações não salvas. Sair mesmo assim?');
}

// Os dois juntos, como todo modal de criar/alterar usa: avisa o navegador enquanto houver alteração não salva e
// devolve o `fechar` que pergunta antes de sair (X, Cancelar, Esc).
export function useFecharComAviso(sujo: boolean, aoFechar: () => void): () => void {
  useAvisoAlteracaoNaoSalva(sujo);
  return () => {
    if (confirmarSaida(sujo)) aoFechar();
  };
}
