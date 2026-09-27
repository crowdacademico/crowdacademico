// Duplicidade (23505) por índice/constraint única violada: o Postgres informa o nome em `erro.constraint`, e o
// filtro global (postgres-exception.filter.ts) monta o 409 com a mensagem daqui e, quando há `campo`, com
// `campos: { <campo>: [mensagem] }`, para o formulário mostrar o erro embaixo do campo certo. `campo` é o nome
// da propriedade no corpo da requisição (camelCase, como no DTO). Índice fora do mapa: mensagem genérica.
//
// Um lugar só para todas as regras de "já existe": módulo novo com UNIQUE novo acrescenta a linha dele aqui, em
// vez de um `catch` próprio no service. Os índices de nome normalizado ignoram acentos, maiúsculas e espaços
// (02_indices.sql [02-C-1]), por isso a mensagem avisa.
export interface DuplicidadeConhecida {
  mensagem: string;
  campo?: string;
}

const SEM_DIFERENCA =
  '(acentos, maiúsculas e espaços não contam como diferença)';

export const DUPLICIDADE_POR_INDICE_UNICO: Readonly<
  Record<string, DuplicidadeConhecida>
> = {
  uq_tipo_link_nome_normalizado: {
    campo: 'nome',
    mensagem: `Já existe um tipo de link com esse nome ${SEM_DIFERENCA}.`,
  },
  uq_area_conhecimento_nome_normalizado: {
    campo: 'nome',
    mensagem: `Já existe uma área de conhecimento com esse nome dentro da mesma área-mãe ${SEM_DIFERENCA}.`,
  },
  uq_motivo_denuncia_descricao_normalizada: {
    campo: 'descricao',
    mensagem: `Já existe um motivo de denúncia com essa descrição para o mesmo tipo ${SEM_DIFERENCA}.`,
  },
  UK_TIPO_LINK_CODIGO: {
    campo: 'codigo',
    mensagem: 'Já existe um tipo de link com esse código.',
  },
  UK_AREA_CONHECIMENTO_CODIGO_CNPQ: {
    campo: 'codigoCnpq',
    mensagem: 'Já existe uma área de conhecimento com esse código CNPq.',
  },
  UK_CONFIGURACOES_CHAVE: {
    campo: 'chave',
    mensagem: 'Já existe uma configuração com essa chave.',
  },
  UK_TERMOS_DE_USO_TIPO_VERSAO: {
    campo: 'versao',
    mensagem:
      'Já existe uma versão de Termos de Uso com esse código neste tipo.',
  },
  UK_PAPEL_NOME: {
    campo: 'nome',
    mensagem: 'Já existe um papel com esse nome.',
  },
  UK_USUARIO_EMAIL: {
    campo: 'email',
    mensagem: 'Já existe uma conta com esse e-mail.',
  },
  UK_PERFIL_PESQUISADOR_CPF_HASH: {
    campo: 'cpf',
    mensagem: 'Já existe um perfil de pesquisador com esse CPF.',
  },
  PK_PERFIL_PESQUISADOR: {
    mensagem: 'Esta conta já tem perfil de pesquisador.',
  },
  UK_SEGUIR_CAMPANHA_USUARIO_CAMPANHA: {
    mensagem: 'Você já segue esta campanha.',
  },
  UK_SEGUIR_PESQUISADOR_USUARIO_PESQUISADOR: {
    mensagem: 'Você já segue este pesquisador.',
  },
  UK_COMENTARIO_CAMPANHA_PESQUISADOR: {
    mensagem: 'Este pesquisador já comentou nesta campanha.',
  },
  UK_DENUNCIA_USUARIO_CAMPANHA_ALVO: {
    mensagem: 'Você já denunciou esta campanha.',
  },
  UK_DENUNCIA_USUARIO_PESQUISADOR_ALVO: {
    mensagem: 'Você já denunciou este pesquisador.',
  },
  PK_PAPEL_PERMISSAO: { mensagem: 'Este papel já tem esta permissão.' },
  PK_USUARIO_PAPEL: { mensagem: 'Este usuário já tem este papel.' },
};
