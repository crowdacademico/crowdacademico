import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export function conferirIdsUnicos(ids: number[]): void {
  if (new Set(ids).size !== ids.length) {
    throw new BadRequestException('O mesmo item apareceu duas vezes.');
  }
}

// A RLS (permissão score_editar) filtra sem erro: 0 linhas é falta de permissão; menos linhas que o pedido é item
// que não existe.
export function conferirLinhas(alteradas: number, pedidas: number): void {
  if (alteradas === 0) {
    throw new ForbiddenException('Sem permissão para editar o score.');
  }
  if (alteradas < pedidas) {
    throw new NotFoundException(
      'Um dos itens não existe mais. Recarregue a tela.',
    );
  }
}
