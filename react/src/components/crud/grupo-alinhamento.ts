// Grupo de alinhamento (prop `grupoAlinhamento` da GenericTable, opcional): tabelas com as MESMAS colunas, uma embaixo
// da outra (Estúdio > Campanhas ativas e encerradas), passam a ter as colunas na mesma posição. Sem o grupo, cada
// tabela mede o próprio conteúdo e as duas nunca coincidem (DS-104). Tabela sem a prop nem passa por aqui.
//
// O que o grupo divide entre as tabelas, sem nenhuma largura escrita à mão:
// - colunas curtas: cada uma fica com a MAIOR largura medida daquela coluna entre as tabelas do grupo;
// - respiro das colunas do meio: o MENOR entre as tabelas (o maior empurraria a tabela mais cheia para a rolagem);
// - ações só em ícone: se uma tabela precisou, todas ficam assim.
// O nome continua com a sobra; com o resto igual, ele também fica igual.
//
// As medidas são do CONTEÚDO (não da célula), então aplicar o resultado não muda a próxima medição: quando uma tabela
// publica um valor novo, as outras medem de novo uma vez e o grupo para.
export interface MembroGrupo {
  // Largura de conteúdo de cada coluna curta (chave da coluna -> px, sem respiro).
  curtas: Map<string, number>;
  // Respiro que esta tabela calculou sozinha; null quando ela não tem linhas (não opina).
  respiro: number | null;
  icone: boolean;
  atualizar: () => void;
}

const grupos = new Map<string, Set<MembroGrupo>>();
const agendados = new Set<MembroGrupo>();

export function entrarNoGrupo(nome: string, membro: MembroGrupo): () => void {
  const grupo = grupos.get(nome) ?? new Set<MembroGrupo>();
  grupo.add(membro);
  grupos.set(nome, grupo);
  return () => {
    grupo.delete(membro);
    agendados.delete(membro);
    if (grupo.size === 0) grupos.delete(nome);
    // Quem fica pode ter ficado maior por causa de quem saiu.
    avisarOutros(nome, membro);
  };
}

export function maiorCurta(nome: string, chave: string, propria: number): number {
  let maior = propria;
  grupos.get(nome)?.forEach((membro) => {
    maior = Math.max(maior, membro.curtas.get(chave) ?? 0);
  });
  return maior;
}

export function menorRespiro(nome: string, proprio: number | null): number | null {
  let menor = proprio;
  grupos.get(nome)?.forEach((membro) => {
    if (membro.respiro !== null) menor = menor === null ? membro.respiro : Math.min(menor, membro.respiro);
  });
  return menor;
}

export function alguemEmIcone(nome: string): boolean {
  return [...(grupos.get(nome) ?? [])].some((membro) => membro.icone);
}

// Pede às outras tabelas do grupo que meçam de novo, no próximo quadro (uma vez por quadro, mesmo com vários avisos).
export function avisarOutros(nome: string, quem: MembroGrupo) {
  grupos.get(nome)?.forEach((membro) => {
    if (membro === quem || agendados.has(membro)) return;
    agendados.add(membro);
    requestAnimationFrame(() => {
      if (!agendados.delete(membro)) return;
      membro.atualizar();
    });
  });
}
