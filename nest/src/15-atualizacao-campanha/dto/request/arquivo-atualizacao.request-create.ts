import { IsInt } from 'class-validator';

// Vincula um arquivo (já enviado: id_arquivo vem do módulo 25-arquivo) a uma atualização de campanha (INSERT
// normal na tabela de associação).
export class ArquivoAtualizacaoRequestCreate {
  @IsInt()
  idArquivo: number;

  @IsInt()
  idAtualizacao: number;
}
