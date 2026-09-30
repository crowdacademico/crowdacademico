import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { IndicadorEtapas } from '../../components/crud/indicador-etapas';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { useRegrasCampanha } from '../../services/12-campanha/hook/use-regras-campanha';
import { dataLocal, duracaoEmDias, fimDoDia, hojeISO, inicioDoDia } from '../../services/12-campanha/util/prazo-campanha.util';
import { useAreasDaCampanha } from '../../services/8-area-conhecimento/hook/use-areas-da-campanha';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { PainelOrcamentoCronograma } from './painel-orcamento-cronograma';
import { EtapaRevisaoCampanha } from './etapa-revisao-campanha';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { CampanhaRequestCreate, CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

interface ModalCriarCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  // Continuar um rascunho que já existe: o mesmo passo a passo, com os dados dele, sempre a partir da etapa 1. O
  // rascunho só é editado aqui (Minhas Campanhas e T2 mandam para cá); o Alterar comum fica para os outros status.
  idRascunho?: number;
  // Cria a campanha com os dados da etapa 1. Padrão: em nome de quem está logado (POST /campanha). O Campo de
  // Testes passa o endpoint de suporte, em nome do pesquisador escolhido.
  criar?: (dados: CampanhaRequestCreate) => Promise<CampanhaResponse>;
  // Campos a mais no topo da etapa 1 (o Campo de Testes põe o "Dono da campanha") e se eles já estão válidos.
  camposExtras?: ReactNode;
  camposExtrasValidos?: boolean;
  subtituloDados?: string;
  // Texto que fica na frente do subtítulo em todas as etapas (o T2 põe "Pesquisador: fulano.").
  contexto?: string;
  // A lista de quem abriu precisa recarregar (campanha criada, alterada ou enviada).
  aoMudar: () => void;
  aoFechar: () => void;
}

interface FormDadosCampanha {
  titulo: string;
  idAreaConhecimento: string;
  metaFinanceira: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  videoApresentacaoUrl: string;
}

const FORM_VAZIO: FormDadosCampanha = {
  titulo: '',
  idAreaConhecimento: '',
  metaFinanceira: '',
  descricao: '',
  dataInicio: '',
  dataFim: '',
  videoApresentacaoUrl: '',
};

type Etapa = 'dados' | 'orcamento' | 'cronograma' | 'revisao';

const ETAPAS = [
  { chave: 'dados', rotulo: 'Dados' },
  { chave: 'orcamento', rotulo: 'Orçamento' },
  { chave: 'cronograma', rotulo: 'Cronograma' },
  { chave: 'revisao', rotulo: 'Revisão' },
] as const;

// Criar campanha em 4 etapas do MESMO modal: Dados, Orçamento, Cronograma e Revisão, com o indicador de etapas no
// topo. Os itens de orçamento e os marcos só existem depois de a campanha ter um id (FK), por isso "Próximo" na
// etapa Dados já cria a campanha como rascunho; voltando para Dados e avançando de novo, ela é ALTERADA (PATCH),
// nunca criada outra vez. O mínimo de itens e de marcos só é exigido no envio: dá para fechar e continuar depois,
// e o rascunho reabre neste mesmo passo a passo (idRascunho).
//
// "Enviar para aprovação" não tem checagem no front, de propósito: quem cobra orçamento, soma, cronograma e
// prazo é o banco (trg_campanha_valida_completude), e o erro chega traduzido. O clique acontece e o sistema DIZ o
// que falta, em vez de um botão desabilitado sem explicação. Se falhar, o modal continua aberto e a campanha
// continua rascunho: nada se perde.
export function ModalCriarCampanha({
  auth,
  idRascunho,
  criar,
  camposExtras,
  camposExtrasValidos = true,
  subtituloDados = 'A campanha é salva como rascunho a cada etapa: dá para fechar e continuar depois.',
  contexto,
  aoMudar,
  aoFechar,
}: ModalCriarCampanhaProps) {
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const { ocupado: trabalhando, executar: executarTrabalhando } = useEnvio(reportarErro);
  const regras = useRegrasCampanha();
  const idPrazoDica = useId();
  const areas = useAreasDaCampanha(auth.authFetch);
  const [form, setForm] = useState<FormDadosCampanha>(FORM_VAZIO);
  // O que está gravado no banco (vazio antes de o rascunho existir): diz se a etapa Dados tem mudança não salva.
  const [formSalvo, setFormSalvo] = useState<FormDadosCampanha>(FORM_VAZIO);
  const [etapa, setEtapa] = useState<Etapa>('dados');
  const [idCampanha, setIdCampanha] = useState<number | null>(idRascunho ?? null);
  const [carregandoRascunho, setCarregandoRascunho] = useState(idRascunho !== undefined);

  // Rascunho que já existe: o formulário da etapa 1 começa com o que está salvo.
  useEffect(() => {
    if (idRascunho === undefined) {
      return;
    }
    campanhaApi
      .buscar(auth.authFetch, String(idRascunho))
      .then((campanha) => {
        const salvo: FormDadosCampanha = {
          titulo: campanha.titulo,
          idAreaConhecimento: String(campanha.idAreaConhecimento),
          metaFinanceira: String(campanha.metaFinanceira),
          descricao: campanha.descricao ?? '',
          dataInicio: campanha.dataInicio ? dataLocal(campanha.dataInicio) : '',
          dataFim: campanha.dataFim ? dataLocal(campanha.dataFim) : '',
          videoApresentacaoUrl: campanha.videoApresentacaoUrl ?? '',
        };
        setForm(salvo);
        setFormSalvo(salvo);
      })
      .catch(reportarErro)
      .finally(() => setCarregandoRascunho(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idRascunho]);

  const hoje = hojeISO();
  const duracao = duracaoEmDias(form.dataInicio, form.dataFim);
  const duracaoValida = duracao !== null && duracao >= regras.prazoMinimoDias && duracao <= regras.prazoMaximoDias;
  const metaAbaixoDoMinimo = form.metaFinanceira !== '' && Number(form.metaFinanceira) < regras.metaMinima;
  const textoMetaMinima = `Meta mínima: ${formatarMoeda(regras.metaMinima)}.`;
  // "Próximo" fica sempre clicável: clicando com algo faltando, cada campo mostra o próprio erro.
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    extras: !camposExtrasValidos && 'Preencha os campos acima.',
    titulo: form.titulo.trim() === '' && 'Informe o título.',
    area: form.idAreaConhecimento === '' && 'Escolha a área do conhecimento.',
    meta: form.metaFinanceira === '' ? 'Informe a meta.' : metaAbaixoDoMinimo && textoMetaMinima,
    inicio: form.dataInicio === '' ? 'Informe a data de início.' : form.dataInicio < hoje && 'O início precisa ser hoje ou depois.',
    fim: (form.dataFim === '' || !duracaoValida) && 'prazo',
  }));
  const prazoComErro = Boolean(erroDe('fim')) || (duracao !== null && !duracaoValida);

  const corpo = (): CampanhaRequestCreate => ({
    titulo: form.titulo.trim(),
    idAreaConhecimento: Number(form.idAreaConhecimento),
    metaFinanceira: Number(form.metaFinanceira),
    dataInicio: inicioDoDia(form.dataInicio),
    dataFim: fimDoDia(form.dataFim),
    ...(form.descricao.trim() ? { descricao: form.descricao.trim() } : {}),
    ...(form.videoApresentacaoUrl.trim() ? { videoApresentacaoUrl: form.videoApresentacaoUrl.trim() } : {}),
  });

  // Mudança na etapa Dados que ainda não foi gravada (antes de o rascunho existir, qualquer coisa digitada).
  const sujo = JSON.stringify(form) !== JSON.stringify(formSalvo);

  // Sair da etapa Dados (pelo Próximo ou clicando noutra etapa) grava o formulário antes: cria o rascunho na
  // primeira vez, altera nas outras. Rascunho sem mudança nos Dados só troca de etapa: um rascunho antigo (com o
  // início já no passado, por exemplo) ainda deixa ver orçamento e cronograma, e a Revisão aponta o que corrigir.
  const avancarDosDados = async (destino: Etapa = 'orcamento') => {
    if (idCampanha !== null && !sujo) {
      setEtapa(destino);
      return;
    }
    if (!tentarEnviar()) {
      return;
    }
    await executarTrabalhando(async () => {
      if (idCampanha === null) {
        const nova = criar ? await criar(corpo()) : await campanhaApi.criar(auth.authFetch, corpo());
        setIdCampanha(nova.idCampanha);
        mostrar('Campanha criada como rascunho.', `ID: ${nova.idCampanha}. Agora, o orçamento.`);
      } else {
        await campanhaApi.atualizar(auth.authFetch, idCampanha, corpo());
      }
      setFormSalvo(form);
      aoMudar();
      setEtapa(destino);
    });
  };

  const irPara = (destino: Etapa) => {
    if (etapa === 'dados') {
      void avancarDosDados(destino);
    } else {
      setEtapa(destino);
    }
  };

  const enviarParaAprovacao = async () => {
    if (idCampanha === null) {
      return;
    }
    await executarTrabalhando(async () => {
      await campanhaApi.enviar(auth.authFetch, idCampanha);
      mostrar('Campanha enviada para aprovação.', `ID: ${idCampanha}`);
      aoMudar();
      aoFechar();
    });
  };

  // Fechar com mudança não gravada na etapa Dados pergunta antes. Orçamento e cronograma gravam na hora.
  useAvisoAlteracaoNaoSalva(sujo);
  const fechar = () => {
    if (confirmarSaida(sujo)) aoFechar();
  };

  const subtitulo = [
    contexto,
    idCampanha === null ? subtituloDados : `Rascunho #${idCampanha}. Cada etapa é salva ao avançar; dá para fechar e continuar depois.`,
  ]
    .filter(Boolean)
    .join(' ');

  const rodape =
    etapa === 'dados' ? (
      <RodapeAcoes
        aoCancelar={fechar}
        acao={{ rotulo: 'Próximo', ocupado: trabalhando, aoClicar: () => void avancarDosDados() }}
      />
    ) : etapa === 'orcamento' ? (
      <RodapeAcoes
        aoCancelar={() => setEtapa('dados')}
        rotuloCancelar="Voltar"
        acao={{ rotulo: 'Próximo', aoClicar: () => setEtapa('cronograma') }}
      />
    ) : etapa === 'cronograma' ? (
      <RodapeAcoes
        aoCancelar={() => setEtapa('orcamento')}
        rotuloCancelar="Voltar"
        acao={{ rotulo: 'Próximo', aoClicar: () => setEtapa('revisao') }}
      />
    ) : (
      <RodapeAcoes
        aoCancelar={() => setEtapa('cronograma')}
        rotuloCancelar="Voltar"
        largura="md"
        acao={{
          rotulo: 'Enviar para aprovação',
          rotuloOcupado: 'Enviando...',
          ocupado: trabalhando,
          aoClicar: () => void enviarParaAprovacao(),
        }}
      />
    );

  return (
    <ModalFicha
      titulo={idRascunho === undefined ? 'Criar Campanha' : 'Continuar rascunho'}
      carregando={carregandoRascunho}
      // Um clique sem querer no fundo escurecido derrubaria o passo a passo; só fecha por Cancelar ou pelo X.
      // Depois da etapa 1 a campanha já está salva como rascunho: fechar não perde nada.
      fecharAoClicarFora={false}
      subtitulo={subtitulo}
      aoFechar={fechar}
      rodape={rodape}
    >
      <IndicadorEtapas
        etapas={ETAPAS}
        atual={etapa}
        aoEscolher={trabalhando ? undefined : irPara}
        // Antes de o rascunho existir, só dá para avançar pelo Próximo (que valida e cria).
        liberada={(chave) => chave === 'dados' || idCampanha !== null}
      />
      {etapa === 'revisao' && idCampanha !== null ? (
        <EtapaRevisaoCampanha
          auth={auth}
          idCampanha={idCampanha}
          titulo={form.titulo}
          nomeArea={areas.find((area) => String(area.idAreaConhecimento) === form.idAreaConhecimento)?.nome ?? ''}
          meta={Number(form.metaFinanceira)}
          dataInicio={form.dataInicio}
          dataFim={form.dataFim}
          duracaoDias={duracao}
          prazoValido={duracaoValida && form.dataInicio >= hoje}
          minimoItensOrcamento={regras.minimoItensOrcamento}
          minimoMarcosCronograma={regras.minimoMarcosCronograma}
        />
      ) : (etapa === 'orcamento' || etapa === 'cronograma') && idCampanha !== null ? (
        <SecaoFicha titulo={etapa === 'orcamento' ? 'Orçamento' : 'Cronograma'}>
          <div className="sm:col-span-2">
            <PainelOrcamentoCronograma
              // `key`: a etapa troca só a prop `abaFixa`, e o painel guarda a aba no próprio estado; sem remontar,
              // Cronograma continuaria mostrando a tabela de Orçamento.
              key={etapa}
              auth={auth}
              idCampanha={idCampanha}
              podeEditar
              abaFixa={etapa}
              metaFinanceira={Number(form.metaFinanceira)}
              dataInicioCampanha={form.dataInicio}
              minimoMarcosCronograma={regras.minimoMarcosCronograma}
            />
          </div>
        </SecaoFicha>
      ) : (
        <>
          {camposExtras}
          {erroDe('extras') && <p className="text-xs texto-erro font-semibold -mt-2 mb-3">{erroDe('extras')}</p>}
          <SecaoFicha titulo="Dados">
            <Campo rotulo="Título" className="sm:col-span-2" erro={erroDe('titulo')}>
              {({ atributos, classeErro }) => (
                <input
                  {...atributos}
                  type="text"
                  value={form.titulo}
                  onChange={(evento) => setForm({ ...form, titulo: evento.target.value })}
                  className={'input-padrao' + classeErro}
                />
              )}
            </Campo>
            <Campo rotulo="Área do conhecimento" erro={erroDe('area')}>
              {({ atributos, classeErro }) => (
                <select
                  {...atributos}
                  value={form.idAreaConhecimento}
                  onChange={(evento) => setForm({ ...form, idAreaConhecimento: evento.target.value })}
                  className={'input-padrao' + classeErro}
                >
                  <option value="">Selecione...</option>
                  {areas.map((area) => (
                    <option key={area.idAreaConhecimento} value={area.idAreaConhecimento}>
                      {area.nome}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo
              rotulo="Meta (R$)"
              dica={`Meta mínima: ${formatarMoeda(regras.metaMinima)}.`}
              erro={erroDe('meta') ?? (metaAbaixoDoMinimo && textoMetaMinima)}
            >
              {({ atributos, classeErro }) => (
                <input
                  {...atributos}
                  type="number"
                  min={regras.metaMinima}
                  value={form.metaFinanceira}
                  onChange={(evento) => setForm({ ...form, metaFinanceira: evento.target.value })}
                  className={'input-padrao' + classeErro}
                />
              )}
            </Campo>
            <Campo rotulo="Descrição (opcional)" className="sm:col-span-2">
              {({ atributos }) => (
                <textarea
                  {...atributos}
                  rows={3}
                  value={form.descricao}
                  onChange={(evento) => setForm({ ...form, descricao: evento.target.value })}
                  className="input-padrao"
                />
              )}
            </Campo>
            <Campo rotulo="Início" erro={erroDe('inicio')}>
              {({ atributos, classeErro }) => (
                <input
                  {...atributos}
                  type="date"
                  value={form.dataInicio}
                  min={hoje}
                  onChange={(evento) => setForm({ ...form, dataInicio: evento.target.value })}
                  className={'input-padrao' + classeErro}
                />
              )}
            </Campo>
            {/* O aviso de prazo vale para as duas datas e ocupa a linha inteira abaixo delas, por isso fica fora do
                Campo e é ligado ao campo "Fim" à mão; fica vermelho também quando o fim está vazio e já houve uma
                tentativa de avançar. */}
            <Campo rotulo="Fim">
              {({ atributos }) => (
                <input
                  {...atributos}
                  aria-invalid={prazoComErro}
                  aria-describedby={idPrazoDica}
                  type="date"
                  value={form.dataFim}
                  min={form.dataInicio || hoje}
                  onChange={(evento) => setForm({ ...form, dataFim: evento.target.value })}
                  className={'input-padrao' + (prazoComErro ? ' borda-erro' : '')}
                />
              )}
            </Campo>
            <p
              id={idPrazoDica}
              className={'sm:col-span-2 text-xs -mt-2 ' + (prazoComErro ? 'texto-erro font-semibold' : 'texto-fraco')}
            >
              {form.dataFim === '' && erroDe('fim') ? 'Informe a data de fim. ' : ''}
              {duracao !== null ? `Duração: ${duracao} ${duracao === 1 ? 'dia' : 'dias'}. ` : ''}A campanha precisa durar
              entre {regras.prazoMinimoDias} e {regras.prazoMaximoDias} dias, começando hoje ou depois.
            </p>
            <Campo rotulo="URL do vídeo de apresentação (opcional)" className="sm:col-span-2">
              {({ atributos }) => (
                <input
                  {...atributos}
                  type="url"
                  value={form.videoApresentacaoUrl}
                  onChange={(evento) => setForm({ ...form, videoApresentacaoUrl: evento.target.value })}
                  className="input-padrao"
                  placeholder="https://"
                />
              )}
            </Campo>
          </SecaoFicha>
        </>
      )}
    </ModalFicha>
  );
}
