import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { SessaoResponseDto } from '../dto/response/sessao.response.dto';

// Minha Conta > Segurança > Sessões Ativas (09-08-2026, Bloco E do prompt
// do Claude Web — "o item de maior impacto percebido nesta lista
// inteira"). `sessao` (pol_sessao_all, USING(true)) não filtra por dono na
// RLS — a autorização de "só as suas sessões" é feita AQUI, no WHERE, não
// no banco (mesmo raciocínio já documentado em auth.service.refresh.ts).
// NUNCA aceitar id_usuario vindo de fora — sempre o id de quem está logado.
@Injectable()
export class AuthServiceListarSessoes {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idUsuario: number,
    idSessaoAtual: number,
  ): Promise<SessaoResponseDto[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('sessao')
      .select([
        'id_sessao',
        'criado_em',
        'expira_em',
        'ip',
        'user_agent',
        'origem',
      ])
      .where('id_usuario', '=', idUsuario)
      .where('revogado_em', 'is', null)
      .where('expira_em', '>', new Date())
      .orderBy('criado_em', 'desc')
      .execute();

    return linhas.map((linha) => ({
      idSessao: linha.id_sessao,
      criadoEm: linha.criado_em,
      expiraEm: linha.expira_em,
      ip: linha.ip,
      userAgent: linha.user_agent,
      origem: linha.origem,
      atual: linha.id_sessao === idSessaoAtual,
    }));
  }
}
