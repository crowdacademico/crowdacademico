import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

// Primeira de um padrão que vai se repetir: view própria por operação
// (criar/alterar/consultar/excluir), não formulário embutido dentro da
// listagem — mesmo padrão do modelo de referência (hotel: Criar.tsx/
// Alterar.tsx/Consultar.tsx/Excluir.tsx, um arquivo por operação).
export function CriarUsuario({ auth }) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // Foto de perfil (módulo 25-arquivo) — OPCIONAL na criação. O upload
  // acontece na hora (SeletorFotoPerfil já sobe e confirma o arquivo antes
  // de devolver o id), então aqui só guardamos o id_arquivo já confirmado
  // pra mandar junto do POST /usuario quando existir. Sem foto escolhida,
  // idImagemPerfil fica null e o campo nem entra no corpo da requisição —
  // usuário nasce usando o avatar padrão do sistema (ver
  // ArquivoServiceResolverAvatar).
  const [idImagemPerfil, setIdImagemPerfil] = useState(null);
  const [urlImagemPerfil, setUrlImagemPerfil] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const aoCriar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const usuarioCriado = await usuarioApi.criar(auth.authFetch, {
        nome,
        email,
        senha,
        ...(idImagemPerfil !== null ? { idImagemPerfil } : {}),
      });
      mostrar(
        'Usuário cadastrado com sucesso.',
        `O novo usuário possui o ID: ${usuarioCriado.idUsuario}`,
      );
      // ERA navigate('/') (08-08-2026, achado do Lucas: depois que "/"
      // passou a redirecionar pra /admin/dashboard em vez de
      // /admin/usuarios, criar um usuário mandava pra tela errada — o
      // "sucesso" ficava esquisito, sem a pessoa criada nem aparecer).
      // navigate(-1) volta pra onde a pessoa realmente veio (a listagem de
      // Usuários), mesmo padrão já usado por alterar/excluir-usuario.jsx.
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-user-plus"
      titulo="Criar Usuário"
      subtitulo="Preencha os dados abaixo para cadastrar um novo usuário."
    >
      <form onSubmit={aoCriar} className="p-10 space-y-6">
        {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

        {/* Centralizado, acima dos campos de texto — é o primeiro elemento
            visual da ficha, mesmo lugar que ocupará depois em Alterar
            Usuário. authFetch aqui é do ADMIN logado (quem está criando a
            conta), não do usuário novo — faz sentido: o novo usuário ainda
            nem existe no banco no momento do upload, id_usuario_upload
            registra quem enviou o arquivo, não de quem é o perfil. */}
        <div className="flex justify-center">
          <SeletorFotoPerfil
            authFetch={auth.authFetch}
            nome={nome || 'Novo usuário'}
            url={urlImagemPerfil}
            tamanho="xl"
            aoAlterar={(idArquivo, novaUrl) => {
              setIdImagemPerfil(idArquivo);
              setUrlImagemPerfil(novaUrl);
            }}
          />
        </div>

        <div>
          <label className="rotulo-campo">
            Nome
          </label>
          <input
            type="text"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            required
            className="input-padrao"
            placeholder="Nome completo"
          />
        </div>

        <div>
          <label className="rotulo-campo">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
            className="input-padrao"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label className="rotulo-campo">
            Senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            required
            className="input-padrao"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-dark hover:bg-black text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg hover:shadow-xl mt-4 disabled:opacity-60"
        >
          {enviando ? 'Criando...' : 'Criar'}
        </button>
      </form>
    </CartaoFormulario>
  );
}
