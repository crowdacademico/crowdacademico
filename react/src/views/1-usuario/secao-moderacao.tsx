import { SecaoSuspensao } from '../../components/crud/secao-suspensao';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface SecaoModeracaoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number | string;
}

// Moderação: suspender/revogar CONTA, dentro de Alterar Usuário porque é ação sobre a MESMA conta que a tela já
// edita, não uma tela própria.
export function SecaoModeracao({ auth, idUsuario }: SecaoModeracaoProps) {
  return (
    <SecaoSuspensao
      titulo="Moderação"
      explicacao="Suspender bloqueia o login desta conta pelo prazo escolhido, com motivo obrigatório (fica visível pra quem tentar entrar)."
      rotuloSuspenso="Suspenso até"
      rotuloSuspender="Suspender usuário"
      mensagemSuspenso="Usuário suspenso com sucesso."
      mensagemRevogado="Suspensão revogada com sucesso."
      buscar={() => usuarioApi.buscarSuspensao(auth.authFetch, idUsuario)}
      suspender={(ate, motivo) => usuarioApi.suspender(auth.authFetch, idUsuario, ate, motivo)}
      revogar={() => usuarioApi.revogarSuspensao(auth.authFetch, idUsuario)}
    />
  );
}
