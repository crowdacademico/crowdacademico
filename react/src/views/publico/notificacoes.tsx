import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Carregando } from '../../components/layout/carregando';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { notificacaoInternaApi } from '../../services/27-notificacao/api/modelo-mensagem.api';
import type { NotificacaoInternaResponse } from '../../services/27-notificacao/type/modelo-mensagem.type';
import type { PropsPagina } from '../../services/router/pagina.type';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';

function dataNotificacao(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}

export function Notificacoes({ auth }: PropsPagina) {
  const [notificacoes, setNotificacoes] = useState<NotificacaoInternaResponse[] | null>(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const [marcandoId, setMarcandoId] = useState<number | null>(null);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });

  useEffect(() => {
    if (auth.carregando || !auth.autenticado) return;
    let ativo = true;
    notificacaoInternaApi
      .listar(auth.authFetch)
      .then((resultado) => {
        if (ativo) setNotificacoes(resultado);
      })
      .catch((erroRequisicao: unknown) => {
        if (ativo) reportarErro(erroRequisicao);
      });

    return () => {
      ativo = false;
    };
    // A lista é buscada uma vez para a sessão autenticada atual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, auth.autenticado, auth.carregando]);

  const marcarTodas = async () => {
    limparErro();
    setMarcandoTodas(true);
    try {
      await notificacaoInternaApi.marcarTodas(auth.authFetch);
      setNotificacoes(await notificacaoInternaApi.listar(auth.authFetch));
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setMarcandoTodas(false);
    }
  };

  const marcarLida = async (idNotificacao: number) => {
    limparErro();
    setMarcandoId(idNotificacao);
    try {
      await notificacaoInternaApi.marcarLida(auth.authFetch, idNotificacao);
      setNotificacoes((atuais) =>
        atuais?.map((notificacao) =>
          notificacao.idNotificacao === idNotificacao
            ? { ...notificacao, lidaEm: new Date().toISOString() }
            : notificacao,
        ) ?? null,
      );
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setMarcandoId(null);
    }
  };

  const quantidadeNaoLidas = notificacoes?.filter((notificacao) => notificacao.lidaEm === null).length ?? 0;
  const carregando = auth.carregando || (auth.autenticado && notificacoes === null && !erro);

  return (
    <div className="fundo-pagina min-h-full py-16">
      {/* Mesmo topo das outras páginas (22-11-2026): .largura-site, py-16 e o CabecalhoPagina, com a trilha Início >
          Notificações em cima do título. */}
      <div className="largura-site w-full">
        <CabecalhoPagina
          className="mb-8"
          titulo="Notificações"
          descricao="Avisos sobre suas campanhas e contribuições."
          acaoTitulo={
            auth.autenticado && quantidadeNaoLidas > 0 ? (
              <button type="button" className="btn btn-secondary shrink-0" onClick={() => void marcarTodas()} disabled={marcandoTodas}>
                {marcandoTodas ? 'Salvando...' : 'Marcar todas como lidas'}
              </button>
            ) : undefined
          }
        />

        {carregando && <Carregando />}
        {!auth.carregando && !auth.autenticado && (
          <section className="fundo-cartao border borda-padrao rounded-xl p-6">
            <p className="paragrafo texto-padrao">Entre na sua conta para consultar seus avisos.</p>
            <Link to="/login" className="btn btn-primary mt-4">Entrar</Link>
          </section>
        )}
        {!carregando && erro && <MensagemErro texto={erro} />}
        {!carregando && !erro && notificacoes?.length === 0 && (
          <EstadoVazio
            icone="fa-bell-slash"
            titulo="Nenhuma notificação por aqui."
            texto="Avisos sobre suas campanhas e contribuições aparecerão nesta lista."
          />
        )}
        {!carregando && !erro && notificacoes && notificacoes.length > 0 && (
          <ol className="flex flex-col gap-3">
            {notificacoes.map((notificacao) => {
              const lida = notificacao.lidaEm !== null;
              return (
                <li key={notificacao.idNotificacao}>
                  {/* Layout de lista de e-mail/app (23-11-2026): o texto ocupa a largura toda do card e o "Marcar como
                      lida" fica embaixo, junto da data. Antes o botão ficava na coluna da direita e espremia o texto no
                      celular (uma palavra por linha). */}
                  <article className={`fundo-cartao border rounded-xl p-4 sm:p-5 ${lida ? 'borda-padrao' : 'border-(--cor-marca)'}`}>
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg fundo-sutil texto-marca" aria-hidden="true">
                        <i className={`fa-solid ${lida ? 'fa-bell' : 'fa-bell-concierge'}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="paragrafo font-semibold texto-forte">{notificacao.titulo}</h2>
                        <p className="paragrafo texto-padrao mt-1 whitespace-pre-wrap">{notificacao.mensagem}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="legenda texto-fraco">{dataNotificacao(notificacao.criadoEm)}</p>
                          {!lida && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-pequeno"
                              onClick={() => void marcarLida(notificacao.idNotificacao)}
                              disabled={marcandoId === notificacao.idNotificacao || marcandoTodas}
                              aria-label={`Marcar "${notificacao.titulo}" como lida`}
                            >
                              {marcandoId === notificacao.idNotificacao ? 'Salvando...' : 'Marcar como lida'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
