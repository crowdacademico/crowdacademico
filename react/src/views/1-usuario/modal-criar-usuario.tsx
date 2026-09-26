import { useId, useState } from 'react';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';

interface ModalCriarUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoCriado: (usuarioCriado: UsuarioResponse) => void;
}

// Criar: nome/e-mail/senha/foto. Não tem equivalente em T1 (Campo de Testes nunca precisou criar conta do zero,
// só "Criar Perfil Pesquisador" para quem já é usuário): só usado pela página real de Usuário.
export function ModalCriarUsuario({ auth, aoFechar, aoCriado }: ModalCriarUsuarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // Foto de perfil: OPCIONAL na criação; sem usuário criado ainda, não existe PATCH para disparar limpeza de
  // foto trocada/removida: best-effort, apaga na hora o upload anterior órfão.
  const [idImagemPerfil, setIdImagemPerfil] = useState<number | null>(null);
  const [urlImagemPerfil, setUrlImagemPerfil] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const idNome = useId();
  const idEmail = useId();
  const idSenha = useId();

  const aoAlterarFoto = (idArquivo: number | null, novaUrl: string | null) => {
    const idAnterior = idImagemPerfil;
    setIdImagemPerfil(idArquivo);
    setUrlImagemPerfil(novaUrl);
    if (idAnterior !== null) {
      arquivoApi.remover(auth.authFetch, idAnterior).catch(() => {
        console.warn(`Falha ao limpar foto de perfil não usada (id_arquivo=${idAnterior}).`);
      });
    }
  };

  const aoCriar = async () => {
    if (!nome || !email || !senha) return;
    limparErro();
    setEnviando(true);
    try {
      const usuarioCriado = await usuarioApi.criar(auth.authFetch, {
        nome,
        email,
        senha,
        ...(idImagemPerfil !== null ? { idImagemPerfil } : {}),
      });
      mostrar('Usuário cadastrado com sucesso.', `O novo usuário possui o ID: ${usuarioCriado.idUsuario}`);
      aoCriado(usuarioCriado);
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo="Criar Usuário"
      subtitulo="Preencha os dados abaixo para cadastrar um novo usuário."
      avatar={
        <SeletorFotoPerfil
          authFetch={auth.authFetch}
          nome={nome || 'Novo usuário'}
          url={urlImagemPerfil}
          tamanho="lg"
          aoAlterar={aoAlterarFoto}
        />
      }
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={aoCriar}
            disabled={enviando || !nome || !email || !senha}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <SecaoFicha titulo="Dados da conta">
        <div className="sm:col-span-2">
          <label htmlFor={idNome} className="rotulo-campo">Nome</label>
          <input
            id={idNome}
            type="text"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            required
            className="input-padrao"
            placeholder="Nome completo"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={idEmail} className="rotulo-campo">E-mail</label>
          <input
            id={idEmail}
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
            className="input-padrao"
            placeholder="seu@email.com"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={idSenha} className="rotulo-campo">Senha</label>
          <input
            id={idSenha}
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            required
            className="input-padrao"
            placeholder="••••••••"
          />
        </div>
      </SecaoFicha>
    </ModalFicha>
  );
}
