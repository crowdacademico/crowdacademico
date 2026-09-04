import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';

@Injectable()
export class AuthServiceEncerrarSessao {
  constructor(private readonly database: DatabaseService) {}

  // Encerra UMA sessão - sempre `.where('id_usuario', '=', idUsuario)`
  // junto do id_sessao, nunca só o id_sessao sozinho: sem isso, qualquer
  // usuário logado poderia encerrar a sessão de QUALQUER outra pessoa só
  // adivinhando um id_sessao sequencial (sessao não tem RLS por dono, ver
  // comentário em auth.service.listar-sessoes.ts). 404 (não 403) se a
  // sessão não existir OU não for sua - não vaza se o id existe.
  async executarUma(idUsuario: number, idSessao: number): Promise<void> {
    const resultado = await this.database
      .getDb()
      .updateTable('sessao')
      .set({ revogado_em: new Date() })
      .where('id_sessao', '=', idSessao)
      .where('id_usuario', '=', idUsuario)
      .where('revogado_em', 'is', null)
      .executeTakeFirst();

    if (resultado.numUpdatedRows === 0n) {
      throw new NotFoundException('Sessão não encontrada.');
    }
  }

  // "Encerrar todas as outras" - tudo que é do usuário, ativo, EXCETO a
  // sessão que está fazendo esta própria requisição (idSessaoAtual, ver
  // usuario-autenticado.interface.ts). Devolve quantas foram encerradas
  // (0 é normal - não é erro, só não havia outra sessão ativa).
  async executarTodasMenosAtual(
    idUsuario: number,
    idSessaoAtual: number,
  ): Promise<number> {
    const resultado = await this.database
      .getDb()
      .updateTable('sessao')
      .set({ revogado_em: new Date() })
      .where('id_usuario', '=', idUsuario)
      .where('id_sessao', '!=', idSessaoAtual)
      .where('revogado_em', 'is', null)
      .executeTakeFirst();

    return Number(resultado.numUpdatedRows);
  }
}
