import { useEffect } from 'react';
import { pedirConfirmacao } from './confirmacao';

// Aviso nativo do navegador ("aviso ao tentar sair com mudança não salva"): beforeunload cobre fechar
// aba/atualizar página/digitar outra URL. Navegação DENTRO do app (botão Cancelar, clicar em outro item do
// menu) não passa por beforeunload: cada tela pergunta na hora, com `confirmarSaida` (abaixo). Fechar a aba
// continua com a pergunta do próprio navegador: nenhum site consegue trocar essa janela.
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

// A confirmação de "sair com alteração não salva?", no ModalConfirmacao. Modal usa `useFecharComAviso` (abaixo),
// que já chama esta; ela fica solta para quem não é modal, como o "Cancelar" da Minha Conta.
export async function confirmarSaida(sujo: boolean): Promise<boolean> {
  return (
    !sujo ||
    pedirConfirmacao({
      titulo: 'Sair sem salvar?',
      texto: 'Você tem alterações não salvas. Se sair agora, elas se perdem.',
      rotuloConfirmar: 'Sair sem salvar',
      perigo: true,
    })
  );
}

// Os dois juntos, como todo modal de criar/alterar usa: avisa o navegador enquanto houver alteração não salva e
// devolve o `fechar` que pergunta antes de sair (X, Cancelar, Esc).
export function useFecharComAviso(sujo: boolean, aoFechar: () => void): () => void {
  useAvisoAlteracaoNaoSalva(sujo);
  return () => {
    void confirmarSaida(sujo).then((sair) => {
      if (sair) aoFechar();
    });
  };
}
