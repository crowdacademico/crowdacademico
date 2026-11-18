// Espelha, para AVISAR na tela antes de salvar, as faixas que o banco confere em fn_valida_faixa_configuracoes()
// (05_regras_negocio.sql, erro 90043). A regra de verdade mora no banco; se uma chave nova ganhar faixa lá, entra
// aqui também.
export interface FaixaConfiguracao {
  minimo: number;
  maximo: number;
  motivo: string;
}

const FAIXAS: Record<string, FaixaConfiguracao> = {
  recuperacao_senha_minutos_validade: {
    minimo: 1,
    maximo: 60,
    motivo: 'O link de redefinição de senha vale no máximo 1 hora (RF-007).',
  },
};

export function faixaDaConfiguracao(chave: string): FaixaConfiguracao | null {
  return FAIXAS[chave] ?? null;
}

// Mensagem do campo Valor quando ele sai da faixa; null quando está dentro (ou não é número, caso que o tipo já avisa).
export function erroForaDaFaixa(chave: string, valor: string): string | null {
  const faixa = faixaDaConfiguracao(chave);
  const texto = valor.trim();
  if (faixa === null || !/^[0-9]+$/.test(texto)) return null;
  const numero = Number(texto);
  if (numero >= faixa.minimo && numero <= faixa.maximo) return null;
  return `Use um valor de ${faixa.minimo} a ${faixa.maximo}. ${faixa.motivo}`;
}
