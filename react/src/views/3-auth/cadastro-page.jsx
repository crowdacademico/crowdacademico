import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { buscarAtivo } from '../../services/5-termo-uso/api/termo-uso.api';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Requisitos do medidor de força de senha (09-08-2026, Bloco D do prompt do
// Claude Web) — só GUIA visual, o piso de verdade continua sendo o backend
// (CadastroRequestDto, @MinLength(8)): não faz sentido bloquear o clique
// aqui por maiúscula/número/símbolo se o servidor aceitaria com menos.
const REQUISITOS_SENHA = [
  { chave: 'tamanho', rotulo: 'Pelo menos 8 caracteres', testar: (s) => s.length >= 8 },
  { chave: 'maiuscula', rotulo: 'Uma letra maiúscula', testar: (s) => /[A-Z]/.test(s) },
  { chave: 'numero', rotulo: 'Um número', testar: (s) => /[0-9]/.test(s) },
  {
    chave: 'simbolo',
    rotulo: 'Um símbolo (!@#$...)',
    testar: (s) => /[^A-Za-z0-9]/.test(s),
  },
];

// Tela de cadastro público (09-08-2026, Bloco D do prompt do Claude Web) —
// primeira tela pública de verdade além de login. Só os 5 campos que
// importam pra criar a conta (nome/e-mail/senha/confirmar/aceite) — o
// resto (foto, perfil acadêmico...) mora em Minha Conta, editável depois,
// pra não derrubar a conversão do cadastro em si.
export function CadastroPage({ auth }) {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast();

  // "Tocado" (blur), não a cada tecla (09-08-2026, pedido explícito do
  // Claude Web: validar enquanto a pessoa ainda está digitando o e-mail
  // acusa erro antes de ela terminar de escrever).
  const [tocado, setTocado] = useState({ nome: false, email: false, senha: false, confirmar: false });
  const marcarTocado = (campo) => setTocado((atual) => ({ ...atual, [campo]: true }));

  const [erroEmailDuplicado, setErroEmailDuplicado] = useState(false);
  const [modalTermoAberto, setModalTermoAberto] = useState(false);
  const [termo, setTermo] = useState(null);
  const [carregandoTermo, setCarregandoTermo] = useState(false);

  const abrirTermos = () => {
    setModalTermoAberto(true);
    if (!termo) {
      setCarregandoTermo(true);
      buscarAtivo()
        .then(setTermo)
        .catch(() => setTermo(null))
        .finally(() => setCarregandoTermo(false));
    }
  };

  const emailValido = REGEX_EMAIL.test(email);
  const senhasIguais = senha.length > 0 && senha === confirmarSenha;
  const requisitosCumpridos = REQUISITOS_SENHA.filter((r) => r.testar(senha)).length;
  const formularioValido =
    nome.trim().length >= 2 && emailValido && senha.length >= 8 && senhasIguais && aceiteTermos;

  const aoCadastrar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setErroEmailDuplicado(false);
    setEnviando(true);
    try {
      const resultado = await auth.cadastrar(nome, email, senha, aceiteTermos);
      if (resultado.tokenVerificacaoEmailDev) {
        // Ambiente sem 4-mail ainda — link de verificação exibido direto,
        // com aviso claro de que é só dev (ver auth.service.cadastro.ts).
        window.alert(
          '[SÓ EM DEV] Link de verificação de e-mail (nenhum e-mail é enviado ainda):\n\n' +
            `${window.location.origin}/verificar-email?token=${resultado.tokenVerificacaoEmailDev}`,
        );
      }
      navigate('/');
    } catch (erroRequisicao) {
      if (erroRequisicao.status === 409) {
        setErroEmailDuplicado(true);
      }
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 fundo-pagina">
      <div className="max-w-md w-full max-h-[calc(100vh-2rem)] fundo-cartao rounded-3xl shadow-2xl border borda-padrao overflow-hidden flex flex-col">
        <div className="p-10 text-center border-b borda-padrao fundo-sutil shrink-0">
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-user-plus"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold texto-forte mb-2">Criar conta</h2>
          <p className="text-sm texto-fraco font-medium">
            Leva menos de um minuto, o resto você completa depois, em Minha Conta.
          </p>
        </div>

        <form
          id="form-cadastro"
          onSubmit={aoCadastrar}
          className="p-10 space-y-5 overflow-y-auto min-h-0 flex-1"
        >
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div>
            <label className="rotulo-campo">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              onBlur={() => marcarTocado('nome')}
              className="input-padrao"
              placeholder="Seu nome"
              autoComplete="name"
            />
            {tocado.nome && nome.trim().length < 2 && (
              <p className="text-xs texto-erro mt-1">Nome precisa ter pelo menos 2 caracteres.</p>
            )}
          </div>

          <div>
            <label className="rotulo-campo">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(evento) => {
                setEmail(evento.target.value);
                setErroEmailDuplicado(false);
              }}
              onBlur={() => marcarTocado('email')}
              className="input-padrao"
              placeholder="seu@email.com"
              autoComplete="email"
            />
            {tocado.email && email.length > 0 && !emailValido && (
              <p className="text-xs texto-erro mt-1">E-mail inválido.</p>
            )}
            {erroEmailDuplicado && (
              <p className="text-xs texto-erro mt-1">
                Já existe conta com este e-mail.{' '}
                <Link to="/login" className="font-bold underline">
                  Já tem conta? Entrar
                </Link>
              </p>
            )}
          </div>

          <div>
            <label className="rotulo-campo">Senha</label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                onBlur={() => marcarTocado('senha')}
                className="input-padrao pr-10"
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

            {/* Medidor de força — barra + requisitos marcados conforme
                cumpridos, não uma mensagem de erro só depois do submit. */}
            {senha.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {REQUISITOS_SENHA.map((r, indice) => (
                    <div
                      key={r.chave}
                      className={
                        'h-1 flex-1 rounded-full ' +
                        (indice < requisitosCumpridos ? 'bg-primary' : 'fundo-sutil')
                      }
                    ></div>
                  ))}
                </div>
                <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {REQUISITOS_SENHA.map((r) => {
                    const cumprido = r.testar(senha);
                    return (
                      <li
                        key={r.chave}
                        className={'text-xs flex items-center gap-1.5 ' + (cumprido ? 'texto-sucesso' : 'texto-fraco')}
                      >
                        <i className={'fa-solid ' + (cumprido ? 'fa-circle-check' : 'fa-circle') + ' text-[10px]'}></i>
                        {r.rotulo}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="rotulo-campo">Confirmar senha</label>
            <input
              type={mostrarSenha ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(evento) => setConfirmarSenha(evento.target.value)}
              onBlur={() => marcarTocado('confirmar')}
              className="input-padrao"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {/* Em tempo real, não só no blur — comparar com a 1ª senha é o
                único campo onde "digitando ainda" já vale avisar (pedido
                explícito do Claude Web: "confirmar senha valida em tempo
                real"). */}
            {confirmarSenha.length > 0 && !senhasIguais && (
              <p className="text-xs texto-erro mt-1">As senhas não são iguais.</p>
            )}
            {confirmarSenha.length > 0 && senhasIguais && (
              <p className="text-xs texto-sucesso mt-1">
                <i className="fa-solid fa-circle-check"></i> Senhas conferem.
              </p>
            )}
          </div>

          <label className="flex items-start gap-2.5 text-sm texto-padrao">
            <input
              type="checkbox"
              checked={aceiteTermos}
              onChange={(evento) => setAceiteTermos(evento.target.checked)}
              className="mt-0.5"
            />
            <span>
              Li e aceito os{' '}
              <button
                type="button"
                onClick={abrirTermos}
                className="text-primary font-bold underline"
              >
                Termos de Uso
              </button>
              .
            </span>
          </label>
        </form>

        <div className="p-6 border-t borda-padrao fundo-cartao shrink-0 space-y-3">
          <button
            type="submit"
            form="form-cadastro"
            disabled={!formularioValido || enviando}
            className="btn btn-primary w-full py-3.5 text-sm"
          >
            {enviando ? 'Criando conta...' : 'Criar conta'}
          </button>
          <p className="text-xs texto-fraco text-center">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary font-bold underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>

      {modalTermoAberto && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
          onClick={() => setModalTermoAberto(false)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] fundo-elevado rounded-2xl shadow-2xl border borda-forte overflow-hidden flex flex-col"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="px-6 py-4 border-b borda-padrao flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold texto-forte">Termos de Uso</p>
                {termo && <p className="text-xs texto-fraco">Versão {termo.versao}</p>}
              </div>
              <button
                type="button"
                onClick={() => setModalTermoAberto(false)}
                aria-label="Fechar"
                className="texto-fraco hover-texto-forte"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto text-sm texto-padrao whitespace-pre-line">
              {carregandoTermo ? 'Carregando...' : (termo?.conteudo ?? 'Não foi possível carregar os termos.')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
