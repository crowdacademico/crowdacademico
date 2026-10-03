import type { FaseAtualizacao, TipoAtualizacao } from '../../constant/type/enums-do-banco.gerado';
import { listaCompleta } from '../../constant/util/lista-completa.util';

// Os VALORES vêm do banco (ENUMs fase_atualizacao e tipo_atualizacao); aqui só a ordem de exibição e o rótulo
// legível (RF-052). `listaCompleta` faz o compilador acusar se um valor do banco faltar.
export const ORDEM_FASE_ATUALIZACAO = listaCompleta<FaseAtualizacao>()(['andamento', 'resultado_preliminar', 'resultado_final'] as const);
export const ORDEM_TIPO_ATUALIZACAO = listaCompleta<TipoAtualizacao>()(['texto', 'imagem', 'pdf', 'linkexterno'] as const);

export const ROTULO_FASE_ATUALIZACAO: Record<FaseAtualizacao, string> = {
  andamento: 'Andamento',
  resultado_preliminar: 'Resultado preliminar',
  resultado_final: 'Resultado final',
};

export const ROTULO_TIPO_ATUALIZACAO: Record<TipoAtualizacao, string> = {
  texto: 'Texto',
  imagem: 'Imagem',
  pdf: 'PDF',
  linkexterno: 'Link externo',
};
