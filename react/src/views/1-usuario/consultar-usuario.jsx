import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoTextboxConsulta } from '../../components/crud/campo-textbox-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

// "Consultar" — botão do meio entre Alterar e Excluir (GenericTable).
// Mostra TODOS os dados do usuário ligados ao banco (UsuarioResponseDto
// inteiro), sempre em textbox desabilitado — não salva nada, campo sem
// valor fica vazio naturalmente.
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
      // etc.) entra aqui do mesmo jeito, sem precisar de coluna nova.
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

  const ehPesquisador = papeis?.some((papel) => papel.nomePapel === 'pesquisador');

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
  // já aparece no textbox "Último login em" acima, então some daqui pra
  // não duplicar (pedido do Lucas: "exceto o último").
  const loginsAnteriores = logins?.slice(1) ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-circle-user"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Consultar Usuário</h2>
        </div>

        {carregando ? (
          <p className="p-10 text-center text-sm text-slate-600">Carregando...</p>
        ) : !usuario ? (
          <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
        ) : (
          <div className="p-10 space-y-6">
            <CampoTextboxConsulta rotulo="id" valor={usuario.idUsuario} />
            <CampoTextboxConsulta rotulo="Nome" valor={usuario.nome} />
            <CampoTextboxConsulta rotulo="E-mail" valor={usuario.email} />
            <CampoTextboxConsulta rotulo="Id da imagem de perfil" valor={usuario.idImagemPerfil} />
            <CampoTextboxConsulta
              rotulo="E-mail verificado"
              valor={usuario.emailVerificado ? 'Sim' : 'Não'}
            />
            <CampoTextboxConsulta
              rotulo="Criado em"
              valor={usuario.criadoEm && new Date(usuario.criadoEm).toLocaleString('pt-BR')}
            />
            {/* Tirado do log de auditoria de propósito (07-08-2026, pedido do
                Lucas: login bem-sucedido lotava o log com uma linha por
                login) — mora só aqui agora, não no log. */}
            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <CampoTextboxConsulta
                    rotulo="Último login em"
                    valor={
                      usuario.ultimoLoginEm
                        ? new Date(usuario.ultimoLoginEm).toLocaleString('pt-BR')
                        : 'Nunca'
                    }
                  />
                </div>
                {/* Setinha (07-08-2026, pedido do Lucas) — histórico completo
                    de login vem de `sessao` (cada login já É uma sessão,
                    não precisou de tabela nova). Só aparece se já teve
                    login registrado. */}
                {usuario.ultimoLoginEm && (
                  <button
                    type="button"
                    onClick={aoAlternarLogins}
                    aria-label="Ver logins anteriores"
                    title="Ver logins anteriores"
                    className="btn btn-secondary shrink-0"
                    style={{ padding: '0.875rem' }}
                  >
                    <i
                      className={
                        'fa-solid fa-chevron-down transition-transform' +
                        (loginsAbertos ? ' rotate-180' : '')
                      }
                    ></i>
                  </button>
                )}
              </div>

              {loginsAbertos && (
                <div className="mt-2 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm">
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
            </div>
            <CampoTextboxConsulta
              rotulo="É pesquisador?"
              valor={papeis === null ? '' : ehPesquisador ? 'Sim' : 'Não'}
            />
            <CampoTextboxConsulta
              rotulo="Papéis"
              valor={papeis?.map((papel) => papel.nomePapel).join(', ')}
            />

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary w-full"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
