import { useEffect, useState } from 'react';
import { BadgeStatusContribuicao } from '../../components/crud/badge-status-contribuicao';
import { BarraProgresso } from '../../components/crud/barra-progresso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { emBreve } from '../../services/12-campanha/constants/status-campanha.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { formatarDataHora, formatarMoeda } from '../../services/constant/util/formatacao.util';
import { TIPO_CHAVE_PIX, type TipoChavePix } from '../../services/constant/type/enums-do-banco.gerado';
import { ROTULO_TIPO_CHAVE_PIX } from '../../services/30-conta-recebimento/constants/conta-recebimento.constants';
import { bancadaPagamentoApi, type ContribuicaoBancada, type ContribuicaoCriada } from '../servicos/api/bancada-pagamento.api';
import type { StatusContribuicao } from '../../services/constant/type/enums-do-banco.gerado';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

type Chamar = <T>(caminho: string, opcoes?: RequestInit) => Promise<T>;
type MeioContribuicao = 'pix' | 'cartao_credito' | 'boleto';

// Campanha que aceita apoio agora: publicada, já começou e o prazo não acabou.
function aceitaApoio(campanha: CampanhaResponse): boolean {
  return campanha.status === 'ativo' && !emBreve(campanha) && (campanha.dataFim === null || new Date(campanha.dataFim) > new Date());
}

// A campanha da contribuição e a situação dela, igual no "Contribuir" (logo depois de criar) e no "Consultar" da tabela:
// título, meta, arrecadado até agora com a barra, situação e a data e hora exatas (com segundos) em que foi criada.
function SecaoCampanhaDaContribuicao({ campanha, status, criadoEm }: { campanha: CampanhaResponse; status: StatusContribuicao; criadoEm: string }) {
  return (
    <SecaoFicha titulo="Campanha">
      <CampoFicha rotulo="Campanha" largura="cheia" valor={`#${campanha.idCampanha} ${campanha.titulo}`} />
      <CampoFicha rotulo="Meta" valor={formatarMoeda(campanha.metaFinanceira)} />
      <CampoFicha
        rotulo="Arrecadado até agora"
        valor={
          <span className="block space-y-1.5">
            <span className="block">{formatarMoeda(campanha.valorBrutoArrecadado)}</span>
            <BarraProgresso valor={campanha.valorBrutoArrecadado} total={campanha.metaFinanceira} rotulo="Arrecadado em relação à meta" />
          </span>
        }
      />
      <CampoFicha
        rotulo="Situação da contribuição"
        largura="cheia"
        valor={
          <span className="flex flex-wrap items-center gap-2">
            <BadgeStatusContribuicao status={status} />
            {status === 'pendente' && <span className="texto-fraco">Entra no arrecadado quando for paga (botão Pagar da tabela).</span>}
          </span>
        }
      />
      <CampoFicha rotulo="Criada em" valor={formatarDataHora(criadoEm)} />
    </SecaoFicha>
  );
}

interface ModalGerarPixProps {
  authFetch: AuthFetch;
  chamar: Chamar;
  aoFechar: () => void;
  aoGerado: () => void;
}

// Contribuir como a conta logada, pela rota de verdade (POST /contribuicao), com Pix, cartão ou boleto. Mostra o que a
// pessoa veria: o valor, a tarifa paga por cima, e o código Pix, o link da página segura do cartão ou o boleto. Cartão e
// boleto só aparecem para campanha flexível (o banco recusa nas outras); o boleto nasce desligado (parâmetro).
export function ModalGerarPix({ authFetch, chamar, aoFechar, aoGerado }: ModalGerarPixProps) {
  const [campanhas, setCampanhas] = useState<CampanhaResponse[] | null>(null);
  const [idCampanha, setIdCampanha] = useState('');
  const [valor, setValor] = useState('100');
  const [meio, setMeio] = useState<MeioContribuicao>('pix');
  const [gerada, setGerada] = useState<ContribuicaoCriada | null>(null);
  const campanhaEscolhida = campanhas?.find((campanha) => campanha.idCampanha === Number(idCampanha));
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);

  useEffect(() => {
    campanhaApi
      .listar(authFetch)
      .then((todas) => setCampanhas(todas.filter(aceitaApoio)))
      .catch(reportarErro);
  }, [authFetch, reportarErro]);

  const gerar = () =>
    executar(async () => {
      setGerada(await bancadaPagamentoApi.contribuir(chamar, Number(idCampanha), Number(valor), meio));
      aoGerado();
    });

  const copiar = async (texto: string, oQue = 'Código Pix') => {
    await navigator.clipboard.writeText(texto);
    mostrar(`${oQue} copiado.`);
  };

  return (
    <ModalFicha
      titulo={gerada ? `Contribuição #${gerada.idContribuicao}` : 'Contribuir'}
      ajuda="Contribui como a conta logada, pela rota de verdade. A tarifa do provedor é paga por quem apoia, por cima do valor. Cartão: só em campanha flexível, na faixa de valor definida em Parâmetros. Boleto: só em campanha flexível e desligado até ser ligado em Parâmetros (boleto_habilitado)."
      aoFechar={aoFechar}
      erro={erro}
      carregando={campanhas === null}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          rotuloCancelar={gerada ? 'Fechar' : 'Cancelar'}
          acao={gerada ? undefined : { rotulo: 'Contribuir', ocupado, aoClicar: () => void gerar() }}
        />
      }
    >
      {gerada ? (
        <>
          {campanhaEscolhida && <SecaoCampanhaDaContribuicao campanha={campanhaEscolhida} status={gerada.status} criadoEm={gerada.criadoEm} />}
          <SecaoFicha titulo="O que a pessoa paga">
            <CampoFicha rotulo="Contribuição" valor={formatarMoeda(gerada.valor)} />
            <CampoFicha rotulo="Tarifa do provedor" valor={formatarMoeda(gerada.taxaPagamento)} />
            <CampoFicha rotulo="Total cobrado" valor={formatarMoeda(gerada.valorCobrado)} />
            {gerada.pix && (
              <CampoFicha
                rotulo="Pix copia e cola"
                largura="cheia"
                valor={
                  <span className="flex items-start gap-2">
                    <code className="break-all">{gerada.pix.copiaECola}</code>
                    <button type="button" className="btn btn-secondary btn-pequeno shrink-0" onClick={() => void copiar(gerada.pix?.copiaECola ?? '')}>
                      <i className="fa-solid fa-copy" aria-hidden="true"></i> Copiar
                    </button>
                  </span>
                }
              />
            )}
            {gerada.cartao && (
              <CampoFicha
                rotulo="Página segura de pagamento"
                largura="cheia"
                valor={
                  <a href={gerada.cartao.linkPagamento} target="_blank" rel="noreferrer" className="btn btn-secondary btn-pequeno">
                    <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Abrir e pagar com cartão
                  </a>
                }
              />
            )}
            {gerada.boleto && (
              <>
                <CampoFicha
                  rotulo="Linha digitável"
                  largura="cheia"
                  valor={
                    <span className="flex items-start gap-2">
                      <code className="break-all">{gerada.boleto.linhaDigitavel}</code>
                      <button
                        type="button"
                        className="btn btn-secondary btn-pequeno shrink-0"
                        onClick={() => void copiar(gerada.boleto?.linhaDigitavel ?? '', 'Linha digitável')}
                      >
                        <i className="fa-solid fa-copy" aria-hidden="true"></i> Copiar
                      </button>
                    </span>
                  }
                />
                <CampoFicha rotulo="Vence em" valor={new Date(gerada.boleto.venceEm).toLocaleDateString('pt-BR')} />
                <CampoFicha
                  rotulo="Boleto"
                  valor={
                    <a href={gerada.boleto.link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-pequeno">
                      <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Abrir o boleto
                    </a>
                  }
                />
              </>
            )}
          </SecaoFicha>
        </>
      ) : (
        <SecaoFicha titulo="Contribuição" colunas={1}>
          <Campo rotulo="Campanha" dica={campanhas?.length === 0 ? 'Nenhuma campanha recebendo apoio agora.' : undefined}>
            {({ atributos, classeErro }) => (
              <select {...atributos} value={idCampanha} onChange={(evento) => setIdCampanha(evento.target.value)} className={'input-padrao' + classeErro}>
                <option value="">Escolha a campanha</option>
                {campanhas?.filter((campanha) => meio === 'pix' || campanha.modelo === 'flexivel').map((campanha) => (
                  <option key={campanha.idCampanha} value={campanha.idCampanha}>
                    #{campanha.idCampanha} {campanha.titulo}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Meio de pagamento">
            {({ atributos, classeErro }) => (
              <select {...atributos} value={meio} onChange={(evento) => setMeio(evento.target.value as MeioContribuicao)} className={'input-padrao' + classeErro}>
                <option value="pix">Pix</option>
                <option value="cartao_credito">Cartão de crédito (só campanha flexível)</option>
                <option value="boleto">Boleto (só campanha flexível)</option>
              </select>
            )}
          </Campo>
          <Campo rotulo="Valor (R$)">
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(evento) => setValor(evento.target.value)}
                className={'input-padrao' + classeErro}
              />
            )}
          </Campo>
        </SecaoFicha>
      )}
    </ModalFicha>
  );
}

interface ModalChavePixProps {
  chamar: Chamar;
  aoFechar: () => void;
  aoCadastrada: () => void;
}

// Chave Pix de recebimento da conta logada (o pesquisador dono da campanha), pela rota de verdade. A bancada registra a
// chave no "diretório Pix" do provedor de teste com o CPF do perfil, para a titularidade ser confirmada.
export function ModalChavePix({ chamar, aoFechar, aoCadastrada }: ModalChavePixProps) {
  const [tipoChave, setTipoChave] = useState<TipoChavePix>('email');
  const [chave, setChave] = useState('');
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);

  const cadastrar = () =>
    executar(async () => {
      const cadastrada = await bancadaPagamentoApi.cadastrarChavePix(chamar, tipoChave, chave);
      mostrar(
        'Chave Pix cadastrada.',
        cadastrada ? `${cadastrada.chaveMascarada}, ${cadastrada.titularidadeVerificada ? 'titularidade confirmada' : 'titularidade não confirmada'}.` : undefined,
      );
      aoCadastrada();
      aoFechar();
    });

  return (
    <ModalFicha
      titulo="Minha chave Pix de teste"
      ajuda="Só para pesquisador: entre como o dono da campanha (Entrar como) antes. Sem chave confirmada, o repasse fica esperando."
      aoFechar={aoFechar}
      erro={erro}
      rodape={<RodapeAcoes aoCancelar={aoFechar} acao={{ rotulo: 'Cadastrar', ocupado, aoClicar: () => void cadastrar() }} />}
    >
      <SecaoFicha titulo="Chave" colunas={1}>
        <Campo rotulo="Tipo">
          {({ atributos, classeErro }) => (
            <select {...atributos} value={tipoChave} onChange={(evento) => setTipoChave(evento.target.value as TipoChavePix)} className={'input-padrao' + classeErro}>
              {TIPO_CHAVE_PIX.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ROTULO_TIPO_CHAVE_PIX[tipo]}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo rotulo="Chave">
          {({ atributos, classeErro }) => (
            <input {...atributos} value={chave} onChange={(evento) => setChave(evento.target.value)} className={'input-padrao' + classeErro} />
          )}
        </Campo>
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalConsultarContribuicaoProps {
  authFetch: AuthFetch;
  contribuicao: ContribuicaoBancada;
  rotuloMeio: string;
  aoFechar: () => void;
}

// Consultar uma contribuição da tabela da T5: a mesma ficha do "Contribuir", com a campanha lida de novo (arrecadado e
// meta de agora). O código Pix, o link do cartão e o boleto só aparecem no momento de contribuir: a bancada não os guarda.
export function ModalConsultarContribuicao({ authFetch, contribuicao, rotuloMeio, aoFechar }: ModalConsultarContribuicaoProps) {
  const [campanha, setCampanha] = useState<CampanhaResponse | null>(null);
  const { erro, reportarErro } = useErroToast({ mostraTexto: true });

  useEffect(() => {
    campanhaApi.buscar(authFetch, String(contribuicao.idCampanha)).then(setCampanha).catch(reportarErro);
  }, [authFetch, contribuicao.idCampanha, reportarErro]);

  return (
    <ModalFicha
      titulo={`Contribuição #${contribuicao.idContribuicao}`}
      aoFechar={aoFechar}
      erro={erro}
      carregando={campanha === null && !erro}
      rodape={<RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />}
    >
      {campanha && <SecaoCampanhaDaContribuicao campanha={campanha} status={contribuicao.status} criadoEm={contribuicao.criadoEm} />}
      <SecaoFicha titulo="O que a pessoa paga">
        <CampoFicha rotulo="Contribuição" valor={formatarMoeda(contribuicao.valor)} />
        <CampoFicha rotulo="Tarifa do provedor" valor={formatarMoeda(contribuicao.taxaPagamento)} />
        <CampoFicha rotulo="Total cobrado" valor={formatarMoeda(contribuicao.valor + contribuicao.taxaPagamento)} />
        <CampoFicha rotulo="Meio de pagamento" valor={rotuloMeio} />
        <CampoFicha rotulo="Repasse" valor={contribuicao.idRepasse === null ? 'Ainda não' : `#${contribuicao.idRepasse}`} />
      </SecaoFicha>
    </ModalFicha>
  );
}
