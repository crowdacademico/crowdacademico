import { useState } from 'react';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Campo } from '../../components/input/campo';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';

interface ModalCriarUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoCriado: (usuarioCriado: UsuarioResponse) => void;
}

// Criar: nome/e-mail/senha/foto. Só a lista de Usuários usa (a Bancada do Pesquisador só cria perfil de
// pesquisador para quem já é usuário).
export function ModalCriarUsuario({ auth, aoFechar, aoCriado }: ModalCriarUsuarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // Foto de perfil: OPCIONAL na criação; sem usuário criado ainda, não existe PATCH para disparar limpeza de
  // foto trocada/removida: best-effort, apaga na hora o upload anterior órfão.
  const [idImagemPerfil, setIdImagemPerfil] = useState<number | null>(null);
  const [urlImagemPerfil, setUrlImagemPerfil] = useState<string | null>(null);

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

  // "Criar" fica sempre clicável: clicando com algo faltando, cada campo mostra o próprio erro.
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    nome: nome.trim().length < 2 && 'Nome precisa ter pelo menos 2 caracteres.',
    email: email.trim() === '' && 'Informe o e-mail.',
    senha: senha.length < 8 && 'Senha precisa ter pelo menos 8 caracteres.',
  }));

  const aoCriar = async () => {
    if (!tentarEnviar()) return;
    await executarEnviando(async () => {
      const usuarioCriado = await usuarioApi.criar(auth.authFetch, {
        nome,
        email,
        senha,
        ...(idImagemPerfil !== null ? { idImagemPerfil } : {}),
      });
      mostrar('Usuário cadastrado com sucesso.', `O novo usuário possui o ID: ${usuarioCriado.idUsuario}`);
      aoCriado(usuarioCriado);
      aoFechar();
    });
  };

  // Criar também pergunta antes de fechar com algo digitado, como o Alterar.
  const sujo = nome !== '' || email !== '' || senha !== '' || idImagemPerfil !== null;
  useAvisoAlteracaoNaoSalva(sujo);
  const fechar = () => {
    if (confirmarSaida(sujo)) aoFechar();
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
      aoFechar={fechar}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{
            rotulo: 'Criar',
            rotuloOcupado: 'Criando...',
            ocupado: enviando,
            aoClicar: () => void aoCriar(),
          }}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="Dados da conta">
        <Campo rotulo="Nome" erro={erroDe('nome') ?? errosCampo.nome} className="sm:col-span-2">
          {({ atributos }) => (
            <input
              {...atributos}
              type="text"
              value={nome}
              onChange={(evento) => {
                setNome(evento.target.value);
                limparErroCampo('nome');
              }}
              required
              className="input-padrao"
              placeholder="Nome completo"
            />
          )}
        </Campo>

        <Campo rotulo="E-mail" erro={erroDe('email') ?? errosCampo.email} className="sm:col-span-2">
          {({ atributos }) => (
            <input
              {...atributos}
              type="email"
              value={email}
              onChange={(evento) => {
                setEmail(evento.target.value);
                limparErroCampo('email');
              }}
              required
              className="input-padrao"
              placeholder="seu@email.com"
            />
          )}
        </Campo>

        <Campo rotulo="Senha" erro={erroDe('senha') ?? errosCampo.senha} className="sm:col-span-2">
          {({ atributos }) => (
            <input
              {...atributos}
              type="password"
              value={senha}
              onChange={(evento) => {
                setSenha(evento.target.value);
                limparErroCampo('senha');
              }}
              required
              className="input-padrao"
              placeholder="••••••••"
            />
          )}
        </Campo>
      </SecaoFicha>
    </ModalFicha>
  );
}
