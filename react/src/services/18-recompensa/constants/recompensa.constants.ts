import { listaCompleta } from '../../constant/util/lista-completa.util';
import type { TipoRecompensa } from '../../constant/type/enums-do-banco.gerado';

// A ordem do formulário: da mais simples (o nome de quem apoiou no projeto) para a que pede um link.
export const ORDEM_TIPO_RECOMPENSA = listaCompleta<TipoRecompensa>()(['reconhecimento', 'acesso_antecipado', 'digital'] as const);

export const ROTULO_TIPO_RECOMPENSA: Record<TipoRecompensa, string> = {
  reconhecimento: 'Reconhecimento',
  acesso_antecipado: 'Acesso antecipado',
  digital: 'Conteúdo digital',
};

export const EXEMPLO_TIPO_RECOMPENSA: Record<TipoRecompensa, string> = {
  reconhecimento: 'Ex.: o nome de quem apoiou nos agradecimentos do artigo.',
  acesso_antecipado: 'Ex.: ler os resultados antes da publicação.',
  digital: 'Ex.: um link especial para os dados da pesquisa ou um vídeo dos bastidores.',
};
