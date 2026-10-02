import { colunaId } from './1-coluna-id';
import { colunaNome } from './2-coluna-nome';
import { colunaTexto } from './3-coluna-texto';
import { colunaCurta } from './4-coluna-curta';
import { FORMATOS, type Formato } from './formatos';

// Um tipo de coluna da GenericTable = um FORMATO (formatos.tsx: como mostra, busca e ordena) + um ESPAÇO (os
// arquivos numerados: id, nome, texto, curta). A tela só diz o tipo (`tipo: 'dinheiro'`); largura e alinhamento
// ficam na classe CSS (5-crud.css). Ações não é tipo de coluna: a tabela monta sozinha a partir de `acoes`
// (5-coluna-acoes.tsx).
//
// `largura`: `conteudo` (nome, texto) cresce e quebra, com piso pelo maior valor da lista inteira, para a coluna
// não mudar ao virar a página; `curta` nunca quebra e divide a largura com as outras do mesmo tipo na tabela.
export interface TipoColuna extends Formato {
  classe: string;
  largura?: 'conteudo' | 'curta';
}

export const TIPOS_COLUNA = {
  id: colunaId,
  nome: colunaNome,
  texto: colunaTexto,
  numero: colunaCurta(FORMATOS.numero),
  simNao: colunaCurta(FORMATOS.simNao),
  status: colunaCurta(FORMATOS.texto),
  // Código de formato fixo (ex.: código CNPq "1.00.00.00-3"): curto e centralizado como status, sem quebrar.
  codigo: colunaCurta(FORMATOS.texto),
  dinheiro: colunaCurta(FORMATOS.dinheiro),
  data: colunaCurta(FORMATOS.data),
  dataHora: colunaCurta(FORMATOS.dataHora),
  espera: colunaCurta(FORMATOS.espera),
} satisfies Record<string, TipoColuna>;

export type NomeTipoColuna = keyof typeof TIPOS_COLUNA;
