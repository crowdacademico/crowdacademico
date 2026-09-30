// Regra do banco (CHECK, 23514) violada: o Postgres informa o nome da constraint em `erro.constraint`, e o filtro
// global (postgres-exception.filter.ts) monta o 400 com a mensagem daqui e, quando há `campo`, com
// `campos: { <campo>: [mensagem] }`, para o formulário mostrar o erro embaixo do campo certo. Mesmo formato de
// mensagens-duplicidade.constants.ts. `campo` é o nome da propriedade no corpo da requisição (camelCase, como no DTO).
//
// Só as regras que uma tela consegue atingir. As internas (sessão, notificação, log, tokens) ficam de fora: se uma
// delas falhar, é defeito do sistema, e a mensagem genérica do filtro basta. Constraint fora do mapa: mensagem
// genérica.
export interface RegraConhecida {
  mensagem: string;
  campo?: string;
}

const TEXTO_LONGO =
  'O texto passou do tamanho máximo permitido. Encurte e tente de novo.';

export const REGRA_POR_CONSTRAINT: Readonly<Record<string, RegraConhecida>> = {
  CK_CONFIGURACOES_VALOR_TIPO: {
    campo: 'valor',
    mensagem:
      'O valor não combina com o tipo do parâmetro: "inteiro" aceita só números sem vírgula (ex.: 30), "decimal" aceita número com ponto (ex.: 5.00) e "booleano" aceita true ou false.',
  },
  CK_CONFIGURACOES_GLOBAL_ATIVA: {
    campo: 'ativo',
    mensagem:
      'Parâmetro global não pode ser desativado: ele faz parte das regras do sistema. Para desligar uma regra, mude o valor.',
  },
  CK_TIPO_LINK_ALGUM_ESCOPO: {
    campo: 'permitePerfil',
    mensagem:
      'Marque pelo menos um lugar onde este tipo de link pode ser usado.',
  },
  CK_PERFIL_VINCULO: {
    campo: 'vinculoInstitucional',
    mensagem:
      'Com vínculo institucional, informe a instituição. Pesquisador independente não informa instituição.',
  },
  CK_USUARIO_SUSPENSAO: {
    campo: 'motivo',
    mensagem: 'A suspensão precisa de data final e de motivo, os dois juntos.',
  },
  CK_USUARIO_PAPEL_SUSPENSAO: {
    campo: 'motivo',
    mensagem: 'A suspensão precisa de data final e de motivo, os dois juntos.',
  },
  CK_PERFIL_PESQUISADOR_SUSPENSAO: {
    campo: 'motivo',
    mensagem: 'A suspensão precisa de data final e de motivo, os dois juntos.',
  },
  CK_SEGUIR_PESQUISADOR_NAO_AUTOSEGUIR: {
    mensagem: 'Você não pode seguir o seu próprio perfil.',
  },
  CK_CAMPANHA_PRAZO: {
    campo: 'dataFim',
    mensagem: 'A data de fim precisa ser depois da data de início.',
  },
  CK_CAMPANHA_META_FINANCEIRA_POSITIVA: {
    campo: 'metaFinanceira',
    mensagem: 'A meta precisa ser maior que zero.',
  },
  CK_CAMPANHA_DESCRICAO_TAMANHO: { campo: 'descricao', mensagem: TEXTO_LONGO },
  CK_ATUALIZACAO_CAMPANHA_CONTEUDO_TAMANHO: {
    campo: 'conteudo',
    mensagem: TEXTO_LONGO,
  },
  CK_ORCAMENTO_CAMPANHA_VALOR_POSITIVO: {
    campo: 'valor',
    mensagem: 'O valor do item precisa ser maior que zero.',
  },
  CK_ORCAMENTO_CAMPANHA_DESCRICAO_TAMANHO: {
    campo: 'descricao',
    mensagem: TEXTO_LONGO,
  },
  CK_MARCO_CRONOGRAMA_DESCRICAO_TAMANHO: {
    campo: 'descricao',
    mensagem: TEXTO_LONGO,
  },
  CK_COMENTARIO_CONTEUDO_NAO_VAZIO: {
    campo: 'conteudo',
    mensagem: 'Escreva o comentário antes de enviar.',
  },
  CK_DENUNCIA_RELATO_TAMANHO: { campo: 'relato', mensagem: TEXTO_LONGO },
  CK_RECOMPENSA_VALOR_MINIMO: {
    campo: 'valorMinimo',
    mensagem: 'O valor mínimo da recompensa precisa ser maior que zero.',
  },
  CK_RECOMPENSA_QUANTIDADE: {
    campo: 'quantidadeDisponivel',
    mensagem: 'A quantidade disponível não pode ser negativa.',
  },
  CK_RECOMPENSA_DESCRICAO_TAMANHO: {
    campo: 'descricao',
    mensagem: TEXTO_LONGO,
  },
  CK_CONTRIBUICAO_VALOR_MINIMO: {
    campo: 'valor',
    mensagem: 'O valor da contribuição precisa ser maior que zero.',
  },
  CK_SOLICITACAO_JUSTIFICATIVA_PESQ_TAMANHO: {
    campo: 'justificativa',
    mensagem: TEXTO_LONGO,
  },
  CK_SOLICITACAO_JUSTIFICATIVA_ADMIN_TAMANHO: {
    campo: 'justificativa',
    mensagem: TEXTO_LONGO,
  },
};
