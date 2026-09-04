import { IsInt } from 'class-validator';

// Vincula um arquivo (já enviado - id_arquivo vem do módulo 25-arquivo,
// hoje só uma pasta vazia, ainda não construído pela Alexia) a uma
// atualização de campanha. Este endpoint já funciona (INSERT normal na
// tabela de associação), só não há como testar de ponta a ponta até
// existir um jeito real de subir arquivo e conseguir um id_arquivo válido.
export class ArquivoAtualizacaoRequestCreate {
  @IsInt()
  idArquivo: number;

  @IsInt()
  idAtualizacao: number;
}
