// ============================================================================
// Campo de Testes deixou de ser só ferramenta de teste descartável
// (07-09-2026, decisão do Lucas): virou parte permanente do painel
// administrativo, com o mesmo padrão de dados/comportamento do resto do
// sistema (nunca uma versão simplificada à parte).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { orcamentoCampanhaApi } from '../../services/13-orcamento-campanha/api/orcamento-campanha.api';
import { marcoCronogramaApi } from '../../services/14-marco-cronograma/api/marco-cronograma.api';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useFecharAoClicarFora } from '../../services/constant/hook/use-fechar-ao-clicar-fora';
import { LIMITE_SUGESTOES_COMBOBOX } from '../../services/campo-testes/constants/campo-testes.constants';
import { useChamadaRegistrada } from '../../services/campo-testes/hook/use-chamada-registrada';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { CAMPANHA_BLOQUEADA, motivoBloqueioCampanha } from '../../services/campo-testes/util/registros-bloqueados';
import { AcaoLinha } from '../../components/crud/acao-linha';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import {
  ROTULO_STATUS_CAMPANHA,
  classeBadgeStatusCampanha,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { formatarData, formatarDataHora, formatarMoeda } from '../../services/constant/utils/formatacao.util';
import { paginarClientSide } from '../../services/constant/utils/paginacao.util';
import { RodapePaginacao } from '../../components/pagination/rodape-paginacao';
import { BarraFiltros } from '../../components/search/barra-filtros';
import { LIMIAR_FILTRO } from '../../components/search/limiar-filtro.constants';
import { RegistroChamadas } from './registro-chamadas';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse, HistoricoRejeicaoResponse } from '../../services/12-campanha/type/campanha.type';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../services/14-marco-cronograma/type/marco-cronograma.type';
import type { StatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import type { AreaConhecimentoResponse } from '../../services/8-area-conhecimento/type/area-conhecimento.type';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

// Tipos e API extraídos pra services/13-orcamento-campanha e
// services/14-marco-cronograma (23-09-2026) - antes viviam aqui como
// interface local com shape inferido do próprio uso; ver o comentário
// completo no arquivo de tipo de cada módulo.

interface FormEdicaoCampanha {
  titulo: string;
  idAreaConhecimento: number | string;
  metaFinanceira: number | string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  videoApresentacaoUrl: string;
}

interface PainelOrcamentoCronogramaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  podeEditar: boolean;
  // `aoCarregar` (13-09-2026, pedido do Lucas: remover o painel "campanha
  // em foco" de baixo, que tinha SUA PRÓPRIA cópia de orçamento/cronograma
  // só pra alimentar o checklist "Pronta pra aprovar?") - callback opcional
  // que devolve os dados toda vez que este painel (re)carrega, pra quem
  // usa (o modal de Alterar) manter as CONTAGENS em dia sem duplicar
  // adicionar/remover - só o Alterar passa isto, o Consultar não precisa.
  aoCarregar?: (orcamento: OrcamentoCampanhaResponse[], cronograma: MarcoCronogramaResponse[]) => void;
  // `abaFixa` (15-09-2026, pedido do Lucas: Orçamento e Cronograma como
  // 2 MODAIS/etapas diferentes dentro de Criar Campanha, não uma tabela só
  // com abas) - quando presente, trava a aba nesse valor e esconde os 2
  // botões de trocar aba (não faz sentido oferecer "trocar pra Cronograma"
  // dentro da etapa que É a de Orçamento). Alterar/Consultar Campanha
  // continuam sem passar isto, mantendo as 2 abas normais de sempre.
  abaFixa?: 'orcamento' | 'cronograma';
  // `metaFinanceira` (15-09-2026, pedido do Lucas: "em orçamento precisa
  // aparecer o valor declarado... e a soma dos itens tem que ser igual o
  // do orçamento") - opcional: quando presente, mostra "Soma X de Y" logo
  // acima da tabela de Orçamento, com a diferença em destaque. O banco já
  // EXIGE essa igualdade exata na aprovação (fn_valida_completude_campanha_
  // aprovacao, RF-039/040) - isto só adianta o feedback, igual os avisos
  // de prazo/meta mínima já fazem no formulário de Dados.
  metaFinanceira?: number;
  // `dataInicioCampanha` (15-09-2026, pedido do Lucas: "cronograma tem que
  // estar dentro do tempo declarado") - `min` do campo "Data prevista" de
  // um marco novo. SÓ o mínimo, de propósito - RF-042/`fn_valida_data_
  // marco_cronograma` (05_regras_negocio.sql) bloqueiam data ANTERIOR ao
  // início, mas permitem ultrapassar `data_fim` sem problema ("um marco de
  // divulgação de resultado é comum acontecer depois do prazo de
  // arrecadação" - decisão da Alexia, 31-07-2026). Não existe `max` aqui
  // por isso não ser um bug, é a regra de negócio de verdade.
  dataInicioCampanha?: string;
  // `minimoMarcosCronograma` (15-09-2026, achado do Lucas: concluiu o
  // wizard com orçamento não batendo com a meta E cronograma vazio, sem
  // AVISO nenhum) - quando vem junto com `metaFinanceira`, mostra 2
  // tabelinhas simples (Meta/Soma atual em Orçamento; Mínimo de marcos/
  // Marcos cadastrados em Cronograma, cada uma dentro da própria aba) -
  // não é o checklist "Pronta para aprovar?" de Alterar Campanha (Lucas
  // rejeitou essa frase/estilo aqui: "não precisa desses dizeres... está
  // esquisito"), só um par rótulo + textbox readonly com o valor já
  // declarado, com borda vermelha quando não bate/não atinge o mínimo.
  minimoMarcosCronograma?: number;
}

// Extraído (08-09-2026, pedido do Lucas: "acima de Datas, nos dois
// modais") - mesmo padrão de <PainelLinksAcademicos> em T1: componente
// próprio com estado próprio, porque Consultar/Alterar podem abrir uma
// campanha DIFERENTE da que está em foco (`campanhaFoco`) lá embaixo, não
// dá pra reaproveitar o mesmo estado. Único ponto que ficou de fora de
// propósito: o painel "campanha em foco" (mais abaixo nesta tela) mantém
// a PRÓPRIA cópia de `orcamento`/`cronograma` no componente pai - o
// checklist "Pronta pra aprovar?" precisa somar/contar esses itens pra
// decidir se o botão Aprovar libera, e não vale a pena prop-drill esse
// dado de volta pra cima só pra eliminar uma pequena duplicação de
// fetch/estado numa ferramenta de bancada.
function PainelOrcamentoCronograma({
  auth,
  idCampanha,
  podeEditar,
  aoCarregar,
  abaFixa,
  metaFinanceira,
  dataInicioCampanha,
  minimoMarcosCronograma,
}: PainelOrcamentoCronogramaProps) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  const [orcamento, setOrcamento] = useState<OrcamentoCampanhaResponse[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronogramaResponse[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'orcamento' | 'cronograma'>(abaFixa ?? 'orcamento');
  const [novoItemOrcamento, setNovoItemOrcamento] = useState({ categoria: '', valor: '' });
  const [novoMarco, setNovoMarco] = useState({ titulo: '', dataPrevista: '' });
  // Alterar/Consultar de item de orçamento e marco (15-09-2026, pedido do
  // Lucas: "os 3 ícones de sempre de ações, alterar, consultar e excluir")
  // - mesmo padrão de edição em linha já usado pra Link Acadêmico em
  // modal-usuario.tsx (linha vira input + Salvar/Cancelar; fora de edição,
  // vira Alterar/Consultar/Excluir). Consultar é `ModalDetalhe` (mesmo
  // componente, mesmo `rotuloAcao="Consultar"` que Link Acadêmico usa) -
  // não tem nada escondido pra mostrar que a própria linha já não mostre,
  // mas o Lucas pediu os 3 ícones por consistência com o resto do painel.
  const [idOrcamentoEditando, setIdOrcamentoEditando] = useState<number | null>(null);
  const [formEdicaoOrcamento, setFormEdicaoOrcamento] = useState({ categoria: '', valor: '' });
  const [itemOrcamentoConsultado, setItemOrcamentoConsultado] = useState<OrcamentoCampanhaResponse | null>(null);
  const [idMarcoEditando, setIdMarcoEditando] = useState<number | null>(null);
  const [formEdicaoMarco, setFormEdicaoMarco] = useState({ titulo: '', dataPrevista: '' });
  const [marcoConsultado, setMarcoConsultado] = useState<MarcoCronogramaResponse | null>(null);

  // Ref (não dependência de `carregar`) - `aoCarregar` recebe uma arrow
  // function nova a cada render do modal pai; colocar ela nas dependências
  // de `useCallback` recriaria `carregar` toda hora, disparando o efeito
  // de baixo em loop. O ref sempre lê a versão mais recente sem esse risco.
  // Atualizado em `useEffect` (não direto no corpo do componente) - mutar
  // ref durante o render é proibido pela regra `react-hooks/refs`.
  const aoCarregarRef = useRef(aoCarregar);
  useEffect(() => {
    aoCarregarRef.current = aoCarregar;
  });

  const carregar = useCallback(() => {
    Promise.all([
      orcamentoCampanhaApi.listar(auth.authFetch, idCampanha).catch(() => []),
      marcoCronogramaApi.listar(auth.authFetch, idCampanha).catch(() => []),
    ])
      .then(([dadosOrcamento, dadosCronograma]) => {
        setOrcamento(dadosOrcamento);
        setCronograma(dadosCronograma);
        aoCarregarRef.current?.(dadosOrcamento, dadosCronograma);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCampanha]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const adicionarItemOrcamento = async () => {
    if (!novoItemOrcamento.categoria || !novoItemOrcamento.valor) return;
    await chamarERegistrar<void>('/orcamento-campanha', {
      method: 'POST',
      body: JSON.stringify({ idCampanha, categoria: novoItemOrcamento.categoria, valor: Number(novoItemOrcamento.valor) }),
    }).catch(() => {});
    setNovoItemOrcamento({ categoria: '', valor: '' });
    carregar();
  };

  const removerItemOrcamento = async (idOrcamento: number) => {
    await chamarERegistrar<void>(`/orcamento-campanha/${idOrcamento}`, { method: 'DELETE' }).catch(() => {});
    carregar();
  };

  const iniciarEdicaoOrcamento = (item: OrcamentoCampanhaResponse) => {
    setIdOrcamentoEditando(item.idOrcamento);
    setFormEdicaoOrcamento({ categoria: item.categoria, valor: String(item.valor) });
  };

  const salvarEdicaoOrcamento = async () => {
    if (!formEdicaoOrcamento.categoria || !formEdicaoOrcamento.valor) return;
    await chamarERegistrar<void>(`/orcamento-campanha/${idOrcamentoEditando}`, {
      method: 'PATCH',
      body: JSON.stringify({ categoria: formEdicaoOrcamento.categoria, valor: Number(formEdicaoOrcamento.valor) }),
    }).catch(() => {});
    setIdOrcamentoEditando(null);
    carregar();
  };

  const adicionarMarco = async () => {
    if (!novoMarco.titulo || !novoMarco.dataPrevista) return;
    await chamarERegistrar<void>('/marco-cronograma', {
      method: 'POST',
      body: JSON.stringify({ idCampanha, titulo: novoMarco.titulo, dataPrevista: new Date(novoMarco.dataPrevista).toISOString() }),
    }).catch(() => {});
    setNovoMarco({ titulo: '', dataPrevista: '' });
    carregar();
  };

  const removerMarco = async (idMarco: number) => {
    await chamarERegistrar<void>(`/marco-cronograma/${idMarco}`, { method: 'DELETE' }).catch(() => {});
    carregar();
  };

  const iniciarEdicaoMarco = (marco: MarcoCronogramaResponse) => {
    setIdMarcoEditando(marco.idMarco);
    setFormEdicaoMarco({ titulo: marco.titulo, dataPrevista: marco.dataPrevista.slice(0, 10) });
  };

  const salvarEdicaoMarco = async () => {
    if (!formEdicaoMarco.titulo || !formEdicaoMarco.dataPrevista) return;
    await chamarERegistrar<void>(`/marco-cronograma/${idMarcoEditando}`, {
      method: 'PATCH',
      body: JSON.stringify({ titulo: formEdicaoMarco.titulo, dataPrevista: new Date(formEdicaoMarco.dataPrevista).toISOString() }),
    }).catch(() => {});
    setIdMarcoEditando(null);
    carregar();
  };

  return (
    <div>
      {!abaFixa && (
        <div className="flex gap-2 mb-3">
          <button type="button" className={`btn ${abaAtiva === 'orcamento' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('orcamento')}>
            Orçamento
          </button>
          <button type="button" className={`btn ${abaAtiva === 'cronograma' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('cronograma')}>
            Cronograma
          </button>
        </div>
      )}

      {abaAtiva === 'orcamento' && (
        <>
          {/* Meta/Soma em estilo tabela simples, 2 textbox readonly
              (15-09-2026, pedido do Lucas - a versão anterior era "1 texto
              inteiro" numa frase só, "esquisito"; o Projeto de Interface já
              tinha achado o formato certo: rótulo + valor comparável lado a
              lado, sem badge/palavra "aprovar" nenhuma - isto aqui é
              criação, não aprovação). `.borda-erro` (já existe pra
              `.input-padrao`, mesmo par usado no resto do painel) marca a
              Soma quando ela não bate com a Meta - sem precisar de um
              badge ao lado pra dizer a mesma coisa 2x. */}
          {metaFinanceira !== undefined && (() => {
            const somaOrcamento = orcamento.reduce((soma, item) => soma + item.valor, 0);
            const bate = somaOrcamento === metaFinanceira;
            return (
              <table className="crud-tabela mb-3">
                <tbody>
                  <tr>
                    <td>Meta</td>
                    <td><input type="text" readOnly value={formatarMoeda(metaFinanceira)} className="input-padrao" /></td>
                  </tr>
                  <tr>
                    <td>Soma atual</td>
                    <td><input type="text" readOnly value={formatarMoeda(somaOrcamento)} className={'input-padrao' + (bate ? '' : ' borda-erro')} /></td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
          <table className="crud-tabela mb-3">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Valor</th>
              {podeEditar && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {orcamento.map((item) => {
              const emEdicao = idOrcamentoEditando === item.idOrcamento;
              return (
                <tr key={item.idOrcamento}>
                  {emEdicao ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={formEdicaoOrcamento.categoria}
                          onChange={(e) => setFormEdicaoOrcamento({ ...formEdicaoOrcamento, categoria: e.target.value })}
                          className="input-padrao"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={formEdicaoOrcamento.valor}
                          onChange={(e) => setFormEdicaoOrcamento({ ...formEdicaoOrcamento, valor: e.target.value })}
                          className="input-padrao"
                        />
                      </td>
                      {podeEditar && (
                        <td>
                          <div className="crud-tabela__acoes">
                            <AcaoLinha rotulo="Salvar" icone="fa-check" variante="alterar" onClick={salvarEdicaoOrcamento} />
                            <AcaoLinha rotulo="Cancelar" icone="fa-xmark" onClick={() => setIdOrcamentoEditando(null)} />
                          </div>
                        </td>
                      )}
                    </>
                  ) : (
                    <>
                      <td>{item.categoria}</td>
                      <td>{formatarMoeda(item.valor)}</td>
                      {podeEditar && (
                        <td>
                          <div className="crud-tabela__acoes">
                            <AcaoLinha rotulo="Alterar" icone="fa-pen" variante="alterar" onClick={() => iniciarEdicaoOrcamento(item)} />
                            <AcaoLinha rotulo="Consultar" icone="fa-eye" onClick={() => setItemOrcamentoConsultado(item)} />
                            <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => removerItemOrcamento(item.idOrcamento)} />
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })}
            {podeEditar && (
              <tr>
                <td>
                  <input type="text" value={novoItemOrcamento.categoria} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, categoria: e.target.value })} className="input-padrao" placeholder="Categoria" />
                </td>
                <td>
                  <input type="number" value={novoItemOrcamento.valor} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, valor: e.target.value })} className="input-padrao" placeholder="Valor" />
                </td>
                <td>
                  <button type="button" className="btn btn-sucesso text-xs" onClick={adicionarItemOrcamento}>
                    + adicionar
                  </button>
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </>
      )}

      {abaAtiva === 'cronograma' && (
        <>
          {/* Mesmo estilo simples do Orçamento acima - mínimo/cadastrados
              em textbox readonly, `.borda-erro` só no valor que não bate. */}
          {minimoMarcosCronograma !== undefined && (
            <table className="crud-tabela mb-3">
              <tbody>
                <tr>
                  <td>Mínimo de marcos</td>
                  <td><input type="text" readOnly value={minimoMarcosCronograma} className="input-padrao" /></td>
                </tr>
                <tr>
                  <td>Marcos cadastrados</td>
                  <td><input type="text" readOnly value={cronograma.length} className={'input-padrao' + (cronograma.length >= minimoMarcosCronograma ? '' : ' borda-erro')} /></td>
                </tr>
              </tbody>
            </table>
          )}
        <table className="crud-tabela mb-3">
          <thead>
            <tr>
              <th>Título</th>
              <th>Data prevista</th>
              {podeEditar && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {cronograma.map((marco) => {
              const emEdicao = idMarcoEditando === marco.idMarco;
              return (
                <tr key={marco.idMarco}>
                  {emEdicao ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={formEdicaoMarco.titulo}
                          onChange={(e) => setFormEdicaoMarco({ ...formEdicaoMarco, titulo: e.target.value })}
                          className="input-padrao"
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={formEdicaoMarco.dataPrevista}
                          min={dataInicioCampanha}
                          onChange={(e) => setFormEdicaoMarco({ ...formEdicaoMarco, dataPrevista: e.target.value })}
                          className="input-padrao"
                        />
                      </td>
                      {podeEditar && (
                        <td>
                          <div className="crud-tabela__acoes">
                            <AcaoLinha rotulo="Salvar" icone="fa-check" variante="alterar" onClick={salvarEdicaoMarco} />
                            <AcaoLinha rotulo="Cancelar" icone="fa-xmark" onClick={() => setIdMarcoEditando(null)} />
                          </div>
                        </td>
                      )}
                    </>
                  ) : (
                    <>
                      <td>{marco.titulo}</td>
                      <td>{new Date(marco.dataPrevista).toLocaleDateString('pt-BR')}</td>
                      {podeEditar && (
                        <td>
                          <div className="crud-tabela__acoes">
                            <AcaoLinha rotulo="Alterar" icone="fa-pen" variante="alterar" onClick={() => iniciarEdicaoMarco(marco)} />
                            <AcaoLinha rotulo="Consultar" icone="fa-eye" onClick={() => setMarcoConsultado(marco)} />
                            <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => removerMarco(marco.idMarco)} />
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })}
            {podeEditar && (
              <tr>
                <td>
                  <input type="text" value={novoMarco.titulo} onChange={(e) => setNovoMarco({ ...novoMarco, titulo: e.target.value })} className="input-padrao" placeholder="Título" />
                </td>
                <td>
                  <input type="date" value={novoMarco.dataPrevista} min={dataInicioCampanha} onChange={(e) => setNovoMarco({ ...novoMarco, dataPrevista: e.target.value })} className="input-padrao" />
                </td>
                <td>
                  <button type="button" className="btn btn-secondary text-xs" onClick={adicionarMarco}>
                    + adicionar
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </>
      )}

      {itemOrcamentoConsultado && (
        <ModalDetalhe
          titulo="Item de orçamento"
          rotuloAcao="Consultar"
          aoFechar={() => setItemOrcamentoConsultado(null)}
          secoes={[
            { titulo: 'Categoria', conteudo: itemOrcamentoConsultado.categoria },
            { titulo: 'Valor', conteudo: formatarMoeda(itemOrcamentoConsultado.valor) },
          ]}
        />
      )}

      {marcoConsultado && (
        <ModalDetalhe
          titulo="Marco de cronograma"
          rotuloAcao="Consultar"
          aoFechar={() => setMarcoConsultado(null)}
          secoes={[
            { titulo: 'Título', conteudo: marcoConsultado.titulo },
            { titulo: 'Data prevista', conteudo: new Date(marcoConsultado.dataPrevista).toLocaleDateString('pt-BR') },
          ]}
        />
      )}
    </div>
  );
}

// T2, Bancada da Campanha. SEM ELENCO (25-08-2026, pedido do Lucas:
// "remover de vez" o motor de login-múltiplo - redesenho completo desta
// tela). Toda chamada usa a sessão REAL do painel (`auth`, sempre um
// admin): leituras sempre funcionaram assim (relatorio_visualizar vê
// tudo); as ESCRITAS que hoje continuam fazendo sentido (Alterar,
// orçamento/cronograma, Aprovar, Rejeitar, Excluir) também - o admin já
// tem `campanha_editar`/`campanha_aprovar`/`campanha_rejeitar`, RLS
// libera não importa quem seja o dono de verdade (04_rls_policies.sql,
// pol_campanha_update). Criar campanha SAIU daqui (RLS exige
// id_usuario = id_usuario_atual(), não dá pra "criar em nome de" um
// pesquisador escolhido sem personificação) - o Lucas vai detalhar
// depois como a criação pelo próprio pesquisador vai funcionar.
//
// SEM pré-filtro por pesquisador (12-09-2026, pedido do Lucas: "abandonar
// completamente" a coluna "Escolher" de T1 - ela era a ÚNICA fonte de
// `pesquisadorSelecionado`, então o pré-filtro que dependia dele aqui
// (tabela só mostrando campanhas de um dono escolhido em T1, resumo
// "Pesquisador selecionado (T1)" com "Limpar seleção") ficaria morto pra
// sempre, nunca mais alimentado por ninguém. Removido junto, não só
// deixado quieto.
//
// SEM "Escolher"/"campanha em foco" (13-09-2026, pedido do Lucas: "vamos
// tirar o Escolher também de T2") - mesmo raciocínio de T1: o painel
// "campanha em foco" (checklist "Pronta pra aprovar?" + Aprovar/Rejeitar +
// Orçamento/Cronograma) que vivia solto embaixo da tabela, alimentado só
// pela coluna "Escolher", foi embutido no modal de Alterar (que já mostra
// Orçamento/Cronograma - só faltava o checklist e os 2 botões). `campanhaFoco`
// saiu do `CampoTestesContext` por inteiro (única fonte era esta coluna) -
// T3 (Vida da Campanha Ativa), que dependia dele pra saber qual campanha
// usar, ganhou busca própria (ver vida-campanha-ativa.tsx), não depende
// mais de nada escolhido aqui.
export function BancadaCampanha({ auth }: PropsPagina) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();

  // CORRIGIDO (12-09-2026, achado de agente numa auditoria de hardcode):
  // eram constantes fixas (`MINIMO_ITENS_ORCAMENTO = 3`), cujo próprio
  // comentário já avisava "mostrado aqui só como RÓTULO, quem decide de
  // verdade é o banco" - mas `configuracoes.orcamento_min_itens` mudou de
  // 3 pra 1 em 05-09-2026 (RF revisado) e ninguém atualizou a cópia daqui.
  // Resultado: o botão "Aprovar" ficava desabilitado (`orcamentoOk`
  // calculado com o número ERRADO) mesmo quando o banco já aceitaria.
  // Lendo ao vivo agora, mesmo padrão de `seletor-foto-perfil.tsx`.
  const { obterConfiguracao } = useConfiguracoes();
  const valorMinimoOrcamento = obterConfiguracao('orcamento_min_itens', 1);
  const minimoItensOrcamento = typeof valorMinimoOrcamento === 'number' ? valorMinimoOrcamento : 1;
  const valorMinimoCronograma = obterConfiguracao('cronograma_min_marcos', 3);
  const minimoMarcosCronograma = typeof valorMinimoCronograma === 'number' ? valorMinimoCronograma : 3;
  // Mesmo padrão dos 2 acima (14-09-2026, achado do Lucas: "Início/Fim não
  // deveriam ser opcionais, e tem prazo mínimo/máximo") - RF-066 já é
  // aplicado de verdade no banco (`fn_valida_prazo_campanha_negocio`,
  // 05_regras_negocio.sql), lendo estas 2 chaves; o formulário de criação
  // não lia nenhuma das duas, então só descobria o limite batendo num erro
  // 90012 cru do Postgres depois de enviar.
  const valorPrazoMinimo = obterConfiguracao('prazo_minimo_campanha_dias', 15);
  const prazoMinimoCampanha = typeof valorPrazoMinimo === 'number' ? valorPrazoMinimo : 15;
  const valorPrazoMaximo = obterConfiguracao('prazo_maximo_campanha_dias', 60);
  const prazoMaximoCampanha = typeof valorPrazoMaximo === 'number' ? valorPrazoMaximo : 60;
  // Mesmo padrão dos 3 acima (15-09-2026, achado numa auditoria contra
  // Meta mínima de campanha (ver REQUISITOS_V7) - `fn_valida_meta_campanha_negocio`,
  // 05_regras_negocio.sql - já rejeita meta abaixo de `meta_minima_campanha`,
  // mas o formulário de criação nunca lia essa chave, mesmo gap do prazo.
  const valorMetaMinima = obterConfiguracao('meta_minima_campanha', 500);
  const metaMinimaCampanha = typeof valorMetaMinima === 'number' ? valorMetaMinima : 500;

  const [areas, setAreas] = useState<AreaConhecimentoResponse[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [perfisPesquisador, setPerfisPesquisador] = useState<PerfilPesquisadorResponse[]>([]);
  const [campanhas, setCampanhas] = useState<CampanhaResponse[]>([]);
  // Ligado por padrão (pedido do Lucas): a demo pré-montada (campanhas
  // 1-10) não serve pra testar, então já nasce fora da vista.
  const [ocultarBloqueadas, setOcultarBloqueadas] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<number | 'todos'>(10);
  const [statusSelecionados, setStatusSelecionados] = useState<StatusCampanha[]>([]);
  const [campanhaConsultada, setCampanhaConsultada] = useState<CampanhaResponse | null>(null);
  const [historicoRejeicaoConsultada, setHistoricoRejeicaoConsultada] = useState<HistoricoRejeicaoResponse[]>([]);

  // Histórico de rejeições da campanha aberta em Consultar (14-09-2026) -
  // mesmo dado/mesma chamada de consultar-campanha.tsx, só que esta tela é
  // uma cópia manual da página real (ver comentário grande perto do modal,
  // "Consultar replica a página real") - mantendo os dois em sincronia.
  useEffect(() => {
    if (campanhaConsultada) {
      campanhaApi
        .listarHistoricoRejeicao(auth.authFetch, campanhaConsultada.idCampanha)
        .then(setHistoricoRejeicaoConsultada)
        .catch(() => setHistoricoRejeicaoConsultada([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanhaConsultada]);
  const [idCampanhaEditando, setIdCampanhaEditando] = useState<number | null>(null);
  const [formEdicaoCampanha, setFormEdicaoCampanha] = useState<FormEdicaoCampanha | null>(null);
  // Checklist "Pronta pra aprovar?" + Aprovar/Rejeitar (13-09-2026, trazido
  // pra dentro do modal de Alterar - ver comentário grande acima). As
  // contagens vêm do `aoCarregar` de <PainelOrcamentoCronograma> (o mesmo
  // componente que já desenha Orçamento/Cronograma editável logo acima no
  // modal) - mantém as duas listas sincronizadas sem duplicar
  // adicionar/remover.
  const [checklistOrcamento, setChecklistOrcamento] = useState<OrcamentoCampanhaResponse[]>([]);
  const [checklistCronograma, setChecklistCronograma] = useState<MarcoCronogramaResponse[]>([]);
  const [justificativaRejeicaoEdicao, setJustificativaRejeicaoEdicao] = useState('');
  const [aprovando, setAprovando] = useState(false);
  const [rejeitando, setRejeitando] = useState(false);
  // Ciclo de rejeição e reenvio (21-09-2026, ver REQUISITOS_V7). `detalheRejeitada`
  // vem de GET /campanha/:id (a listagem NÃO traz reenviosRestantes/prazo/
  // somenteLeitura, só a consulta individual), buscado ao abrir Alterar numa
  // campanha rejeitada. `ofertaDatas` liga o aviso "as datas venceram" dentro do
  // próprio modal (e não um 2º modal empilhado: cada ModalFicha registra o seu
  // próprio listener de Esc, e dois abertos fechariam juntos).
  const [detalheRejeitada, setDetalheRejeitada] = useState<CampanhaResponse | null>(null);
  const [historicoEdicao, setHistoricoEdicao] = useState<HistoricoRejeicaoResponse[]>([]);
  const [ofertaDatas, setOfertaDatas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [campanhaExcluindo, setCampanhaExcluindo] = useState<CampanhaResponse | null>(null);
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [confirmacaoExclusaoForcada, setConfirmacaoExclusaoForcada] = useState('');
  const [excluindoForcado, setExcluindoForcado] = useState(false);

  // Criar Campanha (08-09-2026, pedido do Lucas: "o Admin deve conseguir
  // criar uma campanha e ASSOCIAR um pesquisador a ela") - mesmo padrão de
  // "Criar Perfil Pesquisador" em T1, só que campanha nunca teve um botão
  // de Criar aqui desde a remoção do Elenco (25-08-2026). Usa POST
  // /campanha/:idUsuario (endpoint de suporte/admin, ver
  // campanha.controller.create-para-outro.ts).
  const [criandoCampanha, setCriandoCampanha] = useState(false);
  const [formCriarCampanha, setFormCriarCampanha] = useState({
    titulo: '',
    idAreaConhecimento: '',
    metaFinanceira: '',
    descricao: '',
    dataInicio: '',
    dataFim: '',
    videoApresentacaoUrl: '',
  });
  // Fase pós-criação (14-09-2026, pedido do Lucas: "dentro do Modal não tem
  // Cronograma ou Orçamento... era para estar dentro do formulário") -
  // RF-040/RF-042 preveem orçamento/cronograma cadastrados "durante a
  // criação da campanha", mas os itens só podem existir depois da campanha
  // ter um `idCampanha` de verdade (FK). Nulo = ainda não criada.
  const [idCampanhaRecemCriada, setIdCampanhaRecemCriada] = useState<number | null>(null);
  // 3 etapas do MESMO modal (15-09-2026, pedido do Lucas: "Criar" virou
  // "Próximo", e Orçamento/Cronograma passam a ser 2 telas SEPARADAS e
  // focadas, com Voltar/Próximo entre elas, em vez de uma tabela só com
  // abas) - `PainelOrcamentoCronograma` (existia desde 08-09-2026, usado
  // em Alterar Campanha) ganhou a prop `abaFixa` só pra travar numa aba e
  // esconder o toggle entre elas nesta rodada, sem duplicar a tabela.
  // "Voltar" de Orçamento pra Dados PATCHa a campanha já criada (mesmo
  // endpoint de Alterar Campanha) em vez de tentar criar de novo - ver
  // `avancarDaEtapaDados`, abaixo.
  const [etapaCriarCampanha, setEtapaCriarCampanha] = useState<'dados' | 'orcamento' | 'cronograma'>('dados');
  // Combobox de pesquisador (08-09-2026, pedido do Lucas: "digitar 24 ou
  // marina, aparece até 5") - não é um <select> (lista de TODOS os
  // usuários seria enorme e sem indicar quem já é pesquisador de
  // verdade). Busca por id OU pedaço do nome, até 5 resultados; cada
  // resultado mostra se dá pra escolher (pesquisador ativo) ou não (sem
  // perfil / suspenso), com o motivo explícito - nunca deixa escolher
  // quem não pode, o backend também recusaria, mas é melhor a pessoa
  // nunca tentar.
  const [pesquisadorEscolhido, setPesquisadorEscolhido] = useState<UsuarioResponse | null>(null);
  const [buscaPesquisador, setBuscaPesquisador] = useState('');
  const [sugestoesPesquisadorAbertas, setSugestoesPesquisadorAbertas] = useState(false);
  const sugestoesPesquisadorRef = useRef<HTMLDivElement>(null);

  const carregarCampanhas = () => {
    campanhaApi.listar(auth.authFetch).then(setCampanhas).catch(() => {});
  };

  useEffect(() => {
    areaConhecimentoApi
      .listar(auth.authFetch)
      .then((lista) => setAreas(lista.filter((area) => area.idPai !== null)))
      .catch(() => {});
    usuarioApi.listar(auth.authFetch).then(setUsuarios).catch(() => {});
    perfilPesquisadorApi.listar(auth.authFetch).then(setPerfisPesquisador).catch(() => {});
    carregarCampanhas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fechar as sugestões do combobox de pesquisador ao clicar fora - mesmo
  // padrão, extraído em `useFecharAoClicarFora` em 13-09-2026. O dropdown
  // "Status" tem o próprio fechamento embutido em `BarraFiltros` desde
  // 14-09-2026.
  useFecharAoClicarFora(sugestoesPesquisadorRef, sugestoesPesquisadorAbertas, () => setSugestoesPesquisadorAbertas(false));

  const nomeDe = (idUsuario: number): string => usuarios.find((u) => u.idUsuario === idUsuario)?.nome ?? `#${idUsuario}`;

  // 'ativo' = pode ser escolhido pra Criar Campanha; 'suspenso'/'sem-perfil'
  // só existem pra mostrar o motivo certo no combobox, nunca selecionáveis
  // (o backend também recusaria - criar_campanha_para_outro exige
  // status_pesquisador = 'ativo').
  const statusPesquisadorParaCriar = (idUsuario: number): 'ativo' | 'suspenso' | 'sem-perfil' => {
    const perfil = perfisPesquisador.find((p) => p.idUsuario === idUsuario);
    if (!perfil) return 'sem-perfil';
    return perfil.statusPesquisador === 'suspenso' ? 'suspenso' : 'ativo';
  };

  // Busca por id OU pedaço do nome (08-09-2026, pedido do Lucas) - até 5
  // resultados, sem filtro nenhum além do texto digitado (mostra
  // pesquisador e não-pesquisador juntos, cada um com seu próprio aviso).
  const sugestoesPesquisador = (() => {
    const termo = buscaPesquisador.trim().toLowerCase();
    if (!termo) return [];
    return usuarios
      .filter((usuario) => String(usuario.idUsuario).includes(termo) || usuario.nome.toLowerCase().includes(termo))
      .slice(0, LIMITE_SUGESTOES_COMBOBOX);
  })();

  // Opções do dropdown "Status" - só os valores que já aparecem nos
  // dados (mesmo sniff de GenericTable/bancada-pesquisador.tsx), sem
  // lista fixa do enum (evita hardcoded - se um status novo aparecer, o
  // facet já mostra sozinho).
  const opcoesStatus = [...new Set(campanhas.map((c) => c.status))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const campanhasFiltradas = campanhas
    .filter((item) => !ocultarBloqueadas || !CAMPANHA_BLOQUEADA(item.idCampanha))
    .filter((item) => statusSelecionados.length === 0 || statusSelecionados.includes(item.status))
    .filter((item) => {
      const termo = filtroTexto.trim().toLowerCase();
      if (!termo) return true;
      return [item.idCampanha, item.titulo, item.status, nomeDe(item.idUsuario)].some((valor) =>
        String(valor).toLowerCase().includes(termo),
      );
    });
  const { totalPaginas, paginaAtual, itensPagina: campanhasPagina } = paginarClientSide(campanhasFiltradas, pagina, tamanhoPagina);

  const iniciarEdicaoCampanha = (item: CampanhaResponse) => {
    setIdCampanhaEditando(item.idCampanha);
    setFormEdicaoCampanha({
      titulo: item.titulo,
      idAreaConhecimento: item.idAreaConhecimento,
      metaFinanceira: item.metaFinanceira,
      descricao: item.descricao ?? '',
      dataInicio: item.dataInicio ? item.dataInicio.slice(0, 10) : '',
      dataFim: item.dataFim ? item.dataFim.slice(0, 10) : '',
      videoApresentacaoUrl: item.videoApresentacaoUrl ?? '',
    });
    // Checklist "Pronta pra aprovar?" recomeça vazio a cada abertura -
    // <PainelOrcamentoCronograma> preenche via `aoCarregar` assim que
    // busca os dados de verdade (mesmo idCampanha do modal).
    setChecklistOrcamento([]);
    setChecklistCronograma([]);
    setJustificativaRejeicaoEdicao('');
    setDetalheRejeitada(null);
    setHistoricoEdicao([]);
    setOfertaDatas(false);
    if (item.status === 'rejeitado') {
      campanhaApi
        .buscar(auth.authFetch, item.idCampanha)
        .then(setDetalheRejeitada)
        .catch(() => setDetalheRejeitada(null));
      campanhaApi
        .listarHistoricoRejeicao(auth.authFetch, item.idCampanha)
        .then(setHistoricoEdicao)
        .catch(() => setHistoricoEdicao([]));
    }
  };

  // PATCH /campanha/:id (dono OU campanha_editar) - sem status/id_admin/
  // taxa_plataforma/modelo aqui de propósito, ver campanha.request-update.
  // ts: quem muda status são aprovar/rejeitar, nunca este PATCH genérico.
  const gravarEdicaoCampanha = (id: number, form: FormEdicaoCampanha) =>
    chamarERegistrar<void>(`/campanha/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        titulo: form.titulo,
        idAreaConhecimento: Number(form.idAreaConhecimento),
        metaFinanceira: Number(form.metaFinanceira),
        ...(form.descricao ? { descricao: form.descricao } : {}),
        ...(form.dataInicio ? { dataInicio: new Date(form.dataInicio).toISOString() } : {}),
        ...(form.dataFim ? { dataFim: new Date(form.dataFim).toISOString() } : {}),
        ...(form.videoApresentacaoUrl ? { videoApresentacaoUrl: form.videoApresentacaoUrl } : {}),
      }),
    });

  const salvarEdicaoCampanha = async () => {
    if (!formEdicaoCampanha?.titulo || idCampanhaEditando === null) return;
    try {
      await gravarEdicaoCampanha(idCampanhaEditando, formEdicaoCampanha);
      const idEditado = idCampanhaEditando;
      setIdCampanhaEditando(null);
      carregarCampanhas();
      mostrar('Campanha alterada com sucesso.', `ID: ${idEditado} foi alterada`);
    } catch (erro) {
      reportarErro(erro);
    }
  };

  // "Enviar para aprovação" (rascunho) e "Corrigir e reenviar" (rejeitada),
  // 21-09-2026. Grava o formulário ANTES de enviar, senão uma alteração ainda
  // não salva se perderia em silêncio. Nenhuma checagem de completude aqui de
  // propósito: quem cobra orçamento, cronograma e prazo é
  // trg_campanha_valida_completude (05), e o erro chega traduzido - o clique
  // acontece e o sistema DIZ o que falta (Heurísticas de Nielsen), em vez de um
  // botão desabilitado sem explicação. A única exceção é o prazo vencido: em vez
  // de deixar o erro estourar, oferece atualizar as datas mantendo a duração
  // (REQUISITOS_V7, "prazo vencido"), sempre com confirmação explícita.
  const dataFimVencida = (form: FormEdicaoCampanha) => Boolean(form.dataFim) && new Date(form.dataFim) <= new Date();

  const enviarEdicao = async (comDatasAtualizadas = false) => {
    if (!formEdicaoCampanha || idCampanhaEditando === null) return;
    if (!comDatasAtualizadas && dataFimVencida(formEdicaoCampanha)) {
      setOfertaDatas(true);
      return;
    }
    setEnviando(true);
    try {
      await gravarEdicaoCampanha(idCampanhaEditando, formEdicaoCampanha);
      if (comDatasAtualizadas) {
        await chamarERegistrar<CampanhaResponse>(`/campanha/${idCampanhaEditando}/deslizar-datas`, {
          method: 'POST',
          body: JSON.stringify({ novaDataInicio: new Date().toISOString() }),
        });
      }
      await chamarERegistrar<CampanhaResponse>(`/campanha/${idCampanhaEditando}/enviar`, { method: 'POST' });
      mostrar('Campanha enviada para aprovação.', `ID: ${idCampanhaEditando}`);
      setIdCampanhaEditando(null);
      carregarCampanhas();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setEnviando(false);
    }
  };

  // Aprovar/Rejeitar (13-09-2026, trazido pra dentro do modal de Alterar -
  // ERA um botão do painel "campanha em foco", solto embaixo da tabela,
  // alimentado só pela coluna "Escolher") - escopados a `idCampanhaEditando`
  // (o modal aberto), não mais a um "foco" separado. Fecham o modal ao
  // terminar (mudar de status torna o resto do formulário obsoleto - "Salvar"
  // não faz mais sentido depois de aprovar/rejeitar).
  const aprovarEdicao = async () => {
    if (idCampanhaEditando === null) return;
    setAprovando(true);
    try {
      await chamarERegistrar<void>(`/campanha/${idCampanhaEditando}/aprovar`, { method: 'POST' });
      mostrar('Campanha aprovada com sucesso.', `ID: ${idCampanhaEditando} foi aprovada`);
      setIdCampanhaEditando(null);
      carregarCampanhas();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setAprovando(false);
    }
  };

  const rejeitarEdicao = async () => {
    if (idCampanhaEditando === null) return;
    setRejeitando(true);
    try {
      await chamarERegistrar<void>(`/campanha/${idCampanhaEditando}/rejeitar`, {
        method: 'POST',
        body: JSON.stringify({ justificativa: justificativaRejeicaoEdicao || undefined }),
      });
      mostrar('Campanha rejeitada com sucesso.', `ID: ${idCampanhaEditando} foi rejeitada`);
      setIdCampanhaEditando(null);
      carregarCampanhas();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setRejeitando(false);
    }
  };

  // Só permitido em 'rascunho' (RLS: pol_campanha_delete, ver
  // 04_rls_policies.sql) - era 'aguardando_aprovacao' até 20-09-2026, e essa
  // versão antiga tinha um bug: uma campanha rejeitada e reenviada volta pra
  // 'aguardando_aprovacao' já com linha em historico_rejeicao, cuja FK não tem
  // ON DELETE CASCADE, então o DELETE travava em violação de FK.
  // Cascateia orçamento/cronograma/atualizações/seguidores/comentários
  // (ON DELETE CASCADE, 01_extensoes_enums_tabelas.sql), sem risco: nada
  // disso existe ainda pra uma campanha que nunca saiu do rascunho.
  //
  // CORRIGIDO (08-09-2026, pedido do Lucas: "consertar T2... modal de
  // Excluir") - antes o botão "Excluir" da tabela apagava na hora, sem
  // NENHUMA confirmação (só um `disabled` quando o status não permitia) -
  // diferente de Excluir Usuário, que sempre exigiu digitar o e-mail antes.
  // Exclusão de campanha é DELETE de verdade (não lógica, como usuário) -
  // mereceu a mesma barreira, ou mais.
  const excluirCampanha = async () => {
    if (!campanhaExcluindo) return;
    setExcluindo(true);
    try {
      await chamarERegistrar<void>(`/campanha/${campanhaExcluindo.idCampanha}`, { method: 'DELETE' });
      carregarCampanhas();
      mostrar('Campanha excluída com sucesso.', `ID: ${campanhaExcluindo.idCampanha} foi excluída`);
      setCampanhaExcluindo(null);
      setConfirmacaoExclusao('');
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setExcluindo(false);
    }
  };

  // forcar_exclusao_campanha() (08-09-2026, pedido do Lucas: "o Admin, o
  // todo poderoso, precisa poder excluir forçadamente uma campanha, senão
  // este campo de testes vai ficar muito sujo") - ignora status de
  // propósito (POST /campanha/:id/forcar-exclusao, endpoint separado do
  // DELETE normal, que desde 20-09-2026 só libera 'rascunho'). Só
  // oferecida quando a campanha NÃO é uma das 10 de demonstração - essas
  // continuam protegidas de qualquer exclusão, forçada ou não.
  const forcarExclusaoCampanha = async () => {
    if (!campanhaExcluindo) return;
    setExcluindoForcado(true);
    try {
      await chamarERegistrar<void>(`/campanha/${campanhaExcluindo.idCampanha}/forcar-exclusao`, { method: 'POST' });
      carregarCampanhas();
      mostrar('Campanha excluída à força com sucesso.', `ID: ${campanhaExcluindo.idCampanha} foi excluída`);
      setCampanhaExcluindo(null);
      setConfirmacaoExclusaoForcada('');
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setExcluindoForcado(false);
    }
  };

  // Hoje em formato de <input type="date"> (yyyy-mm-dd, fuso local) - usado
  // como `min` do campo Início, pra o próprio navegador impedir escolher
  // ontem ou antes (14-09-2026, achado do Lucas: "obviamente não deve dar
  // pra iniciar no dia anterior"). `toISOString()` sozinho usaria UTC, que
  // pode cair no dia ERRADO pra quem está em fuso negativo (ex.: 23h de
  // 14/09 em Brasília já é 15/09 em UTC) - por isso monta a string local
  // campo a campo, igual `getFullYear`/`getMonth`/`getDate` do próprio
  // objeto Date, em vez de `toISOString().slice(0, 10)`.
  const hojeISO = (() => {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  })();

  // Duração em dias corridos entre Início/Fim, pra validar contra
  // RF-066 (`prazo_minimo_campanha_dias`/`prazo_maximo_campanha_dias`) ANTES
  // de mandar pro backend - o banco já rejeita fora do intervalo
  // (`fn_valida_prazo_campanha_negocio`), isto só adianta o aviso.
  const duracaoDiasCriar =
    formCriarCampanha.dataInicio && formCriarCampanha.dataFim
      ? Math.round(
          (new Date(formCriarCampanha.dataFim).getTime() - new Date(formCriarCampanha.dataInicio).getTime()) /
            86400000,
        )
      : null;
  const duracaoCriarValida =
    duracaoDiasCriar !== null && duracaoDiasCriar >= prazoMinimoCampanha && duracaoDiasCriar <= prazoMaximoCampanha;

  const formCriarCampanhaValido =
    Boolean(pesquisadorEscolhido) &&
    Boolean(formCriarCampanha.titulo) &&
    Boolean(formCriarCampanha.idAreaConhecimento) &&
    Boolean(formCriarCampanha.metaFinanceira) &&
    Number(formCriarCampanha.metaFinanceira) >= metaMinimaCampanha &&
    Boolean(formCriarCampanha.dataInicio) &&
    Boolean(formCriarCampanha.dataFim) &&
    formCriarCampanha.dataInicio >= hojeISO &&
    duracaoCriarValida;

  // Corpo do request é o mesmo pra criar e pra atualizar (os 2 DTOs do
  // Nest aceitam os mesmos 7 campos) - só o método/rota mudam.
  const corpoDadosCampanha = () => ({
    idAreaConhecimento: Number(formCriarCampanha.idAreaConhecimento),
    titulo: formCriarCampanha.titulo,
    metaFinanceira: Number(formCriarCampanha.metaFinanceira),
    dataInicio: new Date(formCriarCampanha.dataInicio).toISOString(),
    dataFim: new Date(formCriarCampanha.dataFim).toISOString(),
    ...(formCriarCampanha.descricao ? { descricao: formCriarCampanha.descricao } : {}),
    ...(formCriarCampanha.videoApresentacaoUrl ? { videoApresentacaoUrl: formCriarCampanha.videoApresentacaoUrl } : {}),
  });

  // Botão "Próximo" da etapa Dados (15-09-2026, ERA "Criar") - na 1ª vez
  // (idCampanhaRecemCriada ainda nulo) cria a campanha de verdade; se a
  // pessoa voltou da etapa Orçamento pra corrigir algo aqui, a campanha JÁ
  // existe - "Próximo" de novo faz um PATCH (mesmo endpoint de Alterar
  // Campanha) em vez de tentar criar outra. Nos dois casos, avança pra
  // Orçamento no final.
  const avancarDaEtapaDados = async () => {
    if (!formCriarCampanhaValido || !pesquisadorEscolhido) {
      return;
    }
    try {
      if (idCampanhaRecemCriada === null) {
        const nova = await chamarERegistrar<CampanhaResponse>(`/campanha/${pesquisadorEscolhido.idUsuario}`, {
          method: 'POST',
          body: JSON.stringify(corpoDadosCampanha()),
        });
        carregarCampanhas();
        setIdCampanhaRecemCriada(nova.idCampanha);
        mostrar('Campanha criada com sucesso.', `ID: ${nova.idCampanha}, em nome de ${nomeDe(nova.idUsuario)}`);
      } else {
        await chamarERegistrar<void>(`/campanha/${idCampanhaRecemCriada}`, {
          method: 'PATCH',
          body: JSON.stringify(corpoDadosCampanha()),
        });
        carregarCampanhas();
      }
      setEtapaCriarCampanha('orcamento');
    } catch (erro) {
      reportarErro(erro);
    }
  };

  // "Enviar para aprovação" (20-09-2026, junto com o status 'rascunho') -
  // substituiu o antigo "Concluir", que só fechava o modal e deixava a
  // campanha numa fila que ninguém podia aprovar.
  //
  // De propósito NÃO tem validação client-side antes de chamar: quem cobra
  // orçamento completo, soma batendo com a meta, cronograma e prazo não
  // vencido é trg_campanha_valida_completude_aprovacao (05), e o erro dele
  // chega aqui traduzido pelo PostgresExceptionFilter. É o comportamento que
  // o Lucas pediu nas Heurísticas de Nielsen: o clique acontece e o sistema
  // DIZ o que falta, em vez de um botão desabilitado sem explicação.
  //
  // Se falhar, o modal fica aberto: a campanha continua em rascunho, o
  // trabalho não se perde, e a pessoa pode voltar nas etapas e corrigir.
  const enviarCampanhaParaAprovacao = async () => {
    if (idCampanhaRecemCriada === null) {
      return;
    }
    try {
      await chamarERegistrar<CampanhaResponse>(`/campanha/${idCampanhaRecemCriada}/enviar`, {
        method: 'POST',
      });
      carregarCampanhas();
      mostrar('Campanha enviada para aprovação.', `ID: ${idCampanhaRecemCriada}`);
      fecharModalCriarCampanha();
    } catch (erro) {
      reportarErro(erro);
    }
  };

  // Fecha o modal de verdade e limpa tudo pra próxima abertura - chamado pelo
  // "Cancelar"/X (a campanha já criada FICA salva como rascunho, nada se
  // perde) e pelo sucesso do "Enviar para aprovação".
  const fecharModalCriarCampanha = () => {
    setCriandoCampanha(false);
    setPesquisadorEscolhido(null);
    setBuscaPesquisador('');
    setIdCampanhaRecemCriada(null);
    setEtapaCriarCampanha('dados');
    setFormCriarCampanha({
      titulo: '',
      idAreaConhecimento: '',
      metaFinanceira: '',
      descricao: '',
      dataInicio: '',
      dataFim: '',
      videoApresentacaoUrl: '',
    });
  };

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h2 className="titulo-secao">Campo de Testes - Bancada da Campanha</h2>
        <div className="crud-secao__acao-topo">
          <button type="button" className="btn btn-primary" onClick={() => setCriandoCampanha(true)}>
            Criar
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="subtitulo">Campanhas</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={ocultarBloqueadas}
              onChange={(evento) => {
                setOcultarBloqueadas(evento.target.checked);
                setPagina(1);
              }}
            />
            Ocultar bloqueadas (demonstração)
          </label>
        </div>
      </div>

      <BarraFiltros
        mostrarBusca={campanhas.length > LIMIAR_FILTRO}
        valorBusca={filtroTexto}
        aoMudarBusca={(valor) => {
          setFiltroTexto(valor);
          setPagina(1);
        }}
        facetas={[
          {
            chave: 'status',
            rotulo: 'Status',
            opcoes: opcoesStatus,
            selecionados: statusSelecionados,
            aoAlternar: (opcao) => {
              const status = opcao as StatusCampanha;
              setStatusSelecionados((atuais) =>
                atuais.includes(status) ? atuais.filter((s) => s !== status) : [...atuais, status],
              );
              setPagina(1);
            },
            aoLimpar: () => {
              setStatusSelecionados([]);
              setPagina(1);
            },
          },
        ]}
      />

      <table className="crud-tabela mb-2">
        <thead>
          <tr>
            <th className="crud-tabela__coluna-id crud-tabela__celula--centralizada">id</th>
            <th>título</th>
            <th className="crud-tabela__celula--centralizada">status</th>
            <th>dono</th>
            <th className="crud-tabela__celula--centralizada">meta</th>
            <th className="crud-tabela__celula--centralizada">Ações</th>
          </tr>
        </thead>
        <tbody>
          {campanhasPagina.length === 0 && (
            <tr>
              <td colSpan={6} className="texto-fraco">{filtroTexto ? 'Nenhum registro bate com o filtro.' : 'Nenhum registro.'}</td>
            </tr>
          )}
          {campanhasPagina.map((item) => {
            const bloqueada = CAMPANHA_BLOQUEADA(item.idCampanha);
            return (
                <tr key={item.idCampanha} className={bloqueada ? 'texto-fraco' : undefined}>
                  <td className="crud-tabela__coluna-id crud-tabela__celula--centralizada" style={bloqueada ? { textDecoration: 'line-through' } : undefined}>
                    {item.idCampanha}
                  </td>
                  <td style={bloqueada ? { textDecoration: 'line-through' } : undefined}>{item.titulo}</td>
                  <td
                    className="crud-tabela__celula--centralizada"
                    style={bloqueada ? { textDecoration: 'line-through' } : undefined}
                  >
                    <span className={`badge ${classeBadgeStatusCampanha(item.status)}`}>
                      {ROTULO_STATUS_CAMPANHA[item.status]}
                    </span>
                  </td>
                  <td style={bloqueada ? { textDecoration: 'line-through' } : undefined}>{nomeDe(item.idUsuario)}</td>
                  <td className="crud-tabela__celula--centralizada">{formatarMoeda(item.metaFinanceira)}</td>
                  {/* CORRIGIDO (13-09-2026, pedido do Lucas: "tirar o Escolher
                      também de T2") - a coluna sumiu, mas o cadeado continua
                      só em Alterar/Excluir; Consultar é leitura pura, sem
                      risco nenhum de estragar a demo. */}
                  <td className="crud-tabela__celula--centralizada">
                    <div className="crud-tabela__acoes">
                      <AcaoLinha
                        rotulo="Alterar"
                        icone="fa-pen"
                        variante="alterar"
                        onClick={() => iniciarEdicaoCampanha(item)}
                      />
                      <AcaoLinha
                        rotulo="Consultar"
                        icone="fa-eye"
                        onClick={() => setCampanhaConsultada(item)}
                      />
                      <AcaoLinha
                        rotulo="Excluir"
                        icone="fa-trash"
                        variante="excluir"
                        onClick={() => setCampanhaExcluindo(item)}
                      />
                    </div>
                  </td>
                </tr>
            );
          })}
        </tbody>
      </table>

      {/* Consultar/Alterar/Excluir em MODAL (08-09-2026, pedido do Lucas:
          "consertar T2... os modais primeiro") - mesmo padrão de T1
          (ModalFicha + SecaoFicha/CampoFicha). Diferença de T1: não existe
          página real de Alterar/Excluir Campanha no painel admin pra
          copiar (só Consultar existe, ver consultar-campanha.tsx -
          editar/excluir campanha é ação do dono, painel dele ainda não
          construído) - Consultar replica a página real; Alterar e Excluir
          são desenho novo, seguindo o mesmo padrão visual estabelecido. */}
      {campanhaConsultada && (
        <ModalFicha
          titulo={campanhaConsultada.titulo}
          subtitulo={`Pesquisador: ${nomeDe(campanhaConsultada.idUsuario)}`}
          badges={[
            <span key="status" className={`badge ${classeBadgeStatusCampanha(campanhaConsultada.status)}`}>
              {ROTULO_STATUS_CAMPANHA[campanhaConsultada.status]}
            </span>,
            <span key="modelo" className="badge badge-neutro">
              {campanhaConsultada.modelo}
            </span>,
          ]}
          aoFechar={() => setCampanhaConsultada(null)}
          rodape={
            <button type="button" onClick={() => setCampanhaConsultada(null)} className="btn btn-secondary w-full">
              Fechar
            </button>
          }
        >
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <SecaoFicha titulo="Dados">
                <CampoFicha rotulo="id" valor={campanhaConsultada.idCampanha} />
                <CampoFicha
                  rotulo="Área do conhecimento"
                  valor={areas.find((a) => a.idAreaConhecimento === campanhaConsultada.idAreaConhecimento)?.nome ?? `#${campanhaConsultada.idAreaConhecimento}`}
                />
                <CampoFicha rotulo="Descrição" valor={campanhaConsultada.descricao} largura="cheia" />
                <CampoFicha rotulo="Vídeo de apresentação" valor={campanhaConsultada.videoApresentacaoUrl} largura="cheia" />
              </SecaoFicha>

              {/* Orçamento/Cronograma acima de Datas (08-09-2026, pedido do
                  Lucas) - só leitura aqui (Consultar nunca edita nada).
                  Linha divisória dos dois lados, mesmo padrão já usado
                  entre Links Acadêmicos e Moderação em T1. */}
              <div className="border-t borda-padrao"></div>
              <PainelOrcamentoCronograma auth={auth} idCampanha={campanhaConsultada.idCampanha} podeEditar={false} />
              <div className="border-t borda-padrao"></div>

              <SecaoFicha titulo="Datas">
                <CampoFicha rotulo="Início" valor={formatarDataHora(campanhaConsultada.dataInicio)} />
                <CampoFicha rotulo="Fim (previsto)" valor={formatarDataHora(campanhaConsultada.dataFim)} />
                <CampoFicha rotulo="Criada em" valor={formatarDataHora(campanhaConsultada.criadoEm)} />
                <CampoFicha rotulo="Aprovada em" valor={formatarDataHora(campanhaConsultada.aprovadoEm)} />
                <CampoFicha rotulo="Encerrada em" valor={formatarDataHora(campanhaConsultada.encerradoEm)} />
              </SecaoFicha>

              {/* Escondida quando vazia, mesmo critério de
                  consultar-campanha.tsx - rejeição é minoria. */}
              {historicoRejeicaoConsultada.length > 0 && (
                <SecaoFicha titulo="Histórico de Rejeições">
                  {historicoRejeicaoConsultada.map((item) => (
                    <CampoFicha
                      key={item.idRejeicao}
                      rotulo={formatarDataHora(item.rejeitadoEm)}
                      valor={`${item.justificativa ?? 'Sem justificativa registrada.'} (${item.nomeAdmin ?? 'Administrador removido'})`}
                      largura="cheia"
                    />
                  ))}
                </SecaoFicha>
              )}
            </div>

            <div className="space-y-6">
              <SecaoFicha titulo="Financeiro">
                <CampoFicha rotulo="Meta" valor={formatarMoeda(campanhaConsultada.metaFinanceira)} />
                <CampoFicha rotulo="Arrecadado" valor={formatarMoeda(campanhaConsultada.valorBrutoArrecadado)} />
                <CampoFicha
                  rotulo="Taxa da plataforma"
                  valor={campanhaConsultada.taxaPlataforma === null ? 'Ainda não carimbada (não aprovada)' : `${campanhaConsultada.taxaPlataforma}%`}
                />
              </SecaoFicha>
            </div>
          </div>
        </ModalFicha>
      )}

      {idCampanhaEditando !== null && formEdicaoCampanha && (() => {
        const campanhaEmEdicao = campanhas.find((c) => c.idCampanha === idCampanhaEditando) ?? null;
        // CORRIGIDO (08-09-2026, pedido do Lucas: mesmo raciocínio do
        // modal de Excluir) - Alterar também sempre abre o modal; se for
        // uma das 10 campanhas de demonstração, um aviso aparece dentro
        // (campos ficam só-leitura, Salvar some) em vez de o botão da
        // tabela ficar cinza sem explicação nenhuma.
        const bloqueadaEdicao = CAMPANHA_BLOQUEADA(idCampanhaEditando);
        // Rejeitada que já usou todos os reenvios é SÓ LEITURA (banco: 91027 nas
        // 3 funções de congelamento). `edicaoTravada` junta isso com a proteção
        // das 10 campanhas de demonstração pra decidir o que fica desabilitado.
        const rejeitadaSomenteLeitura = campanhaEmEdicao?.status === 'rejeitado' && detalheRejeitada?.somenteLeitura === true;
        const edicaoTravada = bloqueadaEdicao || rejeitadaSomenteLeitura;
        const duracaoFormDias =
          formEdicaoCampanha.dataInicio && formEdicaoCampanha.dataFim
            ? Math.round((new Date(formEdicaoCampanha.dataFim).getTime() - new Date(formEdicaoCampanha.dataInicio).getTime()) / 86400000)
            : 0;
        // Checklist "Pronta pra aprovar?" (13-09-2026, trazido do painel
        // "campanha em foco" removido - ver comentário grande no topo do
        // arquivo) - contagens vêm de `checklistOrcamento`/`checklistCronograma`,
        // preenchidas pelo `aoCarregar` de <PainelOrcamentoCronograma> logo
        // abaixo (mesmo idCampanha, sempre em sincronia com o que a pessoa
        // vê nas abas Orçamento/Cronograma).
        const somaChecklistOrcamento = checklistOrcamento.reduce((total, item) => total + Number(item.valor), 0);
        const metaBatendoChecklist = campanhaEmEdicao !== null && somaChecklistOrcamento === Number(campanhaEmEdicao.metaFinanceira);
        const orcamentoOkChecklist = checklistOrcamento.length >= minimoItensOrcamento && metaBatendoChecklist;
        const cronogramaOkChecklist = checklistCronograma.length >= minimoMarcosCronograma;
        const prontaParaAprovarChecklist =
          campanhaEmEdicao?.status === 'aguardando_aprovacao' && orcamentoOkChecklist && cronogramaOkChecklist;
        const motivoAprovarDesabilitado = (): string => {
          if (campanhaEmEdicao?.status !== 'aguardando_aprovacao') {
            return `Status atual é "${campanhaEmEdicao?.status}", não dá pra aprovar.`;
          }
          if (!orcamentoOkChecklist) {
            return `Orçamento incompleto (${checklistOrcamento.length}/${minimoItensOrcamento} itens, soma ${formatarMoeda(somaChecklistOrcamento)} de ${formatarMoeda(campanhaEmEdicao.metaFinanceira)}).`;
          }
          if (!cronogramaOkChecklist) {
            return `Cronograma incompleto (${checklistCronograma.length}/${minimoMarcosCronograma} marcos).`;
          }
          return '';
        };
        return (
          <ModalFicha
            // `carregando` (14-09-2026) - ModalFicha esconde o título de
            // verdade sozinho enquanto `campanhaEmEdicao` não chega (ver
            // comentário completo em modal-ficha.tsx).
            carregando={!campanhaEmEdicao}
            titulo={campanhaEmEdicao?.titulo ?? ''}
            subtitulo={campanhaEmEdicao ? `Pesquisador: ${nomeDe(campanhaEmEdicao.idUsuario)}` : undefined}
            aoFechar={() => setIdCampanhaEditando(null)}
            rodape={
              <div className="flex gap-3 max-w-xl ml-auto">
                <button
                  type="button"
                  onClick={() => setIdCampanhaEditando(null)}
                  className="btn btn-secondary flex-1"
                >
                  {edicaoTravada ? 'Fechar' : 'Cancelar'}
                </button>
                {!edicaoTravada && (
                  <button type="button" onClick={salvarEdicaoCampanha} className="btn btn-primary flex-1">
                    Salvar
                  </button>
                )}
                {!edicaoTravada && campanhaEmEdicao?.status === 'rascunho' && (
                  <button type="button" onClick={() => enviarEdicao()} disabled={enviando} className="btn btn-primary flex-1">
                    {enviando ? 'Enviando...' : 'Enviar para aprovação'}
                  </button>
                )}
                {!edicaoTravada && campanhaEmEdicao?.status === 'rejeitado' && (
                  <button type="button" onClick={() => enviarEdicao()} disabled={enviando} className="btn btn-primary flex-1">
                    {enviando ? 'Enviando...' : 'Corrigir e reenviar'}
                  </button>
                )}
              </div>
            }
          >
            {bloqueadaEdicao && (
              <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
                <p className="font-bold mb-1">
                  <i className="fa-solid fa-lock mr-1"></i> Não dá pra alterar esta campanha
                </p>
                <p>{motivoBloqueioCampanha()}</p>
              </div>
            )}

            {/* Campanha REJEITADA (21-09-2026): o histórico de rejeições vem no
                topo porque é a primeira coisa que o pesquisador precisa ler pra
                saber o que corrigir, junto com quantos reenvios ainda tem e até
                quando. Esgotados os reenvios, vira só leitura e a frase diz
                quando a campanha será excluída. */}
            {campanhaEmEdicao?.status === 'rejeitado' && (
              <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro space-y-3">
                <p className="font-bold">
                  <i className="fa-solid fa-circle-exclamation mr-1"></i> Campanha rejeitada
                </p>
                {detalheRejeitada &&
                  (detalheRejeitada.somenteLeitura ? (
                    <p>
                      Esta campanha usou todos os reenvios permitidos e agora é somente leitura.
                      {detalheRejeitada.prazoReenvioAte && <> Ela será excluída em {formatarData(detalheRejeitada.prazoReenvioAte)}.</>}
                    </p>
                  ) : (
                    <p>
                      Reenvios restantes: <strong>{detalheRejeitada.reenviosRestantes}</strong>.
                      {detalheRejeitada.prazoReenvioAte && <> Prazo para reenviar: até <strong>{formatarData(detalheRejeitada.prazoReenvioAte)}</strong>.</>}
                    </p>
                  ))}
                {historicoEdicao.length > 0 && (
                  <ul className="space-y-2">
                    {historicoEdicao.map((item, indice) => (
                      <li key={item.idRejeicao} className={indice === 0 ? 'font-semibold' : ''}>
                        {formatarDataHora(item.rejeitadoEm)}
                        {item.nomeAdmin ? ` por ${item.nomeAdmin}` : ''}: {item.justificativa ?? 'Sem justificativa.'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Datas vencidas no envio/reenvio (21-09-2026): oferta EXPLÍCITA, nunca
                silenciosa - a data de início é o que o pesquisador vai comunicar
                pra rede dele. */}
            {ofertaDatas && (
              <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso space-y-3">
                <p className="font-bold">
                  <i className="fa-solid fa-calendar-xmark mr-1"></i> As datas desta campanha já venceram
                </p>
                <p>
                  O prazo terminou em {formatarData(new Date(formEdicaoCampanha.dataFim).toISOString())}, e uma campanha com prazo
                  vencido não pode ser enviada para aprovação. Você pode começar agora mantendo a mesma duração
                  {duracaoFormDias > 0 ? ` de ${duracaoFormDias} dias` : ''}, ou escolher outras datas nos campos de Datas mais abaixo.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" disabled={enviando} onClick={() => enviarEdicao(true)}>
                    {enviando ? 'Enviando...' : 'Começar agora, mantendo a duração'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setOfertaDatas(false)}>
                    Escolher outras datas
                  </button>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                <SecaoFicha titulo="Dados">
                  <div className="sm:col-span-2">
                    <label className="rotulo-campo">Título</label>
                    <input
                      type="text"
                      value={formEdicaoCampanha.titulo}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, titulo: evento.target.value })}
                      className="input-padrao"
                      disabled={edicaoTravada}
                    />
                  </div>
                  <div>
                    <label className="rotulo-campo">Área do conhecimento</label>
                    <select
                      value={formEdicaoCampanha.idAreaConhecimento}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, idAreaConhecimento: evento.target.value })}
                      className="input-padrao"
                      disabled={edicaoTravada}
                    >
                      {areas.map((area) => (
                        <option key={area.idAreaConhecimento} value={area.idAreaConhecimento}>
                          {area.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="rotulo-campo">Descrição</label>
                    <input
                      type="text"
                      value={formEdicaoCampanha.descricao}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, descricao: evento.target.value })}
                      className="input-padrao"
                      disabled={edicaoTravada}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="rotulo-campo">URL do vídeo de apresentação</label>
                    <input
                      type="text"
                      value={formEdicaoCampanha.videoApresentacaoUrl}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, videoApresentacaoUrl: evento.target.value })}
                      className="input-padrao"
                      disabled={edicaoTravada}
                    />
                  </div>
                </SecaoFicha>

                {/* Orçamento/Cronograma acima de Datas (08-09-2026, pedido
                    do Lucas) - editável aqui também (mesmo padrão de Links
                    Acadêmicos em T1), mas só quando a campanha ainda está
                    aguardando aprovação (mesma regra do painel "campanha em
                    foco" mais abaixo nesta tela) e não é uma das 10 de
                    demonstração. Linha divisória dos dois lados. */}
                <div className="border-t borda-padrao"></div>
                <PainelOrcamentoCronograma
                  auth={auth}
                  idCampanha={idCampanhaEditando}
                  // 'rascunho' incluído em 20-09-2026: é justamente o status em
                  // que o pesquisador MAIS precisa mexer em orçamento e
                  // cronograma. Sem ele, abrir um rascunho em Alterar Campanha
                  // deixaria os 2 painéis só de leitura, que é o contrário do
                  // que o estado significa. 'aguardando_aprovacao' continua
                  // editável porque o congelamento (fn_congela_*, 05) só começa
                  // em 'ativo' - e é por isso que a checagem de completude
                  // roda de novo na aprovação, não só no envio.
                  podeEditar={
                    !edicaoTravada &&
                    (campanhaEmEdicao?.status === 'rascunho' ||
                      campanhaEmEdicao?.status === 'aguardando_aprovacao' ||
                      campanhaEmEdicao?.status === 'rejeitado')
                  }
                  aoCarregar={(orcamentoCarregado, cronogramaCarregado) => {
                    setChecklistOrcamento(orcamentoCarregado);
                    setChecklistCronograma(cronogramaCarregado);
                  }}
                />

                {/* "Pronta pra aprovar?" + Aprovar/Rejeitar (13-09-2026,
                    trazido do painel "campanha em foco" removido) - só
                    faz sentido enquanto a campanha ainda está aguardando
                    aprovação e não é uma das 10 de demonstração. */}
                {!bloqueadaEdicao && campanhaEmEdicao?.status === 'aguardando_aprovacao' && (
                  <div className="fundo-sutil rounded-md p-4">
                    <h3 className="subtitulo mb-3">Pronta para aprovar?</h3>
                    <table className="crud-tabela mb-3">
                      <thead>
                        <tr>
                          <th>Critério</th>
                          <th className="crud-tabela__celula--centralizada">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Orçamento: {checklistOrcamento.length} itens (mínimo {minimoItensOrcamento})</td>
                          <td className="crud-tabela__celula--centralizada">
                            <span className={`badge ${checklistOrcamento.length >= minimoItensOrcamento ? 'badge-sucesso' : 'badge-erro'}`}>
                              {checklistOrcamento.length >= minimoItensOrcamento ? 'OK' : 'Faltando'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Soma × meta: {formatarMoeda(somaChecklistOrcamento)} de {formatarMoeda(campanhaEmEdicao.metaFinanceira)}
                            {!metaBatendoChecklist && ` (faltam ${formatarMoeda(Number(campanhaEmEdicao.metaFinanceira) - somaChecklistOrcamento)})`}
                          </td>
                          <td className="crud-tabela__celula--centralizada">
                            <span className={`badge ${metaBatendoChecklist ? 'badge-sucesso' : 'badge-erro'}`}>{metaBatendoChecklist ? 'OK' : 'Faltando'}</span>
                          </td>
                        </tr>
                        <tr>
                          <td>Cronograma: {checklistCronograma.length} marcos (mínimo {minimoMarcosCronograma})</td>
                          <td className="crud-tabela__celula--centralizada">
                            <span className={`badge ${cronogramaOkChecklist ? 'badge-sucesso' : 'badge-erro'}`}>{cronogramaOkChecklist ? 'OK' : 'Faltando'}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="acao-com-motivo mt-3">
                      <button type="button" className="btn btn-primary" disabled={!prontaParaAprovarChecklist || aprovando} onClick={aprovarEdicao}>
                        {aprovando ? 'Aprovando...' : 'Aprovar (Admin)'}
                      </button>
                      {!prontaParaAprovarChecklist && <span className="acao-com-motivo__motivo">{motivoAprovarDesabilitado()}</span>}
                    </div>

                    <div className="flex gap-2 items-end mt-3">
                      <textarea
                        placeholder="Justificativa da rejeição (opcional)"
                        value={justificativaRejeicaoEdicao}
                        onChange={(evento) => setJustificativaRejeicaoEdicao(evento.target.value)}
                        className="input-padrao flex-1"
                        rows={2}
                      />
                      <button type="button" className="btn btn-secondary text-xs" disabled={rejeitando} onClick={rejeitarEdicao}>
                        {rejeitando ? 'Rejeitando...' : 'Rejeitar (Admin)'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t borda-padrao"></div>

                <SecaoFicha titulo="Datas">
                  <div>
                    <label className="rotulo-campo">Início</label>
                    <input
                      type="date"
                      value={formEdicaoCampanha.dataInicio}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, dataInicio: evento.target.value })}
                      className="input-padrao"
                      disabled={edicaoTravada}
                    />
                  </div>
                  <div>
                    <label className="rotulo-campo">Fim (previsto)</label>
                    <input
                      type="date"
                      value={formEdicaoCampanha.dataFim}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, dataFim: evento.target.value })}
                      className="input-padrao"
                      disabled={edicaoTravada}
                    />
                  </div>
                </SecaoFicha>
              </div>

              <div className="space-y-6">
                <SecaoFicha titulo="Financeiro">
                  <div className="sm:col-span-2">
                    <label className="rotulo-campo">Meta (R$)</label>
                    <input
                      type="number"
                      value={formEdicaoCampanha.metaFinanceira}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, metaFinanceira: evento.target.value })}
                      className="input-padrao"
                      disabled={edicaoTravada}
                    />
                  </div>
                  <CampoSomenteLeitura rotulo="Arrecadado" valor={campanhaEmEdicao ? formatarMoeda(campanhaEmEdicao.valorBrutoArrecadado) : '-'} />
                  <CampoSomenteLeitura
                    rotulo="Taxa da plataforma"
                    valor={campanhaEmEdicao?.taxaPlataforma === null || campanhaEmEdicao === null ? 'Ainda não carimbada' : `${campanhaEmEdicao.taxaPlataforma}%`}
                  />
                </SecaoFicha>

                <SecaoFicha titulo="Metadados" colunas={1}>
                  <CampoSomenteLeitura rotulo="id" valor={idCampanhaEditando} />
                  <CampoSomenteLeitura rotulo="Status" valor={campanhaEmEdicao ? ROTULO_STATUS_CAMPANHA[campanhaEmEdicao.status] : '-'} />
                  <CampoSomenteLeitura rotulo="Dono" valor={campanhaEmEdicao ? nomeDe(campanhaEmEdicao.idUsuario) : '-'} />
                </SecaoFicha>
              </div>
            </div>
          </ModalFicha>
        );
      })()}

      {campanhaExcluindo && (() => {
        // CORRIGIDO (08-09-2026, pedido do Lucas: "clico e não acontece
        // nada, parece quebrado") - Excluir agora SEMPRE abre o modal
        // (nunca fica um botão cinza/inerte na tabela); quando a campanha
        // não pode ser excluída normalmente, o motivo aparece bem visível
        // dentro do próprio modal, em vez de um tooltip em cima de um
        // botão desabilitado. As 10 campanhas de demonstração continuam
        // com proteção TOTAL (nem "forçar" funciona nelas) - o resto
        // (status que já passou de "aguardando aprovação") ganha a opção
        // de exclusão FORÇADA (08-09-2026, pedido do Lucas: "senão este
        // campo de testes vai ficar muito sujo") - endpoint separado
        // (POST /campanha/:id/forcar-exclusao), que ignora status de
        // propósito, gateado por permissão própria.
        const bloqueadaDemo = CAMPANHA_BLOQUEADA(campanhaExcluindo.idCampanha);
        // 'aguardando_aprovacao' -> 'rascunho' (20-09-2026): acompanha
        // pol_campanha_delete (04), que mudou junto. Se ficasse como estava, a
        // tela diria "pode excluir" numa campanha que o banco recusa, e "não
        // pode" justamente nos rascunhos, que são os únicos excluíveis agora.
        const statusNaoElegivel = !bloqueadaDemo && campanhaExcluindo.status !== 'rascunho';
        const fecharModal = () => {
          setCampanhaExcluindo(null);
          setConfirmacaoExclusao('');
          setConfirmacaoExclusaoForcada('');
        };

        return (
          <ModalFicha
            titulo={`Excluir "${campanhaExcluindo.titulo}"`}
            subtitulo={bloqueadaDemo ? undefined : 'Não existe botão de desfazer no painel.'}
            aoFechar={fecharModal}
            rodape={
              <div className="flex gap-3 max-w-sm ml-auto">
                <button type="button" onClick={fecharModal} className="btn btn-secondary flex-1">
                  {bloqueadaDemo ? 'Fechar' : 'Cancelar'}
                </button>
                {!bloqueadaDemo && !statusNaoElegivel && (
                  <button
                    type="button"
                    onClick={excluirCampanha}
                    disabled={excluindo || confirmacaoExclusao.trim().toLowerCase() !== campanhaExcluindo.titulo.trim().toLowerCase()}
                    className="btn btn-danger flex-1"
                  >
                    {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
                  </button>
                )}
                {statusNaoElegivel && (
                  <button
                    type="button"
                    onClick={forcarExclusaoCampanha}
                    disabled={excluindoForcado || confirmacaoExclusaoForcada.trim().toLowerCase() !== campanhaExcluindo.titulo.trim().toLowerCase()}
                    className="btn btn-danger flex-1"
                  >
                    {excluindoForcado ? 'Excluindo...' : 'Forçar exclusão'}
                  </button>
                )}
              </div>
            }
          >
            <SecaoFicha titulo={bloqueadaDemo || statusNaoElegivel ? 'Dados da campanha' : 'O que será excluído'}>
              <CampoFicha rotulo="id" valor={campanhaExcluindo.idCampanha} />
              <CampoFicha rotulo="Título" valor={campanhaExcluindo.titulo} />
              <CampoFicha rotulo="Status" valor={ROTULO_STATUS_CAMPANHA[campanhaExcluindo.status]} />
              <CampoFicha rotulo="Dono" valor={nomeDe(campanhaExcluindo.idUsuario)} />
              <CampoFicha rotulo="Meta" valor={formatarMoeda(campanhaExcluindo.metaFinanceira)} largura="cheia" />
            </SecaoFicha>

            {bloqueadaDemo && (
              <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
                <p className="font-bold mb-1">
                  <i className="fa-solid fa-lock mr-1"></i> Não dá pra excluir esta campanha
                </p>
                <p>{motivoBloqueioCampanha()}</p>
              </div>
            )}

            {statusNaoElegivel && (
              <>
                <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
                  <p className="font-bold mb-1">
                    <i className="fa-solid fa-circle-info mr-1"></i> Exclusão normal indisponível
                  </p>
                  <p>
                    Só dá pra excluir campanhas que ainda estão "aguardando aprovação" - esta já
                    passou desse ponto (congelamento pós-aprovação).
                  </p>
                </div>

                <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
                  <p className="font-bold mb-1">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i> Forçar exclusão (ignora a proteção acima)
                  </p>
                  <p className="mb-3">
                    Ferramenta de limpeza do Campo de Testes - apaga a campanha de VERDADE
                    (`DELETE`, com cascata), não importa o status. Numa campanha real, com
                    contribuição/repasse em andamento, isso destruiria dado financeiro de
                    verdade - só use em campanha de teste.
                  </p>
                  <label className="rotulo-campo">
                    Digite o título "{campanhaExcluindo.titulo}" pra confirmar
                  </label>
                  <input
                    type="text"
                    value={confirmacaoExclusaoForcada}
                    onChange={(evento) => setConfirmacaoExclusaoForcada(evento.target.value)}
                    className="input-padrao"
                    placeholder={campanhaExcluindo.titulo}
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            {!bloqueadaDemo && !statusNaoElegivel && (
              <>
                <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
                  <p className="font-bold mb-1">
                    <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
                  </p>
                  <p>
                    Diferente de excluir um usuário, isto é uma exclusão de VERDADE (`DELETE`), não
                    lógica - a linha some do banco pra sempre, junto com orçamento, cronograma e tudo
                    que já foi ligado a ela (cascata). Só é permitido enquanto a campanha ainda está
                    "aguardando aprovação" - depois disso, o congelamento pós-aprovação impede.
                  </p>
                </div>

                <div>
                  <label className="rotulo-campo">
                    Digite o título "{campanhaExcluindo.titulo}" pra confirmar
                  </label>
                  <input
                    type="text"
                    value={confirmacaoExclusao}
                    onChange={(evento) => setConfirmacaoExclusao(evento.target.value)}
                    className="input-padrao"
                    placeholder={campanhaExcluindo.titulo}
                    autoComplete="off"
                  />
                </div>
              </>
            )}
          </ModalFicha>
        );
      })()}

      {/* Criar Campanha (08-09-2026, pedido do Lucas: "o Admin deve
          conseguir criar uma campanha e ASSOCIAR um pesquisador a ela,
          por id e ou nome, não importa") - dropdown mostra nome (id), o
          valor por baixo é o id. Mesmo endpoint de suporte/admin usado no
          resto desta sessão (POST /campanha/:idUsuario). */}
      {criandoCampanha && (
        <ModalFicha
          titulo="Criar Campanha"
          // Miss-click no fundo escurecido já derrubou este wizard de 3
          // etapas 2x (15-09-2026, achado do Lucas) - perder o progresso
          // (ou até uma campanha já criada, se estava nas etapas 2/3) por
          // um clique sem querer é caro aqui. Só fecha por "Cancelar"/
          // "Concluir" ou pelo X.
          fecharAoClicarFora={false}
          subtitulo={
            etapaCriarCampanha === 'dados'
              ? 'Em nome de outro pesquisador - escolha quem é o dono abaixo. Etapa 1 de 3: Dados.'
              : etapaCriarCampanha === 'orcamento'
                ? `Campanha #${idCampanhaRecemCriada} - Etapa 2 de 3: Orçamento.`
                : `Campanha #${idCampanhaRecemCriada} - Etapa 3 de 3: Cronograma.`
          }
          aoFechar={fecharModalCriarCampanha}
          rodape={
            etapaCriarCampanha === 'dados' ? (
              <div className="flex gap-3 max-w-sm ml-auto">
                <button type="button" onClick={fecharModalCriarCampanha} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={avancarDaEtapaDados}
                  disabled={!formCriarCampanhaValido}
                  className="btn btn-primary flex-1"
                >
                  Próximo
                </button>
              </div>
            ) : etapaCriarCampanha === 'orcamento' ? (
              <div className="flex gap-3 max-w-sm ml-auto">
                <button type="button" onClick={() => setEtapaCriarCampanha('dados')} className="btn btn-secondary flex-1">
                  Voltar
                </button>
                <button type="button" onClick={() => setEtapaCriarCampanha('cronograma')} className="btn btn-primary flex-1">
                  Próximo
                </button>
              </div>
            ) : (
              <div className="flex gap-3 max-w-sm ml-auto">
                <button type="button" onClick={() => setEtapaCriarCampanha('orcamento')} className="btn btn-secondary flex-1">
                  Voltar
                </button>
                <button type="button" onClick={enviarCampanhaParaAprovacao} className="btn btn-primary flex-1">
                  Enviar para aprovação
                </button>
              </div>
            )
          }
        >
          {etapaCriarCampanha !== 'dados' && idCampanhaRecemCriada !== null ? (
            // Orçamento e Cronograma como 2 ETAPAS SEPARADAS e focadas
            // (15-09-2026, pedido do Lucas: "Modais diferentes e focados
            // para cada coisa", não uma tabela só com abas) - RF-040/042
            // preveem isso "durante a criação", mas os itens só existem
            // depois de a campanha ter um id (FK pra orcamento_campanha/
            // marco_cronograma), por isso são etapas do MESMO modal, não
            // campos do formulário de Dados. `abaFixa` trava o painel
            // (que já existia, usado em Alterar Campanha) numa aba só,
            // sem UI nova pra tabela em si. Mínimo de itens (RF-040/042)
            // só é exigido na APROVAÇÃO, não aqui - pode ficar sem nenhum
            // item e concluir, completando depois via Alterar, exatamente
            // como o RF permite ("aos poucos").
            <SecaoFicha titulo={etapaCriarCampanha === 'orcamento' ? 'Orçamento' : 'Cronograma'}>
              <div className="sm:col-span-2">
                <PainelOrcamentoCronograma
                  // `key` (15-09-2026, achado do Lucas: Cronograma
                  // mostrando a tabela de Orçamento) - sem isto, React
                  // reaproveita a MESMA instância do componente ao trocar
                  // de etapa (é a mesma posição na árvore JSX, só a prop
                  // `abaFixa` muda) - o `useState(abaFixa ?? 'orcamento')`
                  // só roda o inicializador na 1ª montagem, então `abaAtiva`
                  // ficava travado em 'orcamento' pra sempre, mesmo depois
                  // de `abaFixa` virar 'cronograma'. `key` força remontar
                  // (nova instância = novo estado) toda vez que a etapa
                  // muda.
                  key={etapaCriarCampanha}
                  auth={auth}
                  idCampanha={idCampanhaRecemCriada}
                  podeEditar={true}
                  abaFixa={etapaCriarCampanha}
                  metaFinanceira={Number(formCriarCampanha.metaFinanceira)}
                  dataInicioCampanha={formCriarCampanha.dataInicio}
                  minimoMarcosCronograma={minimoMarcosCronograma}
                />
              </div>
            </SecaoFicha>
          ) : (
            <>
          <SecaoFicha titulo="Pesquisador">
            <div className="sm:col-span-2 relative" ref={sugestoesPesquisadorRef}>
              <label className="rotulo-campo">Dono da campanha</label>
              {/* Um só <input>, sempre (08-09-2026, pedido do Lucas) - não
                  troca pra um "chip" separado depois de escolher. O texto
                  mostrado É o nome escolhido; clicar/focar reabre a lista
                  de sugestões já filtrada por esse mesmo nome (ex.: "Maria
                  da Silva" escolhida, clicar mostra "Maria da Silva",
                  "Maria da Silva Junior", "Maria da Silva Oliveira"...) -
                  a escolha atual continua valendo até a pessoa clicar
                  numa sugestão diferente ou digitar algo nesse meio
                  tempo (que invalida a escolha, mesmo padrão de qualquer
                  combobox de busca). */}
              <input
                type="text"
                value={buscaPesquisador}
                onChange={(evento) => {
                  setBuscaPesquisador(evento.target.value);
                  setPesquisadorEscolhido(null);
                  setSugestoesPesquisadorAbertas(true);
                }}
                onFocus={() => setSugestoesPesquisadorAbertas(true)}
                placeholder="Digite o id ou o nome..."
                className="input-padrao"
                autoComplete="off"
              />
              {sugestoesPesquisadorAbertas && sugestoesPesquisador.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
                  {sugestoesPesquisador.map((usuario) => {
                    const status = statusPesquisadorParaCriar(usuario.idUsuario);
                    const podeEscolher = status === 'ativo';
                    return (
                      <button
                        key={usuario.idUsuario}
                        type="button"
                        disabled={!podeEscolher}
                        onClick={() => {
                          if (!podeEscolher) return;
                          setPesquisadorEscolhido(usuario);
                          setBuscaPesquisador(usuario.nome);
                          setSugestoesPesquisadorAbertas(false);
                        }}
                        className={
                          'w-full text-left px-3 py-2 text-sm border-b borda-padrao last:border-b-0 flex items-center justify-between gap-2 ' +
                          (podeEscolher ? 'hover-fundo-marca-suave' : 'opacity-60 cursor-not-allowed')
                        }
                      >
                        <span className="texto-forte inline-flex items-baseline">
                          <span className="inline-block w-16 shrink-0 tabular-nums">ID: {usuario.idUsuario}</span>
                          <span>{usuario.nome}</span>
                        </span>
                        {status === 'sem-perfil' && <span className="text-xs texto-erro">não é pesquisador</span>}
                        {status === 'suspenso' && <span className="text-xs texto-erro">pesquisador suspenso</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs texto-fraco mt-1">
                Precisa ser um pesquisador ativo - quem não tem perfil de pesquisador ou está
                suspenso aparece na lista, mas não dá pra escolher.
              </p>
            </div>
          </SecaoFicha>

          <SecaoFicha titulo="Dados">
            <div className="sm:col-span-2">
              <label className="rotulo-campo">Título</label>
              <input
                type="text"
                value={formCriarCampanha.titulo}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, titulo: evento.target.value })}
                className="input-padrao"
              />
            </div>
            <div>
              <label className="rotulo-campo">Área do conhecimento</label>
              <select
                value={formCriarCampanha.idAreaConhecimento}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, idAreaConhecimento: evento.target.value })}
                className="input-padrao"
              >
                <option value="">Selecione...</option>
                {areas.map((area) => (
                  <option key={area.idAreaConhecimento} value={area.idAreaConhecimento}>
                    {area.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo-campo">Meta (R$)</label>
              <input
                type="number"
                min={metaMinimaCampanha}
                value={formCriarCampanha.metaFinanceira}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, metaFinanceira: evento.target.value })}
                className="input-padrao"
              />
              {/* Aviso de meta mínima (RF-067) - mesmo padrão do aviso de
                  prazo, abaixo: o banco já rejeita (fn_valida_meta_
                  campanha_negocio), isto só adianta o aviso. */}
              {formCriarCampanha.metaFinanceira !== '' &&
                Number(formCriarCampanha.metaFinanceira) < metaMinimaCampanha && (
                  <p className="text-xs texto-erro font-semibold mt-1">
                    Meta mínima: {formatarMoeda(metaMinimaCampanha)}.
                  </p>
                )}
            </div>
            <div className="sm:col-span-2">
              <label className="rotulo-campo">Descrição (opcional)</label>
              <input
                type="text"
                value={formCriarCampanha.descricao}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, descricao: evento.target.value })}
                className="input-padrao"
              />
            </div>
            <div>
              {/* Não é mais "(opcional)" (14-09-2026, achado do Lucas) -
                  RF-066 exige as duas datas pra checar o prazo (15-60
                  dias); `min={hojeISO}` impede escolher ontem ou antes
                  direto no seletor do navegador, sem precisar de JS extra
                  pra bloquear a data errada. */}
              <label className="rotulo-campo">Início</label>
              <input
                type="date"
                value={formCriarCampanha.dataInicio}
                min={hojeISO}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, dataInicio: evento.target.value })}
                className="input-padrao"
              />
            </div>
            <div>
              <label className="rotulo-campo">Fim</label>
              <input
                type="date"
                value={formCriarCampanha.dataFim}
                min={formCriarCampanha.dataInicio || hojeISO}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, dataFim: evento.target.value })}
                className="input-padrao"
              />
            </div>
            {/* Aviso de prazo (RF-066) - o banco já rejeita fora do
                intervalo (fn_valida_prazo_campanha_negocio), isto só
                adianta o aviso antes de mandar. Só aparece com as 2 datas
                preenchidas, pra não assustar quem ainda não chegou lá. */}
            {duracaoDiasCriar !== null && (
              <p className={'sm:col-span-2 text-xs -mt-2 ' + (duracaoCriarValida ? 'texto-fraco' : 'texto-erro font-semibold')}>
                Duração: {duracaoDiasCriar} {duracaoDiasCriar === 1 ? 'dia' : 'dias'} - precisa estar entre{' '}
                {prazoMinimoCampanha} e {prazoMaximoCampanha} dias.
              </p>
            )}
            <div className="sm:col-span-2">
              <label className="rotulo-campo">URL do vídeo de apresentação (opcional)</label>
              <input
                type="text"
                value={formCriarCampanha.videoApresentacaoUrl}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, videoApresentacaoUrl: evento.target.value })}
                className="input-padrao"
              />
            </div>
          </SecaoFicha>
            </>
          )}
        </ModalFicha>
      )}

      <RodapePaginacao
        total={campanhasFiltradas.length}
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        tamanhoPagina={tamanhoPagina}
        className="mb-4"
        aoMudarPagina={setPagina}
        aoMudarTamanho={(tamanho) => {
          setTamanhoPagina(tamanho);
          setPagina(1);
        }}
      />

      {/* Criar campanha saiu daqui (25-08-2026, remoção do Elenco): RLS
          exige id_usuario = id_usuario_atual(), não dá mais pra "criar em
          nome de" um pesquisador escolhido. Lucas vai detalhar depois como
          fica a criação pelo próprio pesquisador (login como ele, ou uma
          conta já com privilégio de pesquisador). */}

      {/* Painel "campanha em foco" (checklist "Pronta pra aprovar?" +
          Aprovar/Rejeitar + abas de Orçamento/Cronograma) removido daqui
          (13-09-2026, pedido do Lucas: "vamos tirar o Escolher também de
          T2") - a coluna "Escolher" era sua única fonte. Todo esse
          conteúdo virou parte do modal de Alterar (que já mostrava
          Orçamento/Cronograma mesmo antes disso - só faltava o checklist e
          os 2 botões, ver bloco `idCampanhaEditando` acima). */}
      <div className="border-t borda-padrao my-8"></div>

      <RegistroChamadas />
      </section>
    </div>
  );
}
