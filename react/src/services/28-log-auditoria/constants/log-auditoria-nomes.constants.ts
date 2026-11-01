import { ROTULO_TIPO_MOTIVO_DENUNCIA } from '../../10-motivo-denuncia/constants/motivo-denuncia.constants';
import { ROTULO_TIPO_TERMO } from '../../5-termo-uso/constants/termo-uso-tipos.constants';
import { ROTULO_MODELO_CAMPANHA, ROTULO_STATUS_CAMPANHA } from '../../12-campanha/constants/status-campanha.constants';
import { ROTULO_STATUS_CONTESTACAO, ROTULO_STATUS_DENUNCIA } from '../../19-denuncia/constants/status-denuncia.constants';
import { ROTULO_STATUS_ENCERRAMENTO } from '../../20-solicitacao-encerramento/constants/status-encerramento.constants';
import { ROTULO_MEIO_PAGAMENTO } from '../../22-contribuicao/constants/contribuicao.constants';
import { ROTULO_STATUS_CONTRIBUICAO } from '../../22-contribuicao/constants/status-contribuicao.constants';
import { ROTULO_STATUS_REPASSE } from '../../23-pagamento/constants/status-repasse.constants';
import { ROTULO_TIPO_CHAVE_PIX } from '../../24-conta-recebimento/constants/conta-recebimento.constants';
import { ROTULO_CANAL_NOTIFICACAO, rotuloTipoNotificacao } from '../../27-notificacao/constants/notificacao.constants';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
} from '../../6-perfil-pesquisador/constants/status-pesquisador.constants';
import { formatarMoeda } from '../../constant/util/formatacao.util';

// O nome que a tela mostra para cada coluna do banco no histórico de alterações ("Ver log"): quem lê o log vê "Motivo
// da suspensão", não "motivo_suspensao". Pelo nome da coluna: a mesma coluna (criado_em, ativo, descricao...) tem o
// mesmo nome em todas. Quando uma tela chama a coluna de outro jeito, vale o nome por tabela (NOME_COLUNA_TABELA). Cobre as tabelas que o log registra (fn_log_auditoria, 05). "(id)" diz que
// o valor é um número de registro, não um nome.
//
// Coluna que não estiver aqui (uma nova, por exemplo) não some: `nomeDaColuna` mostra o nome do banco legível ("_" vira
// espaço, primeira letra maiúscula). Mesmo espírito de permissao-nomes-amigaveis.constants.ts: uma camada de exibição
// por cima do dado, sem mudar o dado.
const NOME_COLUNA: Partial<Record<string, string>> = {
  // Usuário e perfil de pesquisador
  id_usuario: 'Usuário (id)',
  nome: 'Nome',
  email: 'E-mail',
  senha_hash: 'Senha',
  id_imagem_perfil: 'Foto de perfil (id)',
  deletado: 'Excluído',
  deletado_em: 'Excluído em',
  deletado_por: 'Excluído por (id)',
  email_verificado: 'E-mail verificado',
  tentativas_login_falhas: 'Tentativas de login erradas',
  bloqueado_ate: 'Bloqueado até',
  ultimo_login_em: 'Último login',
  ultimo_login_ip: 'IP do último login',
  suspenso_ate: 'Suspenso até',
  motivo_suspensao: 'Motivo da suspensão',
  suspenso_por: 'Suspenso por (id)',
  cpf_criptografado: 'CPF',
  cpf_hash: 'CPF (índice)',
  tipo_vinculo: 'Tipo de vínculo',
  vinculo_institucional: 'Vínculo institucional',
  titulo_academico: 'Título acadêmico',
  status_pesquisador: 'Situação do pesquisador',
  ativado_em: 'Ativado em',
  score_atual: 'Pontuação atual',
  score_atualizado_em: 'Pontuação atualizada em',
  tipo_chave_pix: 'Tipo de chave Pix',
  chave_pix_criptografada: 'Chave Pix',
  chave_pix_verificada_em: 'Chave Pix verificada em',
  // Comuns a várias tabelas
  criado_em: 'Criado em',
  atualizado_em: 'Atualizado em',
  ativo: 'Ativo',
  descricao: 'Descrição',
  codigo: 'Código',
  tipo: 'Tipo',
  status: 'Situação',
  // Parâmetros, papéis e catálogos
  id_config: 'Parâmetro (id)',
  chave: 'Chave',
  valor: 'Valor',
  publica: 'Pública',
  id_papel: 'Papel (id)',
  id_permissao: 'Permissão (id)',
  ordem_exibicao: 'Ordem de exibição',
  id_motivo: 'Motivo (id)',
  id_area_conhecimento: 'Área do conhecimento (id)',
  codigo_cnpq: 'Código CNPq',
  id_pai: 'Item pai (id)',
  id_tipolink: 'Tipo de link (id)',
  regex: 'Regex de validação',
  dominio: 'Domínios permitidos',
  permite_perfil: 'Perfil do pesquisador',
  permite_atualizacao: 'Atualização de campanha',
  permite_recompensa: 'Recompensa',
  id_termo: 'Termo (id)',
  versao: 'Versão',
  conteudo: 'Conteúdo',
  // Campanha
  id_campanha: 'Campanha (id)',
  id_admin: 'Administrador (id)',
  titulo: 'Título',
  modelo: 'Modelo',
  meta_financeira: 'Meta',
  valor_bruto_arrecadado: 'Arrecadado',
  taxa_plataforma: 'Taxa da plataforma',
  data_inicio: 'Início',
  data_fim: 'Fim (previsto)',
  aprovado_em: 'Aprovada em',
  enviado_aprovacao_em: 'Enviada para aprovação em',
  encerrado_em: 'Encerrada em',
  video_apresentacao_url: 'Vídeo de apresentação',
  // Denúncia
  id_denuncia: 'Denúncia (id)',
  id_campanha_alvo: 'Campanha denunciada (id)',
  id_pesquisador_alvo: 'Pesquisador denunciado (id)',
  relato: 'Relato',
  justificativa_moderacao: 'Justificativa da moderação',
  id_julgador: 'Julgador (id)',
  julgado_em: 'Julgada em',
  id_julgador_contestacao: 'Julgador da contestação (id)',
  contestacao: 'Contestação',
  contestacao_status: 'Situação da contestação',
  contestada_em: 'Contestada em',
  justificativa_contestacao: 'Justificativa da contestação',
  // Mensagens (modelo_mensagem). `titulo` e `ativo` têm o nome da tela de Mensagens em NOME_COLUNA_TABELA.
  id_modelo_mensagem: 'Mensagem (id)',
  tipo_evento: 'Aviso',
  canal: 'Canal',
  corpo: 'Texto',
  obrigatoria: 'Obrigatória',
  // Pontuação
  id_score_config: 'Item da pontuação (id)',
  peso: 'Peso',
  id_rotulo: 'Faixa (id)',
  rotulo: 'Faixa',
  score_minimo: 'Pontuação mínima',
  score_maximo: 'Pontuação máxima',
  // Pedido de encerramento antecipado
  id_solicitacao_encerramento: 'Pedido (id)',
  justificativa_pesquisador: 'Justificativa do pesquisador',
  justificativa_admin: 'Justificativa da decisão',
  solicitado_em: 'Pedido em',
  avaliado_em: 'Decidido em',
  // Contribuição, repasse e aviso do provedor (telas de pagamento)
  id_contribuicao: 'Contribuição (id)',
  meio_pagamento: 'Meio de pagamento',
  anonima: 'Anônima',
  id_transacao_api: 'Cobrança no provedor',
  provedor: 'Provedor',
  taxa_pagamento: 'Tarifa do provedor',
  dinheiro_liberado_em: 'Dinheiro liberado em',
  id_repasse: 'Repasse (id)',
  tentativas_estorno: 'Tentativas de estorno automático',
  proxima_tentativa_estorno_em: 'Próxima tentativa de estorno',
  reconciliada_em: 'Conferida com o provedor em',
  cobranca_cancelada_em: 'Cobrança cancelada em',
  valor_bruto: 'Valor bruto',
  valor_liquido: 'Valor líquido',
  meta_atingida: 'Meta atingida',
  repassado_em: 'Repassado em',
  taxa_relativa: 'Taxa da plataforma (%)',
  id_transferencia_api: 'Transferência no provedor',
  chave_idempotencia: 'Chave de idempotência',
  tentativas_transferencia: 'Tentativas de transferência',
  proxima_tentativa_em: 'Próxima tentativa',
  id_evento_pagamento: 'Evento (id)',
  id_evento_externo: 'Evento do provedor',
  recebido_em: 'Recebido em',
  processado_em: 'Processado em',
  erro_processamento: 'Erro de processamento',
  revisao_manual_em: 'Em revisão manual desde',
  resolvido_em: 'Baixa em',
  resolvido_por: 'Baixa dada por (id)',
};

// A mesma coluna com nome diferente numa tela: vale este, pela tabela.
const NOME_COLUNA_TABELA: Partial<Record<string, string>> = {
  'perfil_pesquisador.suspenso_ate': 'Poder de pesquisador suspenso até',
  'area_conhecimento.id_pai': 'Grande área (pai) (id)',
  'modelo_mensagem.ativo': 'Ligado',
  'modelo_mensagem.titulo': 'Assunto ou título',
  'solicitacao_encerramento.id_admin': 'Decidido por (id)',
  'evento_pagamento.tipo_evento': 'Evento',
  'contribuicao.status': 'Situação da contribuição',
  'termos_de_uso.tipo': 'Termo',
};

// O valor como a tela mostra, pela TABELA e coluna (não só pela coluna: `status` é de campanha numa tela e de denúncia
// em outra). Valor fora da lista aparece como foi gravado.
const ROTULO_VALOR: Partial<Record<string, Partial<Record<string, string>>>> = {
  'campanha.status': ROTULO_STATUS_CAMPANHA,
  'campanha.modelo': ROTULO_MODELO_CAMPANHA,
  'denuncia.status': ROTULO_STATUS_DENUNCIA,
  'denuncia.contestacao_status': ROTULO_STATUS_CONTESTACAO,
  'motivo_denuncia.tipo': ROTULO_TIPO_MOTIVO_DENUNCIA,
  'perfil_pesquisador.status_pesquisador': ROTULO_STATUS_PESQUISADOR,
  'perfil_pesquisador.titulo_academico': ROTULO_TITULO_ACADEMICO,
  'perfil_pesquisador.tipo_vinculo': ROTULO_TIPO_VINCULO,
  'perfil_pesquisador.tipo_chave_pix': ROTULO_TIPO_CHAVE_PIX,
  'modelo_mensagem.canal': ROTULO_CANAL_NOTIFICACAO,
  'solicitacao_encerramento.status': ROTULO_STATUS_ENCERRAMENTO,
  'contribuicao.status': ROTULO_STATUS_CONTRIBUICAO,
  'contribuicao.meio_pagamento': ROTULO_MEIO_PAGAMENTO,
  'repasse.status': ROTULO_STATUS_REPASSE,
  'termos_de_uso.tipo': ROTULO_TIPO_TERMO,
};

const COLUNAS_DINHEIRO = new Set([
  'campanha.meta_financeira',
  'campanha.valor_bruto_arrecadado',
  'contribuicao.valor',
  'contribuicao.taxa_pagamento',
  'repasse.valor_bruto',
  'repasse.valor_liquido',
]);

export function valorDaColuna(tabela: string, coluna: string, valor: string | number): string {
  const chave = `${tabela}.${coluna}`;
  if (COLUNAS_DINHEIRO.has(chave)) {
    return formatarMoeda(valor);
  }
  if (chave === 'modelo_mensagem.tipo_evento') {
    return rotuloTipoNotificacao(String(valor));
  }
  return ROTULO_VALOR[chave]?.[String(valor)] ?? String(valor);
}

export function nomeDaColuna(tabela: string, coluna: string): string {
  const nome = NOME_COLUNA_TABELA[`${tabela}.${coluna}`] ?? NOME_COLUNA[coluna];
  if (nome !== undefined) {
    return nome;
  }
  const legivel = coluna.replaceAll('_', ' ');
  return legivel.charAt(0).toUpperCase() + legivel.slice(1);
}
