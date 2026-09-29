// Espelha, só pra AVISAR na tela, os pares que o banco confere em
// fn_valida_pares_min_max_configuracoes() (05_regras_negocio.sql): o mínimo
// nunca pode passar do máximo. A regra de verdade mora no banco (erro 90019);
// esta lista não valida nada, só explica ANTES de a pessoa salvar. Se um par
// novo entrar no banco, entra aqui também.
export interface ParMinMax {
  papel: 'minimo' | 'maximo';
  outras: string[];
}

const PARES: Record<string, ParMinMax> = {
  prazo_minimo_campanha_dias: { papel: 'minimo', outras: ['prazo_maximo_campanha_dias'] },
  prazo_maximo_campanha_dias: { papel: 'maximo', outras: ['prazo_minimo_campanha_dias'] },
  orcamento_min_itens: { papel: 'minimo', outras: ['orcamento_max_itens'] },
  orcamento_max_itens: { papel: 'maximo', outras: ['orcamento_min_itens'] },
  cronograma_min_marcos: { papel: 'minimo', outras: ['cronograma_max_marcos'] },
  cronograma_max_marcos: { papel: 'maximo', outras: ['cronograma_min_marcos'] },
  arquivo_tamanho_minimo_bytes: {
    papel: 'minimo',
    outras: ['arquivo_tamanho_maximo_imagem_bytes', 'arquivo_tamanho_maximo_documento_bytes'],
  },
  arquivo_tamanho_maximo_imagem_bytes: { papel: 'maximo', outras: ['arquivo_tamanho_minimo_bytes'] },
  arquivo_tamanho_maximo_documento_bytes: { papel: 'maximo', outras: ['arquivo_tamanho_minimo_bytes'] },
};

export function parMinMaxDaConfiguracao(chave: string): ParMinMax | null {
  return PARES[chave] ?? null;
}
