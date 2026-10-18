import { useEffect, useState } from 'react';
import { configuracoesApi } from '../api/configuracoes.api';
import { TAREFAS_AUTOMATICAS, type TarefaAutomatica } from '../constants/tarefas-automaticas.constants';
import type { AuthFetch } from '../../3-auth/type/auth.type';

// As tarefas automáticas do sistema que estão DESLIGADAS agora (interruptor = 'false' em configuracoes), para o aviso
// do Dashboard. Os interruptores são parâmetros internos: quem não pode lê-los recebe a lista vazia (sem aviso).
export function useTarefasDesligadas(authFetch: AuthFetch): TarefaAutomatica[] {
  const [desligadas, setDesligadas] = useState<TarefaAutomatica[]>([]);
  useEffect(() => {
    configuracoesApi
      .listar(authFetch)
      .then((lista) => {
        const desligado = new Set(lista.filter((p) => p.idUsuario === null && p.valor === 'false').map((p) => p.chave));
        setDesligadas(TAREFAS_AUTOMATICAS.filter((tarefa) => desligado.has(tarefa.chave)));
      })
      .catch(() => setDesligadas([]));
  }, [authFetch]);
  return desligadas;
}
