import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
  classeBadgeStatusPesquisador,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { formatarCpf } from '../../services/constant/utils/formatacao.util';

// Botão de olho (04-09-2026, pedido do Lucas) - abre a foto de perfil em
// outra guia, mesmo efeito de clicar com o botão direito na imagem e
// escolher "abrir em outra guia" (link direto, sem JS/window.open). Não
// existe "tamanho máximo" de verdade aqui: é a MESMA url do avatar
// pequeno do topo da ficha, já processada pelo `sharp` no upload
// (RNF-016) e redimensionada pro teto do contexto avatar (512px, ver
// PERFIL_PROCESSAMENTO_POR_CONTEXTO em 25-arquivo/arquivo.constants.ts) -
// os bytes originais enviados pelo usuário nunca são guardados.
// `tamanho` (04-09-2026, achado do Lucas: "está cinza e apagado demais")
// - texto-forte (não -fraco) desde o início, sem depender de :hover pra
// ficar legível; usado em dois lugares nesta tela (ver `avatar` da
// FichaConsulta e o campo "Foto de perfil" abaixo).
// `badge` (04-09-2026, imagem editada pelo Lucas mostrando a posição
// exata) - selo circular escuro sobreposto no canto inferior direito do
// círculo do avatar (mesmo padrão de "editar foto" do Instagram/LinkedIn),
// em vez do ícone solto flutuando mais abaixo/à direita da tentativa
// anterior. `border` na cor do CARTÃO (não uma cor fixa) cria o anelzinho
// de respiro entre o selo e a foto, e continua certo nos dois temas.
// Sem o `title` explicando "tamanho máximo" (04-09-2026, pedido do Lucas:
// "o olho de cima não precisa deste tooltip") - a explicação completa fica
// só no olho de baixo, ao lado de "Foto cadastrada".
function BotaoVerFotoPerfil({ url, tamanho = 'text-base', badge = false }) {
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

// "Consultar" - botão do meio entre Alterar e Excluir (GenericTable).
// Mostra TODOS os dados do usuário ligados ao banco (UsuarioResponseDto
// inteiro), em layout de ficha (08-08-2026, ver components/crud/
// ficha-consulta.jsx - não é mais uma pilha de textbox desabilitado).
export function ConsultarUsuario({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [papeis, setPapeis] = useState(null);
  // Avatar (módulo 25-arquivo) - busca separada de `usuario` de propósito:
  // GET /arquivo/avatar/:idUsuario é público (não precisa de auth.authFetch,
  // é o próprio backend que já resolve foto-cadastrada-ou-padrão), e um
  // erro aqui (ex.: avatar padrão ainda não configurado, url null) não deve
  // impedir o resto da ficha de carregar - daí o .catch(() => null) igual
  // já é feito pra `papeis` logo abaixo.
  const [avatar, setAvatar] = useState(null);
  // Perfil de pesquisador (módulo 6, 25-08-2026: existe de verdade agora,
  // o aviso "ainda não implementado" que morava aqui era só um resquício
  // de antes do módulo existir). `null` = não é pesquisador (404, mesmo
  // sinal já usado pra avatar/papéis acima) - a seção inteira some nesse
  // caso, não faz sentido mostrar "não informado" pra sempre pra quem
  // nunca vai ter esse dado.
  const [perfilPesquisador, setPerfilPesquisador] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro } = useErroToast();
  // Histórico de login (07-08-2026, pedido do Lucas: "uma setinha que
  // liste todos os últimos logins, exceto o último") - só busca quando
  // clica (mesma convenção de LogAuditoriaPainel: não vale gastar
  // requisição em quem nunca vai abrir). `null` = ainda não buscou.
  const [logins, setLogins] = useState(null);
  const [carregandoLogins, setCarregandoLogins] = useState(false);
  const [loginsAbertos, setLoginsAbertos] = useState(false);

  useEffect(() => {
    Promise.all([
      usuarioApi.buscar(auth.authFetch, id),
      // Não existe (nem deveria existir) uma coluna "é pesquisador" em
      // usuario - isso já é decidido pelo RBAC (usuario_papel), então é
      // isso que a consulta usa, sem duplicar a informação em outro
      // lugar.
      usuarioPapelApi.listarPorUsuario(auth.authFetch, id).catch(() => []),
      arquivoApi.buscarAvatarPorUsuario(id).catch(() => null),
      // 404 = não é pesquisador, mesmo padrão de tolerância dos dois
      // acima (não impede o resto da ficha de carregar).
      perfilPesquisadorApi.buscar(auth.authFetch, id).catch(() => null),
    ])
      .then(([dadosUsuario, papeisUsuario, avatarUsuario, perfilUsuario]) => {
        setUsuario(dadosUsuario);
        setPapeis(papeisUsuario);
        setAvatar(avatarUsuario);
        setPerfilPesquisador(perfilUsuario);
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

  // Lista vem mais recente primeiro (backend) - o [0] é o MESMO login que
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
      avatar={
        // `relative`/`absolute` (04-09-2026, achado do Lucas: empilhar em
        // flex-col empurrava a FOTO pra cima, porque o bloco inteiro
        // ficava mais alto e `items-center` recentralizava tudo) - a foto
        // fica exatamente onde sempre ficou, o selo só flutua por cima,
        // sem afetar a altura/alinhamento do cabeçalho. Posição final
        // (imagem editada pelo Lucas, 04-09-2026): selo sobreposto no
        // canto inferior direito do círculo, mesmo padrão "editar foto"
        // do Instagram/LinkedIn.
        <div className="relative shrink-0">
          <AvatarUsuario nome={usuario.nome} foto={avatar?.url} tamanho="xl" />
          {avatar?.padrao === false && avatar?.url && (
            <div className="absolute bottom-0 right-0">
              <BotaoVerFotoPerfil url={avatar.url} badge />
            </div>
          )}
        </div>
      }
      largura="larga"
      // Sem `badges` de propósito (25-08-2026, pedido da Alexia): os
      // papéis já aparecem uma vez, de verdade, na seção "Papéis" mais
      // abaixo - mostrar de novo aqui em cima, do lado de "Alterar", era
      // duplicar a mesma informação duas vezes na mesma tela.
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
          Alterar Usuário) - principal (2/3): dados de verdade da conta.
          Lateral (1/3): Papéis. "Sessões ativas" NÃO entra aqui (mesma
          decisão do Alterar Usuário - não existe endpoint do admin ver
          sessão de outra pessoa, só o histórico de login já existente
          abaixo, que já é colapsado por padrão desde sempre). */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SecaoFicha titulo="Dados da conta">
            <CampoFicha rotulo="id" valor={usuario.idUsuario} />
            <CampoFicha
              rotulo="Foto de perfil"
              // Botão de olho à ESQUERDA do texto (04-09-2026, pedido do
              // Lucas) - por isso vem dentro de `valor`, não em `acao`
              // (que sempre renderiza à direita, ver ficha-consulta.jsx).
              // Só aparece pra quem cadastrou foto de verdade (avatar
              // padrão do sistema não precisa disso).
              valor={
                avatar?.padrao === false ? (
                  <span className="inline-flex items-center gap-2">
                    {avatar?.url && <BotaoVerFotoPerfil url={avatar.url} />}
                    Foto cadastrada
                  </span>
                ) : (
                  'Avatar padrão do sistema'
                )
              }
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
                login) - mora só aqui agora, não no log. Colapsado por
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
                        // não existe aqui - a resposta não traz id_sessao
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

          {/* Perfil de Pesquisador (25-08-2026: dado real agora, módulo 6
              existe - some inteira pra quem não é pesquisador, em vez de
              mostrar "não informado" pra sempre pra quem nunca vai ter
              esse dado). CPF vem `null` de quem não tem a permissão
              'perfil_pesquisador_visualizar_sensivel' (o backend já decide
              isso, não é uma checagem daqui). */}
          {perfilPesquisador && (
            <SecaoFicha titulo="Perfil de Pesquisador">
              <CampoFicha
                rotulo="CPF"
                valor={perfilPesquisador.cpf ? formatarCpf(perfilPesquisador.cpf) : null}
              />
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
    </FichaConsulta>
  );
}
