import { TabelaDimensoesScore } from '../../components/crud/tabelas/2-tabela-dimensoes-score';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface PainelScoreProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
}

// Score do pesquisador (Consultar Usuário): o total, a faixa e os pontos de cada dimensão.
export function PainelScore({ auth, idUsuario }: PainelScoreProps) {
  const { dado: score } = useBuscar(() => perfilPesquisadorApi.buscarScore(auth.authFetch, idUsuario), [idUsuario]);

  return (
    <>
      <h3 className="titulo-bloco titulo-bloco--linha">Score</h3>
      {score ? (
        <>
          <p>
            {score.scoreTotal} pontos, <span className="badge badge-sucesso">{score.rotulo}</span>
          </p>
          <TabelaDimensoesScore dimensoes={score.dimensoes} />
        </>
      ) : (
        <p className="legenda texto-fraco">carregando...</p>
      )}
    </>
  );
}
