import { useCallback, useEffect, useState } from 'react';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { usuarioPapelApi, papelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { ErroHttp, tratarResposta } from '../../services/constant/api/http.util';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
  classeBadgeStatusPesquisador,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { formatarCpf, formatarCpfOuMotivoOculto, formatarData, formatarDataHora, formatarNomeDimensao } from '../../services/constant/utils/formatacao.util';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import { CamposVinculoPerfil } from '../6-perfil-pesquisador/campos-vinculo-perfil';
import { SecaoModeracaoPesquisador } from '../6-perfil-pesquisador/secao-moderacao-pesquisador';
import { SecaoModeracao } from './secao-moderacao';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioResponse, UsuarioResponseLoginHistorico, UsuarioResponseTermoAceito } from '../../services/1-usuario/type/usuario.type';
import type { PapelResponse, UsuarioPapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';
import type {
  PerfilPesquisadorResponse,
  PerfilPesquisadorResponseScore,
} from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';
import type { EntradaRegistroChamada } from '../../services/campo-testes/context/campo-testes-context';

// ============================================================================
// Modal ÚNICO de Alterar/Consultar/Excluir Usuário (nome/senha/foto/papéis/
// moderação de conta) + Perfil de Pesquisador (vínculo/título/CPF/score/
// links acadêmicos/moderação de pesquisador) - nasceu dentro do Campo de
// Testes (T1, Bancada do Pesquisador, 07 a 12-09-2026), extraído pra cá
// (13-09-2026, pedido do Lucas: "apagar as telas do CRUD de Usuário, fazer a
// completa migração do Modal") pra virar o CRUD real de Usuário, sem deixar
// de ser usado por T1 também - um único componente, dois consumidores.
//
// Diferença chave em relação à versão que vivia em bancada-pesquisador.tsx:
// aqui NUNCA se usa `chamarERegistrar`/`useCampoTestes()` diretamente - esses
// só existem dentro de `<CampoTestesProvider>`, que só é montado em build de
// desenvolvimento (ver App.tsx). Este arquivo é código de produção de
// verdade, usado sempre; toda chamada usa `auth.authFetch` direto (via
// `usuarioApi`/`perfilPesquisadorApi`/`usuarioPapelApi`/`papelApi`, mesma
// convenção do resto do painel fora do Campo de Testes) - mesma exceção já
// aceita pra `SecaoModeracaoPesquisador`/`SecaoModeracao` (não aparecem no
// Registro de Chamadas quando usado a partir de T1, consciente).
//
// CORRIGIDO (13-09-2026, achado numa varredura de código morto/inerte pedida
// pelo Lucas depois da extração): a frase acima ficou incompleta na primeira
// versão - T1 (que TINHA todas essas chamadas registradas em T4 antes da
// extração) passou a não aparecer mais NUNCA no Registro de Chamadas, mesmo
// pra quem só usa T1 (perda real, não cosmética, pro próprio propósito de T1
// - "testar upgrade de perfil, scores, etc." de perto). Corrigido com uma
// prop opcional `aoRegistrarChamada?: (entrada: EntradaRegistroChamada) =>
// void` em cada modal - `undefined` na página real (nunca registra, nunca
// depende do provider), a função de verdade só quando T1 passa (via
// `useCampoTestes().registrarChamada`). O helper `comRegistro()` abaixo
// cronometra e reporta cada chamada só quando essa prop existe.
//
// Também self-contido: cada modal recebe só `idUsuario` e busca os PRÓPRIOS
// dados ao abrir (nome/perfil/avatar/papéis) - não depende mais de uma linha
// pré-carregada pelo componente pai, então serve tanto pra listar-usuarios.
// tsx (linha sem perfil_pesquisador embutido) quanto pra bancada-
// pesquisador.tsx (linha já com tudo, mas ignorada por este componente).
// ============================================================================

const SENHA_DEV = 'DevTcc123!';

// Aproximação consciente: em sucesso, a camada tipada (`usuarioApi` etc.)
// nunca expõe o status HTTP real (só o corpo já tratado por
// `tratarResposta<T>`) - `200` aqui é só um rótulo genérico de "deu certo"
// pro Registro de Chamadas, não o código exato que o servidor mandou. Em
// erro, `ErroHttp.status` já carrega o código de verdade (ver http.util.ts),
// esse sim exato.
async function comRegistro<T>(
  aoRegistrarChamada: ((entrada: EntradaRegistroChamada) => void) | undefined,
  metodo: string,
  caminho: string,
  corpoEnviado: unknown,
  chamada: () => Promise<T>,
): Promise<T> {
  if (!aoRegistrarChamada) {
    return chamada();
  }
  const inicio = performance.now();
  try {
    const resultado = await chamada();
    aoRegistrarChamada({
      metodo,
      caminho,
      status: 200,
      ms: Math.round(performance.now() - inicio),
      corpoEnviado: corpoEnviado ?? null,
      corpoRecebido: resultado,
      ok: true,
    });
    return resultado;
  } catch (erro) {
    aoRegistrarChamada({
      metodo,
      caminho,
      status: erro instanceof ErroHttp ? erro.status : 0,
      ms: Math.round(performance.now() - inicio),
      corpoEnviado: corpoEnviado ?? null,
      corpoRecebido: null,
      ok: false,
    });
    throw erro;
  }
}

// Extraído (13-09-2026, achado de auditoria: os dois modais abaixo abriam
// com o MESMO Promise.all de 4 chamadas - usuário, perfil de pesquisador,
// avatar, papéis - byte a byte, cada um com sua própria cópia de estado).
// `perfilPesquisador` e `papeis` continuam expostos com setter porque NÃO
// são só leitura em ModalAlterarUsuario - `criarPerfil()` reatribui o
// primeiro depois de criar um perfil, e as 4 ações de papel (atribuir/
// suspender/reativar/revogar) reatribuem o segundo depois de cada uma -
// nenhum dos dois é puramente derivado da busca inicial só em Alterar
// (em Consultar, os dois são só leitura, o setter simplesmente não é
// usado). `carregando` é true até o Promise.all assentar (sucesso OU
// erro), igual ao `finally` que já existia nas duas cópias.
// `reportarErro` é recebido do chamador (em vez de um `useErroToast()`
// próprio aqui dentro) de propósito - em ModalAlterarUsuario, o mesmo erro
// dessa busca inicial precisa cair na MESMA faixa de erro que as outras
// ~10 ações do modal (atribuir papel, criar perfil, etc.) já usam; um
// `useErroToast()` isolado aqui dentro criaria um segundo estado de erro
// que a busca inicial nunca alimentaria.
function useDadosUsuario(
  idUsuario: number,
  auth: Pick<UseAuthReturn, 'authFetch'>,
  aoRegistrarChamada: ((entrada: EntradaRegistroChamada) => void) | undefined,
  reportarErro: (erro: unknown) => void,
) {
  const [usuario, setUsuario] = useState<UsuarioResponse | null>(null);
  const [perfilPesquisador, setPerfilPesquisador] = useState<PerfilPesquisadorResponse | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [papeis, setPapeis] = useState<UsuarioPapelResponse[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    setUsuario(null);
    setPerfilPesquisador(null);
    setAvatarUrl(null);
    setPapeis(null);
    Promise.all([
      comRegistro(aoRegistrarChamada, 'GET', `/usuario/${idUsuario}`, null, () => usuarioApi.buscar(auth.authFetch, idUsuario)),
      comRegistro(aoRegistrarChamada, 'GET', `/perfil-pesquisador/${idUsuario}`, null, () => perfilPesquisadorApi.buscar(auth.authFetch, idUsuario)).catch(() => null),
      // Avatar não é registrado (endpoint público, cosmético).
      arquivoApi.buscarAvatarPorUsuario(idUsuario).catch(() => null),
      comRegistro(aoRegistrarChamada, 'GET', `/usuario-papel/${idUsuario}`, null, () => usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario)).catch(() => []),
    ])
      .then(([dadosUsuario, perfil, avatar, papeisDoUsuario]) => {
        setUsuario(dadosUsuario);
        setPerfilPesquisador(perfil);
        setAvatarUrl(avatar?.url ?? null);
        setPapeis(papeisDoUsuario);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  return { usuario, perfilPesquisador, setPerfilPesquisador, avatarUrl, papeis, setPapeis, carregando };
}


interface BotaoVerFotoPerfilProps {
  url: string;
  tamanho?: string;
  badge?: boolean;
}

// Botão de olho - abre a foto de perfil em outra guia. Mesma explicação de
// sempre (ERA local só em consultar-usuario.tsx): não existe "tamanho
// máximo" de verdade, é a MESMA url do avatar pequeno, já processada pelo
// `sharp` no upload (RNF-016). `badge` desenha o selo circular sobreposto no
// canto inferior direito do avatar (cabeçalho do modal); sem `badge`, é o
// ícone inline usado dentro de "Dados da conta".
function BotaoVerFotoPerfil({ url, tamanho = 'text-base', badge = false }: BotaoVerFotoPerfilProps) {
  if (badge) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir imagem em outra guia"
        title="Abrir imagem em outra guia"
        className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-opacity hover:opacity-80"
        style={{
          backgroundColor: 'var(--color-dark)',
          borderColor: 'var(--cor-fundo-cartao)',
          color: 'var(--color-white)',
        }}
      >
        <i className="fa-solid fa-eye text-xs"></i>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir imagem em outra guia"
      title='Abrir imagem em outra guia (no tamanho "máximo" - já reduzido pelo servidor, o original não é guardado)'
      className={'texto-forte hover:opacity-70 transition-opacity shrink-0 ' + tamanho}
    >
      <i className="fa-solid fa-eye"></i>
    </a>
  );
}

// `link-academico` (módulo 7) ainda não tem type/api formal em react/src
// (pasta existe, só com .gitkeep) - interface local + authFetch cru, mesma
// convenção já usada em vida-campanha-ativa.tsx/bancada-campanha.tsx pra
// módulos sem camada tipada ainda.
interface LinkAcademico {
  idLinkAcademico: number;
  idTipoLink: number;
  url: string;
  rotulo: string | null;
}

const TAMANHO_MAXIMO_URL_NA_LINHA = 40;

function truncarUrl(url: string): string {
  return url.length > TAMANHO_MAXIMO_URL_NA_LINHA ? `${url.slice(0, TAMANHO_MAXIMO_URL_NA_LINHA)} ...` : url;
}

interface PainelLinksAcademicosProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  tiposLink: TipoLinkResponse[];
  aoRegistrarChamada?: (entrada: EntradaRegistroChamada) => void;
}

function PainelLinksAcademicos({ auth, idUsuario, tiposLink, aoRegistrarChamada }: PainelLinksAcademicosProps) {
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const { obterConfiguracao } = useConfiguracoes();
  const valorLimiteLinks = obterConfiguracao('limite_links_academicos_perfil', 5);
  const limiteLinks = typeof valorLimiteLinks === 'number' ? valorLimiteLinks : 5;

  const [links, setLinks] = useState<LinkAcademico[]>([]);
  const [novoLink, setNovoLink] = useState({ idTipoLink: '', url: '', rotulo: '' });
  const [idLinkEditando, setIdLinkEditando] = useState<number | null>(null);
  const [formEdicaoLink, setFormEdicaoLink] = useState({ url: '', rotulo: '' });
  const [linkConsultado, setLinkConsultado] = useState<LinkAcademico | null>(null);

  const carregarLinks = useCallback(() => {
    const caminho = `/link-academico?idUsuario=${idUsuario}`;
    comRegistro(aoRegistrarChamada, 'GET', caminho, null, () =>
      auth.authFetch(caminho).then(tratarResposta<LinkAcademico[]>),
    )
      .then(setLinks)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  useEffect(() => {
    carregarLinks();
  }, [carregarLinks]);

  const adicionarLink = async () => {
    if (!novoLink.idTipoLink || !novoLink.url) return;
    const corpo = {
      idTipoLink: Number(novoLink.idTipoLink),
      url: novoLink.url,
      ...(novoLink.rotulo ? { rotulo: novoLink.rotulo } : {}),
    };
    try {
      await comRegistro(aoRegistrarChamada, 'POST', `/link-academico/${idUsuario}`, corpo, () =>
        auth.authFetch(`/link-academico/${idUsuario}`, { method: 'POST', body: JSON.stringify(corpo) }).then(tratarResposta<LinkAcademico>),
      );
      carregarLinks();
      setNovoLink({ idTipoLink: '', url: '', rotulo: '' });
      mostrar('Link acadêmico adicionado com sucesso.');
    } catch (erro) {
      reportarErro(erro);
    }
  };

  const removerLink = async (idLinkAcademico: number) => {
    try {
      await comRegistro(aoRegistrarChamada, 'DELETE', `/link-academico/${idLinkAcademico}`, null, () =>
        auth.authFetch(`/link-academico/${idLinkAcademico}`, { method: 'DELETE' }).then(tratarResposta<void>),
      );
      carregarLinks();
      mostrar('Link acadêmico excluído com sucesso.');
    } catch (erro) {
      reportarErro(erro);
    }
  };

  const iniciarEdicaoLink = (link: LinkAcademico) => {
    setIdLinkEditando(link.idLinkAcademico);
    setFormEdicaoLink({ url: link.url, rotulo: link.rotulo ?? '' });
  };

  const salvarEdicaoLink = async () => {
    if (!formEdicaoLink.url) return;
    const corpo = { url: formEdicaoLink.url, ...(formEdicaoLink.rotulo ? { rotulo: formEdicaoLink.rotulo } : {}) };
    try {
      await comRegistro(aoRegistrarChamada, 'PATCH', `/link-academico/${idLinkEditando}`, corpo, () =>
        auth.authFetch(`/link-academico/${idLinkEditando}`, { method: 'PATCH', body: JSON.stringify(corpo) }).then(tratarResposta<void>),
      );
      carregarLinks();
      setIdLinkEditando(null);
      mostrar('Link acadêmico alterado com sucesso.');
    } catch (erro) {
      reportarErro(erro);
    }
  };

  return (
    <>
      <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">
        Links acadêmicos ({links.length} de {limiteLinks})
      </h3>
      <div className="links-academicos-wrapper">
        <table className="crud-tabela mb-2">
          <thead>
            <tr>
              <th className="crud-tabela__celula--centralizada">Tipo</th>
              <th className="crud-tabela__celula--centralizada">URL</th>
              <th className="crud-tabela__celula--centralizada">Rótulo</th>
              <th className="crud-tabela__celula--centralizada">Ações</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => {
              const emEdicao = idLinkEditando === link.idLinkAcademico;
              return (
                <tr key={link.idLinkAcademico}>
                  <td className="crud-tabela__celula--centralizada">{tiposLink.find((t) => t.idTipolink === link.idTipoLink)?.nome ?? link.idTipoLink}</td>
                  {emEdicao ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={formEdicaoLink.url}
                          onChange={(evento) => setFormEdicaoLink({ ...formEdicaoLink, url: evento.target.value })}
                          className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1 w-full"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={formEdicaoLink.rotulo}
                          onChange={(evento) => setFormEdicaoLink({ ...formEdicaoLink, rotulo: evento.target.value })}
                          className="border-2 border-[var(--cor-texto-info)] rounded-md px-2 py-1 w-full"
                        />
                      </td>
                      <td className="crud-tabela__celula--centralizada">
                        <div className="crud-tabela__acoes">
                          <button type="button" className="crud-tabela__acao crud-tabela__acao--escolher" onClick={salvarEdicaoLink} aria-label="Salvar">
                            <i className="fa-solid fa-check"></i>
                            <span className="crud-tabela__acao-texto">Salvar</span>
                            <span className="crud-tabela__acao-dica" role="tooltip">Salvar</span>
                          </button>
                          <button type="button" className="crud-tabela__acao" onClick={() => setIdLinkEditando(null)} aria-label="Cancelar">
                            <i className="fa-solid fa-xmark"></i>
                            <span className="crud-tabela__acao-texto">Cancelar</span>
                            <span className="crud-tabela__acao-dica" role="tooltip">Cancelar</span>
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ whiteSpace: 'nowrap' }}>{truncarUrl(link.url)}</td>
                      <td className="crud-tabela__celula--centralizada">{link.rotulo ?? '-'}</td>
                      <td className="crud-tabela__celula--centralizada">
                        <div className="crud-tabela__acoes">
                          <button
                            type="button"
                            className="crud-tabela__acao crud-tabela__acao--alterar"
                            onClick={() => iniciarEdicaoLink(link)}
                            aria-label="Alterar"
                          >
                            <i className="fa-solid fa-pen"></i>
                            <span className="crud-tabela__acao-texto">Alterar</span>
                            <span className="crud-tabela__acao-dica" role="tooltip">Alterar</span>
                          </button>
                          <button
                            type="button"
                            className="crud-tabela__acao"
                            onClick={() => setLinkConsultado(link)}
                            aria-label="Consultar"
                          >
                            <i className="fa-solid fa-eye"></i>
                            <span className="crud-tabela__acao-texto">Consultar</span>
                            <span className="crud-tabela__acao-dica" role="tooltip">Consultar</span>
                          </button>
                          <button
                            type="button"
                            className="crud-tabela__acao crud-tabela__acao--excluir"
                            onClick={() => removerLink(link.idLinkAcademico)}
                            aria-label="Remover"
                          >
                            <i className="fa-solid fa-trash"></i>
                            <span className="crud-tabela__acao-texto">Remover</span>
                            <span className="crud-tabela__acao-dica" role="tooltip">Remover</span>
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {links.length < limiteLinks && (
              <tr>
                <td>
                  <select
                    value={novoLink.idTipoLink}
                    onChange={(evento) => setNovoLink({ ...novoLink, idTipoLink: evento.target.value })}
                    className="border borda-forte rounded-md px-2 py-1 w-full"
                  >
                    <option value="">Tipo...</option>
                    {tiposLink.map((tipo) => (
                      <option key={tipo.idTipolink} value={tipo.idTipolink}>
                        {tipo.nome}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="URL"
                    value={novoLink.url}
                    onChange={(evento) => setNovoLink({ ...novoLink, url: evento.target.value })}
                    className="border borda-forte rounded-md px-2 py-1 w-full placeholder:text-[var(--cor-texto)]"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Rótulo (opcional)"
                    value={novoLink.rotulo}
                    onChange={(evento) => setNovoLink({ ...novoLink, rotulo: evento.target.value })}
                    className="border borda-forte rounded-md px-2 py-1 w-full placeholder:text-[var(--cor-texto)]"
                  />
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {links.length < limiteLinks && (
        <button type="button" className="btn btn-primary" onClick={adicionarLink}>
          + Adicionar
        </button>
      )}

      {linkConsultado && (
        <ModalDetalhe
          rotuloAcao="Consultar"
          titulo={tiposLink.find((t) => t.idTipolink === linkConsultado.idTipoLink)?.nome ?? 'Link acadêmico'}
          secoes={[
            { titulo: 'URL completa:', conteudo: <a href={linkConsultado.url} target="_blank" rel="noreferrer" className="texto-link break-all">{linkConsultado.url}</a> },
            { titulo: 'Rótulo:', conteudo: linkConsultado.rotulo ?? '(sem rótulo)' },
          ]}
          aoFechar={() => setLinkConsultado(null)}
        />
      )}
    </>
  );
}

interface PainelScoreProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  aoRegistrarChamada?: (entrada: EntradaRegistroChamada) => void;
}

function PainelScore({ auth, idUsuario, aoRegistrarChamada }: PainelScoreProps) {
  const [score, setScore] = useState<PerfilPesquisadorResponseScore | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScore(null);
    comRegistro(aoRegistrarChamada, 'GET', `/perfil-pesquisador/${idUsuario}/score`, null, () =>
      perfilPesquisadorApi.buscarScore(auth.authFetch, idUsuario),
    )
      .then(setScore)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  return (
    <>
      <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">Score</h3>
      <div className="fundo-erro texto-erro rounded-md p-4 mb-3 flex items-start gap-3">
        <i className="fa-solid fa-triangle-exclamation text-xl"></i>
        <div>
          <p className="font-bold">Ainda não está pronto</p>
          <p className="text-sm">
            A regra de negócio de pontuação (pesos e dimensões abaixo) ainda não foi fechada. Os números
            são só uma prévia da estrutura, não confie neles pra testar nada que dependa do valor final.
          </p>
        </div>
      </div>
      {score ? (
        <>
          <p>
            {score.scoreTotal} pontos, <span className="badge badge-sucesso">{score.rotulo}</span>
          </p>
          <table className="crud-tabela mt-2">
            <thead>
              <tr>
                <th>Dimensão</th>
                <th>Pontos</th>
                <th>Peso</th>
              </tr>
            </thead>
            <tbody>
              {score.dimensoes.map((dimensao) => (
                <tr key={dimensao.nomeDimensao}>
                  <td>{formatarNomeDimensao(dimensao.nomeDimensao)}</td>
                  <td>{dimensao.pontosObtidos}</td>
                  <td>{dimensao.peso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="texto-fraco text-xs">carregando...</p>
      )}
    </>
  );
}

interface ModalConsultarUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  aoFechar: () => void;
  aoRegistrarChamada?: (entrada: EntradaRegistroChamada) => void;
}

// Consultar - mesmo conteúdo de consultar-usuario.tsx (Dados da conta,
// Acesso/histórico de login, Papéis) + Perfil de Pesquisador/Score (só se a
// pessoa for pesquisadora) - tudo buscado ao abrir, não precisa de rota.
export function ModalConsultarUsuario({ auth, idUsuario, aoFechar, aoRegistrarChamada }: ModalConsultarUsuarioProps) {
  const { erro, reportarErro } = useErroToast();
  const { usuario, perfilPesquisador, avatarUrl, papeis } = useDadosUsuario(idUsuario, auth, aoRegistrarChamada, reportarErro);
  const [logins, setLogins] = useState<UsuarioResponseLoginHistorico[] | null>(null);
  const [carregandoLogins, setCarregandoLogins] = useState(false);
  const [loginsAbertos, setLoginsAbertos] = useState(false);
  // Termos de Uso aceitos (14-09-2026, pedido do Lucas: "onde fica
  // registrado" o aceite) - buscado sempre (não atrás de um toggle, como os
  // logins) porque é informação de conformidade que faz sentido já vir
  // visível ao consultar a conta, não um detalhe auxiliar raramente checado.
  const [termosAceitos, setTermosAceitos] = useState<UsuarioResponseTermoAceito[] | null>(null);

  useEffect(() => {
    comRegistro(aoRegistrarChamada, 'GET', `/usuario/${idUsuario}/termos-aceitos`, null, () =>
      usuarioApi.listarTermosAceitos(auth.authFetch, idUsuario),
    )
      .then(setTermosAceitos)
      // Leitura auxiliar - falha aqui não deve travar o resto do modal.
      .catch(() => setTermosAceitos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  const aoAlternarLogins = async () => {
    if (loginsAbertos) {
      setLoginsAbertos(false);
      return;
    }
    setLoginsAbertos(true);
    if (logins !== null) return;
    setCarregandoLogins(true);
    try {
      const resultado = await comRegistro(aoRegistrarChamada, 'GET', `/usuario/${idUsuario}/logins`, null, () =>
        usuarioApi.listarLogins(auth.authFetch, idUsuario),
      );
      setLogins(resultado);
    } catch {
      // Leitura auxiliar - falha aqui não deve travar o resto do modal.
    } finally {
      setCarregandoLogins(false);
    }
  };

  const loginsAnteriores = logins?.slice(1) ?? [];

  return (
    <ModalFicha
      // `carregando` (14-09-2026) - ModalFicha já esconde título/avatar
      // sozinho enquanto `usuario` não chega, mostrando "Carregando..." no
      // lugar (ver comentário completo em modal-ficha.tsx).
      carregando={!usuario}
      titulo={usuario?.nome ?? ''}
      subtitulo={usuario?.email}
      avatar={
        usuario && (
          <div className="relative shrink-0">
            <AvatarUsuario nome={usuario.nome} foto={avatarUrl} tamanho="lg" />
            {avatarUrl && (
              <div className="absolute bottom-0 right-0">
                <BotaoVerFotoPerfil url={avatarUrl} badge />
              </div>
            )}
          </div>
        )
      }
      aoFechar={aoFechar}
      rodape={
        <button type="button" onClick={aoFechar} className="btn btn-secondary w-full">
          Fechar
        </button>
      }
    >
      {!usuario ? (
        <p className="p-6 text-center text-sm texto-fraco">{erro || 'Carregando...'}</p>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <SecaoFicha titulo="Dados da conta">
                <CampoFicha rotulo="id" valor={usuario.idUsuario} />
                <CampoFicha
                  rotulo="Foto de perfil"
                  valor={
                    avatarUrl ? (
                      <span className="inline-flex items-center gap-2">
                        <BotaoVerFotoPerfil url={avatarUrl} />
                        Foto cadastrada
                      </span>
                    ) : (
                      'Sem foto (usa iniciais)'
                    )
                  }
                />
                <CampoFicha rotulo="Criado em" valor={formatarData(usuario.criadoEm)} />
                <CampoFicha rotulo="E-mail verificado" valor={usuario.emailVerificado ? 'Sim' : 'Não'} />
              </SecaoFicha>

              <SecaoFicha titulo="Acesso">
                <CampoFicha
                  rotulo="Último login em"
                  largura="cheia"
                  valor={usuario.ultimoLoginEm ? formatarDataHora(usuario.ultimoLoginEm) : 'Nunca'}
                  acao={
                    usuario.ultimoLoginEm && (
                      <button
                        type="button"
                        onClick={aoAlternarLogins}
                        aria-label="Ver logins anteriores"
                        title="Ver logins anteriores"
                        className="texto-fraco hover-texto-forte transition-colors shrink-0"
                      >
                        <i className={'fa-solid fa-chevron-down transition-transform' + (loginsAbertos ? ' rotate-180' : '')}></i>
                      </button>
                    )
                  }
                >
                  {loginsAbertos && (
                    <div className="mt-2 rounded-lg border borda-padrao fundo-sutil p-3 text-sm max-h-64 overflow-y-auto">
                      {carregandoLogins ? (
                        <p className="texto-fraco">Carregando...</p>
                      ) : loginsAnteriores.length === 0 ? (
                        <p className="texto-fraco">Nenhum login anterior registrado.</p>
                      ) : (
                        <ul className="space-y-1">
                          {loginsAnteriores.map((login, indice) => (
                            <li key={indice} className="texto-padrao">
                              {formatarDataHora(login.logadoEm)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </CampoFicha>
              </SecaoFicha>

              {termosAceitos === null ? (
                <SecaoFicha titulo="Termos de Uso Aceitos" colunas={1}>
                  <p className="texto-fraco text-sm">Carregando...</p>
                </SecaoFicha>
              ) : termosAceitos.length === 0 ? (
                <SecaoFicha titulo="Termos de Uso Aceitos" colunas={1}>
                  <p className="texto-fraco text-sm">Nenhum termo aceito registrado.</p>
                </SecaoFicha>
              ) : (
                <SecaoFicha titulo="Termos de Uso Aceitos">
                  {termosAceitos.map((termo, indice) => (
                    <CampoFicha
                      key={indice}
                      rotulo={ROTULO_TIPO_TERMO[termo.tipo]}
                      valor={`${termo.versao} - ${formatarDataHora(termo.aceitoEm)}`}
                    />
                  ))}
                </SecaoFicha>
              )}

              {perfilPesquisador && (
                <SecaoFicha titulo="Perfil de Pesquisador">
                  <CampoFicha rotulo="CPF" valor={formatarCpfOuMotivoOculto(perfilPesquisador.cpf)} />
                  <CampoFicha
                    rotulo="Status"
                    valor={
                      <span className={'badge ' + classeBadgeStatusPesquisador(perfilPesquisador.statusPesquisador)}>
                        {ROTULO_STATUS_PESQUISADOR[perfilPesquisador.statusPesquisador]}
                      </span>
                    }
                  />
                  <CampoFicha rotulo="Título acadêmico" valor={ROTULO_TITULO_ACADEMICO[perfilPesquisador.tituloAcademico]} />
                  <CampoFicha rotulo="Tipo de vínculo" valor={ROTULO_TIPO_VINCULO[perfilPesquisador.tipoVinculo]} />
                  <CampoFicha rotulo="Vínculo institucional" valor={perfilPesquisador.vinculoInstitucional} />
                  <CampoFicha rotulo="Score atual" valor={perfilPesquisador.scoreAtual} />
                  <CampoFicha
                    rotulo="Ativado em"
                    valor={perfilPesquisador.ativadoEm ? formatarDataHora(perfilPesquisador.ativadoEm) : undefined}
                  />
                </SecaoFicha>
              )}
            </div>

            <div className="space-y-6">
              <SecaoFicha titulo="Papéis">
                <CampoFicha
                  rotulo="Papéis atribuídos"
                  largura="cheia"
                  valor={
                    papeis === null
                      ? undefined
                      : papeis.length === 0
                        ? null
                        : papeis.map((papel) => papel.nomePapel).join(', ')
                  }
                />
              </SecaoFicha>
            </div>
          </div>

          {perfilPesquisador && (
            <>
              <div className="border-t borda-padrao"></div>
              <PainelScore auth={auth} idUsuario={idUsuario} aoRegistrarChamada={aoRegistrarChamada} />
            </>
          )}
        </>
      )}
    </ModalFicha>
  );
}

interface ModalAlterarUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  aoFechar: () => void;
  aoAtualizado: () => void;
  aoRegistrarChamada?: (entrada: EntradaRegistroChamada) => void;
}

// Alterar - conta inteira (nome/senha/foto/papéis/moderação de conta) +
// Perfil de Pesquisador (vínculo/título/CPF/links/moderação de pesquisador),
// pra quem já é pesquisador. Criar perfil pra quem ainda não é passou a
// viver só no cadeado de upgrade (6-perfil-pesquisador/modal-upgrade-
// pesquisador.tsx), hoje disponível apenas na Bancada do Pesquisador
// (Campo de Testes) - removido de aqui a pedido do Lucas (14-09-2026,
// duplicava o mesmo poder sem passar pelo Termo de Uso).
export function ModalAlterarUsuario({ auth, idUsuario, aoFechar, aoAtualizado, aoRegistrarChamada }: ModalAlterarUsuarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [tiposLink, setTiposLink] = useState<TipoLinkResponse[]>([]);

  const { usuario, perfilPesquisador, avatarUrl, papeis, setPapeis, carregando } = useDadosUsuario(
    idUsuario,
    auth,
    aoRegistrarChamada,
    reportarErro,
  );
  const papeisAtuais = papeis ?? [];

  const [nomeEdicao, setNomeEdicao] = useState('');
  const [novaSenhaEdicao, setNovaSenhaEdicao] = useState('');
  const [idImagemPerfilNovo, setIdImagemPerfilNovo] = useState<number | null | undefined>(undefined);
  const [avatarUrlNovo, setAvatarUrlNovo] = useState<string | null>(null);
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [redefinindoSenhaDev, setRedefinindoSenhaDev] = useState(false);

  const [formEdicaoPerfil, setFormEdicaoPerfil] = useState<{
    tipoVinculo: TipoVinculo;
    vinculoInstitucional: string;
    tituloAcademico: TituloAcademico;
  } | null>(null);
  const [cpfCorrecao, setCpfCorrecao] = useState('');

  const [catalogoPapeis, setCatalogoPapeis] = useState<PapelResponse[]>([]);
  const [idPapelParaAtribuir, setIdPapelParaAtribuir] = useState('');
  const [atribuindoPapel, setAtribuindoPapel] = useState(false);
  const [papelSuspendendoId, setPapelSuspendendoId] = useState<number | null>(null);
  const [enviandoSuspensaoPapel, setEnviandoSuspensaoPapel] = useState<number | null>(null);
  const [reativandoPapel, setReativandoPapel] = useState<number | null>(null);
  const [revogandoPapel, setRevogandoPapel] = useState<number | null>(null);

  // Reseta o formulário de edição sempre que uma busca nova de `usuario`
  // termina (dep só em `usuario`, de propósito - ele nunca muda por nenhuma
  // outra ação deste modal, só pela busca inicial de `useDadosUsuario`, então
  // dispara exatamente 1x por abertura, igual ao `.then()` único de antes da
  // extração).
  useEffect(() => {
    if (!usuario) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNomeEdicao(usuario.nome);
    setNovaSenhaEdicao('');
    setIdImagemPerfilNovo(undefined);
    setAvatarUrlNovo(null);
    setFormEdicaoPerfil(
      perfilPesquisador
        ? {
            tipoVinculo: perfilPesquisador.tipoVinculo,
            vinculoInstitucional: perfilPesquisador.vinculoInstitucional ?? '',
            tituloAcademico: perfilPesquisador.tituloAcademico,
          }
        : null,
    );
    setCpfCorrecao('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  // Catálogos exclusivos deste modal (Consultar não precisa deles) - mesma
  // dependência `[idUsuario]` que a busca principal tinha antes da extração.
  // `carregandoCatalogos` combinado com o `carregando` do hook (ver JSX mais
  // abaixo) preserva o comportamento de antes da extração: a tela só sai do
  // "Carregando..." quando TUDO (dados do usuário + estes 2 catálogos) já
  // chegou, em vez de mostrar o conteúdo principal com os dropdowns de papel/
  // link ainda vazios por uma fração de segundo.
  const [carregandoCatalogos, setCarregandoCatalogos] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregandoCatalogos(true);
    void Promise.all([
      comRegistro(aoRegistrarChamada, 'GET', '/papel', null, () => papelApi.listar(auth.authFetch)).catch(() => []),
      comRegistro(aoRegistrarChamada, 'GET', '/tipo-link?escopo=perfil', null, () => tipoLinkApi.listar(auth.authFetch, { escopo: 'perfil' })).catch(() => []),
    ])
      .then(([catalogo, tiposLinkCatalogo]) => {
        setCatalogoPapeis(catalogo);
        setTiposLink(tiposLinkCatalogo);
      })
      .finally(() => setCarregandoCatalogos(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  const papeisDisponiveis = catalogoPapeis.filter(
    (papel) => !papeisAtuais.some((atual) => atual.idPapel === papel.idPapel),
  );

  const salvarEdicao = async () => {
    limparErro();
    const corpoUsuario = {
      nome: nomeEdicao,
      ...(novaSenhaEdicao ? { novaSenha: novaSenhaEdicao } : {}),
      ...(idImagemPerfilNovo !== undefined ? { idImagemPerfil: idImagemPerfilNovo } : {}),
    };
    try {
      await comRegistro(aoRegistrarChamada, 'PATCH', `/usuario/${idUsuario}`, corpoUsuario, () =>
        usuarioApi.atualizar(auth.authFetch, idUsuario, corpoUsuario),
      );
      if (formEdicaoPerfil) {
        const corpoPerfil = {
          tipoVinculo: formEdicaoPerfil.tipoVinculo,
          ...(formEdicaoPerfil.tipoVinculo === 'institucional'
            ? { vinculoInstitucional: formEdicaoPerfil.vinculoInstitucional }
            : {}),
          tituloAcademico: formEdicaoPerfil.tituloAcademico,
        };
        await comRegistro(aoRegistrarChamada, 'PATCH', `/perfil-pesquisador/${idUsuario}`, corpoPerfil, () =>
          perfilPesquisadorApi.atualizar(auth.authFetch, idUsuario, corpoPerfil),
        );
      }
      mostrar('Usuário alterado com sucesso.', `ID: ${idUsuario} foi alterado`);
      aoAtualizado();
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    }
  };

  const aoAtribuirPapel = async () => {
    if (!idPapelParaAtribuir) return;
    limparErro();
    setAtribuindoPapel(true);
    try {
      const papelEscolhido = catalogoPapeis.find((papel) => papel.idPapel === Number(idPapelParaAtribuir));
      await comRegistro(aoRegistrarChamada, 'POST', '/usuario-papel', { idUsuario, idPapel: Number(idPapelParaAtribuir) }, () =>
        usuarioPapelApi.atribuir(auth.authFetch, idUsuario, Number(idPapelParaAtribuir)),
      );
      const papeisAtualizados = await comRegistro(aoRegistrarChamada, 'GET', `/usuario-papel/${idUsuario}`, null, () =>
        usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario),
      );
      setPapeis(papeisAtualizados);
      setIdPapelParaAtribuir('');
      mostrar('Papel atribuído com sucesso.', `ID: ${idUsuario} agora tem o papel "${papelEscolhido?.nome}"`);
      aoAtualizado();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setAtribuindoPapel(false);
    }
  };

  const aoSuspenderPapel = async (papel: UsuarioPapelResponse, dias: number) => {
    limparErro();
    setEnviandoSuspensaoPapel(papel.idPapel);
    try {
      // eslint-disable-next-line react-hooks/purity
      const ate = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
      await comRegistro(aoRegistrarChamada, 'POST', `/usuario-papel/${idUsuario}/${papel.idPapel}/suspender`, { ate }, () =>
        usuarioPapelApi.suspender(auth.authFetch, idUsuario, papel.idPapel, ate),
      );
      const papeisAtualizados = await comRegistro(aoRegistrarChamada, 'GET', `/usuario-papel/${idUsuario}`, null, () =>
        usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario),
      );
      setPapeis(papeisAtualizados);
      setPapelSuspendendoId(null);
      mostrar('Papel suspenso com sucesso.', `"${papel.nomePapel}" suspenso até ${formatarData(ate)}`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviandoSuspensaoPapel(null);
    }
  };

  const aoReativarPapel = async (papel: UsuarioPapelResponse) => {
    limparErro();
    setReativandoPapel(papel.idPapel);
    try {
      await comRegistro(aoRegistrarChamada, 'POST', `/usuario-papel/${idUsuario}/${papel.idPapel}/revogar-suspensao`, null, () =>
        usuarioPapelApi.revogarSuspensao(auth.authFetch, idUsuario, papel.idPapel),
      );
      const papeisAtualizados = await comRegistro(aoRegistrarChamada, 'GET', `/usuario-papel/${idUsuario}`, null, () =>
        usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario),
      );
      setPapeis(papeisAtualizados);
      mostrar('Papel reativado com sucesso.', `"${papel.nomePapel}" voltou a valer normalmente`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setReativandoPapel(null);
    }
  };

  const aoRevogarPapel = async (papel: UsuarioPapelResponse) => {
    limparErro();
    setRevogandoPapel(papel.idPapel);
    try {
      await comRegistro(aoRegistrarChamada, 'DELETE', `/usuario-papel/${idUsuario}/${papel.idPapel}`, null, () =>
        usuarioPapelApi.remover(auth.authFetch, idUsuario, papel.idPapel),
      );
      const papeisAtualizados = await comRegistro(aoRegistrarChamada, 'GET', `/usuario-papel/${idUsuario}`, null, () =>
        usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario),
      );
      setPapeis(papeisAtualizados);
      mostrar('Papel revogado com sucesso.', `ID: ${idUsuario} perdeu o papel "${papel.nomePapel}"`);
      aoAtualizado();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setRevogandoPapel(null);
    }
  };

  const aoDesbloquear = async () => {
    limparErro();
    setDesbloqueando(true);
    try {
      await comRegistro(aoRegistrarChamada, 'POST', `/usuario/${idUsuario}/desbloquear`, null, () =>
        usuarioApi.desbloquear(auth.authFetch, idUsuario),
      );
      mostrar('Login desbloqueado com sucesso.', `ID: ${idUsuario} pode tentar logar novamente`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setDesbloqueando(false);
    }
  };

  const aoRedefinirSenhaDev = async () => {
    limparErro();
    setRedefinindoSenhaDev(true);
    try {
      await comRegistro(aoRegistrarChamada, 'PATCH', `/usuario/${idUsuario}`, { novaSenha: SENHA_DEV }, () =>
        usuarioApi.atualizar(auth.authFetch, idUsuario, { novaSenha: SENHA_DEV }),
      );
      mostrar('Senha redefinida com sucesso.', `ID: ${idUsuario} teve a senha redefinida para "${SENHA_DEV}"`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setRedefinindoSenhaDev(false);
    }
  };

  const salvarCorrecaoCpf = async () => {
    if (!cpfCorrecao) return;
    try {
      await comRegistro(aoRegistrarChamada, 'PATCH', `/perfil-pesquisador/${idUsuario}/cpf`, { cpf: cpfCorrecao }, () =>
        perfilPesquisadorApi.corrigirCpf(auth.authFetch, idUsuario, { cpf: cpfCorrecao }),
      );
      setCpfCorrecao('');
      mostrar('CPF corrigido com sucesso.');
      aoAtualizado();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    }
  };

  // Aviso de "alteração não salva" (13-09-2026, achado do Claude Web: o
  // modal fecha por 3 caminhos - X, clique no fundo escurecido, botão
  // Cancelar - e todos os 3 já passam por `fechar()` abaixo; a página
  // antiga que este modal substituiu tinha esse aviso, o modal nunca
  // ganhou). `sujo` cobre os 3 formulários de verdade (dados da conta,
  // edição de perfil, criação de perfil) - de propósito NÃO inclui foto de
  // perfil nem ações de papel, porque essas já salvam na hora (não ficam
  // pendentes) e incluir geraria aviso quando não há nada a perder.
  const sujo = Boolean(
    usuario &&
      (nomeEdicao !== usuario.nome ||
        novaSenhaEdicao !== '' ||
        (formEdicaoPerfil !== null &&
          perfilPesquisador !== null &&
          (formEdicaoPerfil.tipoVinculo !== perfilPesquisador.tipoVinculo ||
            formEdicaoPerfil.vinculoInstitucional !== (perfilPesquisador.vinculoInstitucional ?? '') ||
            formEdicaoPerfil.tituloAcademico !== perfilPesquisador.tituloAcademico))),
  );
  useAvisoAlteracaoNaoSalva(sujo);

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoAtualizado();
    aoFechar();
  };

  return (
    <ModalFicha
      // `carregando` (14-09-2026) - mesmo mecanismo de ModalConsultarUsuario.
      carregando={!usuario}
      titulo={usuario?.nome ?? ''}
      subtitulo={usuario?.email}
      avatar={
        usuario && (
          <SeletorFotoPerfil
            authFetch={auth.authFetch}
            nome={usuario.nome}
            url={idImagemPerfilNovo === undefined ? avatarUrl : avatarUrlNovo}
            tamanho="lg"
            aoAlterar={(idArquivo, novaUrl) => {
              setIdImagemPerfilNovo(idArquivo);
              setAvatarUrlNovo(novaUrl);
            }}
          />
        )
      }
      aoFechar={fechar}
      rodape={
        usuario && (
          <div className="flex gap-3 max-w-sm ml-auto">
            <button type="button" onClick={fechar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button type="button" onClick={salvarEdicao} className="btn btn-primary flex-1">
              Salvar
            </button>
          </div>
        )
      }
    >
      {carregando || carregandoCatalogos ? (
        <p className="p-6 text-center text-sm texto-fraco">Carregando...</p>
      ) : !usuario ? (
        <p className="p-6 text-center texto-erro text-sm font-bold">{erro}</p>
      ) : (
        <>
          {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <SecaoFicha titulo="Dados da conta">
                <div className="sm:col-span-2">
                  <label className="rotulo-campo">Nome</label>
                  <input
                    type="text"
                    value={nomeEdicao}
                    onChange={(evento) => setNomeEdicao(evento.target.value)}
                    className="input-padrao"
                  />
                </div>
              </SecaoFicha>

              <SecaoFicha titulo="Acesso">
                <div className="sm:col-span-2">
                  <label className="rotulo-campo">Nova senha (opcional)</label>
                  <input
                    type="password"
                    value={novaSenhaEdicao}
                    onChange={(evento) => setNovaSenhaEdicao(evento.target.value)}
                    className="input-padrao"
                    placeholder="••••••••"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border borda-forte p-3">
                  <p className="text-xs texto-fraco">
                    Zera o contador de tentativas de login falhas e libera a conta, caso esteja
                    bloqueada temporariamente.
                  </p>
                  <button
                    type="button"
                    onClick={aoDesbloquear}
                    disabled={desbloqueando}
                    className="btn btn-secondary shrink-0"
                  >
                    {desbloqueando ? 'Desbloqueando...' : 'Desbloquear login'}
                  </button>
                </div>
              </SecaoFicha>

              {formEdicaoPerfil && (
                <>
                  <SecaoFicha titulo="Perfil de Pesquisador">
                    <CamposVinculoPerfil
                      tipoVinculo={formEdicaoPerfil.tipoVinculo}
                      vinculoInstitucional={formEdicaoPerfil.vinculoInstitucional}
                      tituloAcademico={formEdicaoPerfil.tituloAcademico}
                      rotuloVinculoInstitucional="Vínculo institucional"
                      aoAlterarTipoVinculo={(tipo) => setFormEdicaoPerfil({ ...formEdicaoPerfil, tipoVinculo: tipo })}
                      aoAlterarVinculoInstitucional={(valor) =>
                        setFormEdicaoPerfil({ ...formEdicaoPerfil, vinculoInstitucional: valor })
                      }
                      aoAlterarTituloAcademico={(titulo) => setFormEdicaoPerfil({ ...formEdicaoPerfil, tituloAcademico: titulo })}
                    />

                    <CampoFicha rotulo="Score atual" valor={perfilPesquisador?.scoreAtual} />

                    <CampoFicha rotulo="CPF atual" valor={formatarCpfOuMotivoOculto(perfilPesquisador?.cpf)} largura="cheia" />
                    <div className="sm:col-span-2 flex items-end gap-2 rounded-lg border borda-forte p-3">
                      <label className="text-xs flex-1 flex flex-col gap-1">
                        Corrigir CPF (suporte/admin)
                        <input
                          type="text"
                          value={formatarCpf(cpfCorrecao)}
                          onChange={(evento) => setCpfCorrecao(evento.target.value.replace(/\D/g, '').slice(0, 11))}
                          className="input-padrao"
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary shrink-0"
                        disabled={!cpfCorrecao}
                        onClick={salvarCorrecaoCpf}
                      >
                        Salvar CPF
                      </button>
                    </div>
                  </SecaoFicha>

                  <PainelLinksAcademicos auth={auth} idUsuario={idUsuario} tiposLink={tiposLink} aoRegistrarChamada={aoRegistrarChamada} />

                  <div className="border-t borda-padrao"></div>

                  <SecaoModeracaoPesquisador auth={auth} idUsuario={idUsuario} />
                </>
              )}

              <div className="border-t borda-padrao"></div>

              <SecaoModeracao auth={auth} idUsuario={idUsuario} />
            </div>

            <div className="space-y-6">
              <SecaoFicha titulo="Metadados" colunas={1}>
                <CampoSomenteLeitura rotulo="id" valor={idUsuario} />
                <CampoSomenteLeitura rotulo="E-mail" valor={usuario.email} />
                <CampoSomenteLeitura rotulo="E-mail verificado" valor={usuario.emailVerificado ? 'Sim' : 'Não'} />
                <CampoSomenteLeitura rotulo="Criado em" valor={usuario.criadoEm && formatarData(usuario.criadoEm)} />
                {perfilPesquisador && (
                  <CampoSomenteLeitura
                    rotulo="Status (pesquisador)"
                    valor={ROTULO_STATUS_PESQUISADOR[perfilPesquisador.statusPesquisador]}
                  />
                )}
              </SecaoFicha>

              <SecaoFicha titulo="Papéis">
                <div className="sm:col-span-2">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {papeisAtuais.length === 0 && (
                      <p className="text-xs texto-fraco">Nenhum papel atribuído ainda.</p>
                    )}
                    {papeisAtuais.map((papel) => {
                      const suspenso = papel.suspensoAte && new Date(papel.suspensoAte) > new Date();
                      return (
                        <span key={papel.idPapel} className="inline-flex flex-col items-start gap-1">
                          <span
                            className={
                              'badge flex items-center gap-2 ' +
                              (suspenso ? 'fundo-aviso texto-aviso' : 'badge-neutro')
                            }
                          >
                            {papel.nomePapel}
                            {suspenso && <i className="fa-solid fa-clock text-[10px]"></i>}
                            {suspenso ? (
                              <button
                                type="button"
                                onClick={() => aoReativarPapel(papel)}
                                disabled={reativandoPapel === papel.idPapel}
                                className="font-bold hover:underline disabled:opacity-50"
                                title="Reativar agora"
                              >
                                {reativandoPapel === papel.idPapel ? '…' : 'reativar'}
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPapelSuspendendoId((atual) => (atual === papel.idPapel ? null : papel.idPapel))
                                  }
                                  className="texto-fraco hover-texto-forte"
                                  title={`Suspender "${papel.nomePapel}" por um tempo`}
                                >
                                  <i className="fa-solid fa-clock text-[10px]"></i>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => aoRevogarPapel(papel)}
                                  disabled={revogandoPapel === papel.idPapel}
                                  className="texto-erro font-bold hover-texto-erro disabled:opacity-50"
                                  title={`Revogar "${papel.nomePapel}"`}
                                >
                                  ×
                                </button>
                              </>
                            )}
                          </span>
                          {papelSuspendendoId === papel.idPapel && (
                            <span className="flex gap-1 fundo-cartao border borda-forte rounded-lg p-1.5">
                              {[1, 7, 30].map((dias) => (
                                <button
                                  key={dias}
                                  type="button"
                                  onClick={() => aoSuspenderPapel(papel, dias)}
                                  disabled={enviandoSuspensaoPapel === papel.idPapel}
                                  className="text-[10px] font-bold texto-padrao hover-fundo-sutil px-1.5 py-0.5 rounded"
                                >
                                  {dias}d
                                </button>
                              ))}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>

                  {papeisDisponiveis.length === 0 ? (
                    <p className="text-xs texto-fraco">
                      Nenhum papel adicional disponível pra atribuir (o catálogo ainda está
                      carregando, ou este usuário já tem todos os papéis existentes).
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <select
                        value={idPapelParaAtribuir}
                        onChange={(evento) => setIdPapelParaAtribuir(evento.target.value)}
                        className="input-padrao"
                      >
                        <option value="">Selecione um papel...</option>
                        {papeisDisponiveis.map((papel) => (
                          <option key={papel.idPapel} value={papel.idPapel}>
                            {papel.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={aoAtribuirPapel}
                        disabled={!idPapelParaAtribuir || atribuindoPapel}
                        className="btn btn-primary"
                      >
                        {atribuindoPapel ? 'Atribuindo...' : 'Atribuir'}
                      </button>
                    </div>
                  )}
                </div>
              </SecaoFicha>

              <div className="fundo-cartao border border-dashed borda-dev fundo-dev-sutil rounded-xl p-4">
                <span className="badge badge-dev">&lt;dev&gt;</span>
                <p className="text-xs texto-fraco mt-2 mb-3">
                  Redefine a senha direto pra "{SENHA_DEV}", sem digitar nada. Só pra testar login.
                </p>
                <button
                  type="button"
                  onClick={aoRedefinirSenhaDev}
                  disabled={redefinindoSenhaDev}
                  className="btn btn-secondary w-full"
                >
                  {redefinindoSenhaDev ? 'Redefinindo...' : 'Redefinir senha dev'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ModalFicha>
  );
}

interface ModalExcluirUsuarioProps {
  idUsuario: number;
  nome: string;
  email: string;
  emailVerificado: boolean;
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoExcluido: () => void;
  aoRegistrarChamada?: (entrada: EntradaRegistroChamada) => void;
}

// Excluir - exclusão LÓGICA (usuario.deletado = TRUE via
// excluir_conta_usuario()), confirmada digitando o e-mail. Não precisa
// buscar nada sozinho (nome/e-mail já vêm da linha da tabela do chamador).
export function ModalExcluirUsuario({ idUsuario, nome, email, emailVerificado, auth, aoFechar, aoExcluido, aoRegistrarChamada }: ModalExcluirUsuarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const confirmado = confirmacao.trim().toLowerCase() === email.toLowerCase();

  const excluir = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await comRegistro(aoRegistrarChamada, 'DELETE', `/usuario/${idUsuario}`, null, () =>
        usuarioApi.remover(auth.authFetch, idUsuario),
      );
      mostrar('Usuário excluído com sucesso.', `ID: ${idUsuario} foi excluído`);
      aoExcluido();
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <ModalFicha
      titulo={`Excluir "${nome}"`}
      subtitulo="Não existe botão de desfazer no painel."
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button type="button" onClick={excluir} disabled={excluindo || !confirmado} className="btn btn-danger flex-1">
            {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <SecaoFicha titulo="O que será excluído">
        <CampoFicha rotulo="id" valor={idUsuario} />
        <CampoFicha rotulo="Nome" valor={nome} />
        <CampoFicha rotulo="E-mail" valor={email} largura="cheia" />
        <CampoFicha rotulo="E-mail verificado" valor={emailVerificado ? 'Sim' : 'Não'} />
      </SecaoFicha>

      <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
        <p className="font-bold mb-1">
          <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
        </p>
        <p>
          A conta é marcada como excluída (exclusão lógica), não apagada do banco: o login
          deixa de funcionar e o perfil some do público na hora, mas o registro continua
          existindo pra auditoria e conformidade com a LGPD. Não existe um botão de
          "restaurar" no painel - reverter isso hoje exige acesso direto ao banco.
        </p>
      </div>

      <div>
        <label className="rotulo-campo">
          Digite o e-mail "{email}" pra confirmar
        </label>
        <input
          type="text"
          value={confirmacao}
          onChange={(evento) => setConfirmacao(evento.target.value)}
          className="input-padrao"
          placeholder={email}
          autoComplete="off"
        />
      </div>
    </ModalFicha>
  );
}
