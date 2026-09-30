// Para que serve cada papel, pelo `codigo` (fixo; o nome é renomeável pelo painel). Mesmo padrão do dicionário de
// permissões (permissao-nomes-amigaveis.constants.ts): só camada de exibição, sem coluna nova no banco. Os papéis
// nascem no seed (07_seed_dados.sql [07-B-1]) e o painel não cria papel novo.
//
// O texto resume o que o papel recebe na matriz Papel × Permissão do seed. Se alguém conceder ou revogar
// permissões pela tela, a matriz ao vivo continua sendo a verdade; este texto é a intenção do papel.
const DESCRICAO_PAPEL: Partial<Record<string, string>> = {
  admin:
    'Acesso total ao painel: usuários, papéis e permissões, parâmetros, catálogos, Termo de Uso, aprovação de campanhas, moderação e log.',
  moderador:
    'Cuida do conteúdo: responde denúncias, modera comentários e atualizações de campanha e pode encerrar uma campanha por moderação.',
  revisor: 'Cuida da reputação dos pesquisadores: vê e ajusta o score.',
  suporte:
    'Atende quem tem problema para entrar: desbloqueia login, encerra sessões, reenvia a verificação de e-mail e cancela pedidos de recuperação de senha.',
  curador:
    'Cuida dos catálogos e dos textos oficiais: áreas do conhecimento, tipos de link, motivos de denúncia e versões do Termo de Uso.',
  pesquisador:
    'Recebido no upgrade para pesquisador: cria e gerencia as próprias campanhas. Não dá acesso ao que é de outras pessoas.',
  usuario: 'Papel de toda conta cadastrada. Sozinho, não libera nenhuma área de administração.',
};

// Papel sem entrada (criado fora do seed) fica sem descrição: nunca quebra a tela.
export function descricaoPapel(codigo: string): string | undefined {
  return DESCRICAO_PAPEL[codigo];
}
