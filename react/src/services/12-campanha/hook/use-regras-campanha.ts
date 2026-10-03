import { useConfiguracoes } from '../../11-configuracoes/hook/use-configuracoes';

// Regras de campanha lidas ao vivo de `configuracoes` (nada fixo no front): quem decide de verdade é o banco
// (fn_valida_prazo_campanha_negocio, fn_valida_meta_campanha_negocio, fn_valida_completude_campanha, em
// 05_regras_negocio.sql). A tela só lê as MESMAS chaves para avisar antes de enviar, em vez de a pessoa
// descobrir o limite num erro depois. O segundo argumento de `obterNumero` é só o valor enquanto o
// catálogo não carregou. Um lugar só para o formulário de campanha, as bancadas e a fila de aprovação.
export interface RegrasCampanha {
  metaMinima: number;
  prazoMinimoDias: number;
  prazoMaximoDias: number;
  // Duração que o formulário sugere ao escolher o início (RF-069); sugestão, não regra.
  prazoSugeridoDias: number;
  minimoItensOrcamento: number;
  minimoMarcosCronograma: number;
  // Máximo de caracteres da descrição da campanha (RF-072).
  limiteDescricao: number;
  // Máximo de caracteres de um comentário (RF-092).
  limiteComentario: number;
}

export function useRegrasCampanha(): RegrasCampanha {
  const { obterNumero: numero } = useConfiguracoes();
  return {
    metaMinima: numero('meta_minima_campanha', 500),
    prazoMinimoDias: numero('prazo_minimo_campanha_dias', 15),
    prazoMaximoDias: numero('prazo_maximo_campanha_dias', 60),
    prazoSugeridoDias: numero('prazo_sugerido_campanha_dias', 30),
    minimoItensOrcamento: numero('orcamento_min_itens', 1),
    minimoMarcosCronograma: numero('cronograma_min_marcos', 3),
    limiteDescricao: numero('limite_caracteres_descricao_campanha', 5000),
    limiteComentario: numero('limite_caracteres_comentario', 500),
  };
}
