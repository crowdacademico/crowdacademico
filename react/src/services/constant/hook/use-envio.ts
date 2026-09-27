import { useState } from 'react';

// O "enviar" de todo formulário e botão de ação: limpa o erro anterior, liga `ocupado` (o botão mostra
// "Salvando..." e fica desabilitado), roda a ação e, se ela falhar, reporta o erro (texto + toast) em vez de
// deixar a promessa estourar. `ocupado` volta a false no fim, dando certo ou não. Cada ação com o próprio
// "ocupado" (salvar e excluir na mesma tela) chama o hook uma vez para cada uma.
export function useEnvio(reportarErro: (erro: unknown) => unknown, limparErro?: () => void) {
  const [ocupado, setOcupado] = useState(false);

  const executar = async (acao: () => Promise<void>): Promise<void> => {
    limparErro?.();
    setOcupado(true);
    try {
      await acao();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setOcupado(false);
    }
  };

  return { ocupado, executar };
}
