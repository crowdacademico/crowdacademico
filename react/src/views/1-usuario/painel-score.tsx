import { TabelaDimensoesScore } from '../../components/crud/tabelas/2-tabela-dimensoes-score';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface PainelScoreProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
}

// Score do pesquisador (Consultar Usuário). O aviso vermelho fica enquanto a regra de pontuação não estiver fechada.
export function PainelScore({ auth, idUsuario }: PainelScoreProps) {
  const { dado: score } = useBuscar(() => perfilPesquisadorApi.buscarScore(auth.authFetch, idUsuario), [idUsuario]);

  return (
    <>
      <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">Score</h3>
      <div className="fundo-erro texto-erro rounded-md p-4 mb-3 flex items-start gap-3">
        <i className="fa-solid fa-triangle-exclamation icone-grande"></i>
        <div>
          <p className="enfase">Ainda não está pronto</p>
          <p className="paragrafo texto-herdado">
            A regra de negócio de pontuação (pesos e dimensões abaixo) ainda não foi fechada. Os números
            são só uma prévia da estrutura, não confie neles pra testar nada que dependa do valor final.
          </p>
        </div>
      </div>
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
