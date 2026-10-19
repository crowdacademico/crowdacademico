import { useEffect, useState } from 'react';
import { Interruptor } from '../../components/input/interruptor';
import { Tooltip } from '../../components/layout/tooltip';
import { useToast } from '../../components/layout/toast/use-toast';
import { configuracoesApi } from '../../services/11-configuracoes/api/configuracoes.api';
import {
  ENVIO_EMAIL_AUTOMATICO,
  PAGAMENTO_AUTOMATICO,
  TAREFAS_AUTOMATICAS,
  type TarefaAutomatica,
} from '../../services/11-configuracoes/constants/tarefas-automaticas.constants';
import { useAuthFetchRegistrado } from '../servicos/hook/use-chamada-registrada';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { ConfiguracoesResponse } from '../../services/11-configuracoes/type/configuracoes.type';

interface CardsTarefasAutomaticasProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  // Os cards desta tela: a T5 mostra as do pagamento, a T6 a do envio de e-mail.
  cards: TarefaAutomatica[];
  provedorDeTeste: boolean;
  // De quantos em quantos minutos cada tarefa roda, pela chave do interruptor (vem do Nest).
  intervalosMinutos: Partial<Record<string, number>>;
  // A tarefa rodando agora (o botão dela gira; os outros esperam).
  rodando: string | null;
  aoRodar: (tarefa: TarefaAutomatica) => void;
  aoErro: (erro: unknown) => void;
}

// Todos os cards de tarefa (T5 e T6): cada card reserva o espaço do maior título e do maior texto, para ter a mesma
// altura em qualquer tela.
const TODOS_OS_CARDS = [...TAREFAS_AUTOMATICAS, PAGAMENTO_AUTOMATICO, ENVIO_EMAIL_AUTOMATICO];

// Os cards das tarefas automáticas (T5: as 4 do pagamento e o pagamento automático do Campo de Testes, só no modo
// rápido; T6: o envio de e-mail). O interruptor muda o PARÂMETRO de verdade (o mesmo de Parâmetros do
// Sistema): desligada, a execução agendada pula a vez. "Rodar agora" roda na hora, ligada ou não.
export function CardsTarefasAutomaticas({ auth, cards, provedorDeTeste, intervalosMinutos, rodando, aoRodar, aoErro }: CardsTarefasAutomaticasProps) {
  const authFetch = useAuthFetchRegistrado(auth);
  const { mostrar } = useToast();
  const [parametros, setParametros] = useState<Record<string, ConfiguracoesResponse> | null>(null);
  const [mudando, setMudando] = useState<string | null>(null);

  useEffect(() => {
    configuracoesApi
      .listar(authFetch)
      .then((lista) => setParametros(Object.fromEntries(lista.filter((p) => p.idUsuario === null).map((p) => [p.chave, p]))))
      .catch(aoErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternar = async (card: TarefaAutomatica, parametro: ConfiguracoesResponse) => {
    setMudando(card.chave);
    try {
      const novo = parametro.valor === 'true' ? 'false' : 'true';
      const salvo = await configuracoesApi.atualizar(authFetch, parametro.idConfig, { valor: novo });
      setParametros((atuais) => ({ ...atuais, [card.chave]: salvo }));
      mostrar(`${card.rotulo}: ${novo === 'true' ? 'ligada' : 'desligada'}.`);
    } catch (erro) {
      aoErro(erro);
    } finally {
      setMudando(null);
    }
  };

  return (
    <section className="crud-secao">
      <h2 className="titulo-secao">
        Tarefas automáticas{' '}
        <Tooltip texto="O que o sistema faz sozinho de tempos em tempos. O interruptor liga ou desliga a tarefa agendada (é o parâmetro de Parâmetros do Sistema); Rodar agora faz na hora, ligada ou não." />
      </h2>
      {/* A mesma grade em toda tela, com qualquer número de cards: um card sozinho (T6) tem a largura de um da T5. */}
      <div className="grid gap-3 mt-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const parametro = parametros?.[card.chave];
          const soModoRapido = card === PAGAMENTO_AUTOMATICO && !provedorDeTeste;
          const indisponivel = soModoRapido
            ? 'Só no modo rápido (provedor de teste).'
            : parametros && !parametro
              ? 'O parâmetro ainda não existe neste banco.'
              : undefined;
          return (
            <div key={card.chave} className="cartao-painel p-4 flex flex-col gap-3">
              <div className="cartao-tarefa__pilha">
                {TODOS_OS_CARDS.map((outro) => (
                  <span key={outro.chave} className="paragrafo-destaque flex items-center gap-2 invisible" aria-hidden="true">
                    <i className={`fa-solid ${outro.icone}`}></i> {outro.rotulo}
                  </span>
                ))}
                <span className="paragrafo-destaque texto-forte flex items-center gap-2">
                  <i className={`fa-solid ${card.icone}`} aria-hidden="true"></i> {card.rotulo}
                </span>
              </div>
              <div className="cartao-tarefa__pilha flex-1">
                {TODOS_OS_CARDS.map((outro) => (
                  <p key={outro.chave} className="legenda invisible" aria-hidden="true">
                    {outro.dica}
                  </p>
                ))}
                <p className="legenda texto-fraco">{card.dica}</p>
              </div>
              {intervalosMinutos[card.chave] !== undefined && (
                <span className="legenda-destaque texto-padrao flex items-center gap-2">
                  <i className="fa-regular fa-clock" aria-hidden="true"></i>
                  {intervalosMinutos[card.chave] === 1 ? 'A cada 1 minuto' : `A cada ${intervalosMinutos[card.chave]} minutos`}
                </span>
              )}
              <Interruptor
                rotulo={card.rotulo}
                ligado={parametro?.valor === 'true'}
                indisponivel={indisponivel ?? (parametros ? undefined : 'Carregando...')}
                ocupado={mudando === card.chave}
                aoAlternar={() => parametro && void alternar(card, parametro)}
              />
              <button
                type="button"
                className="btn btn-secondary btn-pequeno"
                title={soModoRapido ? 'Só no modo rápido (provedor de teste).' : undefined}
                disabled={rodando !== null || soModoRapido}
                onClick={() => aoRodar(card)}
              >
                <i className={`fa-solid ${rodando === card.tarefa ? 'fa-spinner fa-spin' : 'fa-play'}`} aria-hidden="true"></i> Rodar agora
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
