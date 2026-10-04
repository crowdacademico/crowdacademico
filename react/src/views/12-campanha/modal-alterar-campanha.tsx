import { useId, useState } from 'react';
import { BadgeStatusCampanha } from '../../components/crud/badge-status-campanha';
import { ROTULO_MODELO_CAMPANHA, STATUS_ACEITA_ATUALIZACAO, STATUS_PUBLICADA } from '../../services/12-campanha/constants/status-campanha.constants';
import type { ReactNode } from 'react';
import { BarraProgresso } from '../../components/crud/barra-progresso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { FiltroPartes } from '../../components/crud/filtro-partes';
import type { ParteTela } from '../../components/crud/filtro-partes';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Campo } from '../../components/input/campo';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';

import { useRegrasCampanha } from '../../services/12-campanha/hook/use-regras-campanha';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { dataLocal, duracaoEmDias, fimDoDia, inicioDoDia } from '../../services/12-campanha/util/prazo-campanha.util';
import { useAreasDaCampanha } from '../../services/8-area-conhecimento/hook/use-areas-da-campanha';
import { formatarData, formatarDataHora, formatarMoeda } from '../../services/constant/util/formatacao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { PainelOrcamentoCronograma } from './painel-orcamento-cronograma';
import { SecaoAtualizacoesCampanha } from './secao-atualizacoes-campanha';
import { SecaoComentariosRecebidos } from './secao-comentarios-recebidos';
import { SecaoEncerramentoAntecipado } from '../20-solicitacao-encerramento/secao-encerramento-antecipado';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type {
  CampanhaRequestUpdate,
  CampanhaResponse,
  HistoricoRejeicaoResponse,
} from '../../services/12-campanha/type/campanha.type';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../services/14-marco-cronograma/type/marco-cronograma.type';

// O que a Bancada da Campanha encaixa abaixo do orçamento/cronograma: checklist e Aprovar/Rejeitar, com as
// contagens já carregadas pelo painel.
export interface ContextoAdminCampanha {
  campanha: CampanhaResponse;
  orcamento: OrcamentoCampanhaResponse[];
  cronograma: MarcoCronogramaResponse[];
}

interface ModalAlterarCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  subtitulo?: string;
  // Motivo para a campanha inteira ficar só leitura (as de demonstração do seed, na Bancada da Campanha).
  motivoBloqueio?: string;
  secaoAdmin?: (contexto: ContextoAdminCampanha) => ReactNode;
  // Aberto pelo dono (Minhas Campanhas): com a campanha já publicada, mostra as atualizações (publicar e ocultar) e
  // os comentários recebidos (endossar e excluir).
  ehDono?: boolean;
  aoMudar: () => void;
  aoFechar: () => void;
}

interface FormCampanha {
  titulo: string;
  idAreaConhecimento: string;
  metaFinanceira: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  videoApresentacaoUrl: string;
}

const ROTULO_CAMPO_BLOQUEADO: Record<string, string> = {
  titulo: 'Título',
  descricao: 'Descrição',
  metaFinanceira: 'Meta',
  modelo: 'Modelo de financiamento',
  taxaPlataforma: 'Taxa da plataforma',
  idAreaConhecimento: 'Área do conhecimento',
  videoApresentacaoUrl: 'Vídeo de apresentação',
  dataInicio: 'Início',
  dataFim: 'Fim',
};

// Orçamento e cronograma continuam editáveis enquanto a campanha não foi aprovada: o congelamento (fn_congela_*,
// 05) só começa em 'ativo', e por isso a completude é conferida de novo na aprovação, não só no envio.
const STATUS_EDITAVEIS = new Set(['rascunho', 'aguardando_aprovacao', 'rejeitado']);

const paraForm = (campanha: CampanhaResponse): FormCampanha => ({
  titulo: campanha.titulo,
  idAreaConhecimento: String(campanha.idAreaConhecimento),
  metaFinanceira: String(campanha.metaFinanceira),
  descricao: campanha.descricao ?? '',
  dataInicio: campanha.dataInicio ? dataLocal(campanha.dataInicio) : '',
  dataFim: campanha.dataFim ? dataLocal(campanha.dataFim) : '',
  videoApresentacaoUrl: campanha.videoApresentacaoUrl ?? '',
});

// Alterar campanha (dono, ou o admin pela Bancada da Campanha). Os campos que o banco trava agora
// (fn_campanha_campos_bloqueados, via GET /campanha/:id) aparecem como texto de leitura, não como campo
// desabilitado, com uma linha discreta dizendo quais são: a tela trava exatamente o que o banco recusaria, sem
// lista própria. Orçamento e cronograma aparecem juntos, um embaixo do outro, e a coluna da direita é o resumo.
//
// Rejeitada: o histórico de rejeições vem no topo (é o que o pesquisador precisa ler para corrigir), junto com
// os reenvios restantes e o prazo. Esgotados os reenvios, fica só leitura.
//
// "Enviar para aprovação" (rascunho) e "Corrigir e reenviar" (rejeitada) gravam o formulário ANTES de enviar,
// senão uma alteração não salva se perderia em silêncio. Sem checagem de completude no front (o banco cobra e
// o erro chega traduzido), com uma exceção: prazo vencido. Aí a tela oferece começar agora mantendo a duração,
// sempre com confirmação explícita, nunca em silêncio (a data de início é o que o pesquisador divulga).
export function ModalAlterarCampanha({
  auth,
  idCampanha,
  subtitulo,
  motivoBloqueio,
  secaoAdmin,
  ehDono = false,
  aoMudar,
  aoFechar,
}: ModalAlterarCampanhaProps) {
  const { mostrar } = useToast();
  const errosDaTela = useErroToast();
  const { reportarErro } = errosDaTela;
  const { ocupado: trabalhando, executar: executarTrabalhando } = useEnvio(reportarErro);
  const idAvisoBloqueio = useId();
  const [form, setForm] = useState<FormCampanha | null>(null);
  const areas = useAreasDaCampanha(auth.authFetch);
  const [orcamento, setOrcamento] = useState<OrcamentoCampanhaResponse[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronogramaResponse[]>([]);
  const [ofertaDatas, setOfertaDatas] = useState(false);
  const regras = useRegrasCampanha();
  // Filtro com cara de aba (o mesmo do Consultar): as partes escondidas não são desmontadas, então nada do que está
  // sendo editado se perde ao trocar. Avisos do topo e a decisão da Bancada aparecem em todas as partes.
  const [parte, setParte] = useState<ParteAlterar>('geral');
  const ve = (alvo: ParteAlterar) => (parte === 'geral' || parte === alvo ? '' : ' hidden');
  const comResumo = parte === 'geral' || parte === 'dados';

  // Campanha rejeitada traz junto o histórico de rejeições (o motivo aparece no topo do modal).
  const { dado } = useBuscar(
    async () => {
      const campanhaBuscada = await campanhaApi.buscar(auth.authFetch, idCampanha);
      const historicoBuscado: HistoricoRejeicaoResponse[] =
        campanhaBuscada.status === 'rejeitado'
          ? await campanhaApi.listarHistoricoRejeicao(auth.authFetch, idCampanha).catch((erroHistorico: unknown) => {
              reportarErro(erroHistorico);
              return [];
            })
          : [];
      return { campanha: campanhaBuscada, historico: historicoBuscado };
    },
    [idCampanha],
    { aoChegar: ({ campanha: dados }) => setForm(paraForm(dados)), erros: errosDaTela },
  );
  const campanha: CampanhaResponse | null = dado?.campanha ?? null;
  const historico = dado?.historico ?? [];

  const rejeitadaSomenteLeitura = campanha?.status === 'rejeitado' && campanha.somenteLeitura;
  const edicaoTravada = Boolean(motivoBloqueio) || rejeitadaSomenteLeitura;
  const camposBloqueados = new Set(campanha?.camposBloqueados ?? []);
  const travado = (campo: string) => edicaoTravada || camposBloqueados.has(campo);
  const descreveBloqueio = (campo: string) => (camposBloqueados.has(campo) ? idAvisoBloqueio : undefined);
  const podeEditarItens = !edicaoTravada && campanha !== null && STATUS_EDITAVEIS.has(campanha.status);
  const podeEnviar = !edicaoTravada && (campanha?.status === 'rascunho' || campanha?.status === 'rejeitado');
  const duracao = form ? duracaoEmDias(form.dataInicio, form.dataFim) : null;

  const corpo = (dados: FormCampanha): CampanhaRequestUpdate => ({
    titulo: dados.titulo.trim(),
    idAreaConhecimento: Number(dados.idAreaConhecimento),
    metaFinanceira: Number(dados.metaFinanceira),
    ...(dados.descricao.trim() ? { descricao: dados.descricao.trim() } : {}),
    ...(dados.dataInicio ? { dataInicio: inicioDoDia(dados.dataInicio) } : {}),
    ...(dados.dataFim ? { dataFim: fimDoDia(dados.dataFim) } : {}),
    ...(dados.videoApresentacaoUrl.trim() ? { videoApresentacaoUrl: dados.videoApresentacaoUrl.trim() } : {}),
  });

  const salvar = async () => {
    if (!form || !form.titulo.trim()) return;
    await executarTrabalhando(async () => {
      await campanhaApi.atualizar(auth.authFetch, idCampanha, corpo(form));
      mostrar('Campanha alterada com sucesso.', `ID: ${idCampanha} foi alterada`);
      aoMudar();
      aoFechar();
    });
  };

  const enviar = async (comDatasAtualizadas = false) => {
    if (!form) return;
    const prazoVencido = Boolean(form.dataFim) && new Date(fimDoDia(form.dataFim)) <= new Date();
    if (!comDatasAtualizadas && prazoVencido) {
      setOfertaDatas(true);
      return;
    }
    await executarTrabalhando(async () => {
      await campanhaApi.atualizar(auth.authFetch, idCampanha, corpo(form));
      if (comDatasAtualizadas) {
        await campanhaApi.deslizarDatas(auth.authFetch, idCampanha, new Date().toISOString());
      }
      await campanhaApi.enviar(auth.authFetch, idCampanha);
      mostrar('Campanha enviada para aprovação.', `ID: ${idCampanha}`);
      aoMudar();
      aoFechar();
    });
  };

  const campoTexto = (campo: keyof FormCampanha, rotulo: string, largura = 'sm:col-span-2', tipo = 'text') =>
    form &&
    (travado(campo) ? (
      <CampoFicha
        rotulo={rotulo}
        valor={tipo === 'date' ? formatarData(`${form[campo]}T12:00:00`) : tipo === 'number' ? formatarMoeda(form[campo]) : form[campo]}
        largura={largura ? 'cheia' : undefined}
      />
    ) : (
      <Campo rotulo={rotulo} className={largura}>
        {({ atributos }) => (
          <input
            {...atributos}
            type={tipo}
            value={form[campo]}
            onChange={(evento) => setForm({ ...form, [campo]: evento.target.value })}
            className="input-padrao"
            disabled={travado(campo)}
            aria-describedby={descreveBloqueio(campo)}
          />
        )}
      </Campo>
    ));

  return (
    <ModalFicha
      carregando={!campanha || !form}
      titulo={campanha?.titulo ?? ''}
      subtitulo={subtitulo}
      badges={
        campanha
          ? [
              <BadgeStatusCampanha key="status" campanha={campanha} />,
              <span key="modelo" className="badge badge-neutro">
                {ROTULO_MODELO_CAMPANHA[campanha.modelo]}
              </span>,
            ]
          : undefined
      }
      aoFechar={aoFechar}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          rotuloCancelar={edicaoTravada ? 'Fechar' : 'Cancelar'}
          acao={[
            ...(edicaoTravada ? [] : [{ rotulo: 'Salvar', ocupado: trabalhando, aoClicar: () => void salvar() }]),
            ...(podeEnviar
              ? [
                  {
                    rotulo: campanha.status === 'rejeitado' ? 'Corrigir e reenviar' : 'Enviar para aprovação',
                    rotuloOcupado: 'Enviando...',
                    ocupado: trabalhando,
                    aoClicar: () => void enviar(),
                  },
                ]
              : []),
          ]}
        />
      }
    >
      {campanha && form && (
        <>
          <FiltroPartes
            partes={[
              { chave: 'geral', rotulo: 'Geral' },
              { chave: 'dados', rotulo: 'Dados' },
              { chave: 'orcamento', rotulo: 'Orçamento e cronograma' },
              ...(ehDono && STATUS_PUBLICADA.has(campanha.status)
                ? [
                    { chave: 'atualizacoes' as const, rotulo: 'Atualizações' },
                    { chave: 'comentarios' as const, rotulo: 'Comentários' },
                  ]
                : []),
              ...(ehDono && campanha.status === 'ativo' ? [{ chave: 'encerramento' as const, rotulo: 'Encerramento' }] : []),
            ] satisfies ParteTela<ParteAlterar>[]}
            atual={parte}
            aoEscolher={setParte}
          />

          {motivoBloqueio && (
            <CaixaAviso titulo="Não dá pra alterar esta campanha" tom="erro" icone="fa-lock">
              <p>{motivoBloqueio}</p>
            </CaixaAviso>
          )}

          {campanha.status === 'rejeitado' && (
            <CaixaAviso titulo="Campanha rejeitada" tom="erro" icone="fa-circle-exclamation" espacado>
              {campanha.somenteLeitura ? (
                <p>
                  Esta campanha usou todos os reenvios permitidos e agora é somente leitura.
                  {campanha.prazoReenvioAte && <> Ela será excluída em {formatarData(campanha.prazoReenvioAte)}.</>}
                </p>
              ) : (
                <p>
                  Reenvios restantes: <strong>{campanha.reenviosRestantes}</strong>.
                  {campanha.prazoReenvioAte && (
                    <> Prazo para reenviar: até <strong>{formatarData(campanha.prazoReenvioAte)}</strong>.</>
                  )}
                </p>
              )}
              {historico.length > 0 && (
                <ul className="space-y-2">
                  {historico.map((item, indice) => (
                    <li key={item.idRejeicao} className={indice === 0 ? 'enfase' : ''}>
                      {formatarDataHora(item.rejeitadoEm)}
                      {item.nomeAdmin ? ` por ${item.nomeAdmin}` : ''}: {item.justificativa ?? 'Sem justificativa.'}
                    </li>
                  ))}
                </ul>
              )}
            </CaixaAviso>
          )}

          {ofertaDatas && (
            <CaixaAviso titulo="As datas desta campanha já venceram" icone="fa-calendar-xmark" espacado>
              <p>
                O prazo terminou em {formatarData(form.dataFim)}, e uma campanha com prazo vencido não
                pode ser enviada para aprovação. Você pode começar agora mantendo a mesma duração
                {duracao !== null && duracao > 0 ? ` de ${duracao} dias` : ''}, ou escolher outras datas em Dados.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" disabled={trabalhando} onClick={() => enviar(true)}>
                  {trabalhando ? 'Enviando...' : 'Começar agora, mantendo a duração'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => {
                    setOfertaDatas(false);
                    setParte('dados');
                  }}>
                  Escolher outras datas
                </button>
              </div>
            </CaixaAviso>
          )}

          {camposBloqueados.size > 0 && !rejeitadaSomenteLeitura && (
            <p id={idAvisoBloqueio} className={'paragrafo flex items-start gap-2 texto-fraco' + ve('dados')}>
              <i className="fa-solid fa-shield-halved mt-0.5 texto-marca" aria-hidden="true"></i>
              <span>
                <strong className="texto-forte">Campos protegidos depois da aprovação</strong>, para proteger quem já
                contribuiu: {[...camposBloqueados].map((campo) => ROTULO_CAMPO_BLOQUEADO[campo] ?? campo).join(', ')}.
              </span>
            </p>
          )}

          <div className="grade-ficha">
            <div className={(comResumo ? 'lg:col-span-2' : 'lg:col-span-3') + ' space-y-6'}>
              <div className={'space-y-6' + ve('dados')}>
                <SecaoFicha titulo="Informações da campanha">
                  {campoTexto('titulo', 'Título')}
                  {travado('idAreaConhecimento') ? (
                    <CampoFicha rotulo="Área do conhecimento" valor={areas.find((area) => String(area.idAreaConhecimento) === form.idAreaConhecimento)?.nome ?? campanha.nomeArea} />
                  ) : (
                    <Campo rotulo="Área do conhecimento">
                      {({ atributos }) => (
                        <select
                          {...atributos}
                          value={form.idAreaConhecimento}
                          onChange={(evento) => setForm({ ...form, idAreaConhecimento: evento.target.value })}
                          className="input-padrao"
                          aria-describedby={descreveBloqueio('idAreaConhecimento')}
                        >
                          {areas.map((area) => (
                            <option key={area.idAreaConhecimento} value={area.idAreaConhecimento}>
                              {area.nome}
                            </option>
                          ))}
                        </select>
                      )}
                    </Campo>
                  )}
                  {travado('descricao') ? (
                    <CampoFicha rotulo="Descrição" valor={form.descricao} largura="cheia" />
                  ) : (
                    <Campo rotulo="Descrição" className="sm:col-span-2">
                      {({ atributos }) => (
                        <>
                          <textarea
                            {...atributos}
                            rows={3}
                            value={form.descricao}
                            onChange={(evento) => setForm({ ...form, descricao: evento.target.value })}
                            className="input-padrao"
                            aria-describedby={descreveBloqueio('descricao')}
                          />
                          <ContadorCaracteres texto={form.descricao} limite={regras.limiteDescricao} />
                        </>
                      )}
                    </Campo>
                  )}
                  {campoTexto('videoApresentacaoUrl', 'Vídeo de apresentação', 'sm:col-span-2', 'url')}
                </SecaoFicha>

                <SecaoFicha titulo="Período">
                  {campoTexto('dataInicio', 'Início', '', 'date')}
                  {campoTexto('dataFim', 'Fim (previsto)', '', 'date')}
                </SecaoFicha>
              </div>

              <div className={ve('orcamento').trim()}>
                <PainelOrcamentoCronograma
                  auth={auth}
                  idCampanha={idCampanha}
                  podeEditar={podeEditarItens}
                  metaFinanceira={Number(form.metaFinanceira)}
                  dataInicioCampanha={form.dataInicio}
                  minimoMarcosCronograma={regras.minimoMarcosCronograma}
                  aoCarregar={(itens, marcos) => {
                    setOrcamento(itens);
                    setCronograma(marcos);
                  }}
                />
              </div>

              {ehDono && STATUS_PUBLICADA.has(campanha.status) && (
                <>
                  <div className={ve('atualizacoes').trim()}>
                    <SecaoAtualizacoesCampanha auth={auth} idCampanha={idCampanha} podePublicar={STATUS_ACEITA_ATUALIZACAO.has(campanha.status)} />
                  </div>
                  <div className={ve('comentarios').trim()}>
                    <SecaoComentariosRecebidos auth={auth} idCampanha={idCampanha} publicada />
                  </div>
                </>
              )}

              {ehDono && campanha.status === 'ativo' && (
                <div className={ve('encerramento').trim()}>
                  <SecaoEncerramentoAntecipado
                    authFetch={auth.authFetch}
                    idCampanha={idCampanha}
                    valorArrecadado={campanha.valorBrutoArrecadado}
                    aoEncerrada={() => {
                      aoMudar();
                      aoFechar();
                    }}
                  />
                </div>
              )}

              {secaoAdmin?.({ campanha, orcamento, cronograma })}
            </div>

            {/* Resumo: o que só se consulta aqui (arrecadado, taxa, status, id) e a meta, que só é campo enquanto a
                campanha não foi aprovada. */}
            <div className={'rounded-xl border borda-padrao fundo-sutil p-5 space-y-5' + (comResumo ? '' : ' hidden')}>
              <h3 className="titulo-bloco titulo-bloco--linha mb-0">Resumo</h3>
              <CampoFicha
                rotulo="Status"
                valor={
                  <BadgeStatusCampanha campanha={campanha} />
                }
              />
              {campoTexto('metaFinanceira', 'Meta (R$)', '', 'number')}
              <CampoFicha
                rotulo="Arrecadado"
                valor={
                  <span className="flex flex-col gap-1.5">
                    <span>{formatarMoeda(campanha.valorBrutoArrecadado)}</span>
                    <BarraProgresso
                      valor={Number(campanha.valorBrutoArrecadado)}
                      total={Number(form.metaFinanceira)}
                      rotulo="Arrecadado em relação à meta"
                    />
                  </span>
                }
              />
              <CampoFicha
                rotulo="Taxa da plataforma"
                valor={campanha.taxaPlataforma === null ? 'Definida na aprovação' : `${campanha.taxaPlataforma}%`}
              />
              <CampoFicha rotulo="id" valor={campanha.idCampanha} />
            </div>
          </div>
        </>
      )}
    </ModalFicha>
  );
}

type ParteAlterar = 'geral' | 'dados' | 'orcamento' | 'atualizacoes' | 'comentarios' | 'encerramento';
