import { useCallback, useEffect, useState } from 'react';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { Dica } from '../../components/layout/tooltip';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useOpcoesDiasSuspensao } from '../../services/constant/hook/use-opcoes-dias-suspensao';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { TabelaLinksAcademicos } from '../../components/crud/tabelas/1-tabela-links-academicos';
import type {
  LinkAcademicoRequestCreate,
  LinkAcademicoResponse,
} from '../../services/7-link-academico/type/link-academico.type';
import { linkAcademicoApi } from '../../services/7-link-academico/api/link-academico.api';
import { TabelaDimensoesScore } from '../../components/crud/tabelas/2-tabela-dimensoes-score';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { Campo } from '../../components/input/campo';
import { ConfirmacaoDigitada } from '../../components/input/confirmacao-digitada';
import { confirmacaoConfere } from '../../components/input/confirmacao-confere';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { usuarioPapelApi, papelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { ErroHttp } from '../../services/constant/api/http.util';
import { SENHA_DEV } from '../../services/constant/constants/senha-dev.constants';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
  classeBadgeStatusPesquisador,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { formatarCpf, formatarCpfOuMotivoOculto, formatarData, formatarDataHora } from '../../services/constant/util/formatacao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { descricaoPapel } from '../../services/2-papel-permissao/constants/papel-descricoes.constants';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos.constants';
import { CamposVinculoPerfil } from '../6-perfil-pesquisador/campos-vinculo-perfil';
import { SecaoModeracaoPesquisador } from '../6-perfil-pesquisador/secao-moderacao-pesquisador';
import { SecaoModeracao } from './secao-moderacao';
import { Carregando } from '../../components/layout/carregando';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioResponse, UsuarioResponseLoginHistory, UsuarioResponseAcceptedTerm } from '../../services/1-usuario/type/usuario.type';
import type { PapelResponse, UsuarioPapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';
import type {
  PerfilPesquisadorResponse,
  PerfilPesquisadorResponseScore,
} from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';
import type { EntradaRegistroChamada } from '../../services/campo-testes/context/campo-testes-context';

// Modal ÚNICO de Alterar/Consultar/Excluir Usuário (nome/senha/foto/papéis/moderação de conta) + Perfil de
// Pesquisador (vínculo/título/CPF/score/links acadêmicos/moderação de pesquisador). Nasceu dentro do Campo de
// Testes (T1, Bancada do Pesquisador) e foi extraído para cá para ser o CRUD real de Usuário, sem deixar de ser
// usado por T1: um único componente, dois consumidores.
//
// Diferença chave em relação à versão que vivia em bancada-pesquisador.tsx: aqui NUNCA se usa
// `chamarERegistrar`/`useCampoTestes()` diretamente: esses só existem dentro de `<CampoTestesProvider>`, que só
// é montado em build de desenvolvimento (ver App.tsx). Este arquivo é código de produção de verdade, usado
// sempre; toda chamada usa `auth.authFetch` direto (via
// `usuarioApi`/`perfilPesquisadorApi`/`usuarioPapelApi`/`papelApi`, mesma convenção do resto do painel fora do
// Campo de Testes). Mesma exceção aceita para `SecaoModeracaoPesquisador`/`SecaoModeracao` (não aparecem no
// Registro de Chamadas quando usado a partir de T1, consciente).
//
// Para T1 não perder o Registro de Chamadas (T4, que é o propósito de T1: "testar upgrade de perfil, scores,
// etc." de perto), cada modal tem uma prop opcional `aoRegistrarChamada?: (entrada: EntradaRegistroChamada) =>
// void`: `undefined` na página real (nunca registra, nunca depende do provider), a função de verdade só quando
// T1 passa (via `useCampoTestes().registrarChamada`). O helper `comRegistro()` abaixo cronometra e reporta cada
// chamada só quando essa prop existe.
//
// Também self-contido: cada modal recebe só `idUsuario` e busca os PRÓPRIOS dados ao abrir
// (nome/perfil/avatar/papéis): não depende de uma linha pré-carregada pelo componente pai, então serve tanto
// para listar-usuarios.tsx (linha sem perfil_pesquisador embutido) quanto para bancada-pesquisador.tsx (linha
// já com tudo, mas ignorada por este componente).

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

// Os dois modais abaixo abrem com o MESMO Promise.all de 4 chamadas (usuário, perfil de pesquisador, avatar,
// papéis), pelo useBuscar. `papeis` continua com setter porque não é só leitura em ModalAlterarUsuario: as 4 ações
// de papel (atribuir/suspender/reativar/revogar) reatribuem depois de cada uma. `erros` é o useErroToast do
// próprio modal: o erro dessa busca cai na MESMA faixa de erro das outras ações. `aoChegar` preenche o
// formulário de edição quando os dados chegam.
interface DadosUsuario {
  usuario: UsuarioResponse;
  perfilPesquisador: PerfilPesquisadorResponse | null;
  avatarUrl: string | null;
  papeis: UsuarioPapelResponse[];
}

function useDadosUsuario(
  idUsuario: number,
  auth: Pick<UseAuthReturn, 'authFetch'>,
  aoRegistrarChamada: ((entrada: EntradaRegistroChamada) => void) | undefined,
  erros: ReturnType<typeof useErroToast>,
  aoChegar?: (dados: DadosUsuario) => void,
) {
  const [papeis, setPapeis] = useState<UsuarioPapelResponse[] | null>(null);
  const { dado, carregando } = useBuscar(
    async (): Promise<DadosUsuario> => {
      const [usuario, avatar, papeisDoUsuario] = await Promise.all([
        comRegistro(aoRegistrarChamada, 'GET', `/usuario/${idUsuario}`, null, () => usuarioApi.buscar(auth.authFetch, idUsuario)),
        // Avatar não é registrado (endpoint público, cosmético).
        arquivoApi.buscarAvatarPorUsuario(idUsuario).catch(() => null),
        comRegistro(aoRegistrarChamada, 'GET', `/usuario-papel/${idUsuario}`, null, () => usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario)).catch(() => []),
      ]);
      // Depois da conta, e só de quem é pesquisador: pedir de todo mundo dava 404 para quem não é.
      const perfilPesquisador =
        usuario.ehPesquisador === false
          ? null
          : await comRegistro(aoRegistrarChamada, 'GET', `/perfil-pesquisador/${idUsuario}`, null, () =>
              perfilPesquisadorApi.buscar(auth.authFetch, idUsuario),
            ).catch(() => null);
      return { usuario, perfilPesquisador, avatarUrl: avatar?.url ?? null, papeis: papeisDoUsuario };
    },
    [idUsuario],
    {
      erros,
      aoChegar: (dados) => {
        setPapeis(dados.papeis);
        aoChegar?.(dados);
      },
    },
  );

  return {
    usuario: dado?.usuario ?? null,
    perfilPesquisador: dado?.perfilPesquisador ?? null,
    avatarUrl: dado?.avatarUrl ?? null,
    papeis,
    setPapeis,
    carregando,
  };
}

interface BotaoVerFotoPerfilProps {
  url: string;
  tamanho?: string;
  badge?: boolean;
}

// Botão de olho: abre a foto de perfil em outra guia. Não existe "tamanho máximo" de verdade: é a MESMA url do
// avatar pequeno, já processada pelo `sharp` no upload (RNF-016). `badge` desenha o selo circular sobreposto no
// canto inferior direito do avatar (cabeçalho do modal); sem `badge`, é o ícone inline usado dentro de "Dados
// da conta".
function BotaoVerFotoPerfil({ url, tamanho = 'text-base', badge = false }: BotaoVerFotoPerfilProps) {
  if (badge) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir imagem em outra guia"
        className="dica w-7 h-7 rounded-full flex items-center justify-center border-2 transition-opacity hover:opacity-80"
        style={{
          backgroundColor: 'var(--color-dark)',
          borderColor: 'var(--cor-fundo-cartao)',
          color: 'var(--color-white)',
        }}
      >
        <i className="fa-solid fa-eye text-xs"></i>
        <Dica texto="Abrir imagem em outra guia" curta />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir imagem em outra guia"
      className={'dica texto-forte hover:opacity-70 transition-opacity shrink-0 ' + tamanho}
    >
      <i className="fa-solid fa-eye"></i>
      <Dica texto='Abrir imagem em outra guia (no tamanho "máximo" - já reduzido pelo servidor, o original não é guardado)' />
    </a>
  );
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

  const [links, setLinks] = useState<LinkAcademicoResponse[]>([]);

  const carregarLinks = useCallback(() => {
    comRegistro(aoRegistrarChamada, 'GET', linkAcademicoApi.caminhoListarDoUsuario(idUsuario), null, () =>
      linkAcademicoApi.listarDoUsuario(auth.authFetch, idUsuario),
    )
      .then(setLinks)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario]);

  useEffect(() => {
    carregarLinks();
  }, [carregarLinks]);

  // Chamadas da tabela (components/crud/tabelas/1-tabela-links-academicos.tsx): devolvem true quando deu certo.
  const adicionarLink = async (dados: LinkAcademicoRequestCreate) => {
    try {
      await comRegistro(aoRegistrarChamada, 'POST', `/link-academico/${idUsuario}`, dados, () =>
        linkAcademicoApi.criarParaOutro(auth.authFetch, idUsuario, dados),
      );
      carregarLinks();
      mostrar('Link acadêmico adicionado com sucesso.');
      return true;
    } catch (erro) {
      reportarErro(erro);
      return false;
    }
  };

  const removerLink = async (link: LinkAcademicoResponse) => {
    try {
      await comRegistro(aoRegistrarChamada, 'DELETE', `/link-academico/${link.idLinkAcademico}`, null, () =>
        linkAcademicoApi.remover(auth.authFetch, link.idLinkAcademico),
      );
      carregarLinks();
      mostrar('Link acadêmico excluído com sucesso.');
    } catch (erro) {
      reportarErro(erro);
    }
  };

  // O tipo não muda depois de criado: o PATCH leva url e rótulo (rótulo apagado vai como null; a ordem fica).
  const salvarLink = async (link: LinkAcademicoResponse, { url, rotulo }: LinkAcademicoRequestCreate) => {
    const corpo = { url, rotulo: rotulo ? rotulo : null };
    try {
      await comRegistro(aoRegistrarChamada, 'PATCH', `/link-academico/${link.idLinkAcademico}`, corpo, () =>
        linkAcademicoApi.alterar(auth.authFetch, link.idLinkAcademico, corpo),
      );
      carregarLinks();
      mostrar('Link acadêmico alterado com sucesso.');
      return true;
    } catch (erro) {
      reportarErro(erro);
      return false;
    }
  };

  return (
    <>
      <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">
        Links acadêmicos ({links.length} de {limiteLinks})
      </h3>
      <TabelaLinksAcademicos
        links={links}
        tiposLink={tiposLink}
        podeAdicionar={links.length < limiteLinks}
        aoAdicionar={adicionarLink}
        aoSalvar={salvarLink}
        aoExcluir={(link) => void removerLink(link)}
      />
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
          <TabelaDimensoesScore dimensoes={score.dimensoes} />
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
  const errosDaTela = useErroToast({ mostraTexto: true });
  const { erro } = errosDaTela;
  const { usuario, perfilPesquisador, avatarUrl, papeis } = useDadosUsuario(idUsuario, auth, aoRegistrarChamada, errosDaTela);
  const [logins, setLogins] = useState<UsuarioResponseLoginHistory[] | null>(null);
  const [carregandoLogins, setCarregandoLogins] = useState(false);
  const [loginsAbertos, setLoginsAbertos] = useState(false);
  // Termo de Uso aceitos ("onde fica registrado" o aceite): buscado sempre (não atrás de um toggle, como os
  // logins) porque é informação de conformidade que faz sentido já vir visível ao consultar a conta, não um
  // detalhe auxiliar raramente checado.
  const [termosAceitos, setTermosAceitos] = useState<UsuarioResponseAcceptedTerm[] | null>(null);

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
      // `carregando`: ModalFicha já esconde título/avatar sozinho enquanto `usuario` não chega, mostrando
      // "Carregando..." no lugar (ver comentário completo em modal-ficha.tsx).
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
        erro ? (
          <MensagemErro texto={erro} className="p-6 text-center texto-erro text-sm font-bold" />
        ) : (
          <p className="p-6 text-center text-sm texto-fraco">Carregando...</p>
        )
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
                        className="dica texto-fraco hover-texto-forte transition-colors shrink-0"
                      >
                        <i className={'fa-solid fa-chevron-down transition-transform' + (loginsAbertos ? ' rotate-180' : '')}></i>
                        <Dica texto="Ver logins anteriores" curta />
                      </button>
                    )
                  }
                >
                  {loginsAbertos && (
                    <div className="mt-2 rounded-lg border borda-padrao fundo-sutil p-3 text-sm max-h-64 overflow-y-auto">
                      {carregandoLogins ? (
                        <Carregando />
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
                <SecaoFicha titulo="Aceites do Termo de Uso" colunas={1}>
                  <Carregando />
                </SecaoFicha>
              ) : termosAceitos.length === 0 ? (
                <SecaoFicha titulo="Aceites do Termo de Uso" colunas={1}>
                  <p className="texto-fraco text-sm">Nenhum termo aceito registrado.</p>
                </SecaoFicha>
              ) : (
                <SecaoFicha titulo="Aceites do Termo de Uso">
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

// Alterar: conta inteira (nome/senha/foto/papéis/moderação de conta) + Perfil de Pesquisador
// (vínculo/título/CPF/links/moderação de pesquisador), para quem já é pesquisador. Criar perfil para quem ainda
// não é vive só no cadeado de upgrade (6-perfil-pesquisador/modal-upgrade-pesquisador.tsx), disponível apenas
// na Bancada do Pesquisador (Campo de Testes): duplicar aqui daria o mesmo poder sem passar pelo Termo de Uso.
export function ModalAlterarUsuario({ auth, idUsuario, aoFechar, aoAtualizado, aoRegistrarChamada }: ModalAlterarUsuarioProps) {
  const { mostrar } = useToast();
  const errosDaTela = useErroToast({ mostraTexto: true });
  const { erro, reportarErro, limparErro } = errosDaTela;
  const { ocupado: redefinindoSenhaDev, executar: executarRedefinindoSenhaDev } = useEnvio(reportarErro, limparErro);
  const { ocupado: desbloqueando, executar: executarDesbloqueando } = useEnvio(reportarErro, limparErro);
  const { ocupado: atribuindoPapel, executar: executarAtribuindoPapel } = useEnvio(reportarErro, limparErro);
  const [tiposLink, setTiposLink] = useState<TipoLinkResponse[]>([]);


  const [nomeEdicao, setNomeEdicao] = useState('');
  const [novaSenhaEdicao, setNovaSenhaEdicao] = useState('');
  const [idImagemPerfilNovo, setIdImagemPerfilNovo] = useState<number | null | undefined>(undefined);
  const [avatarUrlNovo, setAvatarUrlNovo] = useState<string | null>(null);

  const [formEdicaoPerfil, setFormEdicaoPerfil] = useState<{
    tipoVinculo: TipoVinculo;
    vinculoInstitucional: string;
    tituloAcademico: TituloAcademico;
  } | null>(null);
  const [cpfCorrecao, setCpfCorrecao] = useState('');

  // Quando os dados chegam (1x por abertura), o formulário de edição começa com eles.
  const { usuario, perfilPesquisador, avatarUrl, papeis, setPapeis, carregando } = useDadosUsuario(
    idUsuario,
    auth,
    aoRegistrarChamada,
    errosDaTela,
    (dados) => {
      setNomeEdicao(dados.usuario.nome);
      setNovaSenhaEdicao('');
      setIdImagemPerfilNovo(undefined);
      setAvatarUrlNovo(null);
      setFormEdicaoPerfil(
        dados.perfilPesquisador
          ? {
              tipoVinculo: dados.perfilPesquisador.tipoVinculo,
              vinculoInstitucional: dados.perfilPesquisador.vinculoInstitucional ?? '',
              tituloAcademico: dados.perfilPesquisador.tituloAcademico,
            }
          : null,
      );
      setCpfCorrecao('');
    },
  );
  const papeisAtuais = papeis ?? [];

  const [catalogoPapeis, setCatalogoPapeis] = useState<PapelResponse[]>([]);
  const [idPapelParaAtribuir, setIdPapelParaAtribuir] = useState('');
  const [papelSuspendendoId, setPapelSuspendendoId] = useState<number | null>(null);
  const [enviandoSuspensaoPapel, setEnviandoSuspensaoPapel] = useState<number | null>(null);
  const [motivoSuspensaoPapel, setMotivoSuspensaoPapel] = useState('');
  const [erroMotivoPapel, setErroMotivoPapel] = useState<string | null>(null);
  const opcoesDiasSuspensao = useOpcoesDiasSuspensao();
  const [reativandoPapel, setReativandoPapel] = useState<number | null>(null);
  const [revogandoPapel, setRevogandoPapel] = useState<number | null>(null);

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

  // "Atribuir" e "Salvar CPF" ficam sempre clicáveis: sem papel escolhido ou com CPF incompleto, o erro aparece
  // embaixo do campo.
  const codigoPapelEscolhido = catalogoPapeis.find((papel) => papel.idPapel === Number(idPapelParaAtribuir))?.codigo;
  const descricaoPapelEscolhido = codigoPapelEscolhido ? descricaoPapel(codigoPapelEscolhido) : undefined;
  const papelFormulario = useErrosFormulario(() => ({
    papel: idPapelParaAtribuir === '' && 'Escolha um papel para atribuir.',
  }));
  const cpfFormulario = useErrosFormulario(() => ({
    cpf: cpfCorrecao.length !== 11 && 'Digite os 11 números do CPF.',
  }));

  const aoAtribuirPapel = async () => {
    if (!papelFormulario.tentarEnviar()) return;
    await executarAtribuindoPapel(async () => {
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
    });
  };

  const aoSuspenderPapel = async (papel: UsuarioPapelResponse, dias: number) => {
    limparErro();
    const motivo = motivoSuspensaoPapel.trim();
    if (motivo.length < 3) {
      setErroMotivoPapel('Informe o motivo (pelo menos 3 caracteres).');
      return;
    }
    setErroMotivoPapel(null);
    setEnviandoSuspensaoPapel(papel.idPapel);
    try {
      // eslint-disable-next-line react-hooks/purity
      const ate = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
      await comRegistro(aoRegistrarChamada, 'POST', `/usuario-papel/${idUsuario}/${papel.idPapel}/suspender`, { ate, motivo }, () =>
        usuarioPapelApi.suspender(auth.authFetch, idUsuario, papel.idPapel, ate, motivo),
      );
      const papeisAtualizados = await comRegistro(aoRegistrarChamada, 'GET', `/usuario-papel/${idUsuario}`, null, () =>
        usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario),
      );
      setPapeis(papeisAtualizados);
      setPapelSuspendendoId(null);
      setMotivoSuspensaoPapel('');
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
    // O "×" é pequeno e fica colado no nome do papel: um clique sem querer tirava o papel na hora.
    if (!window.confirm(`Revogar o papel "${papel.nomePapel}"? A conta perde na hora o que este papel permite.`)) {
      return;
    }
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
    await executarDesbloqueando(async () => {
      await comRegistro(aoRegistrarChamada, 'POST', `/usuario/${idUsuario}/desbloquear`, null, () =>
        usuarioApi.desbloquear(auth.authFetch, idUsuario),
      );
      mostrar('Login desbloqueado com sucesso.', `ID: ${idUsuario} pode tentar logar novamente`);
    });
  };

  const aoRedefinirSenhaDev = async () => {
    await executarRedefinindoSenhaDev(async () => {
      await comRegistro(aoRegistrarChamada, 'PATCH', `/usuario/${idUsuario}`, { novaSenha: SENHA_DEV }, () =>
        usuarioApi.atualizar(auth.authFetch, idUsuario, { novaSenha: SENHA_DEV }),
      );
      mostrar('Senha redefinida com sucesso.', `ID: ${idUsuario} teve a senha redefinida para "${SENHA_DEV}"`);
    });
  };

  const salvarCorrecaoCpf = async () => {
    if (!cpfFormulario.tentarEnviar()) return;
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

  // Aviso de "alteração não salva": o modal fecha por 3 caminhos (X, clique no fundo escurecido, botão
  // Cancelar) e todos passam por `fechar()` abaixo. `sujo` cobre os 3 formulários de verdade (dados da conta,
  // edição de perfil, criação de perfil); de propósito NÃO inclui foto de perfil nem ações de papel, porque
  // essas já salvam na hora (não ficam pendentes) e incluir geraria aviso quando não há nada a perder.
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
      // `carregando`: mesmo mecanismo de ModalConsultarUsuario.
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
          <RodapeAcoes aoCancelar={fechar} acao={{ rotulo: 'Salvar', aoClicar: () => void salvarEdicao() }} />
        )
      }
    >
      {carregando || carregandoCatalogos ? (
        <Carregando className="p-6 text-center" />
      ) : !usuario ? (
        <MensagemErro texto={erro} className="p-6 text-center texto-erro text-sm font-bold" />
      ) : (
        <>
          <MensagemErro texto={erro} />

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <SecaoFicha titulo="Dados da conta">
                <Campo rotulo="Nome" className="sm:col-span-2">
                  {({ atributos }) => (
                    <input
                      {...atributos}
                      type="text"
                      value={nomeEdicao}
                      onChange={(evento) => setNomeEdicao(evento.target.value)}
                      className="input-padrao"
                    />
                  )}
                </Campo>
              </SecaoFicha>

              <SecaoFicha titulo="Acesso">
                <Campo rotulo="Nova senha (opcional)" className="sm:col-span-2">
                  {({ atributos }) => (
                    <input
                      {...atributos}
                      type="password"
                      value={novaSenhaEdicao}
                      onChange={(evento) => setNovaSenhaEdicao(evento.target.value)}
                      className="input-padrao"
                      placeholder="••••••••"
                    />
                  )}
                </Campo>

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
                          aria-invalid={Boolean(cpfFormulario.erroDe('cpf'))}
                          className={'input-padrao' + (cpfFormulario.erroDe('cpf') ? ' borda-erro' : '')}
                        />
                        {cpfFormulario.erroDe('cpf') && (
                          <span className="texto-erro font-semibold">{cpfFormulario.erroDe('cpf')}</span>
                        )}
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary shrink-0"
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
                                className="dica font-bold hover:underline disabled:opacity-50"
                              >
                                {reativandoPapel === papel.idPapel ? '…' : 'reativar'}
                                <Dica texto="Reativar agora" curta />
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPapelSuspendendoId((atual) => (atual === papel.idPapel ? null : papel.idPapel))
                                  }
                                  className="dica texto-fraco hover-texto-forte"
                                  aria-label={`Suspender "${papel.nomePapel}" por um tempo`}
                                >
                                  <i className="fa-solid fa-clock text-[10px]"></i>
                                  <Dica texto={`Suspender "${papel.nomePapel}" por um tempo`} curta />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => aoRevogarPapel(papel)}
                                  disabled={revogandoPapel === papel.idPapel}
                                  className="dica texto-erro font-bold hover-texto-erro disabled:opacity-50"
                                  aria-label={`Revogar "${papel.nomePapel}"`}
                                >
                                  ×
                                  <Dica texto={`Revogar "${papel.nomePapel}"`} curta />
                                </button>
                              </>
                            )}
                          </span>
                          {papelSuspendendoId === papel.idPapel && (
                            <span className="flex flex-col gap-1 fundo-cartao border borda-forte rounded-lg p-1.5">
                              <input
                                value={motivoSuspensaoPapel}
                                onChange={(evento) => setMotivoSuspensaoPapel(evento.target.value)}
                                placeholder="Motivo (obrigatório)"
                                aria-label={`Motivo da suspensão de "${papel.nomePapel}"`}
                                aria-invalid={Boolean(erroMotivoPapel)}
                                className={'input-padrao text-xs py-1' + (erroMotivoPapel ? ' borda-erro' : '')}
                              />
                              {erroMotivoPapel && <span className="text-[10px] texto-erro font-semibold">{erroMotivoPapel}</span>}
                              <span className="flex gap-1">
                                {opcoesDiasSuspensao.map((dias) => (
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
                        aria-invalid={Boolean(papelFormulario.erroDe('papel'))}
                        className={'input-padrao' + (papelFormulario.erroDe('papel') ? ' borda-erro' : '')}
                      >
                        <option value="">Selecione um papel...</option>
                        {papeisDisponiveis.map((papel) => (
                          <option key={papel.idPapel} value={papel.idPapel}>
                            {papel.nome}
                          </option>
                        ))}
                      </select>
                      {papelFormulario.erroDe('papel') && (
                        <p className="text-xs texto-erro font-semibold">{papelFormulario.erroDe('papel')}</p>
                      )}
                      {/* O que o papel escolhido libera, antes de atribuir. */}
                      {descricaoPapelEscolhido && <p className="text-xs texto-fraco">{descricaoPapelEscolhido}</p>}
                      <button
                        type="button"
                        onClick={aoAtribuirPapel}
                        disabled={atribuindoPapel}
                        className="btn btn-primary"
                      >
                        {atribuindoPapel ? 'Atribuindo...' : 'Atribuir'}
                      </button>
                    </div>
                  )}
                </div>
              </SecaoFicha>

              {import.meta.env.DEV && (
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
              )}
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
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado: excluindo, executar: executarExcluindo } = useEnvio(reportarErro, limparErro);
  const [confirmacao, setConfirmacao] = useState('');
  const confirmado = confirmacaoConfere(confirmacao, email);

  const excluir = async () => {
    await executarExcluindo(async () => {
      await comRegistro(aoRegistrarChamada, 'DELETE', `/usuario/${idUsuario}`, null, () =>
        usuarioApi.remover(auth.authFetch, idUsuario),
      );
      mostrar('Usuário excluído com sucesso.', `ID: ${idUsuario} foi excluído`);
      aoExcluido();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Excluir "${nome}"`}
      subtitulo="Não existe botão de desfazer no painel."
      aoFechar={aoFechar}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          acao={{
            rotulo: 'Confirmar exclusão',
            rotuloOcupado: 'Excluindo...',
            ocupado: excluindo,
            desabilitado: !confirmado,
            aoClicar: () => void excluir(),
            perigo: true,
          }}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="O que será excluído">
        <CampoFicha rotulo="id" valor={idUsuario} />
        <CampoFicha rotulo="Nome" valor={nome} />
        <CampoFicha rotulo="E-mail" valor={email} largura="cheia" />
        <CampoFicha rotulo="E-mail verificado" valor={emailVerificado ? 'Sim' : 'Não'} />
      </SecaoFicha>

      <CaixaAviso titulo="O que acontece de verdade">
        <p>
          A conta é marcada como excluída (exclusão lógica), não apagada do banco: o login
          deixa de funcionar e o perfil some do público na hora, mas o registro continua
          existindo pra auditoria e conformidade com a LGPD. Não existe um botão de
          "restaurar" no painel - reverter isso hoje exige acesso direto ao banco.
        </p>
      </CaixaAviso>

      <ConfirmacaoDigitada oQue="o e-mail" esperado={email} valor={confirmacao} aoMudar={setConfirmacao} />
    </ModalFicha>
  );
}
