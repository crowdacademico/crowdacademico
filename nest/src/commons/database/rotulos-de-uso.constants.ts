// Como cada tabela aparece na mensagem "não é possível excluir: ... está em uso em N <rótulo>"
// (excluir-com-contagem-de-uso.util.ts). Chave: a tabela que APONTA para o item (dona da chave estrangeira).
// Tabela que ainda não está aqui aparece pelo nome técnico ("3 registros em nome_da_tabela"): quando um módulo
// novo criar uma chave estrangeira para um catálogo, basta acrescentar a linha dela.
export interface RotuloDeUso {
  singular: string;
  plural: string;
}

export const ROTULO_DE_USO_POR_TABELA: Readonly<Record<string, RotuloDeUso>> = {
  campanha: { singular: 'campanha', plural: 'campanhas' },
  denuncia: { singular: 'denúncia', plural: 'denúncias' },
  link_academico: { singular: 'perfil', plural: 'perfis' },
  link_atualizacao: { singular: 'atualização', plural: 'atualizações' },
  link_recompensa: { singular: 'recompensa', plural: 'recompensas' },
};

export function rotuloDeUso(tabela: string): RotuloDeUso {
  return (
    ROTULO_DE_USO_POR_TABELA[tabela] ?? {
      singular: `registro em ${tabela}`,
      plural: `registros em ${tabela}`,
    }
  );
}
