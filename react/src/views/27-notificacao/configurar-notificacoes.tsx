import { useEffect, useState } from 'react';
import {
  notificacaoConfiguracaoApi,
  type ConfiguracaoNotificacoesResponse,
  type ModeloMensagem,
  type NovaVersaoModelo,
  type RegraNotificacao,
} from '../../services/27-notificacao/api/notificacao-configuracao.api';
import type { PropsPagina } from '../../services/router/pagina.type';

const nomeCanal = (canal: RegraNotificacao['canal']) =>
  canal === 'email' ? 'E-mail' : 'Sino';

const rascunhoDoModelo = (modelo: ModeloMensagem): NovaVersaoModelo => ({
  titulo_template: modelo.titulo_template,
  corpo_texto_template: modelo.corpo_texto_template,
  corpo_html_template: modelo.corpo_html_template ?? '',
});

export function ConfigurarNotificacoes({ auth }: PropsPagina) {
  const [configuracao, setConfiguracao] =
    useState<ConfiguracaoNotificacoesResponse | null>(null);
  const [rascunhos, setRascunhos] = useState<Record<number, NovaVersaoModelo>>(
    {},
  );
  const [carregando, setCarregando] = useState(true);
  const [salvandoRegra, setSalvandoRegra] = useState<number | null>(null);
  const [salvandoModelo, setSalvandoModelo] = useState<number | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let ativo = true;
    notificacaoConfiguracaoApi
      .listar(auth.authFetch)
      .then((resultado) => {
        if (ativo) {
          setConfiguracao(resultado);
          setErro('');
        }
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : 'Não foi possível carregar as configurações de notificação.',
          );
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [auth.authFetch, chaveRecarga]);

  const atualizarRegra = async (regra: RegraNotificacao) => {
    setSalvandoRegra(regra.id_regra_notificacao);
    setErro('');
    setAviso('');
    try {
      const atualizada = await notificacaoConfiguracaoApi.atualizarRegra(
        auth.authFetch,
        regra.id_regra_notificacao,
        !regra.ativo,
      );
      setConfiguracao((atual) =>
        atual
          ? {
              ...atual,
              regras: atual.regras.map((item) =>
                item.id_regra_notificacao === atualizada.id_regra_notificacao
                  ? atualizada
                  : item,
              ),
            }
          : atual,
      );
      setAviso('Canal atualizado.');
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : 'Não foi possível atualizar o canal.',
      );
    } finally {
      setSalvandoRegra(null);
    }
  };

  const salvarVersao = async (
    regra: RegraNotificacao,
    modelo: ModeloMensagem,
  ) => {
    setSalvandoModelo(regra.id_regra_notificacao);
    setErro('');
    setAviso('');
    try {
      await notificacaoConfiguracaoApi.criarVersao(
        auth.authFetch,
        modelo.id_modelo_mensagem,
        rascunhos[regra.id_regra_notificacao] ?? rascunhoDoModelo(modelo),
      );
      setRascunhos((atuais) => {
        const novos = { ...atuais };
        delete novos[regra.id_regra_notificacao];
        return novos;
      });
      setAviso('Nova versão do modelo criada.');
      setChaveRecarga((atual) => atual + 1);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : 'Não foi possível criar a nova versão do modelo.',
      );
    } finally {
      setSalvandoModelo(null);
    }
  };

  const alterarRascunho = (
    regra: RegraNotificacao,
    modelo: ModeloMensagem,
    campo: keyof NovaVersaoModelo,
    valor: string,
  ) => {
    setRascunhos((atuais) => {
      const atual = atuais[regra.id_regra_notificacao] ?? rascunhoDoModelo(modelo);
      return {
        ...atuais,
        [regra.id_regra_notificacao]: { ...atual, [campo]: valor },
      };
    });
  };

  return (
    <div className="admin-content-painel">
      <header className="mb-5">
        <h1 className="titulo-secao">Notificações e E-mails</h1>
        <p className="paragrafo texto-fraco mt-1">
          Configure os canais por evento e edite o conteúdo criando uma nova versão.
        </p>
      </header>

      {erro && (
        <p className="paragrafo texto-erro mb-4" role="alert">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="paragrafo texto-sucesso mb-4" role="status">
          {aviso}
        </p>
      )}
      {carregando && <p className="paragrafo texto-fraco py-4">Carregando...</p>}
      {!carregando && configuracao?.regras.length === 0 && (
        <p className="paragrafo texto-fraco py-4">
          Nenhuma regra de notificação configurada.
        </p>
      )}

      {configuracao && (
        <div className="divide-y borda-padrao">
          {configuracao.regras.map((regra) => {
            const modelo = configuracao.modelos.find(
              (item) => item.id_modelo_mensagem === regra.id_modelo_mensagem,
            );
            const rascunho = modelo
              ? rascunhos[regra.id_regra_notificacao] ?? rascunhoDoModelo(modelo)
              : null;

            return (
              <section
                className="py-5 first:pt-0 last:pb-0"
                key={regra.id_regra_notificacao}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="paragrafo-destaque texto-forte">
                      {regra.tipo_evento}
                    </h2>
                    <p className="legenda texto-fraco mt-1">
                      {nomeCanal(regra.canal)}
                      {regra.obrigatoria ? ' · obrigatório' : ''}
                      {modelo ? ` · versão ${modelo.versao}` : ''}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 paragrafo">
                    <input
                      type="checkbox"
                      checked={regra.ativo}
                      disabled={regra.obrigatoria || salvandoRegra === regra.id_regra_notificacao}
                      onChange={() => void atualizarRegra(regra)}
                    />
                    Ativo
                  </label>
                </div>

                {!modelo || !rascunho ? (
                  <p className="paragrafo texto-erro mt-3">
                    Não foi possível localizar o modelo associado a esta regra.
                  </p>
                ) : (
                  <form
                    className="mt-4 grid gap-4"
                    onSubmit={(evento) => {
                      evento.preventDefault();
                      void salvarVersao(regra, modelo);
                    }}
                  >
                    <label className="grid gap-1 paragrafo">
                      <span>{regra.canal === 'email' ? 'Assunto' : 'Título'}</span>
                      <input
                        className="w-full rounded border borda-padrao fundo-elevado px-3 py-2"
                        maxLength={200}
                        required
                        value={rascunho.titulo_template}
                        onChange={(evento) =>
                          alterarRascunho(regra, modelo, 'titulo_template', evento.target.value)
                        }
                      />
                    </label>
                    <label className="grid gap-1 paragrafo">
                      <span>Mensagem</span>
                      <textarea
                        className="w-full min-h-24 rounded border borda-padrao fundo-elevado px-3 py-2"
                        maxLength={10000}
                        required
                        value={rascunho.corpo_texto_template}
                        onChange={(evento) =>
                          alterarRascunho(regra, modelo, 'corpo_texto_template', evento.target.value)
                        }
                      />
                    </label>
                    {regra.canal === 'email' && (
                      <label className="grid gap-1 paragrafo">
                        <span>HTML (opcional)</span>
                        <textarea
                          className="w-full min-h-24 rounded border borda-padrao fundo-elevado px-3 py-2 font-mono text-sm"
                          maxLength={30000}
                          value={rascunho.corpo_html_template ?? ''}
                          onChange={(evento) =>
                            alterarRascunho(regra, modelo, 'corpo_html_template', evento.target.value)
                          }
                        />
                      </label>
                    )}
                    <div>
                      <button
                        className="btn btn-secondary"
                        disabled={salvandoModelo === regra.id_regra_notificacao}
                        type="submit"
                      >
                        {salvandoModelo === regra.id_regra_notificacao
                          ? 'Salvando...'
                          : 'Criar nova versão'}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}