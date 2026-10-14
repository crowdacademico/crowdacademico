import { useToast } from '../../../components/layout/toast/use-toast';
import { perfilPesquisadorApi } from '../api/perfil-pesquisador.api';
import type { AuthFetch } from '../../3-auth/type/auth.type';

// Aviso da pontuação depois de uma ação que pode mudá-la (link acadêmico, vínculo, título): "Usuário #12 Ana: score
// total +4 pontos", mesmo +0; ponto perdido sai no aviso laranja. A nota é pública e o banco a recalcula na mesma
// gravação, então lida antes e depois a diferença é exata e segue qualquer peso da tela Pontuação. Sem nota (falha
// na leitura), o aviso só não aparece.
export function useAvisoScore(authFetch: AuthFetch, idUsuario: number, nomeUsuario?: string) {
  const { mostrar } = useToast();

  const lerScore = () =>
    perfilPesquisadorApi
      .buscarScore(authFetch, idUsuario)
      .then((score) => score.scoreTotal)
      .catch(() => null);

  const avisarScore = (antes: number | null, depois: number | null) => {
    if (antes === null || depois === null) return;
    const diferenca = depois - antes;
    const pontos = Math.abs(diferenca) === 1 ? 'ponto' : 'pontos';
    const nome = nomeUsuario ? ` ${nomeUsuario}` : '';
    mostrar(
      `Usuário #${idUsuario}${nome}: score total ${diferenca < 0 ? '-' : '+'}${Math.abs(diferenca)} ${pontos}`,
      undefined,
      diferenca < 0 ? 'aviso' : 'sucesso',
    );
  };

  return { lerScore, avisarScore };
}
