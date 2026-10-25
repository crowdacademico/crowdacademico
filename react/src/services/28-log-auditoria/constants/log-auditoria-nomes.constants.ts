// O nome que a tela mostra para cada coluna do banco no histórico de alterações ("Ver log"): quem lê o log vê "Motivo
// da suspensão", não "motivo_suspensao". Pelo nome da coluna, não da tabela: a mesma coluna (criado_em, ativo,
// descricao...) tem o mesmo nome em todas. Cobre as tabelas que o log registra (fn_log_auditoria, 05). "(id)" diz que
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
  email_verificado: 'E-mail confirmado',
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
  regex: 'Formato (regex)',
  dominio: 'Domínios',
  permite_perfil: 'Aceito no perfil',
  permite_atualizacao: 'Aceito em atualização',
  permite_recompensa: 'Aceito em recompensa',
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
  data_fim: 'Fim',
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
  // Pontuação
  id_score_config: 'Item da pontuação (id)',
  peso: 'Peso',
  id_rotulo: 'Faixa (id)',
  rotulo: 'Faixa',
  score_minimo: 'Pontuação mínima',
  score_maximo: 'Pontuação máxima',
};

export function nomeDaColuna(coluna: string): string {
  const nome = NOME_COLUNA[coluna];
  if (nome !== undefined) {
    return nome;
  }
  const legivel = coluna.replaceAll('_', ' ');
  return legivel.charAt(0).toUpperCase() + legivel.slice(1);
}
