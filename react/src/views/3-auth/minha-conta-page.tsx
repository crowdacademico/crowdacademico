import { useEffect, useState } from 'react';
import { MENSAGEM_NOME_CURTO, NOME_MINIMO_CARACTERES } from '../../services/constant/constants/minimos.constants';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { Dica } from '../../components/layout/tooltip';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { confirmarSaida } from '../../components/crud/use-alteracao-nao-salva';
import { pedirConfirmacao } from '../../components/crud/confirmacao';
import { Campo } from '../../components/input/campo';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { BotaoMostrarSenha } from '../../components/input/botao-mostrar-senha';
import { MedidorSenha } from '../../components/input/medidor-senha';
import { ConfirmacaoDigitada } from '../../components/input/confirmacao-digitada';
import { confirmacaoConfere } from '../../components/input/confirmacao-confere';
import { sessaoApi } from '../../services/3-auth/api/sessao.api';
import { usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import {
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { formatarCpfExibicao, formatarDataHora, formatarMesAno } from '../../services/constant/util/formatacao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { PropsPagina } from '../../services/router/pagina.type';
import { ModalUpgradePesquisador } from '../6-perfil-pesquisador/modal-upgrade-pesquisador';
import { Carregando } from '../../components/layout/carregando';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { AuthResponseSessions } from '../../services/3-auth/type/auth.type';
import type { UsuarioPapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';
import type { SuspensaoResponseDto } from '../../services/constant/type/suspensao.type';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { BadgeStatusPesquisador } from '../../components/crud/badge-status-pesquisador';
import { SecaoContestacaoScore } from '../19-denuncia/secao-contestacao-score';
import { SecaoRecebimento } from '../24-conta-recebimento/secao-recebimento';
import { SENHA_MINIMO_CARACTERES } from '../../services/3-auth/constants/senha.constants';
import { AbaMinhasContribuicoes } from '../22-contribuicao/aba-minhas-contribuicoes';
import { LinksAcademicosDoUsuario } from '../7-link-academico/links-academicos-do-usuario';
import { CamposVinculoPerfil } from '../6-perfil-pesquisador/campos-vinculo-perfil';

// Minha Conta: não é um formulário só, é uma área com seções independentes, cada uma salva por conta própria.
//
// SEM seção "Preferências" de propósito: preferência pessoal (tema/fonte) por conta exigiria uma tabela própria
// para guardar isso direito (o projeto já tem tabelas demais). Tema/fonte são ajustáveis só pelos botões do
// cabeçalho (ControleTema/ControleFonte), preferência de DISPOSITIVO via localStorage, sem ligação nenhuma com
// a conta logada.
//
// Estrutura (referência ORCID/ResearchGate/Google Acadêmico: "portfólio profissional", abrem com uma FAIXA DE
// IDENTIDADE larga no topo, não um cartãozinho de canto): FaixaIdentidade (larga, topo: avatar grande, nome,
// e-mail, badges de papel, "membro desde") + abas de verdade (rota /minha-conta/:aba, não useState: mesma
// decisão das abas do painel admin). Seções com o MESMO peso visual empilhadas parecem um formulário
// longo, não um perfil, e um cartão lateral discreto não ancora a tela.
const ABAS_MINHA_CONTA = [
  { chave: 'perfil', rotulo: 'Perfil', icone: 'fa-user' },
  { chave: 'seguranca', rotulo: 'Segurança', icone: 'fa-shield-halved' },
  { chave: 'papeis', rotulo: 'Papéis', icone: 'fa-user-tag' },
  { chave: 'contribuicoes', rotulo: 'Contribuições', icone: 'fa-hand-holding-heart' },
  // Privacidade por último de propósito - o botão de excluir conta mora
  // aqui dentro, atrás da confirmação por digitação: ação destrutiva
  // nunca na primeira aba que a pessoa vê.
  { chave: 'privacidade', rotulo: 'Privacidade', icone: 'fa-lock' },
];
const CHAVES_ABAS = ABAS_MINHA_CONTA.map((item) => item.chave);

export function MinhaConta({ auth }: PropsPagina) {
  const { aba } = useParams();

  if (auth.carregando) return null;
  if (!auth.usuario) {
    return <Navigate to="/login" replace state={{ voltarPara: `/minha-conta/${aba ?? 'perfil'}` }} />;
  }
  if (!aba || !CHAVES_ABAS.includes(aba)) {
    return <Navigate to="/minha-conta/perfil" replace />;
  }

  return (
    // `w-0 min-w-full`: não é decorativo. Sem isso, a barra de abas logo abaixo (rola na horizontal, com rótulo em
    // whitespace-nowrap para não quebrar linha) faz o NAVEGADOR calcular a largura mínima deste bloco pelo
    // CONTEÚDO da barra (~600px) e empurra a página inteira para a largura horizontal, em vez do próprio nav
    // rolar sozinho, mesmo em telas pequenas. `width: 0` tira este bloco do cálculo de "largura mínima pelo
    // conteúdo" (passa a ter uma largura EXPLÍCITA, não automática); `min-width: 100%` devolve ele ao tamanho
    // normal (cheio do container, até o teto de --largura-ficha) na hora de desenhar de verdade. Troque só se remover
    // a barra de abas.
    <div className="w-0 min-w-full max-w-(--largura-ficha) mx-auto p-6 sm:p-10">
      {/* Um cartão só, do topo ao rodapé - SEM overflow-hidden (mesma
          lição já aprendida nas antigas páginas de formulário e de ficha:
          overflow-hidden cria um contexto de scroll que o `sticky` do
          rodapé da aba Perfil não atravessa). A faixa (fundo-sutil,
          diferente do corpo) arredonda o PRÓPRIO canto de cima
          (rounded-t-2xl); o corpo de cada aba é transparente, deixa o
          fundo-cartao deste wrapper aparecer atrás - só a aba Perfil tem
          rodapé sticky com fundo próprio, e só ELE precisa arredondar o
          canto de baixo (rounded-b-2xl), as outras abas terminam lisas e
          o canto arredondado do wrapper já aparece sozinho por trás. */}
      <div className="fundo-cartao rounded-2xl shadow-lg border borda-padrao">
        <FaixaIdentidade auth={auth} />
        <BarraAbas abaAtiva={aba} />

        {/* `key`: aberta direto pela URL (ou depois de F5), a aba monta antes de a sessão terminar de carregar e
            o formulário nasceria com o nome vazio. Trocar a key quando o usuário chega remonta a aba já com o
            nome certo. */}
        {aba === 'perfil' && (
          <AbaPerfil key={auth.usuario?.idUsuario ?? 'carregando'} auth={auth} />
        )}
        {aba === 'seguranca' && <AbaSeguranca auth={auth} />}
        {aba === 'papeis' && <AbaPapeis auth={auth} />}
        {aba === 'contribuicoes' && <AbaMinhasContribuicoes auth={auth} />}
        {aba === 'privacidade' && <AbaPrivacidade auth={auth} />}
      </div>
    </div>
  );
}

// Faixa de identidade: busca papéis por conta própria, mesmo espírito de sempre neste arquivo: a lista de
// papéis de uma pessoa é minúscula, duplicar essa requisição pequena é mais simples e mais seguro do que subir
// estado (a aba Papéis, abaixo, também busca a sua própria cópia, cada uma no seu tempo de vida).
interface FaixaIdentidadeProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch'>;
}

function FaixaIdentidade({ auth }: FaixaIdentidadeProps) {
  const usuario = auth.usuario;
  const [papeis, setPapeis] = useState<UsuarioPapelResponse[] | null>(null);

  useEffect(() => {
    if (!usuario) {
      return;
    }
    usuarioPapelApi
      .listarPorUsuario(auth.authFetch, usuario.idUsuario)
      .then(setPapeis)
      .catch(() => setPapeis([]));
  }, [auth.authFetch, usuario]);

  const membroDesde = usuario?.criadoEm ? formatarMesAno(usuario.criadoEm) : null;

  return (
    <div className="relative overflow-hidden rounded-t-2xl border-b borda-padrao fundo-sutil px-6 sm:px-8 py-8">
      {/* Gradiente MUITO discreto (10% de opacidade) em vez de fundo verde
          chapado - regra já estabelecida no projeto: verde é acento, não
          fundo. Mesmo truque decorativo do blob em login-page.tsx. */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 brilho-marca rounded-full blur-3xl"></div>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Anel ao redor do avatar via padding + fundo-cartao (não
            hardcoded em branco) - reage ao tema escuro sozinho, mesmos
            tokens de sempre. */}
        <div className="p-1 rounded-full fundo-cartao shadow-md shrink-0 w-fit">
          <AvatarUsuario nome={usuario?.nome} foto={usuario?.avatarUrl} tamanho="xxl" forma="circulo" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="titulo-pagina break-words">
            {usuario?.nome}
          </h1>
          <div className="paragrafo flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 texto-fraco">
            <span className="break-words">{usuario?.email}</span>
            <span
              className={
                'badge gap-1 ' +
                (usuario?.emailVerificado ? 'badge-sucesso' : 'fundo-aviso texto-aviso')
              }
            >
              <i
                className={
                  'fa-solid icone-pequeno ' +
                  (usuario?.emailVerificado ? 'fa-check' : 'fa-triangle-exclamation')
                } aria-hidden="true"
              ></i>
              {usuario?.emailVerificado ? 'E-mail verificado' : 'E-mail não verificado'}
            </span>
            {membroDesde && <span>Membro desde {membroDesde}</span>}
          </div>

          {papeis && papeis.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {papeis.map((papel) => (
                <span key={papel.idPapel} className="badge badge-neutro">
                  {papel.nomePapel}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// Abas de verdade, não useState (mesma decisão das abas do painel admin): link direto funciona, F5 preserva a
// aba, botão Voltar navega. Rola na horizontal (não empilha) no mobile, ver `.barra-abas`.
interface BarraAbasProps {
  abaAtiva: string;
}

function BarraAbas({ abaAtiva }: BarraAbasProps) {
  return (
    <nav
      className="barra-abas px-2 sm:px-4"
      aria-label="Seções de Minha Conta"
    >
      {ABAS_MINHA_CONTA.map((item) => (
        <Link
          key={item.chave}
          to={`/minha-conta/${item.chave}`}
          className={
            'paragrafo enfase flex items-center gap-2 px-4 py-3.5 whitespace-nowrap border-b-2 transition-colors texto-herdado ' +
            (item.chave === abaAtiva
              ? 'borda-marca texto-marca'
              : 'border-transparent texto-fraco hover-texto-forte')
          }
        >
          <i className={'fa-solid ' + item.icone} aria-hidden="true"></i>
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}

// Perfil básico e dados acadêmicos do pesquisador aparecem na mesma aba. A edição abre em ModalFicha.
interface AbaPerfilProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch' | 'atualizarUsuarioLocal' | 'renovarSessaoAgora'>;
}

interface DadosAtualizarPerfil {
  nome: string;
  idImagemPerfil?: number | null;
}

function AbaPerfil({ auth }: AbaPerfilProps) {
  const [perfil, setPerfil] = useState<PerfilPesquisadorResponse | null>(null);
  const [suspensao, setSuspensao] = useState<SuspensaoResponseDto | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [erroCarregamentoPerfil, setErroCarregamentoPerfil] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [fazendoUpgrade, setFazendoUpgrade] = useState(false);
  const carregando = auth.usuario?.ehPesquisador !== false && carregandoPerfil;
  useEffect(() => {
    if (!auth.usuario) {
      return;
    }
    if (auth.usuario.ehPesquisador === false) {
      return;
    }
    setErroCarregamentoPerfil(null);
    void Promise.allSettled([
      perfilPesquisadorApi.buscar(auth.authFetch, auth.usuario.idUsuario),
      perfilPesquisadorApi.buscarSuspensao(auth.authFetch, auth.usuario.idUsuario),
    ])
      .then(([resultadoPerfil, resultadoSuspensao]) => {
        if (resultadoPerfil.status === 'fulfilled') {
          setPerfil(resultadoPerfil.value);
        } else {
          setErroCarregamentoPerfil('Não foi possível carregar os dados acadêmicos do perfil. Tente recarregar a página.');
        }
        if (resultadoSuspensao.status === 'fulfilled') {
          setSuspensao(resultadoSuspensao.value);
        } else {
          setErroCarregamentoPerfil('Não foi possível carregar todos os dados do perfil. Tente recarregar a página.');
        }
      })
      .finally(() => setCarregandoPerfil(false));
  }, [auth.authFetch, auth.usuario]);
  const suspensoAte = suspensao?.suspensoAte ?? null;
  const suspensoAgora = suspensoAte !== null && new Date(suspensoAte) > new Date();

  return (
    <div className="px-6 sm:px-8 py-8 space-y-6">
      {carregando ? <Carregando /> : (
        <>
          <MensagemErro texto={erroCarregamentoPerfil} />
          <div className="flex justify-end">
            <button type="button" className="btn btn-secondary" onClick={() => setEditando(true)}>
              <i className="fa-solid fa-pen" aria-hidden="true"></i> Editar perfil
            </button>
          </div>
          <SecaoFicha titulo="Dados básicos" nivel={2}>
            <CampoFicha rotulo="Nome" valor={auth.usuario?.nome} />
            <CampoFicha rotulo="E-mail" valor={auth.usuario?.email} />
            <CampoFicha rotulo="E-mail verificado" valor={auth.usuario?.emailVerificado ? 'Sim' : 'Não'} />
          </SecaoFicha>
          {auth.usuario?.ehPesquisador && perfil && (
            <>
              {suspensoAgora && (
                <div className="rounded-lg border borda-forte fundo-erro p-4">
                  <p className="paragrafo enfase texto-erro">
                    Seu poder de pesquisador está suspenso até {formatarDataHora(suspensoAte)}
                  </p>
                  <p className="legenda texto-erro mt-1">Motivo: {suspensao?.motivoSuspensao}</p>
                </div>
              )}
              <SecaoFicha titulo="Dados acadêmicos" nivel={2}>
                <CampoFicha rotulo="CPF" valor={perfil.cpf ? formatarCpfExibicao(perfil.cpf) : null} />
                <CampoFicha rotulo="Situação" valor={<BadgeStatusPesquisador status={perfil.statusPesquisador} />} />
                <CampoFicha rotulo="Título acadêmico" valor={ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico]} />
                <CampoFicha rotulo="Tipo de vínculo" valor={ROTULO_TIPO_VINCULO[perfil.tipoVinculo]} />
                <CampoFicha rotulo="Vínculo institucional" valor={perfil.vinculoInstitucional} />
                <CampoFicha rotulo="Pontuação atual" valor={perfil.scoreAtual} />
              </SecaoFicha>
              {auth.usuario && (
                <SecaoFicha titulo="Links acadêmicos" nivel={2}>
                  <LinksAcademicosDoUsuario
                    auth={auth}
                    idUsuario={auth.usuario.idUsuario}
                    nomeUsuario={auth.usuario.nome}
                    contaPropria
                  />
                </SecaoFicha>
              )}
              <SecaoContestacaoScore authFetch={auth.authFetch} />
              <SecaoRecebimento authFetch={auth.authFetch} />
            </>
          )}
          {auth.usuario && !auth.usuario.ehPesquisador && (
            <div className="rounded-lg fundo-info texto-info p-4 space-y-3">
              <p className="paragrafo texto-herdado">
                Seu perfil contém os dados básicos da conta. Ao se tornar pesquisador, os dados acadêmicos serão exibidos nesta mesma aba.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setFazendoUpgrade(true)}>
                <i className="fa-solid fa-flask" aria-hidden="true"></i> Tornar-me pesquisador
              </button>
            </div>
          )}
        </>
      )}
      {editando && auth.usuario && (
        <ModalEditarPerfil
          auth={auth}
          perfil={perfil ?? null}
          aoFechar={() => setEditando(false)}
          aoAtualizar={(usuarioAtualizado, perfilAtualizado) => {
            auth.atualizarUsuarioLocal(usuarioAtualizado);
            if (perfilAtualizado) setPerfil(perfilAtualizado);
          }}
        />
      )}
      {fazendoUpgrade && auth.usuario && (
        <ModalUpgradePesquisador
          auth={auth}
          idUsuarioAlvo={auth.usuario.idUsuario}
          nomeAlvo={auth.usuario.nome}
          aoFechar={() => setFazendoUpgrade(false)}
          aoConcluido={(perfilCriado) => {
            setPerfil(perfilCriado);
            setCarregandoPerfil(false);
          }}
        />
      )}
    </div>
  );
}

interface ModalEditarPerfilProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch' | 'atualizarUsuarioLocal'>;
  perfil: PerfilPesquisadorResponse | null;
  aoFechar: () => void;
  aoAtualizar: (
    usuario: NonNullable<UseAuthReturn['usuario']>,
    perfil: PerfilPesquisadorResponse | null,
  ) => void;
}

function ModalEditarPerfil({ auth, perfil, aoFechar, aoAtualizar }: ModalEditarPerfilProps) {
  const usuario = auth.usuario;
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [fotoNova, setFotoNova] = useState<{ id: number | null; url: string | null } | undefined>();
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo>(perfil?.tipoVinculo ?? 'institucional');
  const [vinculoInstitucional, setVinculoInstitucional] = useState(perfil?.vinculoInstitucional ?? '');
  const [tituloAcademico, setTituloAcademico] = useState<TituloAcademico>(perfil?.tituloAcademico ?? 'mestre');
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const conta = useErrosFormulario(() => ({
    nome: nome.trim().length < NOME_MINIMO_CARACTERES && MENSAGEM_NOME_CURTO,
  }));
  const academico = useErrosFormulario(() => ({
    vinculoInstitucional:
      tipoVinculo === 'institucional' &&
      vinculoInstitucional.trim() === '' &&
      'Informe a instituição.',
  }));
  const contaAlterada = nome.trim() !== (usuario?.nome ?? '') || fotoNova !== undefined;
  const academicoAlterado = perfil !== null && (
    tipoVinculo !== perfil.tipoVinculo ||
    (tipoVinculo === 'institucional' && vinculoInstitucional !== (perfil.vinculoInstitucional ?? '')) ||
    tituloAcademico !== perfil.tituloAcademico
  );
  const sujo = contaAlterada || academicoAlterado;

  const salvar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const contaValida = !contaAlterada || conta.tentarEnviar();
    const academicoValido = !academicoAlterado || academico.tentarEnviar();
    if (!usuario || !contaValida || !academicoValido) return;

    await executarEnviando(async () => {
      let usuarioAtualizado = usuario;
      let perfilAtualizado: PerfilPesquisadorResponse | null = perfil;
      if (contaAlterada) {
        const dados: DadosAtualizarPerfil = { nome: nome.trim() };
        if (fotoNova !== undefined) dados.idImagemPerfil = fotoNova.id;
        usuarioAtualizado = await usuarioApi.atualizar(auth.authFetch, usuario.idUsuario, dados);
      }
      if (academicoAlterado) {
        perfilAtualizado = await perfilPesquisadorApi.atualizarProprio(auth.authFetch, {
          tipoVinculo,
          ...(tipoVinculo === 'institucional' ? { vinculoInstitucional: vinculoInstitucional.trim() } : {}),
          tituloAcademico,
        });
      }
      aoAtualizar(usuarioAtualizado, perfilAtualizado);
      mostrar('Perfil atualizado com sucesso.');
      aoFechar();
    });
  };

  const fechar = async () => {
    if (await confirmarSaida(sujo)) aoFechar();
  };

  return (
    <ModalFicha
      titulo="Editar perfil"
      subtitulo="Atualize seus dados básicos e acadêmicos."
      erro={erro}
      aoFechar={() => void fechar()}
      rodape={(
        <RodapeAcoes
          aoCancelar={() => void fechar()}
          acao={{
            rotulo: 'Salvar',
            rotuloOcupado: 'Salvando...',
            ocupado: enviando,
            desabilitado: !sujo,
            formulario: 'form-editar-meu-perfil',
          }}
        />
      )}
    >
      <form id="form-editar-meu-perfil" onSubmit={salvar} className="space-y-6">
        <SecaoFicha titulo="Dados básicos" nivel={2}>
          <div className="sm:col-span-2 flex items-center gap-4">
            <SeletorFotoPerfil
              authFetch={auth.authFetch}
              nome={nome}
              url={fotoNova === undefined ? usuario?.avatarUrl : fotoNova.url}
              tamanho="xxl"
              aoAlterar={(id, url) => setFotoNova({ id, url })}
            />
            <p className="legenda texto-forte">Escolha ou remova sua foto do perfil.</p>
          </div>
          <Campo rotulo="Nome" erro={conta.erroDe('nome')}>
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                className={'input-padrao' + classeErro}
              />
            )}
          </Campo>
          <Campo rotulo="E-mail">
            {({ atributos }) => (
              <input {...atributos} type="email" value={usuario?.email ?? ''} disabled className="input-padrao" />
            )}
          </Campo>
        </SecaoFicha>
        {perfil && (
          <SecaoFicha titulo="Dados acadêmicos" nivel={2}>
            <CamposVinculoPerfil
              tipoVinculo={tipoVinculo}
              vinculoInstitucional={vinculoInstitucional}
              tituloAcademico={tituloAcademico}
              rotuloVinculoInstitucional="Vínculo institucional"
              aoAlterarTipoVinculo={setTipoVinculo}
              aoAlterarVinculoInstitucional={setVinculoInstitucional}
              aoAlterarTituloAcademico={setTituloAcademico}
              erroVinculoInstitucional={academico.erroDe('vinculoInstitucional')}
            />
          </SecaoFicha>
        )}
      </form>
    </ModalFicha>
  );
}

function iconePorDispositivo(userAgent: string | null): string {
  const ua = (userAgent ?? '').toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'fa-mobile-screen-button';
  }
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return 'fa-tablet-screen-button';
  }
  return 'fa-desktop';
}

// 2. SEGURANÇA: senha (exige a atual) + Sessões Ativas (ícone de dispositivo por sessão, "sessão atual" já vem
// destacada em verde (badge-sucesso), encerrar é um ícone discreto em vez de botão cheio).
interface AbaSegurancaProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch'>;
}

function AbaSeguranca({ auth }: AbaSegurancaProps) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  // Mesmo formulário de senha do Cadastro: medidor de força, mostrar a senha e confirmar a nova.
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: encerrandoTodas, executar: executarEncerrandoTodas } = useEnvio(reportarErro);
  const { ocupado: enviandoSenha, executar: executarEnviandoSenha } = useEnvio(reportarErro, limparErro);
  // "Alterar senha" fica sempre clicável; faltando algo, o erro aparece embaixo do campo.
  const {
    erroDe: erroSenhaDe,
    tentarEnviar: tentarTrocarSenha,
    limpar: limparErrosSenha,
  } = useErrosFormulario(() => ({
    atual: senhaAtual === '' && 'Informe a senha atual.',
    nova:
      novaSenha.length < SENHA_MINIMO_CARACTERES
        ? `A nova senha precisa ter pelo menos ${SENHA_MINIMO_CARACTERES} caracteres.`
        : novaSenha === senhaAtual && 'A nova senha precisa ser diferente da senha atual.',
    confirmar: confirmarSenha === '' ? 'Confirme a nova senha.' : confirmarSenha !== novaSenha && 'As senhas não são iguais.',
  }));

  const aoTrocarSenha = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const usuario = auth.usuario;
    if (!usuario || !tentarTrocarSenha()) {
      return;
    }
    await executarEnviandoSenha(async () => {
      await usuarioApi.atualizar(auth.authFetch, usuario.idUsuario, {
        senhaAtual,
        novaSenha,
      });
      mostrar('Senha alterada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      limparErrosSenha();
    });
  };

  const [sessoes, setSessoes] = useState<AuthResponseSessions[] | null>(null);
  const [encerrando, setEncerrando] = useState<number | null>(null);
  // Colapsada por padrão: imagine um usuário com 10, 20, 30 sessões abertas. Expandida, a lista ainda ganha
  // scroll próprio (max-h-64): nunca empurra a página.
  const [sessoesAbertas, setSessoesAbertas] = useState(false);

  const carregarSessoes = () => {
    sessaoApi
      .listar(auth.authFetch)
      .then(setSessoes)
      .catch(() => setSessoes([]));
  };
  useEffect(carregarSessoes, [auth.authFetch]);

  const aoEncerrarUma = async (idSessao: number) => {
    setEncerrando(idSessao);
    try {
      await sessaoApi.encerrarUma(auth.authFetch, idSessao);
      mostrar('Sessão encerrada.');
      carregarSessoes();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEncerrando(null);
    }
  };

  const aoEncerrarTodas = async () => {
    const confirmou = await pedirConfirmacao({
      titulo: 'Encerrar as outras sessões?',
      texto: 'Os outros aparelhos conectados nesta conta saem na hora; este continua.',
      rotuloConfirmar: 'Encerrar sessões',
      perigo: true,
    });
    if (!confirmou) {
      return;
    }
    await executarEncerrandoTodas(async () => {
      const resultado = await sessaoApi.encerrarTodasMenosAtual(auth.authFetch);
      mostrar(`${resultado.encerradas} sessão(ões) encerrada(s).`);
      carregarSessoes();
    });
  };

  return (
    <div className="px-6 sm:px-8 py-8 space-y-8">
      <div>
        <h2 className="titulo-bloco titulo-bloco--linha">
          Trocar senha
        </h2>
        <form onSubmit={aoTrocarSenha} className="space-y-4 max-w-(--largura-formulario)">
          <MensagemErro texto={erro} className="paragrafo texto-erro" />
          {/* O erro do backend (senha atual incorreta) também cai embaixo do campo, não só no aviso. */}
          <Campo rotulo="Senha atual" erro={erroSenhaDe('atual') || errosCampo.senhaAtual}>
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type="password"
                value={senhaAtual}
                onChange={(evento) => setSenhaAtual(evento.target.value)}
                className={'input-padrao' + classeErro}
                autoComplete="current-password"
              />
            )}
          </Campo>
          <Campo rotulo="Nova senha" erro={erroSenhaDe('nova') || errosCampo.novaSenha}>
            {({ atributos, classeErro }) => (
              <>
                <div className="relative">
                  <input
                    {...atributos}
                    type={mostrarSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(evento) => setNovaSenha(evento.target.value)}
                    className={'input-padrao pr-10' + classeErro}
                    autoComplete="new-password"
                  />
                  <BotaoMostrarSenha mostrando={mostrarSenha} aoAlternar={() => setMostrarSenha((atual) => !atual)} />
                </div>
                <MedidorSenha senha={novaSenha} />
              </>
            )}
          </Campo>
          <Campo
            rotulo="Confirmar nova senha"
            erro={erroSenhaDe('confirmar') || (confirmarSenha.length > 0 && confirmarSenha !== novaSenha ? 'As senhas não são iguais.' : undefined)}
          >
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(evento) => setConfirmarSenha(evento.target.value)}
                className={'input-padrao' + classeErro}
                autoComplete="new-password"
              />
            )}
          </Campo>
          <button
            type="submit"
            disabled={enviandoSenha}
            className="btn btn-secondary"
          >
            {enviandoSenha ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 pb-2 border-b borda-padrao">
          <button
            type="button"
            onClick={() => setSessoesAbertas((atual) => !atual)}
            className="titulo-bloco flex items-center gap-2"
          >
            Sessões ativas
            {sessoes && <span className="legenda texto-herdado normal-case">({sessoes.length})</span>}
            <i
              className={
                'fa-solid fa-chevron-down icone-pequeno transition-transform' +
                (sessoesAbertas ? ' rotate-180' : '')
              } aria-hidden="true"
            ></i>
          </button>
          {sessoesAbertas && sessoes && sessoes.length > 1 && (
            <button
              type="button"
              onClick={aoEncerrarTodas}
              disabled={encerrandoTodas}
              className="legenda enfase texto-erro hover:underline"
            >
              {encerrandoTodas ? 'Encerrando...' : 'Encerrar todas as outras'}
            </button>
          )}
        </div>

        {sessoesAbertas &&
          (sessoes === null ? (
            <Carregando />
          ) : sessoes.length === 0 ? (
            <EstadoVazio compacto icone="fa-laptop" titulo="Nenhuma sessão ativa encontrada." />
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {sessoes.map((sessao) => (
                <li
                  key={sessao.idSessao}
                  className="paragrafo flex items-center gap-3 rounded-lg border borda-padrao p-3 texto-herdado"
                >
                  <i
                    className={
                      'fa-solid ' + iconePorDispositivo(sessao.userAgent) + ' texto-fraco icone-grande shrink-0'
                    } aria-hidden="true"
                  ></i>
                  <div className="min-w-0 flex-1">
                    {/* truncate no <span> do texto, não no <p> inteiro: user-agent de verdade é longo, e
                        `truncate` num flex container com 2 filhos corta a linha inteira sem dar espaço para
                        o badge ("Esta sessão" sumia). Mesma família de min-w-0/break-words em CampoFicha. */}
                    <p className="texto-forte flex items-center gap-2 min-w-0">
                      <span className="truncate min-w-0">
                        {sessao.userAgent ?? 'Dispositivo desconhecido'}
                      </span>
                      {sessao.atual && (
                        <span className="badge badge-sucesso shrink-0">Esta sessão</span>
                      )}
                    </p>
                    <p className="legenda texto-fraco">
                      {sessao.ip ?? 'IP desconhecido'} · desde{' '}
                      {formatarDataHora(sessao.criadoEm)}
                    </p>
                  </div>
                  {!sessao.atual && (
                    <button
                      type="button"
                      onClick={() => aoEncerrarUma(sessao.idSessao)}
                      disabled={encerrando === sessao.idSessao}
                      aria-label="Encerrar sessão"
                      className="dica shrink-0 w-8 h-8 rounded-full flex items-center justify-center texto-erro hover-fundo-sutil transition-colors disabled:opacity-60"
                    >
                      <i
                        className={
                          'fa-solid icone-pequeno ' + (encerrando === sessao.idSessao ? 'fa-spinner fa-spin' : 'fa-power-off')
                        } aria-hidden="true"
                      ></i>
                      <Dica texto="Encerrar sessão" curta />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}

// 3. PAPÉIS - só leitura, como sempre foi.
interface AbaPapeisProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch'>;
}

function AbaPapeis({ auth }: AbaPapeisProps) {
  const [papeis, setPapeis] = useState<UsuarioPapelResponse[] | null>(null);

  useEffect(() => {
    if (!auth.usuario) {
      return;
    }
    usuarioPapelApi
      .listarPorUsuario(auth.authFetch, auth.usuario.idUsuario)
      .then(setPapeis)
      .catch(() => setPapeis([]));
  }, [auth.authFetch, auth.usuario]);

  return (
    <div className="px-6 sm:px-8 py-8">
      <p className="paragrafo texto-fraco mb-4">
        O que você é na plataforma, só leitura aqui - pra alterar, um administrador precisa
        fazer isso pelo painel de Usuários.
      </p>
      {papeis === null ? (
        <Carregando />
      ) : papeis.length === 0 ? (
        <EstadoVazio compacto icone="fa-user-tag" titulo="Nenhum papel atribuído." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {papeis.map((papel) => {
            // Papel suspenso não vale até a data: a própria pessoa precisa ver isso aqui, não só descobrir barrada.
            const suspenso = papel.suspensoAte !== null && new Date(papel.suspensoAte) > new Date();
            return (
              <span
                key={papel.idPapel}
                className={'badge gap-1 ' + (suspenso ? 'badge-erro' : 'badge-neutro')}
              >
                {papel.nomePapel}
                {suspenso && (
                  <>
                    <i className="fa-solid fa-clock icone-pequeno" aria-hidden="true"></i>
                    suspenso até {formatarDataHora(papel.suspensoAte)}
                  </>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 5. PRIVACIDADE - última aba de propósito (ação destrutiva nunca na
// primeira). Exportar dados (LGPD Art. 18) baixa o pacote de GET
// /usuario/eu/exportar-dados como arquivo JSON; excluir conta reaproveita
// excluir_conta_usuario() (03_funcoes_seguranca.sql, [03-O]), que já
// valida que só o próprio dono (ou quem tem usuario_excluir) pode chamar.
interface AbaPrivacidadeProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch' | 'logout'>;
}

function AbaPrivacidade({ auth }: AbaPrivacidadeProps) {
  const navigate = useNavigate();
  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });

  const confirmado = auth.usuario && confirmacaoConfere(confirmacao, auth.usuario.email);
  const { mostrar } = useToast();
  const { erro: erroExportar, reportarErro: reportarErroExportar } = useErroToast({ mostraTexto: true });
  const { ocupado: exportando, executar: executarExportando } = useEnvio(reportarErroExportar);

  const aoExportar = async () => {
    await executarExportando(async () => {
      const pacote = await usuarioApi.exportarMeusDados(auth.authFetch);
      const arquivo = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(arquivo);
      link.download = `meus-dados-crowdacademico-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      mostrar('Seus dados foram exportados.', 'O arquivo foi baixado pelo navegador.');
    });
  };

  const aoExcluir = async () => {
    if (!auth.usuario) {
      return;
    }
    limparErro();
    setExcluindo(true);
    try {
      await usuarioApi.remover(auth.authFetch, auth.usuario.idUsuario);
      void auth.logout();
      void navigate('/');
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      setExcluindo(false);
    }
  };

  return (
    <div className="px-6 sm:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-lg border borda-padrao p-4">
        <div>
          <p className="paragrafo enfase texto-padrao">Exportar meus dados</p>
          <p className="legenda texto-fraco">
            Direito de portabilidade (LGPD Art. 18): baixa um arquivo com os dados da sua conta. Uma vez por
            hora.
          </p>
          <MensagemErro texto={erroExportar} className="legenda enfase erro-campo" />
        </div>
        <button type="button" onClick={() => void aoExportar()} disabled={exportando} className="btn btn-secondary">
          {exportando ? 'Exportando...' : 'Exportar'}
        </button>
      </div>

      <div className="rounded-lg border borda-forte fundo-erro p-4">
        <p className="paragrafo enfase texto-erro mb-2">Excluir minha conta</p>
        <p className="legenda texto-erro mb-3">
          Marca sua conta como excluída (exclusão lógica), o login para de funcionar na hora.
          Não existe desfazer pelo painel.
        </p>
        <MensagemErro texto={erro} className="legenda enfase texto-erro mb-2" />
        <div className="mb-3">
          <ConfirmacaoDigitada
            oQue="o e-mail"
            esperado={auth.usuario?.email ?? ''}
            valor={confirmacao}
            aoMudar={setConfirmacao}
            classeRotulo="texto-erro"
          />
        </div>
        <button
          type="button"
          onClick={aoExcluir}
          disabled={!confirmado || excluindo}
          className="btn btn-danger"
        >
          {excluindo ? 'Excluindo...' : 'Excluir minha conta'}
        </button>
      </div>
    </div>
  );
}
