import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoResponse } from '../dto/response/termo-uso.response';

// Tornar UMA versão específica a vigente do seu tipo (13-09-2026, ação nova
// - separada de Criar, que a partir de agora NUNCA ativa sozinha, ver
// TermoUsoServiceCriar). Fluxo real, pedido do Lucas: cria-se um rascunho,
// a "staff" revisa (procura erro de português etc.), e SÓ DEPOIS um
// administrador vem aqui e torna essa versão a vigente manualmente - nunca
// automático.
//
// 2 writes na MESMA transação por requisição (GlobalDbInterceptor, mesmo
// padrão de campanha.service.rejeitar.ts) - desativa a vigente atual DO
// MESMO TIPO (excluindo o próprio alvo - se o alvo já for o vigente, isto é
// idempotente, não desativa e reativa à toa) e ativa o alvo. Funciona tanto
// pra promover um rascunho novo quanto pra REVERTER pra uma versão antiga
// (reativar algo já usado no passado) - nenhuma restrição de "já foi
// aceita" aqui, essa trava é só de TermoUsoServiceAlterar (editar
// conteúdo), não de "qual está vigente agora".
@Injectable()
export class TermoUsoServiceAtivar {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<TermoUsoResponse> {
    const alvo = await this.database
      .getDb()
      .selectFrom('termos_de_uso')
      .select(['id_termo', 'tipo'])
      .where('id_termo', '=', id)
      .executeTakeFirst();

    if (!alvo) {
      throw new NotFoundException('Versão de Termos de Uso não encontrada.');
    }

    await this.database
      .getDb()
      .updateTable('termos_de_uso')
      .set({ ativo: false })
      .where('tipo', '=', alvo.tipo)
      .where('ativo', '=', true)
      .where('id_termo', '!=', id)
      .execute();

    const linha = await this.database
      .getDb()
      .updateTable('termos_de_uso')
      .set({ ativo: true })
      .where('id_termo', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!linha) {
      // pol_termos_update exige 'termos_uso_gerenciar' - se o UPDATE não
      // afetou nada apesar do SELECT acima ter achado a linha (pol_termos_
      // select é USING(true)), é falta de permissão, não inexistência.
      throw new ForbiddenException(
        "Sem permissão 'termos_uso_gerenciar' para tornar esta versão vigente.",
      );
    }

    return {
      idTermo: linha.id_termo,
      tipo: linha.tipo,
      versao: linha.versao,
      conteudo: linha.conteudo,
      ativo: linha.ativo,
      criadoEm: linha.criado_em,
    };
  }
}
