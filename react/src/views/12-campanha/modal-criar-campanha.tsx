import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { useRegrasCampanha } from '../../services/12-campanha/hook/use-regras-campanha';
import { duracaoEmDias, hojeISO } from '../../services/12-campanha/util/prazo-campanha.util';
import { useAreasDaCampanha } from '../../services/8-area-conhecimento/hook/use-areas-da-campanha';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { PainelOrcamentoCronograma } from './painel-orcamento-cronograma';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { CampanhaRequestCreate, CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

interface ModalCriarCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  // Cria a campanha com os dados da etapa 1. Padrão: em nome de quem está logado (POST /campanha). O Campo de
  // Testes passa o endpoint de suporte, em nome do pesquisador escolhido.
  criar?: (dados: CampanhaRequestCreate) => Promise<CampanhaResponse>;
  // Campos a mais no topo da etapa 1 (o Campo de Testes põe o "Dono da campanha") e se eles já estão válidos.
  camposExtras?: ReactNode;
  camposExtrasValidos?: boolean;
  subtituloDados?: string;
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

type Etapa = 'dados' | 'orcamento' | 'cronograma';

// Criar campanha em 3 etapas do MESMO modal: Dados, Orçamento e Cronograma. Os itens de orçamento e os marcos só
// existem depois de a campanha ter um id (FK), por isso "Próximo" na etapa Dados já cria a campanha como
// rascunho; voltando para Dados e avançando de novo, ela é ALTERADA (PATCH), nunca criada outra vez. O mínimo
// de itens e de marcos só é exigido no envio: dá para concluir depois, pelo Alterar.
//
// "Enviar para aprovação" não tem checagem no front, de propósito: quem cobra orçamento, soma, cronograma e
// prazo é o banco (trg_campanha_valida_completude), e o erro chega traduzido. O clique acontece e o sistema DIZ o
// que falta, em vez de um botão desabilitado sem explicação. Se falhar, o modal continua aberto e a campanha
// continua rascunho: nada se perde.
export function ModalCriarCampanha({
  auth,
  criar,
  camposExtras,
  camposExtrasValidos = true,
  subtituloDados = 'Etapa 1 de 3: Dados.',
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
  const [etapa, setEtapa] = useState<Etapa>('dados');
  const [idCampanha, setIdCampanha] = useState<number | null>(null);


  const hoje = hojeISO();
  const duracao = duracaoEmDias(form.dataInicio, form.dataFim);
  const duracaoValida = duracao !== null && duracao >= regras.prazoMinimoDias && duracao <= regras.prazoMaximoDias;
  const metaAbaixoDoMinimo = form.metaFinanceira !== '' && Number(form.metaFinanceira) < regras.metaMinima;
  const dadosValidos =
    camposExtrasValidos &&
    form.titulo.trim() !== '' &&
    form.idAreaConhecimento !== '' &&
    form.metaFinanceira !== '' &&
    !metaAbaixoDoMinimo &&
    form.dataInicio >= hoje &&
    duracaoValida;

  const corpo = (): CampanhaRequestCreate => ({
    titulo: form.titulo.trim(),
    idAreaConhecimento: Number(form.idAreaConhecimento),
    metaFinanceira: Number(form.metaFinanceira),
    dataInicio: new Date(form.dataInicio).toISOString(),
    dataFim: new Date(form.dataFim).toISOString(),
    ...(form.descricao.trim() ? { descricao: form.descricao.trim() } : {}),
    ...(form.videoApresentacaoUrl.trim() ? { videoApresentacaoUrl: form.videoApresentacaoUrl.trim() } : {}),
  });

  const avancarDosDados = async () => {
    if (!dadosValidos) {
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
      aoMudar();
      setEtapa('orcamento');
    });
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

  const subtitulo =
    etapa === 'dados'
      ? subtituloDados
      : etapa === 'orcamento'
        ? `Campanha #${idCampanha} - Etapa 2 de 3: Orçamento.`
        : `Campanha #${idCampanha} - Etapa 3 de 3: Cronograma.`;

  const rodape =
    etapa === 'dados' ? (
      <RodapeAcoes
        aoCancelar={aoFechar}
        acao={{ rotulo: 'Próximo', ocupado: trabalhando, desabilitado: !dadosValidos, aoClicar: () => void avancarDosDados() }}
      />
    ) : etapa === 'orcamento' ? (
      <RodapeAcoes
        aoCancelar={() => setEtapa('dados')}
        rotuloCancelar="Voltar"
        acao={{ rotulo: 'Próximo', aoClicar: () => setEtapa('cronograma') }}
      />
    ) : (
      <RodapeAcoes
        aoCancelar={() => setEtapa('orcamento')}
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
      titulo="Criar Campanha"
      // Um clique sem querer no fundo escurecido derrubaria o passo a passo; só fecha por Cancelar ou pelo X.
      // Depois da etapa 1 a campanha já está salva como rascunho: fechar não perde nada.
      fecharAoClicarFora={false}
      subtitulo={subtitulo}
      aoFechar={aoFechar}
      rodape={rodape}
    >
      {etapa !== 'dados' && idCampanha !== null ? (
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
          <SecaoFicha titulo="Dados">
            <Campo rotulo="Título" className="sm:col-span-2">
              {({ atributos }) => (
                <input
                  {...atributos}
                  type="text"
                  value={form.titulo}
                  onChange={(evento) => setForm({ ...form, titulo: evento.target.value })}
                  className="input-padrao"
                />
              )}
            </Campo>
            <Campo rotulo="Área do conhecimento">
              {({ atributos }) => (
                <select
                  {...atributos}
                  value={form.idAreaConhecimento}
                  onChange={(evento) => setForm({ ...form, idAreaConhecimento: evento.target.value })}
                  className="input-padrao"
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
              erro={metaAbaixoDoMinimo && `Meta mínima: ${formatarMoeda(regras.metaMinima)}.`}
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
            <Campo rotulo="Início">
              {({ atributos }) => (
                <input
                  {...atributos}
                  type="date"
                  value={form.dataInicio}
                  min={hoje}
                  onChange={(evento) => setForm({ ...form, dataInicio: evento.target.value })}
                  className="input-padrao"
                />
              )}
            </Campo>
            {/* O aviso de prazo vale para as duas datas e ocupa a linha inteira abaixo delas, por isso fica fora do
                Campo e é ligado ao campo "Fim" à mão. */}
            <Campo rotulo="Fim">
              {({ atributos }) => (
                <input
                  {...atributos}
                  aria-invalid={duracao !== null && !duracaoValida}
                  aria-describedby={idPrazoDica}
                  type="date"
                  value={form.dataFim}
                  min={form.dataInicio || hoje}
                  onChange={(evento) => setForm({ ...form, dataFim: evento.target.value })}
                  className={'input-padrao' + (duracao !== null && !duracaoValida ? ' borda-erro' : '')}
                />
              )}
            </Campo>
            <p
              id={idPrazoDica}
              className={'sm:col-span-2 text-xs -mt-2 ' + (duracao !== null && !duracaoValida ? 'texto-erro font-semibold' : 'texto-fraco')}
            >
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
