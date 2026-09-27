import { useRedeOcupada } from './atividade-rede';

// Faixa fina no topo da tela enquanto houver requisição em andamento. Só aparece depois de um pequeno atraso
// (CSS, `.barra-carregamento`): resposta rápida não pisca nada na tela.
export function BarraCarregamento() {
  const ocupada = useRedeOcupada();
  if (!ocupada) return null;
  return <div className="barra-carregamento" role="progressbar" aria-label="Carregando" />;
}
