import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
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
    ])
      .then(([dadosUsuario, papeisUsuario]) => {
        setUsuario(dadosUsuario);
        setPapeis(papeisUsuario);
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
    return <p className="p-10 text-center text-sm text-slate-600">Carregando...</p>;
  }

  if (!usuario) {
    return <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={usuario.nome}
      subtitulo={usuario.email}
      badges={papeis?.map((papel) => (
        <span key={papel.nomePapel} className="badge badge-neutro">
          {papel.nomePapel}
        </span>
      ))}
      acoes={
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full">
          Voltar
        </button>
      }
    >
      <SecaoFicha titulo="Dados da conta">
        <CampoFicha rotulo="id" valor={usuario.idUsuario} />
        <CampoFicha rotulo="Id da imagem de perfil" valor={usuario.idImagemPerfil} />
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
        {/* Tirado do log de auditoria de propósito (07-08-2026, pedido do
            Lucas: login bem-sucedido lotava o log com uma linha por
            login) — mora só aqui agora, não no log. */}
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
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
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
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              {carregandoLogins ? (
                <p className="text-slate-600">Carregando...</p>
              ) : loginsAnteriores.length === 0 ? (
                <p className="text-slate-600">Nenhum login anterior registrado.</p>
              ) : (
                <ul className="space-y-1">
                  {loginsAnteriores.map((login, indice) => (
                    // criado_em não é único por usuário (chave melhor não
                    // existe aqui — a resposta não traz id_sessao de
                    // propósito, é histórico de login, não uma entidade
                    // gerenciável pelo painel).
                    <li key={indice} className="text-slate-700">
                      {new Date(login.logadoEm).toLocaleString('pt-BR')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CampoFicha>
      </SecaoFicha>

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
    </FichaConsulta>
  );
}
