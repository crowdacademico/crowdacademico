// ============================================================================
// Campo de Testes deixou de ser só ferramenta de teste descartável
// (07-09-2026, decisão do Lucas): virou parte permanente do painel
// administrativo, com o mesmo padrão de dados/comportamento do resto do
// sistema (nunca uma versão simplificada à parte).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { tratarResposta } from '../../services/constant/api/http.util';
import { useCampoTestes } from '../../services/campo-testes/hook/use-campo-testes';
import { useChamadaRegistrada } from '../../services/campo-testes/hook/use-chamada-registrada';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { CAMPANHA_BLOQUEADA, motivoBloqueioCampanha } from '../../services/campo-testes/util/registros-bloqueados';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import {
  ROTULO_STATUS_CAMPANHA,
  classeBadgeStatusCampanha,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { formatarDataHora } from '../../services/constant/utils/formatacao.util';
import { RegistroChamadas } from './registro-chamadas';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { StatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import type { AreaConhecimentoResponse } from '../../services/8-area-conhecimento/type/area-conhecimento.type';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

const TAMANHOS_PAGINA = [10, 20, 30, 'todos'] as const;
const LIMIAR_FILTRO = 5;

// `orcamento-campanha`/`marco-cronograma` (módulo 22-contribuicao/módulo
// próprio) não têm type/ formal ainda - só o Campo de Testes fala com
// eles, via `authFetch` cru + `tratarResposta<T>`. Shape inferido do
// próprio uso real aqui.
interface ItemOrcamento {
  idOrcamento: number;
  idCampanha: number;
  categoria: string;
  valor: number;
}

interface MarcoCronograma {
  idMarco: number;
  idCampanha: number;
  titulo: string;
  dataPrevista: string;
}

interface FormEdicaoCampanha {
  titulo: string;
  idAreaConhecimento: number | string;
  metaFinanceira: number | string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  videoApresentacaoUrl: string;
}

function formatarReais(valor: number | null): string {
  return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface PainelOrcamentoCronogramaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  podeEditar: boolean;
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
function PainelOrcamentoCronograma({ auth, idCampanha, podeEditar }: PainelOrcamentoCronogramaProps) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  const [orcamento, setOrcamento] = useState<ItemOrcamento[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronograma[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'orcamento' | 'cronograma'>('orcamento');
  const [novoItemOrcamento, setNovoItemOrcamento] = useState({ categoria: '', valor: '' });
  const [novoMarco, setNovoMarco] = useState({ titulo: '', dataPrevista: '' });

  const carregar = useCallback(() => {
    auth.authFetch(`/orcamento-campanha?idCampanha=${idCampanha}`).then(tratarResposta<ItemOrcamento[]>).then(setOrcamento).catch(() => {});
    auth.authFetch(`/marco-cronograma?idCampanha=${idCampanha}`).then(tratarResposta<MarcoCronograma[]>).then(setCronograma).catch(() => {});
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

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button type="button" className={`btn ${abaAtiva === 'orcamento' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('orcamento')}>
          Orçamento
        </button>
        <button type="button" className={`btn ${abaAtiva === 'cronograma' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('cronograma')}>
          Cronograma
        </button>
      </div>

      {abaAtiva === 'orcamento' && (
        <table className="crud-tabela mb-3">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Valor</th>
              {podeEditar && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {orcamento.map((item) => (
              <tr key={item.idOrcamento}>
                <td>{item.categoria}</td>
                <td>{formatarReais(item.valor)}</td>
                {podeEditar && (
                  <td>
                    <button type="button" className="crud-tabela__acao crud-tabela__acao--excluir" onClick={() => removerItemOrcamento(item.idOrcamento)}>
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {podeEditar && (
              <tr>
                <td>
                  <input type="text" value={novoItemOrcamento.categoria} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, categoria: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs w-full" placeholder="Categoria" />
                </td>
                <td>
                  <input type="number" value={novoItemOrcamento.valor} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, valor: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs w-24" placeholder="Valor" />
                </td>
                <td>
                  <button type="button" className="btn btn-secondary text-xs" onClick={adicionarItemOrcamento}>
                    + adicionar
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {abaAtiva === 'cronograma' && (
        <table className="crud-tabela mb-3">
          <thead>
            <tr>
              <th>Título</th>
              <th>Data prevista</th>
              {podeEditar && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {cronograma.map((marco) => (
              <tr key={marco.idMarco}>
                <td>{marco.titulo}</td>
                <td>{new Date(marco.dataPrevista).toLocaleDateString('pt-BR')}</td>
                {podeEditar && (
                  <td>
                    <button type="button" className="crud-tabela__acao crud-tabela__acao--excluir" onClick={() => removerMarco(marco.idMarco)}>
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {podeEditar && (
              <tr>
                <td>
                  <input type="text" value={novoMarco.titulo} onChange={(e) => setNovoMarco({ ...novoMarco, titulo: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs w-full" placeholder="Título" />
                </td>
                <td>
                  <input type="date" value={novoMarco.dataPrevista} onChange={(e) => setNovoMarco({ ...novoMarco, dataPrevista: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs" />
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
// `pesquisadorSelecionado` (T1, Bancada do Pesquisador, compartilhado via
// CampoTestesProvider): se tiver alguém selecionado, a tabela abaixo só
// mostra as campanhas DESSE pesquisador (filtro server-side, campanhaApi.
// listar já aceita `idUsuario`). "Campanha em foco" (23-08-2026, ERA um
// <select>, virou tabela com filtro/facet/paginação/linha selecionada,
// mesma regra de T1) continua em `campanhaFoco`, é o que deixa a Vida da
// Campanha Ativa (T3) só continuar de onde esta tela parou.
export function BancadaCampanha({ auth }: PropsPagina) {
  const { pesquisadorSelecionado, limparPesquisadorSelecionado, campanhaFoco, selecionarCampanhaFoco } = useCampoTestes();
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
  const [facetaStatusAberta, setFacetaStatusAberta] = useState(false);
  const facetaStatusRef = useRef<HTMLDivElement>(null);
  const [campanhaConsultada, setCampanhaConsultada] = useState<CampanhaResponse | null>(null);
  const [idCampanhaEditando, setIdCampanhaEditando] = useState<number | null>(null);
  const [formEdicaoCampanha, setFormEdicaoCampanha] = useState<FormEdicaoCampanha | null>(null);
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

  const [campanha, setCampanha] = useState<CampanhaResponse | null>(null);
  const [nomeDono, setNomeDono] = useState<string | null>(null);
  const [orcamento, setOrcamento] = useState<ItemOrcamento[]>([]);
  const [cronograma, setCronograma] = useState<MarcoCronograma[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'orcamento' | 'cronograma'>('orcamento');

  const [novoItemOrcamento, setNovoItemOrcamento] = useState({ categoria: '', valor: '' });
  const [novoMarco, setNovoMarco] = useState({ titulo: '', dataPrevista: '' });
  const [justificativaRejeicao, setJustificativaRejeicao] = useState('');

  const carregarCampanhas = () => {
    campanhaApi
      .listar(auth.authFetch, pesquisadorSelecionado ? { idUsuario: pesquisadorSelecionado.idUsuario } : undefined)
      .then(setCampanhas)
      .catch(() => {});
  };

  useEffect(() => {
    areaConhecimentoApi
      .listar(auth.authFetch)
      .then((lista) => setAreas(lista.filter((area) => area.idPai !== null)))
      .catch(() => {});
    usuarioApi.listar(auth.authFetch).then(setUsuarios).catch(() => {});
    perfilPesquisadorApi.listar(auth.authFetch).then(setPerfisPesquisador).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fechar as sugestões do combobox de pesquisador ao clicar fora - mesmo
  // padrão do facet "Status" logo abaixo.
  useEffect(() => {
    if (!sugestoesPesquisadorAbertas) return undefined;
    const aoClicarFora = (evento: MouseEvent) => {
      if (
        sugestoesPesquisadorRef.current &&
        evento.target instanceof Node &&
        !sugestoesPesquisadorRef.current.contains(evento.target)
      ) {
        setSugestoesPesquisadorAbertas(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [sugestoesPesquisadorAbertas]);

  // Recarrega sempre que o pesquisador selecionado em T1 mudar (filtro
  // por dono, feito no servidor - campanhaApi.listar já aceita
  // `idUsuario`) ou limpar (volta a mostrar todas).
  useEffect(() => {
    carregarCampanhas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesquisadorSelecionado]);

  // Fechar o dropdown "Status" ao clicar fora (mesmo padrão do facet
  // "Papel" de bancada-pesquisador.jsx / GenericTable).
  useEffect(() => {
    if (!facetaStatusAberta) return undefined;
    const aoClicarFora = (evento: MouseEvent) => {
      if (
        facetaStatusRef.current &&
        evento.target instanceof Node &&
        !facetaStatusRef.current.contains(evento.target)
      ) {
        setFacetaStatusAberta(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [facetaStatusAberta]);

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
      .slice(0, 5);
  })();

  const carregarDetalheCampanha = (id: number | null) => {
    if (!id) {
      setCampanha(null);
      setNomeDono(null);
      setOrcamento([]);
      setCronograma([]);
      return;
    }
    campanhaApi
      .buscar(auth.authFetch, id)
      .then((dados) => {
        setCampanha(dados);
        usuarioApi.buscar(auth.authFetch, dados.idUsuario).then((u) => setNomeDono(u.nome)).catch(() => {});
      })
      .catch(() => {});
    auth
      .authFetch(`/orcamento-campanha?idCampanha=${id}`)
      .then(tratarResposta<ItemOrcamento[]>)
      .then(setOrcamento)
      .catch(() => {});
    auth
      .authFetch(`/marco-cronograma?idCampanha=${id}`)
      .then(tratarResposta<MarcoCronograma[]>)
      .then(setCronograma)
      .catch(() => {});
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDetalheCampanha(campanhaFoco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanhaFoco]);

  // Opções do dropdown "Status" - só os valores que já aparecem nos
  // dados (mesmo sniff de GenericTable/bancada-pesquisador.jsx), sem
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
  const totalPaginas = tamanhoPagina === 'todos' ? 1 : Math.max(1, Math.ceil(campanhasFiltradas.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const campanhasPagina =
    tamanhoPagina === 'todos' ? campanhasFiltradas : campanhasFiltradas.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina);

  const somaOrcamento = orcamento.reduce((total, item) => total + Number(item.valor), 0);
  const metaBatendo = campanha && somaOrcamento === Number(campanha.metaFinanceira);
  const orcamentoOk = orcamento.length >= minimoItensOrcamento && metaBatendo;
  const cronogramaOk = cronograma.length >= minimoMarcosCronograma;
  const prontaParaAprovar = campanha?.status === 'aguardando_aprovacao' && orcamentoOk && cronogramaOk;

  const motivoAprovarDesabilitado = () => {
    if (campanha?.status !== 'aguardando_aprovacao') return `Status atual é "${campanha?.status}", não dá pra aprovar.`;
    if (!orcamentoOk) return `Orçamento incompleto (${orcamento.length}/${minimoItensOrcamento} itens, soma ${formatarReais(somaOrcamento)} de ${formatarReais(campanha.metaFinanceira)}).`;
    if (!cronogramaOk) return `Cronograma incompleto (${cronograma.length}/${minimoMarcosCronograma} marcos).`;
    return null;
  };

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
  };

  // PATCH /campanha/:id (dono OU campanha_editar) - sem status/id_admin/
  // taxa_plataforma/modelo aqui de propósito, ver campanha.request-update.
  // ts: quem muda status são aprovar/rejeitar, nunca este PATCH genérico.
  const salvarEdicaoCampanha = async () => {
    if (!formEdicaoCampanha?.titulo || idCampanhaEditando === null) return;
    try {
      await chamarERegistrar<void>(`/campanha/${idCampanhaEditando}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titulo: formEdicaoCampanha.titulo,
          idAreaConhecimento: Number(formEdicaoCampanha.idAreaConhecimento),
          metaFinanceira: Number(formEdicaoCampanha.metaFinanceira),
          ...(formEdicaoCampanha.descricao ? { descricao: formEdicaoCampanha.descricao } : {}),
          ...(formEdicaoCampanha.dataInicio ? { dataInicio: new Date(formEdicaoCampanha.dataInicio).toISOString() } : {}),
          ...(formEdicaoCampanha.dataFim ? { dataFim: new Date(formEdicaoCampanha.dataFim).toISOString() } : {}),
          ...(formEdicaoCampanha.videoApresentacaoUrl ? { videoApresentacaoUrl: formEdicaoCampanha.videoApresentacaoUrl } : {}),
        }),
      });
      const idEditado = idCampanhaEditando;
      setIdCampanhaEditando(null);
      carregarCampanhas();
      if (campanhaFoco === idEditado) {
        carregarDetalheCampanha(idEditado);
      }
      mostrar('Campanha alterada com sucesso.', `ID: ${idEditado} foi alterada`);
    } catch (erro) {
      reportarErro(erro);
    }
  };

  // pol_orcamento_campanha_*/pol_marco_cronograma_* (04) liberam dono OU
  // campanha_editar: admin sempre tem campanha_editar (trg_admin_
  // recebe_toda_permissao, 05), funciona não importa quem seja o dono de
  // verdade.
  const adicionarItemOrcamento = async () => {
    if (!novoItemOrcamento.categoria || !novoItemOrcamento.valor) return;
    await chamarERegistrar<void>('/orcamento-campanha', {
      method: 'POST',
      body: JSON.stringify({ idCampanha: campanhaFoco, categoria: novoItemOrcamento.categoria, valor: Number(novoItemOrcamento.valor) }),
    }).catch(() => {});
    setNovoItemOrcamento({ categoria: '', valor: '' });
    carregarDetalheCampanha(campanhaFoco);
  };

  const removerItemOrcamento = async (idOrcamento: number) => {
    await chamarERegistrar<void>(`/orcamento-campanha/${idOrcamento}`, { method: 'DELETE' }).catch(() => {});
    carregarDetalheCampanha(campanhaFoco);
  };

  const adicionarMarco = async () => {
    if (!novoMarco.titulo || !novoMarco.dataPrevista) return;
    await chamarERegistrar<void>('/marco-cronograma', {
      method: 'POST',
      body: JSON.stringify({ idCampanha: campanhaFoco, titulo: novoMarco.titulo, dataPrevista: new Date(novoMarco.dataPrevista).toISOString() }),
    }).catch(() => {});
    setNovoMarco({ titulo: '', dataPrevista: '' });
    carregarDetalheCampanha(campanhaFoco);
  };

  const removerMarco = async (idMarco: number) => {
    await chamarERegistrar<void>(`/marco-cronograma/${idMarco}`, { method: 'DELETE' }).catch(() => {});
    carregarDetalheCampanha(campanhaFoco);
  };

  const aprovar = async () => {
    await chamarERegistrar<void>(`/campanha/${campanhaFoco}/aprovar`, { method: 'POST' }).catch(() => {});
    carregarDetalheCampanha(campanhaFoco);
    carregarCampanhas();
  };

  const rejeitar = async () => {
    await chamarERegistrar<void>(`/campanha/${campanhaFoco}/rejeitar`, {
      method: 'POST',
      body: JSON.stringify({ justificativa: justificativaRejeicao || undefined }),
    }).catch(() => {});
    setJustificativaRejeicao('');
    carregarDetalheCampanha(campanhaFoco);
    carregarCampanhas();
  };

  // Só permitido em 'aguardando_aprovacao' (RLS: pol_campanha_delete, ver
  // 04_rls_policies.sql) - mesma lógica do congelamento pós-aprovação.
  // Cascateia orçamento/cronograma/atualizações/seguidores/comentários
  // (ON DELETE CASCADE, 01_extensoes_enums_tabelas.sql), sem risco: nada
  // disso existe ainda pra uma campanha que nunca foi aprovada.
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
      if (campanhaFoco === campanhaExcluindo.idCampanha) {
        selecionarCampanhaFoco(null);
      }
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
  // DELETE normal, que continua só liberando 'aguardando_aprovacao'). Só
  // oferecida quando a campanha NÃO é uma das 10 de demonstração - essas
  // continuam protegidas de qualquer exclusão, forçada ou não.
  const forcarExclusaoCampanha = async () => {
    if (!campanhaExcluindo) return;
    setExcluindoForcado(true);
    try {
      await chamarERegistrar<void>(`/campanha/${campanhaExcluindo.idCampanha}/forcar-exclusao`, { method: 'POST' });
      if (campanhaFoco === campanhaExcluindo.idCampanha) {
        selecionarCampanhaFoco(null);
      }
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

  const criarCampanha = async () => {
    if (
      !pesquisadorEscolhido ||
      !formCriarCampanha.titulo ||
      !formCriarCampanha.idAreaConhecimento ||
      !formCriarCampanha.metaFinanceira
    ) {
      return;
    }
    try {
      const nova = await chamarERegistrar<CampanhaResponse>(`/campanha/${pesquisadorEscolhido.idUsuario}`, {
        method: 'POST',
        body: JSON.stringify({
          idAreaConhecimento: Number(formCriarCampanha.idAreaConhecimento),
          titulo: formCriarCampanha.titulo,
          metaFinanceira: Number(formCriarCampanha.metaFinanceira),
          ...(formCriarCampanha.descricao ? { descricao: formCriarCampanha.descricao } : {}),
          ...(formCriarCampanha.dataInicio ? { dataInicio: new Date(formCriarCampanha.dataInicio).toISOString() } : {}),
          ...(formCriarCampanha.dataFim ? { dataFim: new Date(formCriarCampanha.dataFim).toISOString() } : {}),
          ...(formCriarCampanha.videoApresentacaoUrl ? { videoApresentacaoUrl: formCriarCampanha.videoApresentacaoUrl } : {}),
        }),
      });
      carregarCampanhas();
      setCriandoCampanha(false);
      setPesquisadorEscolhido(null);
      setBuscaPesquisador('');
      setFormCriarCampanha({
        titulo: '',
        idAreaConhecimento: '',
        metaFinanceira: '',
        descricao: '',
        dataInicio: '',
        dataFim: '',
        videoApresentacaoUrl: '',
      });
      mostrar('Campanha criada com sucesso.', `ID: ${nova.idCampanha}, em nome de ${nomeDe(nova.idUsuario)}`);
      selecionarCampanhaFoco(nova.idCampanha);
    } catch (erro) {
      reportarErro(erro);
    }
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

      {pesquisadorSelecionado && (
        <table className="crud-tabela mb-4">
          <thead>
            <tr>
              <th>Pesquisador selecionado (T1)</th>
              <th>E-mail</th>
              <th className="crud-tabela__celula--centralizada">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr className="crud-tabela__linha--selecionada">
              <td>{pesquisadorSelecionado.nome}</td>
              <td>{pesquisadorSelecionado.email}</td>
              <td className="crud-tabela__celula--centralizada">
                <button type="button" className="crud-tabela__acao crud-tabela__acao--excluir" onClick={limparPesquisadorSelecionado}>
                  <i className="fa-solid fa-xmark"></i>
                  <span className="crud-tabela__acao-texto">Limpar seleção</span>
                  <span className="crud-tabela__acao-dica" role="tooltip">Limpar seleção</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h3 className="subtitulo">Campanhas{pesquisadorSelecionado ? ` de ${pesquisadorSelecionado.nome}` : ''}</h3>
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

      {(campanhas.length > LIMIAR_FILTRO || opcoesStatus.length > 1) && (
        <div className="flex items-center gap-3 flex-wrap mb-3">
          {campanhas.length > LIMIAR_FILTRO && (
            <input
              type="search"
              placeholder="Filtrar..."
              value={filtroTexto}
              onChange={(evento) => {
                setFiltroTexto(evento.target.value);
                setPagina(1);
              }}
              className="w-full sm:w-64 border borda-forte rounded-lg fundo-sutil py-2 px-3 text-sm outline-none focus:border-primary"
            />
          )}

          {opcoesStatus.length > 1 && (
            <div className="relative" ref={facetaStatusRef}>
              <button
                type="button"
                onClick={() => setFacetaStatusAberta((atual) => !atual)}
                className="btn btn-secondary text-sm flex items-center gap-2"
              >
                <i className="fa-solid fa-filter"></i>
                Status
                {statusSelecionados.length > 0 ? (
                  <span className="badge badge-sucesso">{statusSelecionados.length}</span>
                ) : (
                  <span className="texto-fraco font-normal">(Todos)</span>
                )}
                <i className="fa-solid fa-chevron-down text-xs"></i>
              </button>

              {facetaStatusAberta && (
                <div className="absolute left-0 mt-1 w-56 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusSelecionados([]);
                      setPagina(1);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-bold hover:bg-primary/10 border-b borda-padrao flex items-center justify-between"
                  >
                    Todos
                    {statusSelecionados.length === 0 && <i className="fa-solid fa-check texto-sucesso"></i>}
                  </button>
                  <div className="max-h-64 overflow-y-auto">
                    {opcoesStatus.map((status) => {
                      const marcado = statusSelecionados.includes(status);
                      const alternar = () => {
                        setStatusSelecionados((atuais) => (marcado ? atuais.filter((s) => s !== status) : [...atuais, status]));
                        setPagina(1);
                      };
                      return (
                        <label
                          key={status}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer"
                          onClick={(evento) => {
                            if (evento.target instanceof Element && evento.target.tagName !== 'INPUT') {
                              evento.preventDefault();
                              alternar();
                            }
                          }}
                        >
                          <input type="checkbox" checked={marcado} onChange={alternar} />
                          {status}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      <table className="crud-tabela mb-2">
        <thead>
          <tr>
            <th className="crud-tabela__coluna-id crud-tabela__celula--centralizada">id</th>
            <th>título</th>
            <th className="crud-tabela__celula--centralizada">status</th>
            <th>dono</th>
            <th className="crud-tabela__celula--centralizada">meta</th>
            <th className="crud-tabela__celula--centralizada">Escolher</th>
            <th className="crud-tabela__celula--centralizada">Ações</th>
          </tr>
        </thead>
        <tbody>
          {campanhasPagina.length === 0 && (
            <tr>
              <td colSpan={7} className="texto-fraco">{filtroTexto ? 'Nenhum registro bate com o filtro.' : 'Nenhum registro.'}</td>
            </tr>
          )}
          {campanhasPagina.map((item) => {
            const bloqueada = CAMPANHA_BLOQUEADA(item.idCampanha);
            const selecionada = item.idCampanha === campanhaFoco;
            return (
                <tr
                  key={item.idCampanha}
                  className={selecionada ? 'crud-tabela__linha--selecionada' : bloqueada ? 'texto-fraco' : undefined}
                >
                  <td className="crud-tabela__coluna-id crud-tabela__celula--centralizada" style={bloqueada && !selecionada ? { textDecoration: 'line-through' } : undefined}>
                    {item.idCampanha}
                  </td>
                  <td style={bloqueada && !selecionada ? { textDecoration: 'line-through' } : undefined}>{item.titulo}</td>
                  <td
                    className="crud-tabela__celula--centralizada"
                    style={bloqueada && !selecionada ? { textDecoration: 'line-through' } : undefined}
                  >
                    <span className={`badge ${classeBadgeStatusCampanha(item.status)}`}>
                      {ROTULO_STATUS_CAMPANHA[item.status]}
                    </span>
                  </td>
                  <td style={bloqueada && !selecionada ? { textDecoration: 'line-through' } : undefined}>{nomeDe(item.idUsuario)}</td>
                  <td className="crud-tabela__celula--centralizada">{formatarReais(item.metaFinanceira)}</td>
                  {/* CORRIGIDO (08-09-2026, pedido do Lucas) - "Escolher" já
                      não depende mais de `bloqueada`: as 10 campanhas de
                      demonstração (Alexia) continuam protegidas contra
                      Alterar/Excluir (coluna Ações, abaixo), mas escolher
                      uma delas pra alimentar T3 (Vida da Campanha Ativa) é
                      seguro - só LEITURA no que vem depois, nenhuma escrita
                      na campanha em si. É JUSTAMENTE o motivo de escolher
                      uma bloqueada valer a pena: já vem com orçamento/
                      cronograma/comentário/transação pré-montados, prontos
                      pra explorar T3 sem precisar montar tudo do zero. */}
                  <td className="crud-tabela__celula--centralizada">
                    {selecionada ? (
                      <span className="texto-sucesso font-bold text-xs">
                        <i className="fa-solid fa-circle-check"></i> Selecionada
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="crud-tabela__acao crud-tabela__acao--escolher"
                        onClick={() => selecionarCampanhaFoco(item.idCampanha)}
                        aria-label="Escolher"
                        title={bloqueada ? `${motivoBloqueioCampanha()} (mas dá pra escolher pra explorar T3)` : undefined}
                      >
                        <i className="fa-solid fa-circle-check"></i>
                        <span className="crud-tabela__acao-texto">Escolher</span>
                        <span className="crud-tabela__acao-dica" role="tooltip">Escolher</span>
                      </button>
                    )}
                  </td>
                  {/* CORRIGIDO (08-09-2026, pedido do Lucas) - o cadeado
                      escondia os 3 botões da coluna Ações inteira; só
                      Alterar/Excluir precisam ficar bloqueados nas 10
                      campanhas de demonstração (protegem contra mutação) -
                      Consultar é leitura pura, sem risco nenhum de estragar
                      a demo, não tinha por que ficar atrás do cadeado. */}
                  <td className="crud-tabela__celula--centralizada">
                    <div className="crud-tabela__acoes">
                      <button
                        type="button"
                        className="crud-tabela__acao crud-tabela__acao--alterar"
                        onClick={() => iniciarEdicaoCampanha(item)}
                        aria-label="Alterar"
                      >
                        <i className="fa-solid fa-pen"></i>
                        <span className="crud-tabela__acao-texto">Alterar</span>
                        <span className="crud-tabela__acao-dica" role="tooltip">Alterar</span>
                      </button>
                      <button
                        type="button"
                        className="crud-tabela__acao"
                        onClick={() => setCampanhaConsultada(item)}
                        aria-label="Consultar"
                      >
                        <i className="fa-solid fa-eye"></i>
                        <span className="crud-tabela__acao-texto">Consultar</span>
                        <span className="crud-tabela__acao-dica" role="tooltip">Consultar</span>
                      </button>
                      <button
                        type="button"
                        className="crud-tabela__acao crud-tabela__acao--excluir"
                        onClick={() => setCampanhaExcluindo(item)}
                        aria-label="Excluir"
                      >
                        <i className="fa-solid fa-trash"></i>
                        <span className="crud-tabela__acao-texto">Excluir</span>
                        <span className="crud-tabela__acao-dica" role="tooltip">Excluir</span>
                      </button>
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
            </div>

            <div className="space-y-6">
              <SecaoFicha titulo="Financeiro">
                <CampoFicha rotulo="Meta" valor={formatarReais(campanhaConsultada.metaFinanceira)} />
                <CampoFicha rotulo="Arrecadado" valor={formatarReais(campanhaConsultada.valorBrutoArrecadado)} />
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
        return (
          <ModalFicha
            titulo={campanhaEmEdicao?.titulo ?? `#${idCampanhaEditando}`}
            subtitulo={campanhaEmEdicao ? `Pesquisador: ${nomeDe(campanhaEmEdicao.idUsuario)}` : undefined}
            aoFechar={() => setIdCampanhaEditando(null)}
            rodape={
              <div className="flex gap-3 max-w-sm ml-auto">
                <button
                  type="button"
                  onClick={() => setIdCampanhaEditando(null)}
                  className="btn btn-secondary flex-1"
                >
                  {bloqueadaEdicao ? 'Fechar' : 'Cancelar'}
                </button>
                {!bloqueadaEdicao && (
                  <button type="button" onClick={salvarEdicaoCampanha} className="btn btn-primary flex-1">
                    Salvar
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
                      disabled={bloqueadaEdicao}
                    />
                  </div>
                  <div>
                    <label className="rotulo-campo">Área do conhecimento</label>
                    <select
                      value={formEdicaoCampanha.idAreaConhecimento}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, idAreaConhecimento: evento.target.value })}
                      className="input-padrao"
                      disabled={bloqueadaEdicao}
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
                      disabled={bloqueadaEdicao}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="rotulo-campo">URL do vídeo de apresentação</label>
                    <input
                      type="text"
                      value={formEdicaoCampanha.videoApresentacaoUrl}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, videoApresentacaoUrl: evento.target.value })}
                      className="input-padrao"
                      disabled={bloqueadaEdicao}
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
                  podeEditar={!bloqueadaEdicao && campanhaEmEdicao?.status === 'aguardando_aprovacao'}
                />
                <div className="border-t borda-padrao"></div>

                <SecaoFicha titulo="Datas">
                  <div>
                    <label className="rotulo-campo">Início</label>
                    <input
                      type="date"
                      value={formEdicaoCampanha.dataInicio}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, dataInicio: evento.target.value })}
                      className="input-padrao"
                      disabled={bloqueadaEdicao}
                    />
                  </div>
                  <div>
                    <label className="rotulo-campo">Fim (previsto)</label>
                    <input
                      type="date"
                      value={formEdicaoCampanha.dataFim}
                      onChange={(evento) => setFormEdicaoCampanha({ ...formEdicaoCampanha, dataFim: evento.target.value })}
                      className="input-padrao"
                      disabled={bloqueadaEdicao}
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
                      disabled={bloqueadaEdicao}
                    />
                  </div>
                  <CampoSomenteLeitura rotulo="Arrecadado" valor={campanhaEmEdicao ? formatarReais(campanhaEmEdicao.valorBrutoArrecadado) : '-'} />
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
        const statusNaoElegivel = !bloqueadaDemo && campanhaExcluindo.status !== 'aguardando_aprovacao';
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
              <CampoFicha rotulo="Meta" valor={formatarReais(campanhaExcluindo.metaFinanceira)} largura="cheia" />
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
          subtitulo="Em nome de outro pesquisador - escolha quem é o dono abaixo."
          aoFechar={() => {
            setCriandoCampanha(false);
            setPesquisadorEscolhido(null);
            setBuscaPesquisador('');
          }}
          rodape={
            <div className="flex gap-3 max-w-sm ml-auto">
              <button
                type="button"
                onClick={() => {
                  setCriandoCampanha(false);
                  setPesquisadorEscolhido(null);
                  setBuscaPesquisador('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={criarCampanha}
                disabled={
                  !pesquisadorEscolhido ||
                  !formCriarCampanha.titulo ||
                  !formCriarCampanha.idAreaConhecimento ||
                  !formCriarCampanha.metaFinanceira
                }
                className="btn btn-primary flex-1"
              >
                Criar
              </button>
            </div>
          }
        >
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
                          (podeEscolher ? 'hover:bg-primary/10' : 'opacity-60 cursor-not-allowed')
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
                value={formCriarCampanha.metaFinanceira}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, metaFinanceira: evento.target.value })}
                className="input-padrao"
              />
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
              <label className="rotulo-campo">Início (opcional)</label>
              <input
                type="date"
                value={formCriarCampanha.dataInicio}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, dataInicio: evento.target.value })}
                className="input-padrao"
              />
            </div>
            <div>
              <label className="rotulo-campo">Fim (opcional)</label>
              <input
                type="date"
                value={formCriarCampanha.dataFim}
                onChange={(evento) => setFormCriarCampanha({ ...formCriarCampanha, dataFim: evento.target.value })}
                className="input-padrao"
              />
            </div>
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
        </ModalFicha>
      )}

      {campanhasFiltradas.length > TAMANHOS_PAGINA[0] && (
        <div className="flex items-center justify-between flex-wrap gap-3 mt-3 mb-4 text-sm texto-padrao">
          <span>
            Página {paginaAtual} de {totalPaginas} ({campanhasFiltradas.length} registros)
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold texto-padrao">
              Mostrar
              <select
                value={tamanhoPagina}
                onChange={(evento) => {
                  const valor = evento.target.value;
                  setTamanhoPagina(valor === 'todos' ? 'todos' : Number(valor));
                  setPagina(1);
                }}
                className="border borda-padrao rounded-md fundo-sutil py-1 px-2 text-xs outline-none focus:border-primary"
              >
                {TAMANHOS_PAGINA.map((tamanho) => (
                  <option key={tamanho} value={tamanho}>
                    {tamanho === 'todos' ? 'Todos' : tamanho}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                disabled={paginaAtual === 1}
                className="btn btn-secondary"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                disabled={paginaAtual === totalPaginas}
                className="btn btn-secondary"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Criar campanha saiu daqui (25-08-2026, remoção do Elenco): RLS
          exige id_usuario = id_usuario_atual(), não dá mais pra "criar em
          nome de" um pesquisador escolhido. Lucas vai detalhar depois como
          fica a criação pelo próprio pesquisador (login como ele, ou uma
          conta já com privilégio de pesquisador). */}

      <div className="border-t borda-padrao my-8"></div>

      {campanha && (
        <>
          <div className="fundo-sutil rounded-md p-4 mb-4">
            <div className="flex gap-3 items-center flex-wrap mb-2">
              <span className={`badge ${classeBadgeStatusCampanha(campanha.status)}`}>
                {ROTULO_STATUS_CAMPANHA[campanha.status]}
              </span>
              <h4 className="subtitulo">{campanha.titulo}</h4>
              <span className="legenda">dono: {nomeDono ?? campanha.idUsuario}</span>
              {CAMPANHA_BLOQUEADA(campanha.idCampanha) && (
                <span className="badge badge-erro" title={motivoBloqueioCampanha()}>
                  <i className="fa-solid fa-lock"></i> demonstração
                </span>
              )}
            </div>
            <p className="paragrafo">
              Modelo: {campanha.modelo} · Meta: {formatarReais(campanha.metaFinanceira)} · Arrecadado: {formatarReais(campanha.valorBrutoArrecadado)}
              {campanha.taxaPlataforma !== null && (
                <>
                  {' '}
                  · Taxa: {campanha.taxaPlataforma}% <i className="fa-solid fa-lock" title="Congelada após aprovação"></i>
                </>
              )}
            </p>
          </div>

          {/* CORRIGIDO (08-09-2026, pedido do Lucas) - só faz sentido
              perguntar "pronta pra aprovar?" enquanto a campanha ainda
              está aguardando aprovação; uma campanha já encerrada/rejeitada/
              ativa não precisa mais dessa checklist nem dos botões
              Aprovar/Rejeitar. */}
          {campanha.status === 'aguardando_aprovacao' && (
            <div className="fundo-sutil rounded-md p-4 mb-4">
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
                    <td>Orçamento: {orcamento.length} itens (mínimo {minimoItensOrcamento})</td>
                    <td className="crud-tabela__celula--centralizada">
                      <span className={`badge ${orcamento.length >= minimoItensOrcamento ? 'badge-sucesso' : 'badge-erro'}`}>
                        {orcamento.length >= minimoItensOrcamento ? 'OK' : 'Faltando'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Soma × meta: {formatarReais(somaOrcamento)} de {formatarReais(campanha.metaFinanceira)}
                      {!metaBatendo && ` (faltam ${formatarReais(Number(campanha.metaFinanceira) - somaOrcamento)})`}
                    </td>
                    <td className="crud-tabela__celula--centralizada">
                      <span className={`badge ${metaBatendo ? 'badge-sucesso' : 'badge-erro'}`}>{metaBatendo ? 'OK' : 'Faltando'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Cronograma: {cronograma.length} marcos (mínimo {minimoMarcosCronograma})</td>
                    <td className="crud-tabela__celula--centralizada">
                      <span className={`badge ${cronogramaOk ? 'badge-sucesso' : 'badge-erro'}`}>{cronogramaOk ? 'OK' : 'Faltando'}</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="acao-com-motivo mt-3">
                <button type="button" className="btn btn-primary" disabled={!prontaParaAprovar} onClick={aprovar}>
                  Aprovar (Admin)
                </button>
                {!prontaParaAprovar && <span className="acao-com-motivo__motivo">{motivoAprovarDesabilitado()}</span>}
              </div>

              <div className="flex gap-2 items-end mt-3">
                <textarea
                  placeholder="Justificativa da rejeição (opcional)"
                  value={justificativaRejeicao}
                  onChange={(evento) => setJustificativaRejeicao(evento.target.value)}
                  className="input-padrao flex-1"
                  rows={2}
                />
                <button type="button" className="btn btn-secondary text-xs" onClick={rejeitar}>
                  Rejeitar (Admin)
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <button type="button" className={`btn ${abaAtiva === 'orcamento' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('orcamento')}>
              Orçamento
            </button>
            <button type="button" className={`btn ${abaAtiva === 'cronograma' ? 'btn-primary' : 'btn-secondary'} text-xs`} onClick={() => setAbaAtiva('cronograma')}>
              Cronograma
            </button>
          </div>

          {abaAtiva === 'orcamento' && (
            <table className="crud-tabela mb-3">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Valor</th>
                  {campanha.status === 'aguardando_aprovacao' && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {orcamento.map((item) => (
                  <tr key={item.idOrcamento}>
                    <td>{item.categoria}</td>
                    <td>{formatarReais(item.valor)}</td>
                    {campanha.status === 'aguardando_aprovacao' && (
                      <td>
                        <button type="button" className="crud-tabela__acao crud-tabela__acao--excluir" onClick={() => removerItemOrcamento(item.idOrcamento)}>
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {campanha.status === 'aguardando_aprovacao' && (
                  <tr>
                    <td>
                      <input type="text" value={novoItemOrcamento.categoria} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, categoria: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs w-full" placeholder="Categoria" />
                    </td>
                    <td>
                      <input type="number" value={novoItemOrcamento.valor} onChange={(e) => setNovoItemOrcamento({ ...novoItemOrcamento, valor: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs w-24" placeholder="Valor" />
                    </td>
                    <td>
                      <button type="button" className="btn btn-secondary text-xs" onClick={adicionarItemOrcamento}>
                        + adicionar
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {abaAtiva === 'cronograma' && (
            <table className="crud-tabela mb-3">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Data prevista</th>
                  {campanha.status === 'aguardando_aprovacao' && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {cronograma.map((marco) => (
                  <tr key={marco.idMarco}>
                    <td>{marco.titulo}</td>
                    <td>{new Date(marco.dataPrevista).toLocaleDateString('pt-BR')}</td>
                    {campanha.status === 'aguardando_aprovacao' && (
                      <td>
                        <button type="button" className="crud-tabela__acao crud-tabela__acao--excluir" onClick={() => removerMarco(marco.idMarco)}>
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {campanha.status === 'aguardando_aprovacao' && (
                  <tr>
                    <td>
                      <input type="text" value={novoMarco.titulo} onChange={(e) => setNovoMarco({ ...novoMarco, titulo: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs w-full" placeholder="Título" />
                    </td>
                    <td>
                      <input type="date" value={novoMarco.dataPrevista} onChange={(e) => setNovoMarco({ ...novoMarco, dataPrevista: e.target.value })} className="border borda-padrao rounded-md px-2 py-1 text-xs" />
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
          )}
        </>
      )}

      <RegistroChamadas />
      </section>
    </div>
  );
}
