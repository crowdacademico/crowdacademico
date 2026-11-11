import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Carregando } from '../../components/layout/carregando';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import { ROTULO_FASE_ATUALIZACAO } from '../../services/15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { PropsPagina } from '../../services/router/pagina.type';

function dataPublicacao(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(valor));
}

export function AtualizacoesCampanha({ auth }: PropsPagina) {
  const { id } = useParams();
  const idCampanha = Number(id);
  const idValido = Number.isSafeInteger(idCampanha) && idCampanha > 0;
  const [campanha, setCampanha] = useState<CampanhaResponse | null>(null);
  const [atualizacoes, setAtualizacoes] = useState<AtualizacaoCampanhaResponse[]>([]);
  const [idCarregado, setIdCarregado] = useState<number | null>(null);
  const carregando = idValido && idCarregado !== idCampanha;
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });

  useEffect(() => {
    if (!idValido) return;
    let ativo = true;

    Promise.all([
      campanhaApi.buscar(auth.authFetch, idCampanha),
      atualizacaoCampanhaApi.listar(auth.authFetch, idCampanha),
    ])
      .then(([resultadoCampanha, resultadoAtualizacoes]) => {
        if (ativo) {
          setCampanha(resultadoCampanha);
          setAtualizacoes(resultadoAtualizacoes.filter((atualizacao) => atualizacao.ativo));
          limparErro();
        }
      })
      .catch((erroRequisicao: unknown) => {
        if (ativo) reportarErro(erroRequisicao);
      })
      .finally(() => {
        if (ativo) setIdCarregado(idCampanha);
      });

    return () => {
      ativo = false;
    };
    // Os dados são recarregados quando a campanha da URL ou a sessão muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha, idValido]);

  return (
    <div className="fundo-pagina min-h-full py-16">
      <div className="mx-auto max-w-3xl px-4">
        <header className="mb-8">
          <Link to={idValido ? `/campanha/${idCampanha}` : '/explorar'} className="paragrafo texto-marca hover:underline">
            <i className="fa-solid fa-arrow-left mr-2" aria-hidden="true" />
            Voltar para a campanha
          </Link>
          <p className="rotulo-leitura texto-marca mt-8 mb-3">Acompanhe o projeto</p>
          <h1 className="titulo-pagina">Atualizações</h1>
          {campanha && <p className="paragrafo texto-padrao mt-3">{campanha.titulo}</p>}
        </header>

        {!idValido && <MensagemErro texto="O endereço da campanha é inválido." />}
        {carregando && <Carregando />}
        {!carregando && erro && <MensagemErro texto={erro} />}
        {!carregando && !erro && atualizacoes.length === 0 && (
          <section className="fundo-cartao border borda-padrao rounded-xl p-8 text-center">
            <h2 className="subtitulo">Ainda não há atualizações</h2>
            <p className="paragrafo texto-padrao mt-2">
              Quando o pesquisador publicar novidades, elas aparecerão nesta página.
            </p>
          </section>
        )}

        {!carregando && !erro && atualizacoes.length > 0 && (
          <ol className="flex flex-col gap-5">
            {atualizacoes.map((atualizacao) => (
              <li key={atualizacao.idAtualizacao}>
                <article className="fundo-cartao border borda-padrao rounded-xl p-6">
                  <p className="rotulo-leitura texto-marca mb-2">
                    {ROTULO_FASE_ATUALIZACAO[atualizacao.fase]}
                  </p>
                  <h2 className="subtitulo">{atualizacao.titulo}</h2>
                  <p className="legenda mt-2">{dataPublicacao(atualizacao.publicadoEm)}</p>
                  <p className="paragrafo texto-padrao mt-4 whitespace-pre-wrap">{atualizacao.conteudo}</p>
                  {atualizacao.anexos.length > 0 && (
                    <ul className="mt-5 flex flex-col gap-2 border-t borda-padrao pt-4">
                      {atualizacao.anexos.map((anexo) => (
                        <li key={`${anexo.tipo}-${anexo.idAnexo}`}>
                          <a
                            href={anexo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="paragrafo texto-marca hover:underline"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square mr-2" aria-hidden="true" />
                            {anexo.nome}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
