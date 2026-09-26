import { colunaId } from './1-coluna-id';
import { colunaNome } from './2-coluna-nome';
import { colunaTexto } from './3-coluna-texto';
import { colunaNumero } from './4-coluna-numero';
import { colunaSimNao } from './5-coluna-sim-nao';
import { colunaStatus } from './6-coluna-status';
import { colunaDinheiro } from './7-coluna-dinheiro';
import { colunaData, colunaDataHora } from './8-coluna-data';
import type { TipoColuna } from './tipo-coluna.type';

// Catálogo dos tipos de coluna que a GenericTable aceita em `coluna.tipo`. Ações não está aqui: não é coluna
// de dado, a tabela monta sozinha a partir de `acoes` (ver 9-coluna-acoes.tsx).
export const TIPOS_COLUNA = {
  id: colunaId,
  nome: colunaNome,
  texto: colunaTexto,
  numero: colunaNumero,
  simNao: colunaSimNao,
  status: colunaStatus,
  dinheiro: colunaDinheiro,
  data: colunaData,
  dataHora: colunaDataHora,
} satisfies Record<string, TipoColuna>;

export type NomeTipoColuna = keyof typeof TIPOS_COLUNA;
