import { useSyncExternalStore } from 'react';

// Contador de requisições em andamento, fora do React (qualquer código pode marcar uma requisição, não só
// componente). `authFetch` passa toda chamada por `acompanharRequisicao`; a BarraCarregamento lê pelo hook.
let emAndamento = 0;
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function acompanharRequisicao<T>(promessa: Promise<T>): Promise<T> {
  emAndamento += 1;
  avisar();
  return promessa.finally(() => {
    emAndamento -= 1;
    avisar();
  });
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function useRedeOcupada(): boolean {
  return useSyncExternalStore(inscrever, () => emAndamento > 0);
}
