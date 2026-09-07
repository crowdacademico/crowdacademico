import { useContext } from 'react';
import { ConfiguracoesContext } from '../context/configuracoes-context';
import type { ConfiguracoesContextValue } from '../context/configuracoes-context';

export function useConfiguracoes(): ConfiguracoesContextValue {
  const contexto = useContext(ConfiguracoesContext);
  if (!contexto) {
    throw new Error(
      'useConfiguracoes() precisa ser chamado dentro de <ConfiguracoesProvider>.',
    );
  }
  return contexto;
}
