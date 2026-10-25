import { useEffect, useState } from 'react';
import { BadgeStatusCampanha } from '../../components/crud/badge-status-campanha';
import { ROTULO_MODELO_CAMPANHA, STATUS_PUBLICADA } from '../../services/12-campanha/constants/status-campanha.constants';
import { CampoFicha, FichaLadoALado, SecaoFicha } from '../../components/crud/ficha-consulta';
import { FiltroPartes } from '../../components/crud/filtro-partes';
import type { ParteTela } from '../../components/crud/filtro-partes';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';

import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarData, formatarDataHora, formatarMoeda } from '../../services/constant/util/formatacao.util';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { SecaoComentariosRecebidos } from '../17-comentario/secao-comentarios-recebidos';
import { SecaoDenunciasCampanha } from '../19-denuncia/secao-denuncias-campanha';
import { SecaoPedidosEncerramento } from '../20-solicitacao-encerramento/secao-pedidos-encerramento';
import { SecaoComentariosEndossados, SecaoComentariosTodos } from '../17-comentario/secao-comentarios-campanha';
import { SecaoAtualizacoesCampanha } from '../15-atualizacao-campanha/secao-atualizacoes-campanha';
import { SecaoRecompensasCampanha } from '../18-recompensa/secao-recompensas-campanha';
import { celulaArrecadado } from './colunas-campanha';
import { PainelOrcamentoCronograma } from './painel-orcamento-cronograma';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { HistoricoRejeicaoResponse } from '../../services/12-campanha/type/campanha.type';
import { contribuicaoApi } from '../../services/22-contribuicao/api/contribuicao.api';
import { seguirCampanhaApi } from '../../services/16-seguir/api/seguir-campanha.api';
import type { ResumoContribuicoes } from '../../services/22-contribuicao/type/contribuicao.type';

interface ModalConsultarCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Aberto pelo dono (Minhas Campanhas): mostra os comentários recebidos, com endossar e excluir.
  comoDono?: boolean;
  aoFechar: () => void;
}

// Consultar em modal. Recebe só `idCampanha` (não a linha inteira da listagem) e busca a campanha de novo, de
// propósito: diferente dos catálogos simples (ver modal-motivo-denuncia.tsx), a linha de `listar-campanhas.tsx`
// é TRANSFORMADA para exibição (`status` vira rótulo em português, `metaFinanceira`/`valorBrutoArrecadado`
// viram string já formatada em R$): usar a linha direto quebraria o badge de status e formataria moeda em cima
// de moeda já formatada. `useBuscar` pega o dado cru de verdade.
export function ModalConsultarCampanha({ auth, idCampanha, comoDono = false, aoFechar }: ModalConsultarCampanhaProps) {
  const { dado: campanha, carregando, erro } = useBuscar(
    () => campanhaApi.buscar(auth.authFetch, String(idCampanha)),
    [idCampanha],
  );
  const [historicoRejeicao, setHistoricoRejeicao] = useState<HistoricoRejeicaoResponse[]>([]);
  // Filtro com cara de aba (o mesmo do Alterar Usuário): "Geral" mostra tudo; as outras partes ficam escondidas, não
  // desmontadas, então a troca é instantânea. Moderação só aparece quando há denúncia ou pedido de encerramento.
  const [parte, setParte] = useState<ParteConsultar>('geral');
  const [denuncias, setDenuncias] = useState(0);
  const [pedidos, setPedidos] = useState(0);
  const ve = (alvo: ParteConsultar) => (parte === 'geral' || parte === alvo ? '' : ' hidden');
  // "Por" ao lado de "Aprovada em": antes da aprovação (os dois com "-") ou com o nome de quem aprovou (só vem para
  // quem pode aprovar). Aprovada sem o nome: "Aprovada em" ocupa a linha sozinha.
  const mostrarAprovador = !campanha?.aprovadoEm || campanha.nomeAprovador !== null;
  // O mesmo para "Encerrada em": "Por" com quem encerrou ("Sistema" no fim do prazo).
  const mostrarEncerrador = !campanha?.encerradoEm || campanha.nomeEncerrador !== null;
  // Quantas contribuições estão pagas e quantas existem. null = sem permissão para ver (só o dono e quem tem a
  // permissão): o campo mostra "-".
  const [resumoContribuicoes, setResumoContribuicoes] = useState<ResumoContribuicoes | null>(null);
  // Quantas pessoas seguem (só o número). null = a busca falhou: a linha some.
  const [seguidores, setSeguidores] = useState<number | null>(null);
  // O histórico e o resumo vêm em buscas à parte: o modal só aparece quando os dois chegam, para não crescer depois
  // de aberto.
  const [historicoCarregado, setHistoricoCarregado] = useState(false);

  useEffect(() => {
    if (campanha) {
      void Promise.allSettled([
        campanhaApi.listarHistoricoRejeicao(auth.authFetch, campanha.idCampanha).then(setHistoricoRejeicao),
        contribuicaoApi.resumoDaCampanha(auth.authFetch, campanha.idCampanha).then(setResumoContribuicoes),
        seguirCampanhaApi.contarSeguidores(auth.authFetch, campanha.idCampanha).then((contagem) => setSeguidores(contagem.seguidores)),
      ]).then(() => setHistoricoCarregado(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanha]);

  if (!carregando && !campanha) {
    return (
      <ModalFicha
        titulo={`#${idCampanha}`}
        aoFechar={aoFechar}
        rodape={
          <RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />
        }
      >
        <MensagemErro texto={erro} />
      </ModalFicha>
    );
  }

  return (
    <ModalFicha
      titulo={campanha?.titulo ?? `#${idCampanha}`}
      carregando={carregando || !campanha || !historicoCarregado}
      subtitulo={campanha?.nomePesquisador ? `Pesquisador: ${campanha.nomePesquisador}` : undefined}
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
        <RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />
      }
    >
      {campanha && (
        <FiltroPartes
          partes={[
            { chave: 'geral', rotulo: 'Geral' },
            { chave: 'dados', rotulo: 'Dados' },
            { chave: 'orcamento', rotulo: 'Orçamento e cronograma' },
            { chave: 'recompensas', rotulo: 'Recompensas' },
            ...(STATUS_PUBLICADA.has(campanha.status) ? [{ chave: 'atualizacoes' as const, rotulo: 'Atualizações' }] : []),
            ...(comoDono || campanha.aprovadoEm !== null ? [{ chave: 'comentarios' as const, rotulo: 'Comentários' }] : []),
            ...(!comoDono && denuncias + pedidos > 0 ? [{ chave: 'moderacao' as const, rotulo: 'Moderação' }] : []),
          ] satisfies ParteTela<ParteConsultar>[]}
          atual={parte}
          aoEscolher={setParte}
        />
      )}
      {campanha && (
        <div className="grade-ficha">
          {campanha.precisaRevisaoScore && (
            <p className={'lg:col-span-3 legenda-destaque fundo-aviso texto-aviso rounded-lg p-3' + ve('dados')}>
              O pesquisador está abaixo do score mínimo para campanhas. É só um sinal para revisar esta campanha
              com mais cuidado; não impede a aprovação.
            </p>
          )}

          {/* Dados à esquerda e Auditoria à direita, numa grade só: cada linha tem os dois lados, então os campos
              vizinhos ficam alinhados mesmo quando a descrição ocupa várias linhas. Auditoria fica no canto superior
              direito, onde as outras fichas deixam os metadados. Aprovada com "Por" ao lado (quem aprovou, só para
              quem pode aprovar; sem o nome, Aprovada ocupa a linha). Hora sem os segundos: em meia coluna,
              "25/10/2026, 14:30:45" quebrava. */}
          <div className={'lg:col-span-3' + ve('dados')}>
            <FichaLadoALado
              tituloEsquerda="Dados"
              tituloDireita="Auditoria"
              linhas={[
                {
                  esquerda: [
                    <CampoFicha key="id" rotulo="id" valor={campanha.idCampanha} />,
                    <CampoFicha key="area" rotulo="Área do conhecimento" valor={campanha.nomeArea ?? `#${campanha.idAreaConhecimento}`} />,
                  ],
                  direita: [
                    <CampoFicha key="inicio" rotulo="Início" valor={formatarData(campanha.dataInicio)} />,
                    <CampoFicha key="fim" rotulo="Fim (previsto)" valor={formatarData(campanha.dataFim)} />,
                  ],
                },
                {
                  esquerda: seguidores === null ? [] : [<CampoFicha key="seguidores" rotulo="Seguidores" valor={seguidores} />],
                  direita: [<CampoFicha key="criada" rotulo="Criada em" valor={formatarDataHora(campanha.criadoEm, true)} />],
                },
                {
                  esquerda: [<CampoFicha key="descricao" rotulo="Descrição" valor={campanha.descricao} />],
                  direita: mostrarAprovador
                    ? [
                        <CampoFicha key="aprovada" rotulo="Aprovada em" valor={formatarDataHora(campanha.aprovadoEm, true)} />,
                        <CampoFicha key="por" rotulo="Por" valor={campanha.nomeAprovador} />,
                      ]
                    : [<CampoFicha key="aprovada" rotulo="Aprovada em" valor={formatarDataHora(campanha.aprovadoEm, true)} />],
                },
                {
                  esquerda: [<CampoFicha key="video" rotulo="Vídeo de apresentação" valor={campanha.videoApresentacaoUrl} />],
                  direita: mostrarEncerrador
                    ? [
                        <CampoFicha key="encerrada" rotulo="Encerrada em" valor={formatarDataHora(campanha.encerradoEm, true)} />,
                        <CampoFicha key="por-encerrou" rotulo="Por" valor={campanha.nomeEncerrador} />,
                      ]
                    : [<CampoFicha key="encerrada" rotulo="Encerrada em" valor={formatarDataHora(campanha.encerradoEm, true)} />],
                },
              ]}
            />
          </div>

          {/* Escondida quando vazia, de propósito: rejeição é minoria, mostrar "nenhuma" sempre seria
              ruído. */}
          {historicoRejeicao.length > 0 && (
            <div className={'lg:col-span-2' + ve('dados')}>
              <SecaoFicha titulo="Histórico de Rejeições">
                {historicoRejeicao.map((item) => (
                  <CampoFicha
                    key={item.idRejeicao}
                    rotulo={formatarDataHora(item.rejeitadoEm)}
                    valor={`${item.justificativa ?? 'Sem justificativa registrada.'} (${item.nomeAdmin ?? 'Administrador removido'})`}
                    largura="cheia"
                  />
                ))}
              </SecaoFicha>
            </div>
          )}

          {/* Financeiro na linha inteira, embaixo de Dados e Auditoria, numa linha só de ponta a ponta, na ordem do
              dinheiro: quanto entrou, contra a meta, a taxa e o que sobra para o pesquisador; por último, de quantas
              contribuições. */}
          <div className={'lg:col-span-3' + ve('dados')}>
            <SecaoFicha titulo="Financeiro" centralizada>
              {/* A mesma célula da coluna "arrecadado" das tabelas (DS-105): a barra fina colada embaixo do número, na
                  largura dele, mostrando quanto da meta já foi atingido. */}
              <CampoFicha rotulo="Arrecadado" valor={celulaArrecadado(campanha.valorBrutoArrecadado, campanha.metaFinanceira)} />
              <CampoFicha rotulo="Meta" valor={formatarMoeda(campanha.metaFinanceira)} />
              <CampoFicha
                rotulo="Taxa"
                valor={campanha.taxaPlataforma === null ? 'Ainda não carimbada (não aprovada)' : `${campanha.taxaPlataforma}%`}
              />
              {/* RF-087: o que o pesquisador receberia hoje, pela mesma conta do repasse (taxa mínima incluída); antes
                  da aprovação, com a taxa padrão. */}
              <CampoFicha rotulo="Líquido estimado" valor={formatarMoeda(campanha.valorLiquidoEstimado)} />
              <CampoFicha
                rotulo="Contribuições"
                valor={
                  resumoContribuicoes &&
                  (resumoContribuicoes.total === 0
                    ? 'Nenhuma ainda.'
                    : `${resumoContribuicoes.pagas} pagas de ${resumoContribuicoes.total}`)
                }
              />
            </SecaoFicha>
          </div>

          {/* Orçamento e cronograma, só para ler: a consulta mostra a campanha inteira. Um respiro a mais antes (mt-4,
              além do vão da grade): as tabelas começam outro assunto, depois dos campos de Dados, Auditoria e Financeiro. */}
          <div className={'lg:col-span-3 mt-4' + ve('orcamento')}>
            <PainelOrcamentoCronograma auth={auth} idCampanha={campanha.idCampanha} podeEditar={false} />
          </div>

          {/* Recompensas, só para ler: criar e desativar ficam no Alterar do dono. */}
          <div className={'lg:col-span-3' + ve('recompensas')}>
            <SecaoRecompensasCampanha auth={auth} idCampanha={campanha.idCampanha} podeGerenciar={false} />
          </div>

          {/* Atualizações publicadas, só para ler: o que a página pública mostra e o que quem segue recebe. Publicar e
              ocultar ficam no Alterar do dono. */}
          {STATUS_PUBLICADA.has(campanha.status) && (
            <div className={'lg:col-span-3' + ve('atualizacoes')}>
              <SecaoAtualizacoesCampanha auth={auth} idCampanha={campanha.idCampanha} podePublicar={false} podeGerenciar={false} />
            </div>
          )}

          {comoDono ? (
            // O dono endossa, exclui e denuncia o autor (Minhas Campanhas).
            <div className={'lg:col-span-3' + ve('comentarios')}>
              <SecaoComentariosRecebidos auth={auth} idCampanha={campanha.idCampanha} publicada={campanha.aprovadoEm !== null} />
            </div>
          ) : (
            // A gestão (Campanhas) só lê: os endossados (o que a página pública mostra), as denúncias e todos os
            // comentários, os dois últimos paginados pelo servidor.
            <>
              {campanha.aprovadoEm !== null && (
                <div className={'lg:col-span-3' + ve('comentarios')}>
                  <SecaoComentariosEndossados authFetch={auth.authFetch} idCampanha={campanha.idCampanha} />
                </div>
              )}
              <div className={'lg:col-span-3' + ve('moderacao')}>
                <SecaoDenunciasCampanha authFetch={auth.authFetch} idCampanha={campanha.idCampanha} aoContar={setDenuncias} />
              </div>
              <div className={'lg:col-span-3' + ve('moderacao')}>
                <SecaoPedidosEncerramento authFetch={auth.authFetch} idCampanha={campanha.idCampanha} aoContar={setPedidos} />
              </div>
              {campanha.aprovadoEm !== null && (
                <div className={'lg:col-span-3' + ve('comentarios')}>
                  <SecaoComentariosTodos authFetch={auth.authFetch} idCampanha={campanha.idCampanha} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </ModalFicha>
  );
}

type ParteConsultar = 'geral' | 'dados' | 'orcamento' | 'recompensas' | 'atualizacoes' | 'comentarios' | 'moderacao';
