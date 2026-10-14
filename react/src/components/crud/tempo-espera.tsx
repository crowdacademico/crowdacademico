import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { diasDeEspera } from '../../services/constant/util/formatacao.util';

// Tempo de espera numa fila ("há 3 dias"). A classe diz o nível, e o CSS pinta a célula inteira (DS-102): verde até
// espera_atencao_dias, laranja até espera_critica_dias e vermelho acima disso (Parâmetros do Sistema, grupo Moderação).
export function TempoEspera({ desde }: { desde: string | null }) {
  const { obterNumero } = useConfiguracoes();
  if (!desde) {
    return null;
  }
  const dias = diasDeEspera(desde);
  const nivel =
    dias > obterNumero('espera_critica_dias', 30) ? 'critico' : dias > obterNumero('espera_atencao_dias', 7) ? 'atencao' : 'ok';
  // O número em negrito ("há **7** dias"): é o que a pessoa lê de relance na fila.
  return (
    <span className={'tempo-espera tempo-espera--' + nivel}>
      {dias <= 0 ? (
        'hoje'
      ) : (
        <>
          há <strong>{dias}</strong> {dias === 1 ? 'dia' : 'dias'}
        </>
      )}
    </span>
  );
}
