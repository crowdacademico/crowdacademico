import { useId, useState } from 'react';
import { BotaoGoogle } from '../../components/auth/botao-google';
import { LOGIN_GOOGLE_DISPONIVEL } from '../../services/3-auth/util/google-identity.util';
import { MENSAGEM_NOME_CURTO, NOME_MINIMO_CARACTERES } from '../../services/constant/constants/minimos.constants';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ModalTermo } from '../../components/crud/modal-termo';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Campo } from '../../components/input/campo';
import { CampoCpf } from '../../components/input/campo-cpf';
import { BotaoMostrarSenha } from '../../components/input/botao-mostrar-senha';
import { MedidorSenha } from '../../components/input/medidor-senha';
import { CamposVinculoPerfil } from '../6-perfil-pesquisador/campos-vinculo-perfil';
import { CamposChavePix } from '../24-conta-recebimento/campos-chave-pix';
import { salvarChavePixDoNovoPesquisador } from '../24-conta-recebimento/salvar-chave-pix';
import type { TipoChavePix } from '../../services/constant/type/enums-do-banco.gerado';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ErroHttp } from '../../services/constant/api/http.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TermoUsoResponseActive } from '../../services/5-termo-uso/type/termo-uso.type';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { emailValido } from '../../services/constant/util/validacao.util';
import { SENHA_MINIMO_CARACTERES } from '../../services/3-auth/constants/senha.constants';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';

type TipoConta = 'apoiador' | 'pesquisador';
type CampoTocado = 'nome' | 'email' | 'senha' | 'confirmar';
type TipoTermoCadastro = 'cadastro' | 'upgrade_pesquisador';

const TIPOS_CONTA: { chave: TipoConta; titulo: string; descricao: string; icone: string }[] = [
  {
    chave: 'apoiador',
    titulo: 'Quero apoiar',
    descricao: 'Apoie campanhas de pesquisa e acompanhe os resultados.',
    icone: 'fa-hand-holding-heart',
  },
  {
    chave: 'pesquisador',
    titulo: 'Sou pesquisador',
    descricao: 'Crie seu perfil acadêmico e publique campanhas de pesquisa.',
    icone: 'fa-flask',
  },
];

function cpfValido(cpf: string): boolean {
  const digitos = cpf.replace(/\D/g, '');
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  const calcularDigito = (base: string, pesoInicial: number) => {
    const soma = [...base].reduce((total, digito, indice) => (
      total + Number(digito) * (pesoInicial - indice)
    ), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcularDigito(digitos.slice(0, 9), 10) === Number(digitos[9]) &&
    calcularDigito(digitos.slice(0, 10), 11) === Number(digitos[10]);
}

export function CadastroPage({ auth }: PropsPagina) {
  const { mostrar: mostrarAviso } = useToast();
  const navigate = useNavigate();
  const [passo, setPasso] = useState<1 | 2>(1);
  const [tipoConta, setTipoConta] = useState<TipoConta | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [cpf, setCpf] = useState('');
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo>('institucional');
  const [vinculoInstitucional, setVinculoInstitucional] = useState('');
  const [tituloAcademico, setTituloAcademico] = useState<TituloAcademico>('mestre');
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aceiteTermosPesquisador, setAceiteTermosPesquisador] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });

  // "Tocado" (blur), não a cada tecla: validar enquanto a pessoa ainda está digitando o e-mail acusa erro antes
  // de ela terminar de escrever.
  const [tocado, setTocado] = useState<Record<CampoTocado, boolean>>({
    nome: false,
    email: false,
    senha: false,
    confirmar: false,
  });
  const marcarTocado = (campo: CampoTocado) => setTocado((atual) => ({ ...atual, [campo]: true }));

  const [erroEmailDuplicado, setErroEmailDuplicado] = useState(false);
  const [modalTermoAberto, setModalTermoAberto] = useState(false);
  const [tipoTermoModal, setTipoTermoModal] = useState<TipoTermoCadastro>('cadastro');
  const [erroTipoConta, setErroTipoConta] = useState('');
  const [perfilPesquisadorPendente, setPerfilPesquisadorPendente] = useState(false);
  const [tokenVerificacaoEmailDev, setTokenVerificacaoEmailDev] = useState<string | null>(null);
  const [termos, setTermos] = useState<Partial<Record<TipoTermoCadastro, TermoUsoResponseActive>>>({});
  const idErroTermos = useId();
  const idErroTermosPesquisador = useId();
  const [carregandoTermo, setCarregandoTermo] = useState(false);
  // A sessão abre no meio do cadastro (antes do perfil de pesquisador e da chave Pix): quem se cadastrou AQUI continua
  // na tela; quem já chegou logado é levado embora (abaixo, antes do return).
  const [cadastrouAqui, setCadastrouAqui] = useState(false);

  const abrirTermos = (tipo: TipoTermoCadastro) => {
    setModalTermoAberto(true);
    setTipoTermoModal(tipo);
    if (!termos[tipo]) {
      setCarregandoTermo(true);
      termoUsoApi.buscarAtivo(tipo)
        .then((termoAtivo) => setTermos((atuais) => ({ ...atuais, [tipo]: termoAtivo })))
        .catch(reportarErro)
        .finally(() => setCarregandoTermo(false));
    }
  };

  const emailEhValido = emailValido(email);
  const senhasIguais = senha.length > 0 && senha === confirmarSenha;
  const { erroDe, tentarEnviar, limpar: esquecerTentativa } = useErrosFormulario(() => ({
    nome: nome.trim().length < NOME_MINIMO_CARACTERES && MENSAGEM_NOME_CURTO,
    email: email.trim() === '' ? 'Informe o e-mail.' : !emailEhValido && 'E-mail inválido.',
    senha: senha.length < SENHA_MINIMO_CARACTERES && `A senha precisa ter pelo menos ${SENHA_MINIMO_CARACTERES} caracteres.`,
    confirmar: confirmarSenha === '' ? 'Confirme a senha.' : !senhasIguais && 'As senhas não são iguais.',
    termos: !aceiteTermos && 'É preciso aceitar o Termo de Uso para criar a conta.',
    cpf: tipoConta === 'pesquisador' && !cpfValido(cpf) && 'Informe um CPF válido.',
    vinculoInstitucional:
      tipoConta === 'pesquisador' &&
      tipoVinculo === 'institucional' &&
      !vinculoInstitucional.trim() &&
      'Informe a instituição.',
    termosPesquisador:
      tipoConta === 'pesquisador' &&
      !aceiteTermosPesquisador &&
      'É preciso aceitar o Termo de Uso do pesquisador.',
  }));

  // A chave Pix é opcional aqui (16-11-2026, pedido da Alexia): salva logo depois do perfil, que dá o CPF para conferir
  // a titularidade. Se falhar, a conta e o perfil continuam criados (salvarChavePixDoNovoPesquisador só avisa).
  const [tipoChavePix, setTipoChavePix] = useState<TipoChavePix>('cpf');
  const [chavePix, setChavePix] = useState('');
  const salvarChavePix = () => salvarChavePixDoNovoPesquisador(auth.authFetch, tipoChavePix, chavePix, mostrarAviso);

  const criarPerfilPesquisador = async () => {
    await perfilPesquisadorApi.criar(auth.authFetch, {
      cpf,
      tipoVinculo,
      vinculoInstitucional: tipoVinculo === 'institucional' ? vinculoInstitucional.trim() : undefined,
      tituloAcademico,
      aceiteTermos: true,
    });
  };

  const concluirCadastro = (tokenDev: string | null) => {
    if (tokenDev) {
      window.alert(
        '[SÓ EM DEV] Link de verificação de e-mail (nenhum e-mail é enviado ainda):\n\n' +
          `${window.location.origin}/verificar-email?token=${tokenDev}`,
      );
    }
    // Antes a pessoa caía na Home sem aviso nenhum (16-11-2026).
    mostrarAviso('Conta criada!', `Enviamos um link de confirmação para ${email}. Abra o e-mail para confirmar o endereço.`, 'sucesso');
    void navigate('/');
  };

  // Voltar ao passo 1 (para trocar entre apoiador e pesquisador) esquece a tentativa de envio: o que foi digitado fica,
  // mas o vermelho dos campos só volta numa tentativa nova (16-11-2026: os erros ficavam pintados ao voltar).
  const retornarAoPassoUm = () => {
    setPasso(1);
    setErroTipoConta('');
    esquecerTentativa();
    setTocado({ nome: false, email: false, senha: false, confirmar: false });
    setErroEmailDuplicado(false);
    limparErro();
  };

  const aoCadastrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (passo === 1) {
      if (!tipoConta) {
        setErroTipoConta('Selecione como deseja usar a plataforma.');
        return;
      }
      setErroTipoConta('');
      setPasso(2);
      return;
    }

    if (perfilPesquisadorPendente) {
      setEnviando(true);
      limparErro();
      try {
        await criarPerfilPesquisador();
        await salvarChavePix();
        concluirCadastro(tokenVerificacaoEmailDev);
      } catch (erroPerfil) {
        reportarErro(new Error(
          `A conta foi criada, mas não foi possível concluir o perfil de pesquisador. Tente novamente: ${
            erroPerfil instanceof Error ? erroPerfil.message : 'erro desconhecido'
          }`,
        ));
      } finally {
        setEnviando(false);
      }
      return;
    }

    if (!tentarEnviar()) {
      return;
    }
    limparErro();
    setErroEmailDuplicado(false);
    setEnviando(true);
    try {
      if (tipoConta === 'pesquisador' && !termos.upgrade_pesquisador) {
        const termoPesquisador = await termoUsoApi.buscarAtivo('upgrade_pesquisador');
        setTermos((atuais) => ({ ...atuais, upgrade_pesquisador: termoPesquisador }));
      }
      setCadastrouAqui(true);
      const resultado = await auth.cadastrar(nome, email, senha, aceiteTermos);
      setTokenVerificacaoEmailDev(resultado.tokenVerificacaoEmailDev);
      if (tipoConta === 'pesquisador') {
        try {
          await criarPerfilPesquisador();
        } catch (erroPerfil) {
          setPerfilPesquisadorPendente(true);
          reportarErro(new Error(
            `A conta foi criada, mas não foi possível concluir o perfil de pesquisador. Tente novamente nesta tela: ${
              erroPerfil instanceof Error ? erroPerfil.message : 'erro desconhecido'
            }`,
          ));
          return;
        }
      }
      if (tipoConta === 'pesquisador') await salvarChavePix();
      concluirCadastro(resultado.tokenVerificacaoEmailDev);
    } catch (erroRequisicao) {
      if (erroRequisicao instanceof ErroHttp && erroRequisicao.status === 409) {
        setErroEmailDuplicado(true);
      }
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  // O Google entregou o ID token (18-11-2026): a conta é criada (ou, se o e-mail já tem conta, a pessoa entra nela) e
  // a tela do aceite do Termo de Uso aparece na página inicial antes de qualquer outra coisa.
  const aoCadastrarComGoogle = (credential: string) => {
    limparErro();
    setCadastrouAqui(true);
    setEnviando(true);
    auth
      .entrarComGoogle(credential, false)
      .then(() => void navigate('/'))
      .catch((erroGoogle: unknown) => {
        setCadastrouAqui(false);
        reportarErro(erroGoogle);
      })
      .finally(() => setEnviando(false));
  };

  // Quem já chega com a sessão aberta não cria outra conta por cima da sua (16-11-2026): vai para a página inicial.
  if (!auth.carregando && auth.usuario && !cadastrouAqui) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="pagina-centralizada auth-cadastro">
      <section className="auth-cadastro__cartao w-full max-w-2xl fundo-cartao rounded-2xl sombra-cartao-solto border borda-padrao overflow-hidden" aria-labelledby="titulo-cadastro">
        <header className="p-8 pb-0">
          <h1 id="titulo-cadastro" className="titulo-secao mb-1">Criar conta</h1>
          <p className="text-sm texto-fraco mb-6">
            Já tem conta? <Link to="/login" className="texto-marca font-bold hover:underline">Entrar</Link>
          </p>
          <p className="sr-only">Etapa {passo} de 2</p>
          <div className="flex items-center gap-2 mb-8" aria-hidden="true">
            {[1, 2].map((numero) => (
              <span
                key={numero}
                aria-current={passo === numero ? 'step' : undefined}
                className={`flex-1 h-1.5 rounded-full ${numero <= passo ? 'fundo-marca' : 'fundo-sutil'}`}
              />
            ))}
          </div>
        </header>

        <form id="form-cadastro" onSubmit={aoCadastrar} noValidate className="px-8 pb-4 space-y-5">
          <MensagemErro texto={erro || (perfilPesquisadorPendente
            ? 'A conta foi criada, mas o perfil de pesquisador ainda não foi concluído. Tente novamente.'
            : undefined)} />

          {passo === 1 ? (
            <div>
              <h2 className="subtitulo texto-forte mb-4">Como você quer usar a plataforma?</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {TIPOS_CONTA.map((tipo) => {
                  const selecionado = tipoConta === tipo.chave;
                  return (
                    <button
                      type="button"
                      key={tipo.chave}
                      aria-pressed={selecionado}
                      onClick={() => {
                        setTipoConta(tipo.chave);
                        setErroTipoConta('');
                      }}
                      className={`relative p-5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        selecionado
                          ? 'borda-marca fundo-sutil shadow-md ring-2 ring-(--cor-marca)/20'
                          : 'borda-padrao fundo-cartao hover-fundo-sutil hover-borda-forte'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span
                          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                            selecionado
                              ? 'fundo-marca-forte texto-sobre-cor'
                              : 'fundo-sutil texto-marca'
                          }`}
                        >
                          <i className={`fa-solid ${tipo.icone} icone-grande`} aria-hidden="true" />
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selecionado
                              ? 'borda-marca fundo-marca-forte texto-sobre-cor'
                              : 'borda-padrao'
                          }`}
                          aria-hidden="true"
                        >
                          {selecionado && <i className="fa-solid fa-check icone-pequeno" />}
                        </span>
                      </div>
                      <div>
                        <span className="subtitulo texto-forte block mb-1">{tipo.titulo}</span>
                        <span className="block paragrafo texto-fraco">{tipo.descricao}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {erroTipoConta && <p className="legenda enfase erro-campo mt-3" role="alert">{erroTipoConta}</p>}

              {/* Cadastro com Google (18-11-2026): cria a conta de apoiador com o e-mail já confirmado pelo Google, sem
                  senha. Antes de usar o sistema, a pessoa aceita o Termo de Uso (RF-015). Ser pesquisador continua pelo
                  caminho normal (CPF, Termo de Pesquisador), em Minha Conta > "Tornar-me pesquisador". */}
              {LOGIN_GOOGLE_DISPONIVEL && (
                <div className="mt-6 space-y-3">
                  <div className="relative flex items-center">
                    <div className="flex-grow border-t-2 borda-padrao"></div>
                    <span className="rotulo-leitura flex-shrink-0 mx-4 texto-fraco">Ou crie a conta com</span>
                    <div className="flex-grow border-t-2 borda-padrao"></div>
                  </div>
                  <BotaoGoogle contexto="signup" aoReceberToken={aoCadastrarComGoogle} aoFalhar={reportarErro} />
                  <p className="legenda texto-fraco text-center">
                    Pelo Google, a conta nasce como apoiador. Para ser pesquisador, use depois "Tornar-me pesquisador", em Minha Conta.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="paragrafo texto-fraco">
                {tipoConta === 'pesquisador'
                  ? 'Informe seus dados de acesso e os dados necessários para criar seu perfil acadêmico.'
                  : 'Informe seus dados para criar sua conta de apoiador.'}
              </p>

          <Campo obrigatorio rotulo="Nome" erro={erroDe('nome') ?? (tocado.nome && nome.trim().length < NOME_MINIMO_CARACTERES && MENSAGEM_NOME_CURTO)}>
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                onBlur={() => marcarTocado('nome')}
                className={'input-padrao' + classeErro}
                placeholder="Seu nome"
                autoComplete="name"
              />
            )}
          </Campo>

          <Campo
            obrigatorio
            rotulo="E-mail"
            erro={
              erroEmailDuplicado ? (
                <>
                  Já existe conta com este e-mail.{' '}
                  <Link to="/login" className="link-texto link-texto--cor-herdada">
                    Já tem conta? Entrar
                  </Link>
                </>
              ) : (
                erroDe('email') ?? (tocado.email && email.length > 0 && !emailEhValido && 'E-mail inválido.')
              )
            }
          >
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type="email"
                value={email}
                onChange={(evento) => {
                  setEmail(evento.target.value);
                  setErroEmailDuplicado(false);
                }}
                onBlur={() => marcarTocado('email')}
                className={'input-padrao' + classeErro}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            )}
          </Campo>

          {tipoConta === 'pesquisador' && (
            <section className="space-y-5">
              <h2 className="titulo-bloco titulo-bloco--linha">Dados do perfil de pesquisador</h2>
              <CampoCpf
                valor={cpf}
                onChange={setCpf}
                erro={erroDe('cpf')}
                obrigatorio
              />
              <CamposVinculoPerfil
                tipoVinculo={tipoVinculo}
                vinculoInstitucional={vinculoInstitucional}
                tituloAcademico={tituloAcademico}
                rotuloVinculoInstitucional="Instituição"
                aoAlterarTipoVinculo={setTipoVinculo}
                aoAlterarVinculoInstitucional={setVinculoInstitucional}
                aoAlterarTituloAcademico={setTituloAcademico}
                erroVinculoInstitucional={erroDe('vinculoInstitucional')}
                marcarObrigatorios
              />
              <CamposChavePix
                tipoChave={tipoChavePix}
                aoAlterarTipo={setTipoChavePix}
                chave={chavePix}
                aoAlterarChave={setChavePix}
                opcional
              />
              <p className="legenda texto-fraco">Os links acadêmicos podem ser informados depois, no seu perfil.</p>
            </section>
          )}

          <Campo obrigatorio rotulo="Senha" erro={erroDe('senha')}>
            {({ atributos, classeErro }) => (
              <>
                <div className="relative">
                  <input
                    {...atributos}
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(evento) => setSenha(evento.target.value)}
                    onBlur={() => marcarTocado('senha')}
                    className={'input-padrao pr-10' + classeErro}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <BotaoMostrarSenha mostrando={mostrarSenha} aoAlternar={() => setMostrarSenha((atual) => !atual)} />
                </div>

                <MedidorSenha senha={senha} />
              </>
            )}
          </Campo>

          <Campo
            obrigatorio
            rotulo="Confirmar senha"
            erro={erroDe('confirmar') ?? (confirmarSenha.length > 0 && !senhasIguais && 'As senhas não são iguais.')}
            dica={
              confirmarSenha.length > 0 &&
              senhasIguais && (
                <span className="texto-sucesso">
                  <i className="fa-solid fa-circle-check" aria-hidden="true"></i> Senhas conferem.
                </span>
              )
            }
          >
            {/* Em tempo real, não só no blur: comparar com a 1ª senha é o único campo onde "digitando ainda" já
                vale avisar. */}
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(evento) => setConfirmarSenha(evento.target.value)}
                onBlur={() => marcarTocado('confirmar')}
                className={'input-padrao' + classeErro}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            )}
          </Campo>

          <div className="space-y-2">
            <label className="paragrafo flex items-start gap-2.5 texto-padrao">
              <input
                type="checkbox"
                checked={aceiteTermos}
                onChange={(evento) => setAceiteTermos(evento.target.checked)}
                aria-invalid={Boolean(erroDe('termos'))}
                aria-describedby={erroDe('termos') ? idErroTermos : undefined}
                className="mt-0.5"
              />
              <span>
                Li e aceito os{' '}
                <button
                  type="button"
                  onClick={() => abrirTermos('cadastro')}
                  className="link-texto"
                >
                  Termos de Uso
                </button>
                .
              </span>
            </label>
            {erroDe('termos') && (
              <p id={idErroTermos} className="legenda enfase erro-campo">
                {erroDe('termos')}
              </p>
            )}
            {tipoConta === 'pesquisador' && (
              <>
                <label className="paragrafo flex items-start gap-2.5 texto-padrao">
                  <input
                    type="checkbox"
                    checked={aceiteTermosPesquisador}
                    onChange={(evento) => setAceiteTermosPesquisador(evento.target.checked)}
                    aria-invalid={Boolean(erroDe('termosPesquisador'))}
                    aria-describedby={erroDe('termosPesquisador') ? idErroTermosPesquisador : undefined}
                    className="mt-0.5"
                  />
                  <span>
                    Li e aceito os{' '}
                    <button
                      type="button"
                      onClick={() => abrirTermos('upgrade_pesquisador')}
                      className="link-texto"
                    >
                      Termos de Uso do Pesquisador
                    </button>
                    .
                  </span>
                </label>
                {erroDe('termosPesquisador') && (
                  <p id={idErroTermosPesquisador} className="legenda enfase erro-campo">
                    {erroDe('termosPesquisador')}
                  </p>
                )}
              </>
            )}
          </div>
            </>
          )}
        </form>

        <footer className="p-8 pt-4 flex items-center justify-between gap-3">
          {passo === 2 ? (
            <button
              type="button"
              onClick={retornarAoPassoUm}
              className="btn btn-secondary"
              disabled={enviando || perfilPesquisadorPendente}
            >
              Voltar
            </button>
          ) : <span />}
          <button
            type="submit"
            form="form-cadastro"
            disabled={enviando}
            className="btn btn-primary"
          >
            {enviando
              ? perfilPesquisadorPendente ? 'Concluindo perfil...' : 'Criando conta...'
              : passo === 1 ? 'Continuar' : perfilPesquisadorPendente ? 'Concluir perfil de pesquisador' : 'Criar conta'}
          </button>
        </footer>

      {modalTermoAberto && (
        <ModalTermo
          titulo={tipoTermoModal === 'cadastro' ? 'Termo de Uso' : 'Termo de Uso do pesquisador'}
          versao={termos[tipoTermoModal]?.versao}
          conteudo={termos[tipoTermoModal]?.conteudo ?? null}
          carregando={carregandoTermo}
          aoFechar={() => setModalTermoAberto(false)}
          // Concordar marca a caixinha do aceite e fecha; Cancelar só fecha (igual ao X, ao Esc e ao clique fora).
          rodape={
            termos[tipoTermoModal] && (
              <RodapeAcoes
                aoCancelar={() => setModalTermoAberto(false)}
                acao={{
                  rotulo: 'Li e concordo',
                  aoClicar: () => {
                    if (tipoTermoModal === 'cadastro') setAceiteTermos(true);
                    else setAceiteTermosPesquisador(true);
                    setModalTermoAberto(false);
                  },
                }}
              />
            )
          }
        />
      )}
      </section>
    </div>
  );
}
