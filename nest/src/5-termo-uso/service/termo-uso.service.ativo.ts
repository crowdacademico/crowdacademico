import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoResponseAtivo } from '../dto/response/termo-uso.response-ativo';
import type { TipoTermo } from '../../commons/database/db.types';

// pol_termos_select (04_rls_policies.sql) é USING(true) - leitura pública de
// propósito, precisa ser lida até por quem ainda não tem sessão nenhuma (a
// tela de Cadastro é o próprio caso de uso). uq_termos_uso_ativo (02)
// garante no máximo 1 linha ativa POR TIPO (13-09-2026, antes era 1 no
// sistema inteiro) - por isso `executar` agora exige `tipo`: "a versão
// ativa" só é não-ambígua depois de dizer QUAL das 2 trilhas (cadastro/
// contribuicao) se quer.
@Injectable()
export class TermoUsoServiceAtivo {
  constructor(private readonly database: DatabaseService) {}

  async executar(tipo: TipoTermo): Promise<TermoUsoResponseAtivo> {
    const termo = await this.database
      .getDb()
      .selectFrom('termos_de_uso')
      .select(['id_termo', 'tipo', 'versao', 'conteudo'])
      .where('tipo', '=', tipo)
      .where('ativo', '=', true)
      .executeTakeFirst();

    if (!termo) {
      // Não deveria acontecer num ambiente seedado - sinalizado alto (500
      // viraria 404 aqui) em vez de deixar o Cadastro/Contribuição seguir
      // sem termo nenhum pra aceitar.
      throw new NotFoundException(
        `Nenhuma versão de Termos de Uso do tipo "${tipo}" está ativa no momento.`,
      );
    }

    return {
      idTermo: termo.id_termo,
      tipo: termo.tipo,
      versao: termo.versao,
      conteudo: termo.conteudo,
    };
  }
}
