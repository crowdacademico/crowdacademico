import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { Carregando } from '../../components/layout/carregando';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { PropsPagina } from '../../services/router/pagina.type';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { contribuicaoPublicaApi } from '../../services/22-contribuicao/api/contribuicao-publica.api';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import { ROTULO_TIPO_RECOMPENSA } from '../../services/18-recompensa/constants/recompensa.constants';
import type { RecompensaResponse } from '../../services/18-recompensa/type/recompensa.type';

const VALORES_SUGERIDOS = [25, 50, 100, 150, 200];
const VALOR_MAXIMO = 99_999_999.99;

function idCampanhaDaUrl(valor: string | null): number | null {
  if (!valor || !/^[1-9]\d*$/.test(valor)) return null;
  const id = Number(valor);
  return Number.isSafeInteger(id) ? id : null;
}

function campanhaAceitaContribuicao(campanha: CampanhaResponse): boolean {
  const agora = Date.now();
  return (
    campanha.status === 'ativo' &&
    (campanha.dataInicio === null || Date.parse(campanha.dataInicio) <= agora) &&
    (campanha.dataFim === null || Date.parse(campanha.dataFim) > agora)
  );
}

export function Checkout({ auth }: PropsPagina) {
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  const idCampanha = idCampanhaDaUrl(parametros.get('idCampanha'));
  const [resultadoCampanha, setResultadoCampanha] = useState<{
    id: number;
    campanha: CampanhaResponse;
  } | null>(null);
  const [falhaCampanha, setFalhaCampanha] = useState<{ id: number; mensagem: string } | null>(null);
  // ?valor= vem do "Apoiar com R$ X" da aba Recompensas da campanha; sem ele (ou inválido), 150.
  const valorDaUrl = Number(parametros.get('valor'));
  const [valor, setValor] = useState(Number.isFinite(valorDaUrl) && valorDaUrl > 0 ? String(valorDaUrl) : '150');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [cienteFlexivel, setCienteFlexivel] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [envioBloqueado, setEnvioBloqueado] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  // lista null = falhou ao carregar; undefined (fora do estado) = ainda carregando.
  const [resultadoRecompensas, setResultadoRecompensas] = useState<{
    id: number;
    lista: RecompensaResponse[] | null;
  } | null>(null);

  useEffect(() => {
    if (idCampanha === null) return;

    let ativo = true;
    campanhaApi
      .buscar(auth.authFetch, idCampanha)
      .then((resultado) => {
        if (ativo) setResultadoCampanha({ id: idCampanha, campanha: resultado });
      })
      .catch((erro: unknown) => {
        if (ativo) {
          setFalhaCampanha({
            id: idCampanha,
            mensagem: erro instanceof Error ? erro.message : 'Não foi possível consultar a campanha.',
          });
        }
      })

    return () => {
      ativo = false;
    };
  }, [auth.authFetch, idCampanha]);

  // RF-105: a pessoa não escolhe recompensa; ganha todas as ativas cujo valor mínimo a contribuição alcança
  // (gatilho trg_contribuicao_concede_recompensas). Aqui só mostramos quais o valor digitado alcança.
  useEffect(() => {
    if (idCampanha === null) return;
    let ativo = true;
    recompensaApi
      .listar(auth.authFetch, idCampanha)
      .then((lista) => {
        if (!ativo) return;
        const ativas = lista.filter((item) => item.ativo).sort((a, b) => a.valorMinimo - b.valorMinimo);
        setResultadoRecompensas({ id: idCampanha, lista: ativas });
      })
      .catch(() => {
        if (ativo) setResultadoRecompensas({ id: idCampanha, lista: null });
      });
    return () => {
      ativo = false;
    };
  }, [auth.authFetch, idCampanha]);

  const campanha = resultadoCampanha?.id === idCampanha ? resultadoCampanha.campanha : null;
  const recompensas = resultadoRecompensas?.id === idCampanha ? resultadoRecompensas.lista : undefined;
  const erroCampanha = falhaCampanha?.id === idCampanha ? falhaCampanha.mensagem : null;
  const carregandoCampanha = idCampanha !== null && campanha === null && erroCampanha === null;
  const valorNumerico = Number(valor);
  const valorValido =
    Number.isFinite(valorNumerico) &&
    valorNumerico >= 5 &&
    valorNumerico <= VALOR_MAXIMO &&
    Math.abs(valorNumerico - Math.round(valorNumerico * 100) / 100) < 0.00000001;
  const campanhaAtiva = campanha !== null && campanhaAceitaContribuicao(campanha);
  const flexivel = campanha?.modelo === 'flexivel';
  const cienciaOk = !flexivel || cienteFlexivel;

  async function enviarContribuicao(): Promise<void> {
    if (
      idCampanha === null ||
      campanha === null ||
      !campanhaAtiva ||
      !valorValido ||
      !aceitouTermos ||
      !cienciaOk ||
      enviando ||
      envioBloqueado
    ) {
      return;
    }

    setEnviando(true);
    setErroEnvio(null);
    try {
      const contribuicao = await contribuicaoPublicaApi.criar(auth.authFetch, {
        idCampanha,
        valor: valorNumerico,
        meioPagamento: 'pix',
        ...(flexivel ? { cienteModeloFlexivel: true } : {}),
      });
      const pix = contribuicao.pix;
      if (
        contribuicao.idCampanha !== idCampanha ||
        contribuicao.status !== 'pendente' ||
        !Number.isSafeInteger(contribuicao.idContribuicao) ||
        !contribuicao.tokenSessao ||
        contribuicao.meioPagamento !== 'pix' ||
        !Number.isFinite(contribuicao.taxaPagamento) ||
        contribuicao.taxaPagamento < 0 ||
        !Number.isFinite(contribuicao.valorCobrado) ||
        contribuicao.valorCobrado < contribuicao.valor ||
        !pix?.copiaECola ||
        !Number.isFinite(Date.parse(pix.expiraEm))
      ) {
        setEnvioBloqueado(true);
        setErroEnvio(
          'Não foi possível gerar o Pix. Não tente de novo agora; fale com o suporte.',
        );
        return;
      }

      void navigate('/apoio-confirmado', {
        state: {
          contribuicao,
          tituloCampanha: campanha.titulo,
          metaFinanceira: campanha.metaFinanceira,
          valorBrutoArrecadado: campanha.valorBrutoArrecadado,
        },
      });
    } catch (erro: unknown) {
      setEnvioBloqueado(true);
      setErroEnvio(
        erro instanceof Error
          ? `${erro.message} Não foi possível confirmar se uma cobrança foi criada. Não tente novamente nesta tela; procure o suporte.`
          : 'Não foi possível confirmar se uma cobrança foi criada. Não tente novamente nesta tela; procure o suporte.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main id="view-checkout" className="view-section flex-grow fundo-sutil py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="titulo-pagina mb-3">Finalizar apoio</h1>
        <p className="max-w-4xl text-sm texto-fraco mb-6">
          Escolha o valor e gere o Pix para apoiar a campanha. O apoio é confirmado assim que o pagamento é recebido.
        </p>
        {carregandoCampanha && <Carregando />}
        {idCampanha === null && (
          <div className="fundo-erro border borda-padrao rounded-xl p-5 mb-6" role="alert">
            Checkout indisponível: identificador de campanha ausente ou inválido. Nenhuma cobrança foi solicitada.
          </div>
        )}
        {!carregandoCampanha && erroCampanha && <MensagemErro texto={erroCampanha} />}
        {!carregandoCampanha && campanha && !campanhaAtiva && (
          <div className="fundo-info texto-info border borda-padrao rounded-xl p-5 mb-6" role="status">
            Esta campanha não está aceitando contribuições no momento. Nenhuma cobrança foi solicitada.
          </div>
        )}
      </div>

      {!carregandoCampanha && campanha && campanhaAtiva && (
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row gap-8">
          <div className="flex-1 fundo-cartao rounded-2xl border borda-padrao shadow-xl overflow-hidden">
            <div className="bg-[var(--cor-cianotipo-800)] px-8 py-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <i className="fa-brands fa-pix texto-marca-sobre-escuro text-2xl" aria-hidden="true" />
                <h2 className="subtitulo texto-sobre-escuro-forte">Pagamento Instantâneo</h2>
              </div>
              <span className="veu-claro texto-urgencia-sobre-escuro microrrotulo px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full fundo-urgencia-sobre-escuro" aria-hidden="true" />
                {enviando ? 'Solicitando cobrança…' : 'Cobrança ainda não gerada'}
              </span>
            </div>

            <div className="p-10 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 fundo-sucesso rounded-full blur-3xl opacity-50 pointer-events-none" />

              <div className="w-full max-w-md mb-8 relative">
                <p className="text-left rotulo-campo">Valor da contribuição</p>
                <div id="checkout-valores-pilulas" className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {VALORES_SUGERIDOS.map((sugestao) => (
                    <button
                      type="button"
                      key={sugestao}
                      aria-pressed={valor === String(sugestao)}
                      onClick={() => setValor(String(sugestao))}
                      className={`pilula-valor ${valor === String(sugestao) ? 'pilula-valor--ativa' : ''} py-2.5 rounded-lg text-sm font-bold border-2 transition-colors`}
                    >
                      {formatarMoeda(sugestao)}
                    </button>
                  ))}
                </div>
                <label htmlFor="checkout-valor-outro" className="block text-left rotulo mt-3">
                  Outro valor (R$)
                </label>
                <input
                  id="checkout-valor-outro"
                  type="number"
                  min="5"
                  max={VALOR_MAXIMO}
                  step="0.01"
                  inputMode="decimal"
                  value={valor}
                  onChange={(evento) => setValor(evento.target.value)}
                  className="input-padrao mt-2 w-full"
                  aria-describedby="checkout-valor-ajuda"
                />
                <p id="checkout-valor-ajuda" className="text-xs texto-fraco mt-2 text-left">
                  Mínimo de R$ 5,00.
                </p>
                {!valorValido && (
                  <p className="text-xs texto-erro mt-2 text-left" role="alert">
                    Informe um valor de até duas casas decimais, dentro do limite permitido.
                  </p>
                )}
              </div>

              {recompensas === null && (
                <p className="w-full max-w-md mb-8 text-xs texto-fraco text-left">
                  Não foi possível carregar as recompensas desta campanha. Isso não impede o apoio.
                </p>
              )}
              {recompensas && recompensas.length > 0 && (
                <section className="w-full max-w-md mb-8 text-left" aria-labelledby="checkout-recompensas-titulo">
                  <h3 id="checkout-recompensas-titulo" className="rotulo-campo">
                    Recompensas
                  </h3>
                  <p className="text-xs texto-fraco mb-3" aria-live="polite">
                    {!valorValido
                      ? 'Informe um valor válido para ver as recompensas que ele alcança.'
                      : `Com ${formatarMoeda(valorNumerico)}, você ganha ${recompensas.filter((item) => item.valorMinimo <= valorNumerico).length} de ${recompensas.length}.`}{' '}
                    Você ganha todas as que o valor alcançar, sem precisar escolher.
                  </p>
                  <ul className="space-y-2">
                    {recompensas.map((item) => {
                      const alcancada = valorValido && item.valorMinimo <= valorNumerico;
                      return (
                        <li
                          key={item.idRecompensa}
                          className={`flex items-start gap-3 rounded-lg border p-3 ${alcancada ? 'borda-marca fundo-sucesso' : 'borda-padrao fundo-sutil'}`}
                        >
                          <i
                            className={`fa-solid ${alcancada ? 'fa-circle-check texto-sucesso' : 'fa-lock texto-fraco'} mt-0.5`}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold texto-forte">
                              {item.titulo}
                              <span className="sr-only">{alcancada ? ' (alcançada)' : ' (não alcançada)'}</span>
                            </p>
                            <p className="text-xs texto-fraco">
                              A partir de <span className="numero">{formatarMoeda(item.valorMinimo)}</span> ·{' '}
                              {ROTULO_TIPO_RECOMPENSA[item.tipo]}
                            </p>
                            {item.descricao && <p className="text-xs texto-padrao mt-1">{item.descricao}</p>}
                          </div>
                          {!alcancada && valorValido && (
                            <button
                              type="button"
                              onClick={() => setValor(String(item.valorMinimo))}
                              className="text-xs font-bold text-primary underline whitespace-nowrap"
                            >
                              Apoiar com {formatarMoeda(item.valorMinimo)}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {!auth.usuario && (
                    <p className="text-xs texto-aviso mt-3">
                      As recompensas são concedidas só a quem apoia com a conta logada.
                    </p>
                  )}
                </section>
              )}

              <h3 className="subtitulo texto-forte mb-2">Escaneie o QR Code</h3>
              <p className="text-sm texto-fraco mb-8 max-w-sm">
                O QR Code aparece depois que você gerar o Pix.
              </p>
              <div
                className="w-56 h-56 border-2 borda-padrao p-3 rounded-xl mb-8 fundo-cartao shadow-lg flex items-center justify-center"
                role="status"
                aria-label="QR Code ainda não disponível"
              >
                <i className="fa-brands fa-pix text-6xl texto-marca opacity-40" aria-hidden="true" />
              </div>
              <div className="w-full max-w-md mb-8">
                <label htmlFor="pix-code" className="block text-left rotulo mb-2">
                  Ou utilize o Pix Copia e Cola:
                </label>
                <div className="flex rounded-xl shadow-sm overflow-hidden border-2 borda-padrao fundo-sutil">
                  <input
                    id="pix-code"
                    type="text"
                    readOnly
                    value=""
                    placeholder="Disponível depois de gerar a cobrança"
                    className="flex-1 bg-transparent p-4 text-sm font-dado texto-padrao outline-none truncate"
                  />
                  <button type="button" disabled className="bg-dark text-white px-6 font-bold text-sm border-l borda-padrao disabled:opacity-50">
                    Copiar
                  </button>
                </div>
              </div>
              <div className="inline-flex items-center gap-3 font-dado fundo-info border borda-padrao texto-info px-5 py-2.5 rounded-lg text-sm font-bold">
                O Pix tem prazo de validade, mostrado depois de gerado.
              </div>
            </div>
          </div>

          <div className="w-full md:w-96 flex-shrink-0 h-max">
            <div className="fundo-cartao border borda-padrao rounded-2xl p-8 shadow-xl mb-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              <h2 className="subtitulo texto-forte mb-6 pb-4 border-b borda-padrao">Resumo da Contribuição</h2>
              <div className="space-y-4 text-sm mb-8">
                <div className="flex justify-between items-start gap-4">
                  <span className="texto-fraco font-medium">Projeto</span>
                  <span className="font-bold texto-forte text-right">{campanha.titulo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="texto-fraco font-medium">Apoio Financeiro</span>
                  <span id="checkout-resumo-valor" className="font-bold texto-forte numero">
                    {valorValido ? formatarMoeda(valorNumerico) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="texto-fraco font-medium">Taxa de Transação</span>
                  <span className="texto-padrao text-right">Calculada ao gerar o Pix</span>
                </div>
                <div className="border-t-2 border-dashed borda-padrao pt-5 mt-5 flex justify-between items-center gap-4">
                  <span className="font-black texto-forte uppercase tracking-wider text-xs">Total a pagar</span>
                  <span id="checkout-resumo-total" className="text-xl font-black text-primary numero text-right">
                    Será informado após gerar
                  </span>
                </div>
              </div>

              <div className="fundo-destaque border borda-padrao rounded-xl p-4 mb-6 text-sm texto-padrao">
                <p className="font-semibold texto-forte mb-2">Regras de contribuição</p>
                <p className="leading-relaxed">
                  O pagamento é por Pix e o valor mínimo é <strong>R$ 5,00</strong>. Veja as taxas na página de Transparência.
                </p>
              </div>
              {!flexivel && (
                <div className="fundo-destaque border borda-padrao rounded-xl p-4 mb-6 text-sm texto-padrao">
                  <p className="font-semibold texto-forte mb-2">Modelo da campanha: Tudo ou Nada</p>
                  <p className="leading-relaxed">
                    Se a meta não for atingida até o fim do prazo, aplicam-se as regras de devolução da plataforma.
                  </p>
                </div>
              )}
              {flexivel && (
                <div className="fundo-aviso border-2 borda-padrao rounded-xl p-4 mb-6 text-sm texto-padrao" role="note">
                  <p className="font-bold texto-forte mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation texto-aviso" aria-hidden="true" />
                    Campanha flexível: leia antes de apoiar
                  </p>
                  <ul className="list-disc pl-5 space-y-1 leading-relaxed mb-3">
                    <li>O valor é cobrado assim que o pagamento for confirmado.</li>
                    <li>
                      Ele é repassado ao pesquisador no encerramento da campanha,{' '}
                      <strong>mesmo que a meta não seja atingida</strong>.
                    </li>
                    <li>Você só recebe o valor de volta se a campanha for encerrada pela moderação da plataforma.</li>
                  </ul>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      id="checkout-ciencia-flexivel"
                      type="checkbox"
                      checked={cienteFlexivel}
                      onChange={(evento) => setCienteFlexivel(evento.target.checked)}
                      className="mt-1 w-4 h-4 accent-primary rounded borda-forte"
                    />
                    <span className="text-xs font-semibold texto-forte leading-relaxed">
                      Entendi que, nesta campanha, o valor vai para o pesquisador mesmo que a meta não seja atingida.
                    </span>
                  </label>
                </div>
              )}

              {auth.aceitePendente && (
                <p className="fundo-erro border borda-padrao rounded-xl p-4 mb-6 text-sm texto-erro" role="alert">
                  Aceite a versão vigente dos Termos de Uso na sua conta antes de continuar.
                </p>
              )}
              <label className="flex items-start gap-3 cursor-pointer p-4 fundo-sutil rounded-xl border borda-padrao mb-8 hover-fundo-sutil transition-colors">
                <input
                  id="checkout-aceite-termos"
                  type="checkbox"
                  checked={aceitouTermos}
                  onChange={(evento) => setAceitouTermos(evento.target.checked)}
                  className="mt-1 w-4 h-4 accent-primary rounded borda-forte"
                />
                <span className="text-xs texto-padrao font-medium leading-relaxed">
                  Li e aceito os <Link to="/termos" className="text-primary underline">Termos de Uso</Link> e compreendo
                  as condições aplicáveis a esta contribuição.
                </span>
              </label>
              <p id="checkout-aceite-ajuda" className="text-xs texto-fraco -mt-6 mb-6">
                {flexivel ? 'Confirme a ciência do modelo e aceite os termos para continuar.' : 'Aceite os termos acima para continuar.'}
              </p>

              <MensagemErro texto={erroEnvio} className="fundo-erro border borda-padrao rounded-xl p-4 mb-5 text-sm texto-erro" />
              <button
                id="checkout-botao-confirmar"
                type="button"
                onClick={() => void enviarContribuicao()}
                disabled={
                  enviando ||
                  envioBloqueado ||
                  !aceitouTermos ||
                  !cienciaOk ||
                  !valorValido ||
                  auth.aceitePendente ||
                  !campanhaAtiva
                }
                aria-describedby="checkout-aceite-ajuda"
                className="w-full bg-dark hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-bolt texto-aviso" aria-hidden="true" />
                {enviando ? 'Solicitando cobrança…' : 'Gerar cobrança PIX'}
              </button>
            </div>

            <p className="texto-fraco text-sm font-bold flex items-center justify-center gap-2 py-2">
              <i className="fa-solid fa-lock" aria-hidden="true" /> Pagamento seguro, confirmado automaticamente
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
