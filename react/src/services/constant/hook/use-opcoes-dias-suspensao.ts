import { useConfiguracoes } from '../../11-configuracoes/hook/use-configuracoes';

const PADRAO_OPCOES_DIAS = '1,3,7,30';

// Prazos sugeridos para qualquer suspensão (conta, pesquisador, papel): `configuracoes.suspensao_usuario_opcoes_dias`.
export function useOpcoesDiasSuspensao(): number[] {
  const { obterConfiguracao } = useConfiguracoes();
  const valor = obterConfiguracao('suspensao_usuario_opcoes_dias', PADRAO_OPCOES_DIAS);
  return (typeof valor === 'string' ? valor : PADRAO_OPCOES_DIAS)
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}
