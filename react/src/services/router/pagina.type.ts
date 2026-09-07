import type { UseAuthReturn } from '../3-auth/hook/use-auth';

// Toda página roteada recebe exatamente esta prop (App.jsx: cada rota
// renderiza `<Elemento auth={auth} />`, o MESMO `auth`, sem exceção -
// confirmado lendo App.jsx antes de fechar este tipo). Usado por
// `rotas.constants.ts` (`Rota.elemento`) e por cada view/ quando a Fase 6
// as converter - convergem todas pro mesmo tipo, já que já recebem a
// mesma prop hoje.
export interface PropsPagina {
  auth: UseAuthReturn;
}
