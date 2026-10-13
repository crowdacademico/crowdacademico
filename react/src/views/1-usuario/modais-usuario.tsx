import { ModalAlterarUsuario } from './modal-alterar-usuario';
import { ModalConsultarUsuario } from './modal-consultar-usuario';
import { ModalExcluirUsuario } from './modal-excluir-usuario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface UsuarioParaExcluir {
  idUsuario: number;
  nome: string;
  email: string;
  emailVerificado: boolean;
}

interface ModaisUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  alterando: { idUsuario: number } | null;
  consultando: { idUsuario: number } | null;
  excluindo: UsuarioParaExcluir | null;
  fecharAlterando: () => void;
  fecharConsultando: () => void;
  fecharExcluindo: () => void;
  // Depois de alterar ou excluir: a lista de quem abriu busca de novo.
  aoMudar: () => void;
}

// Alterar, Consultar e Excluir de uma conta, abertos de qualquer lista de pessoas (Usuários, Pesquisadores e a
// Bancada do Pesquisador do Campo de Testes): os três modais com as mesmas ligações, num lugar só.
export function ModaisUsuario({
  auth,
  alterando,
  consultando,
  excluindo,
  fecharAlterando,
  fecharConsultando,
  fecharExcluindo,
  aoMudar,
}: ModaisUsuarioProps) {
  return (
    <>
      {alterando && (
        <ModalAlterarUsuario auth={auth} idUsuario={alterando.idUsuario} aoFechar={fecharAlterando} aoAtualizado={aoMudar} />
      )}

      {consultando && (
        <ModalConsultarUsuario auth={auth} idUsuario={consultando.idUsuario} aoFechar={fecharConsultando} />
      )}

      {excluindo && (
        <ModalExcluirUsuario
          auth={auth}
          idUsuario={excluindo.idUsuario}
          nome={excluindo.nome}
          email={excluindo.email}
          emailVerificado={excluindo.emailVerificado}
          aoFechar={fecharExcluindo}
          aoExcluido={aoMudar}
        />
      )}
    </>
  );
}
