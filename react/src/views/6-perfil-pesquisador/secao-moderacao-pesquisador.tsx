import { SecaoSuspensao, type EstadoSuspensao } from '../../components/crud/secao-suspensao';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface SecaoModeracaoPesquisadorProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number | string;
  aoMudar?: (estado: EstadoSuspensao | null) => void;
}

// Moderação: suspender/reativar o PODER de pesquisador. A diferença para a suspensão de conta é conceitual:
// isto NUNCA bloqueia login (a conta continua normal), só a autoridade de pesquisador (criar campanha nova,
// endossar, etc.), por isso o pesquisador continua vendo o motivo em Minha Conta > Acadêmico.
export function SecaoModeracaoPesquisador({ auth, idUsuario, aoMudar }: SecaoModeracaoPesquisadorProps) {
  return (
    <SecaoSuspensao
      titulo="Moderação (Pesquisador)"
      explicacao="Suspende só o PODER de pesquisador (criar campanha, endossar etc.) pelo prazo escolhido, com motivo obrigatório: a conta continua conseguindo logar normalmente."
      rotuloSuspenso="Poder de pesquisador suspenso até"
      rotuloSuspender="Suspender poder de pesquisador"
      mensagemSuspenso="Poder de pesquisador suspenso com sucesso."
      mensagemRevogado="Poder de pesquisador reativado com sucesso."
      buscar={() => perfilPesquisadorApi.buscarSuspensao(auth.authFetch, idUsuario)}
      suspender={(ate, motivo) => perfilPesquisadorApi.suspender(auth.authFetch, idUsuario, { ate, motivo })}
      revogar={() => perfilPesquisadorApi.reativar(auth.authFetch, idUsuario)}
      aoMudar={aoMudar}
    />
  );
}
