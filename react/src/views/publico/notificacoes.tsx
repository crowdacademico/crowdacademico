import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Carregando } from '../../components/layout/carregando';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { notificacaoInternaApi } from '../../services/27-notificacao/api/modelo-mensagem.api';
import type { NotificacaoInternaResponse } from '../../services/27-notificacao/type/modelo-mensagem.type';
import type { PropsPagina } from '../../services/router/pagina.type';

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
      <div className="mx-auto max-w-2xl px-4">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rotulo-leitura texto-marca mb-3">Sua conta</p>
            <h1 className="titulo-pagina">Notificações</h1>
            <p className="paragrafo texto-padrao mt-3">
              Avisos sobre suas campanhas e contribuições.
            </p>
          </div>
          {auth.autenticado && quantidadeNaoLidas > 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => void marcarTodas()} disabled={marcandoTodas}>
              {marcandoTodas ? 'Salvando...' : 'Marcar todas como lidas'}
            </button>
          )}
        </header>

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
                  <article className={`fundo-cartao border rounded-xl p-5 ${lida ? 'borda-padrao' : 'border-(--cor-marca)'}`}>
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg fundo-sutil texto-marca" aria-hidden="true">
                        <i className={`fa-solid ${lida ? 'fa-bell' : 'fa-bell-concierge'}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="subtitulo">{notificacao.titulo}</h2>
                        <p className="paragrafo texto-padrao mt-1 whitespace-pre-wrap">{notificacao.mensagem}</p>
                        <p className="legenda mt-2">{dataNotificacao(notificacao.criadoEm)}</p>
                      </div>
                      {!lida && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-pequeno shrink-0"
                          onClick={() => void marcarLida(notificacao.idNotificacao)}
                          disabled={marcandoId === notificacao.idNotificacao || marcandoTodas}
                          aria-label={`Marcar "${notificacao.titulo}" como lida`}
                        >
                          {marcandoId === notificacao.idNotificacao ? 'Salvando...' : 'Marcar como lida'}
                        </button>
                      )}
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
