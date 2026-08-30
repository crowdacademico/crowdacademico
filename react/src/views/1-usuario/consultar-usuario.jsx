import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

// "Consultar" — botão do meio entre Alterar e Excluir (GenericTable).
// Mostra TODOS os dados do usuário ligados ao banco (UsuarioResponseDto
// inteiro), em layout de ficha (08-08-2026, ver components/crud/
// ficha-consulta.jsx — não é mais uma pilha de textbox desabilitado).
export function ConsultarUsuario({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [papeis, setPapeis] = useState(null);
  // Avatar (módulo 25-arquivo) — busca separada de `usuario` de propósito:
  // GET /arquivo/avatar/:idUsuario é público (não precisa de auth.authFetch,
  // é o próprio backend que já resolve foto-cadastrada-ou-padrão), e um
  // erro aqui (ex.: avatar padrão ainda não configurado, url null) não deve
  // impedir o resto da ficha de carregar — daí o .catch(() => null) igual
  // já é feito pra `papeis` logo abaixo.
  const [avatar, setAvatar] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro } = useErroToast();
  // Histórico de login (07-08-2026, pedido do Lucas: "uma setinha que
  // liste todos os últimos logins, exceto o último") — só busca quando
  // clica (mesma convenção de LogAuditoriaPainel: não vale gastar
  // requisição em quem nunca vai abrir). `null` = ainda não buscou.
  const [logins, setLogins] = useState(null);
  const [carregandoLogins, setCarregandoLogins] = useState(false);
  const [loginsAbertos, setLoginsAbertos] = useState(false);

  useEffect(() => {
    Promise.all([
      usuarioApi.buscar(auth.authFetch, id),
      // Não existe (nem deveria existir) uma coluna "é pesquisador" em
      // usuario — isso já é decidido pelo RBAC (usuario_papel), então é
      // isso que a consulta usa, sem duplicar a informação em outro
      // lugar. Se um dia o módulo 6-perfil-pesquisador for construído, o
      // perfil completo (vínculo institucional, título acadêmico, links
      // etc.) entra numa seção "Perfil acadêmico" própria, do mesmo jeito.
      usuarioPapelApi.listarPorUsuario(auth.authFetch, id).catch(() => []),
      arquivoApi.buscarAvatarPorUsuario(id).catch(() => null),
    ])
      .then(([dadosUsuario, papeisUsuario, avatarUsuario]) => {
        setUsuario(dadosUsuario);
        setPapeis(papeisUsuario);
        setAvatar(avatarUsuario);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoAlternarLogins = async () => {
    if (loginsAbertos) {
      setLoginsAbertos(false);
      return;
    }
    setLoginsAbertos(true);
    if (logins !== null) {
      return;
    }
    setCarregandoLogins(true);
    try {
      const resultado = await usuarioApi.listarLogins(auth.authFetch, id);
      setLogins(resultado);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setCarregandoLogins(false);
    }
  };

  // Lista vem mais recente primeiro (backend) — o [0] é o MESMO login que
  // já aparece como valor do campo "Último login em" acima, então some
  // daqui pra não duplicar (pedido do Lucas: "exceto o último").
  const loginsAnteriores = logins?.slice(1) ?? [];

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!usuario) {
    return <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={usuario.nome}
      subtitulo={usuario.email}
      largura="larga"
      badges={papeis?.map((papel) => (
        <span key={papel.nomePapel} className="badge badge-neutro">
          {papel.nomePapel}
        </span>
      ))}
      // Botão "Alterar" no topo (10-08-2026, item 4: "fluxo consultar→
      // alterar é o mais comum em painel admin", hoje só dava pra editar
      // voltando pra listagem primeiro).
      acaoTopo={
        <Link to={`/admin/usuarios/${usuario.idUsuario}/alterar`} className="btn btn-primary">
          <i className="fa-solid fa-pen"></i> Alterar
        </Link>
      }
      acoes={
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full">
          Voltar
        </button>
      }
    >
      {/* 2 colunas a partir de lg (10-08-2026, item 4, mesmo padrão de
          Alterar Usuário) — principal (2/3): dados de verdade da conta.
          Lateral (1/3): Papéis. "Sessões ativas" NÃO entra aqui (mesma
          decisão do Alterar Usuário — não existe endpoint do admin ver
          sessão de outra pessoa, só o histórico de login já existente
          abaixo, que já é colapsado por padrão desde sempre). */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SecaoFicha titulo="Dados da conta">
            <CampoFicha rotulo="id" valor={usuario.idUsuario} />
            <CampoFicha
              rotulo="Foto de perfil"
              largura="cheia"
              valor={avatar?.padrao === false ? 'Foto cadastrada' : 'Avatar padrão do sistema'}
              acao={<AvatarUsuario nome={usuario.nome} foto={avatar?.url} tamanho="md" />}
            />
            <CampoFicha
              rotulo="Criado em"
              valor={usuario.criadoEm && new Date(usuario.criadoEm).toLocaleString('pt-BR')}
            />
            <CampoFicha
              rotulo="E-mail verificado"
              valor={usuario.emailVerificado ? 'Sim' : 'Não'}
            />
          </SecaoFicha>

          <SecaoFicha titulo="Acesso">
            {/* Tirado do log de auditoria de propósito (07-08-2026, pedido
                do Lucas: login bem-sucedido lotava o log com uma linha por
                login) — mora só aqui agora, não no log. Colapsado por
                padrão desde que existe (loginsAbertos começa false). */}
            <CampoFicha
              rotulo="Último login em"
              largura="cheia"
              valor={
                usuario.ultimoLoginEm
                  ? new Date(usuario.ultimoLoginEm).toLocaleString('pt-BR')
                  : 'Nunca'
              }
              acao={
                usuario.ultimoLoginEm && (
                  <button
                    type="button"
                    onClick={aoAlternarLogins}
                    aria-label="Ver logins anteriores"
                    title="Ver logins anteriores"
                    className="texto-fraco hover-texto-forte transition-colors shrink-0"
                  >
                    <i
                      className={
                        'fa-solid fa-chevron-down transition-transform' +
                        (loginsAbertos ? ' rotate-180' : '')
                      }
                    ></i>
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
                        // criado_em não é único por usuário (chave melhor
                        // não existe aqui — a resposta não traz id_sessao
                        // de propósito, é histórico de login, não uma
                        // entidade gerenciável pelo painel).
                        <li key={indice} className="texto-padrao">
                          {new Date(login.logadoEm).toLocaleString('pt-BR')}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CampoFicha>
          </SecaoFicha>

          {/* Perfil de Pesquisador (10-08-2026, item 4: "mostrar CPF
              mascarado e links acadêmicos... como 'não informado' enquanto
              o módulo não existir") — mesmo aviso honesto da versão
              editável em Alterar Usuário, aqui só leitura. */}
          <SecaoFicha titulo="Perfil de Pesquisador">
            <div className="sm:col-span-2 flex items-start gap-2 rounded-lg fundo-info texto-info p-3">
              <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
              <p className="text-xs">
                Módulo de Perfil de Pesquisador ainda não foi implementado.
              </p>
            </div>
            <CampoFicha rotulo="CPF" valor="Não informado (módulo inexistente)" />
            <CampoFicha rotulo="Link acadêmico" valor="Não informado (módulo inexistente)" />
          </SecaoFicha>
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
    </FichaConsulta>
  );
}
