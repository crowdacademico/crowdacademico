import { useId, useState } from 'react';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { TelaCheia } from '../../components/crud/tela-cheia';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Campo } from '../../components/input/campo';
import { MedidorSenha } from '../../components/input/medidor-senha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ErroHttp } from '../../services/constant/api/http.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TermoUsoResponseActive } from '../../services/5-termo-uso/type/termo-uso.type';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { emailValido } from '../../services/constant/util/validacao.util';


type CampoTocado = 'nome' | 'email' | 'senha' | 'confirmar';

// Tela de cadastro público: a primeira tela pública de verdade além de login. Só os 5 campos que importam para
// criar a conta (nome/e-mail/senha/confirmar/aceite); o resto (foto, perfil acadêmico...) mora em Minha Conta,
// editável depois, para não derrubar a conversão do cadastro em si.
export function CadastroPage({ auth }: PropsPagina) {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);
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
  // Termo no modal padrão (largo), com "Tela cheia" ao lado do X.
  const [termoTelaCheia, setTermoTelaCheia] = useState(false);
  const idErroTermos = useId();
  const [termo, setTermo] = useState<TermoUsoResponseActive | null>(null);
  const [carregandoTermo, setCarregandoTermo] = useState(false);

  const abrirTermos = () => {
    setModalTermoAberto(true);
    if (!termo) {
      setCarregandoTermo(true);
      termoUsoApi.buscarAtivo('cadastro')
        .then(setTermo)
        .catch(() => setTermo(null))
        .finally(() => setCarregandoTermo(false));
    }
  };

  const emailEhValido = emailValido(email);
  const senhasIguais = senha.length > 0 && senha === confirmarSenha;
  // "Criar conta" fica sempre clicável: clicando com algo faltando, cada campo mostra o próprio erro (inclusive o
  // aceite dos Termos, que antes só deixava o botão cinza sem dizer por quê).
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    nome: nome.trim().length < 2 && 'Nome precisa ter pelo menos 2 caracteres.',
    email: email.trim() === '' ? 'Informe o e-mail.' : !emailEhValido && 'E-mail inválido.',
    senha: senha.length < 8 && 'A senha precisa ter pelo menos 8 caracteres.',
    confirmar: confirmarSenha === '' ? 'Confirme a senha.' : !senhasIguais && 'As senhas não são iguais.',
    termos: !aceiteTermos && 'É preciso aceitar o Termo de Uso para criar a conta.',
  }));

  const aoCadastrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!tentarEnviar()) {
      return;
    }
    limparErro();
    setErroEmailDuplicado(false);
    setEnviando(true);
    try {
      const resultado = await auth.cadastrar(nome, email, senha, aceiteTermos);
      if (resultado.tokenVerificacaoEmailDev) {
        // Ambiente sem 4-mail ainda - link de verificação exibido direto,
        // com aviso claro de que é só dev (ver auth.service.register.ts).
        window.alert(
          '[SÓ EM DEV] Link de verificação de e-mail (nenhum e-mail é enviado ainda):\n\n' +
            `${window.location.origin}/verificar-email?token=${resultado.tokenVerificacaoEmailDev}`,
        );
      }
      void navigate('/');
    } catch (erroRequisicao) {
      if (erroRequisicao instanceof ErroHttp && erroRequisicao.status === 409) {
        setErroEmailDuplicado(true);
      }
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pagina-centralizada">
      <div className="max-w-md w-full max-h-(--altura-cartao-solto) fundo-cartao rounded-3xl sombra-cartao-solto border borda-padrao overflow-hidden flex flex-col">
        {/* `isolate` + `-z-10`: o brilho verde (o mesmo do Login) fica atrás do ícone e do texto sem precisar de
            z-index em cada um. */}
        <div className="p-10 text-center border-b borda-padrao fundo-sutil shrink-0 relative isolate overflow-hidden">
          <div
            className="pointer-events-none absolute -z-10 top-0 left-1/2 -translate-x-1/2 w-32 h-32 brilho-marca brilho-marca-forte rounded-full blur-3xl"
          ></div>
          <div className="w-14 h-14 fundo-marca rounded-2xl mx-auto flex items-center justify-center texto-sobre-cor icone-destaque mb-5 shadow-lg">
            <i className="fa-solid fa-user-plus"></i>
          </div>
          <h1 className="titulo-pagina mb-2">Criar conta</h1>
          <p className="paragrafo texto-fraco">
            Leva menos de um minuto, o resto você completa depois, em Minha Conta.
          </p>
        </div>

        <form
          id="form-cadastro"
          onSubmit={aoCadastrar}
          className="p-10 space-y-5 overflow-y-auto min-h-0 flex-1"
        >
          <MensagemErro texto={erro} />

          <Campo rotulo="Nome" erro={erroDe('nome') ?? (tocado.nome && nome.trim().length < 2 && 'Nome precisa ter pelo menos 2 caracteres.')}>
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
            rotulo="E-mail"
            erro={
              erroEmailDuplicado ? (
                <>
                  Já existe conta com este e-mail.{' '}
                  <Link to="/login" className="enfase underline">
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

          <Campo rotulo="Senha" erro={erroDe('senha')}>
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
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((atual) => !atual)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 texto-fraco hover-texto-forte"
                  >
                    <i className={'fa-solid ' + (mostrarSenha ? 'fa-eye-slash' : 'fa-eye')}></i>
                  </button>
                </div>

                <MedidorSenha senha={senha} />
              </>
            )}
          </Campo>

          <Campo
            rotulo="Confirmar senha"
            erro={erroDe('confirmar') ?? (confirmarSenha.length > 0 && !senhasIguais && 'As senhas não são iguais.')}
            dica={
              confirmarSenha.length > 0 &&
              senhasIguais && (
                <span className="texto-sucesso">
                  <i className="fa-solid fa-circle-check"></i> Senhas conferem.
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

          <div>
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
                  onClick={abrirTermos}
                  className="texto-marca enfase underline"
                >
                  Termo de Uso
                </button>
                .
              </span>
            </label>
            {erroDe('termos') && (
              <p id={idErroTermos} className="legenda-destaque texto-erro mt-1">
                {erroDe('termos')}
              </p>
            )}
          </div>
        </form>

        <div className="p-6 border-t borda-padrao fundo-cartao shrink-0 space-y-3">
          <button
            type="submit"
            form="form-cadastro"
            disabled={enviando}
            className="btn btn-primary btn-destaque w-full py-3.5"
          >
            {enviando ? 'Criando conta...' : 'Criar conta'}
          </button>
          <p className="legenda texto-fraco text-center">
            Já tem conta?{' '}
            <Link to="/login" className="texto-marca enfase underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>

      {modalTermoAberto && (
        <ModalFicha
          titulo="Termo de Uso"
          subtitulo={termo ? `Versão ${termo.versao}` : undefined}
          carregando={carregandoTermo}
          variasTelas
          aoFechar={() => setModalTermoAberto(false)}
          // Concordar marca a caixinha do aceite e fecha; Cancelar só fecha (igual ao X, ao Esc e ao clique fora).
          rodape={
            termo && (
              <RodapeAcoes
                aoCancelar={() => setModalTermoAberto(false)}
                acao={{
                  rotulo: 'Li e concordo',
                  aoClicar: () => {
                    setAceiteTermos(true);
                    setModalTermoAberto(false);
                  },
                }}
              />
            )
          }
          acoesCabecalho={
            termo && (
              <button type="button" onClick={() => setTermoTelaCheia(true)} className="btn-pilula btn-pilula-rotulo">
                <i className="fa-solid fa-expand"></i> Tela cheia
              </button>
            )
          }
        >
          <TelaCheia
            ativa={termoTelaCheia}
            titulo={`Termo de Uso - versão ${termo?.versao ?? ''}`}
            aoSair={() => setTermoTelaCheia(false)}
          >
            <div className="flex-1 overflow-y-auto paragrafo texto-padrao whitespace-pre-line">
              {termo?.conteudo ?? 'Não foi possível carregar o Termo de Uso.'}
            </div>
          </TelaCheia>
        </ModalFicha>
      )}
    </div>
  );
}
