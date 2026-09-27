// Mensagem do 409 quando um item não pode ser excluído porque está em uso (chave estrangeira sem CASCADE): diz
// ONDE e QUANTAS vezes, com singular/plural certos ("em uso em 2 perfis e 1 recompensa"). As contagens passam
// pela RLS: quem exclui catálogo é administrador e enxerga tudo; se mesmo assim nada for contado, a frase diz
// só "em outros registros" em vez de "em uso em 0".
export interface UsoDoItem {
  quantidade: number;
  singular: string;
  plural: string;
}

export interface ItemEmUso {
  // Ex.: "esta área de conhecimento", "este tipo de link".
  descricao: string;
  // Pronome de "Desative-o"/"Desative-a".
  pronome: 'o' | 'a';
}

export function mensagemExclusaoEmUso(
  item: ItemEmUso,
  usos: UsoDoItem[],
): string {
  const partes = usos
    .filter((uso) => uso.quantidade > 0)
    .map(
      (uso) =>
        `${uso.quantidade} ${uso.quantidade === 1 ? uso.singular : uso.plural}`,
    );
  const lista =
    partes.length === 0
      ? 'outros registros'
      : partes.length === 1
        ? partes[0]
        : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
  return `Não é possível excluir: ${item.descricao} está em uso em ${lista}. Desative-${item.pronome} em vez de excluir.`;
}
