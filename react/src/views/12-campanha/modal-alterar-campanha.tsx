import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { ROTULO_STATUS_CAMPANHA } from '../../services/12-campanha/constants/status-campanha.constants';
import { duracaoEmDias } from '../../services/12-campanha/util/prazo-campanha.util';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { formatarData, formatarDataHora, formatarMoeda } from '../../services/constant/utils/formatacao.util';
import { PainelOrcamentoCronograma } from './painel-orcamento-cronograma';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type {
  CampanhaRequestUpdate,
  CampanhaResponse,
  HistoricoRejeicaoResponse,
} from '../../services/12-campanha/type/campanha.type';
import type { AreaConhecimentoResponse } from '../../services/8-area-conhecimento/type/area-conhecimento.type';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../services/14-marco-cronograma/type/marco-cronograma.type';

// O que o Campo de Testes (T2) encaixa abaixo do orçamento/cronograma: checklist e Aprovar/Rejeitar, com as
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
  // Motivo para a campanha inteira ficar só leitura (as 10 de demonstração, no Campo de Testes).
  motivoBloqueio?: string;
  secaoAdmin?: (contexto: ContextoAdminCampanha) => ReactNode;
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
  dataInicio: campanha.dataInicio ? campanha.dataInicio.slice(0, 10) : '',
  dataFim: campanha.dataFim ? campanha.dataFim.slice(0, 10) : '',
  videoApresentacaoUrl: campanha.videoApresentacaoUrl ?? '',
});

// Alterar campanha (dono, ou o admin pelo Campo de Testes). Os campos que o banco trava agora
// (fn_campanha_campos_bloqueados, via GET /campanha/:id) ficam desabilitados, com o aviso de quais são: a tela
// desabilita exatamente o que o banco recusaria, sem lista própria.
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
  aoMudar,
  aoFechar,
}: ModalAlterarCampanhaProps) {
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const prefixoId = useId();
  const idCampo = (nome: string) => `${prefixoId}-${nome}`;
  const [campanha, setCampanha] = useState<CampanhaResponse | null>(null);
  const [form, setForm] = useState<FormCampanha | null>(null);
  const [areas, setAreas] = useState<AreaConhecimentoResponse[]>([]);
  const [historico, setHistorico] = useState<HistoricoRejeicaoResponse[]>([]);
  const [orcamento, setOrcamento] = useState<OrcamentoCampanhaResponse[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronogramaResponse[]>([]);
  const [ofertaDatas, setOfertaDatas] = useState(false);
  const [trabalhando, setTrabalhando] = useState(false);

  useEffect(() => {
    campanhaApi
      .buscar(auth.authFetch, idCampanha)
      .then((dados) => {
        setCampanha(dados);
        setForm(paraForm(dados));
        if (dados.status === 'rejeitado') {
          campanhaApi.listarHistoricoRejeicao(auth.authFetch, idCampanha).then(setHistorico).catch(reportarErro);
        }
      })
      .catch(reportarErro);
    areaConhecimentoApi
      .listar(auth.authFetch)
      .then((lista) => setAreas(lista.filter((area) => area.idPai !== null)))
      .catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCampanha]);

  const rejeitadaSomenteLeitura = campanha?.status === 'rejeitado' && campanha.somenteLeitura;
  const edicaoTravada = Boolean(motivoBloqueio) || rejeitadaSomenteLeitura;
  const camposBloqueados = new Set(campanha?.camposBloqueados ?? []);
  const travado = (campo: string) => edicaoTravada || camposBloqueados.has(campo);
  const idAvisoBloqueio = idCampo('aviso-bloqueio');
  const descreveBloqueio = (campo: string) => (camposBloqueados.has(campo) ? idAvisoBloqueio : undefined);
  const podeEditarItens = !edicaoTravada && campanha !== null && STATUS_EDITAVEIS.has(campanha.status);
  const podeEnviar = !edicaoTravada && (campanha?.status === 'rascunho' || campanha?.status === 'rejeitado');
  const duracao = form ? duracaoEmDias(form.dataInicio, form.dataFim) : null;

  const corpo = (dados: FormCampanha): CampanhaRequestUpdate => ({
    titulo: dados.titulo.trim(),
    idAreaConhecimento: Number(dados.idAreaConhecimento),
    metaFinanceira: Number(dados.metaFinanceira),
    ...(dados.descricao.trim() ? { descricao: dados.descricao.trim() } : {}),
    ...(dados.dataInicio ? { dataInicio: new Date(dados.dataInicio).toISOString() } : {}),
    ...(dados.dataFim ? { dataFim: new Date(dados.dataFim).toISOString() } : {}),
    ...(dados.videoApresentacaoUrl.trim() ? { videoApresentacaoUrl: dados.videoApresentacaoUrl.trim() } : {}),
  });

  const salvar = async () => {
    if (!form || !form.titulo.trim()) return;
    setTrabalhando(true);
    try {
      await campanhaApi.atualizar(auth.authFetch, idCampanha, corpo(form));
      mostrar('Campanha alterada com sucesso.', `ID: ${idCampanha} foi alterada`);
      aoMudar();
      aoFechar();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setTrabalhando(false);
    }
  };

  const enviar = async (comDatasAtualizadas = false) => {
    if (!form) return;
    const prazoVencido = Boolean(form.dataFim) && new Date(form.dataFim) <= new Date();
    if (!comDatasAtualizadas && prazoVencido) {
      setOfertaDatas(true);
      return;
    }
    setTrabalhando(true);
    try {
      await campanhaApi.atualizar(auth.authFetch, idCampanha, corpo(form));
      if (comDatasAtualizadas) {
        await campanhaApi.deslizarDatas(auth.authFetch, idCampanha, new Date().toISOString());
      }
      await campanhaApi.enviar(auth.authFetch, idCampanha);
      mostrar('Campanha enviada para aprovação.', `ID: ${idCampanha}`);
      aoMudar();
      aoFechar();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setTrabalhando(false);
    }
  };

  const campoTexto = (campo: keyof FormCampanha, rotulo: string, largura = 'sm:col-span-2', tipo = 'text') =>
    form && (
      <div className={largura}>
        <label htmlFor={idCampo(campo)} className="rotulo-campo">{rotulo}</label>
        <input
          id={idCampo(campo)}
          type={tipo}
          value={form[campo]}
          onChange={(evento) => setForm({ ...form, [campo]: evento.target.value })}
          className="input-padrao"
          disabled={travado(campo)}
          aria-describedby={descreveBloqueio(campo)}
        />
      </div>
    );

  return (
    <ModalFicha
      carregando={!campanha || !form}
      titulo={campanha?.titulo ?? ''}
      subtitulo={subtitulo}
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-3 max-w-xl ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            {edicaoTravada ? 'Fechar' : 'Cancelar'}
          </button>
          {!edicaoTravada && (
            <button type="button" onClick={salvar} disabled={trabalhando} className="btn btn-primary flex-1">
              Salvar
            </button>
          )}
          {podeEnviar && (
            <button type="button" onClick={() => enviar()} disabled={trabalhando} className="btn btn-primary flex-1">
              {trabalhando ? 'Enviando...' : campanha.status === 'rejeitado' ? 'Corrigir e reenviar' : 'Enviar para aprovação'}
            </button>
          )}
        </div>
      }
    >
      {campanha && form && (
        <>
          {motivoBloqueio && (
            <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
              <p className="font-bold mb-1">
                <i className="fa-solid fa-lock mr-1"></i> Não dá pra alterar esta campanha
              </p>
              <p>{motivoBloqueio}</p>
            </div>
          )}

          {campanha.status === 'rejeitado' && (
            <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro space-y-3">
              <p className="font-bold">
                <i className="fa-solid fa-circle-exclamation mr-1"></i> Campanha rejeitada
              </p>
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
                    <li key={item.idRejeicao} className={indice === 0 ? 'font-semibold' : ''}>
                      {formatarDataHora(item.rejeitadoEm)}
                      {item.nomeAdmin ? ` por ${item.nomeAdmin}` : ''}: {item.justificativa ?? 'Sem justificativa.'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {ofertaDatas && (
            <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso space-y-3">
              <p className="font-bold">
                <i className="fa-solid fa-calendar-xmark mr-1"></i> As datas desta campanha já venceram
              </p>
              <p>
                O prazo terminou em {formatarData(new Date(form.dataFim).toISOString())}, e uma campanha com prazo vencido não
                pode ser enviada para aprovação. Você pode começar agora mantendo a mesma duração
                {duracao !== null && duracao > 0 ? ` de ${duracao} dias` : ''}, ou escolher outras datas mais abaixo.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" disabled={trabalhando} onClick={() => enviar(true)}>
                  {trabalhando ? 'Enviando...' : 'Começar agora, mantendo a duração'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setOfertaDatas(false)}>
                  Escolher outras datas
                </button>
              </div>
            </div>
          )}

          {camposBloqueados.size > 0 && !rejeitadaSomenteLeitura && (
            <div id={idAvisoBloqueio} className="rounded-lg border borda-forte fundo-info p-4 text-sm texto-info">
              <p className="font-bold">
                <i className="fa-solid fa-lock mr-1"></i> Campos travados
              </p>
              <p>
                Depois da aprovação estes campos não mudam, para proteger quem já contribuiu:{' '}
                {[...camposBloqueados].map((campo) => ROTULO_CAMPO_BLOQUEADO[campo] ?? campo).join(', ')}.
              </p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <SecaoFicha titulo="Dados">
                {campoTexto('titulo', 'Título')}
                <div>
                  <label htmlFor={idCampo('idAreaConhecimento')} className="rotulo-campo">Área do conhecimento</label>
                  <select
                    id={idCampo('idAreaConhecimento')}
                    value={form.idAreaConhecimento}
                    onChange={(evento) => setForm({ ...form, idAreaConhecimento: evento.target.value })}
                    className="input-padrao"
                    disabled={travado('idAreaConhecimento')}
                    aria-describedby={descreveBloqueio('idAreaConhecimento')}
                  >
                    {areas.map((area) => (
                      <option key={area.idAreaConhecimento} value={area.idAreaConhecimento}>
                        {area.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={idCampo('descricao')} className="rotulo-campo">Descrição</label>
                  <textarea
                    id={idCampo('descricao')}
                    rows={3}
                    value={form.descricao}
                    onChange={(evento) => setForm({ ...form, descricao: evento.target.value })}
                    className="input-padrao"
                    disabled={travado('descricao')}
                    aria-describedby={descreveBloqueio('descricao')}
                  />
                </div>
                {campoTexto('videoApresentacaoUrl', 'URL do vídeo de apresentação', 'sm:col-span-2', 'url')}
              </SecaoFicha>

              <div className="border-t borda-padrao"></div>
              <PainelOrcamentoCronograma
                auth={auth}
                idCampanha={idCampanha}
                podeEditar={podeEditarItens}
                aoCarregar={(itens, marcos) => {
                  setOrcamento(itens);
                  setCronograma(marcos);
                }}
              />

              {secaoAdmin?.({ campanha, orcamento, cronograma })}

              <div className="border-t borda-padrao"></div>
              <SecaoFicha titulo="Datas">
                {campoTexto('dataInicio', 'Início', '', 'date')}
                {campoTexto('dataFim', 'Fim (previsto)', '', 'date')}
              </SecaoFicha>
            </div>

            <div className="space-y-6">
              <SecaoFicha titulo="Financeiro">
                {campoTexto('metaFinanceira', 'Meta (R$)', 'sm:col-span-2', 'number')}
                <CampoSomenteLeitura rotulo="Arrecadado" valor={formatarMoeda(campanha.valorBrutoArrecadado)} />
                <CampoSomenteLeitura
                  rotulo="Taxa da plataforma"
                  valor={campanha.taxaPlataforma === null ? 'Ainda não carimbada' : `${campanha.taxaPlataforma}%`}
                />
              </SecaoFicha>

              <SecaoFicha titulo="Metadados" colunas={1}>
                <CampoSomenteLeitura rotulo="id" valor={campanha.idCampanha} />
                <CampoSomenteLeitura rotulo="Status" valor={ROTULO_STATUS_CAMPANHA[campanha.status]} />
              </SecaoFicha>
            </div>
          </div>
        </>
      )}
    </ModalFicha>
  );
}
