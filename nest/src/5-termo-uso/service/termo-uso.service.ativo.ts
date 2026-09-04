import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoResponseAtivo } from '../dto/response/termo-uso.response-ativo';

// pol_termos_select (04_rls_policies.sql) é USING(true) - leitura pública de
// propósito, precisa ser lida até por quem ainda não tem sessão nenhuma (a
// tela de Cadastro é o próprio caso de uso). uq_termos_uso_ativo (02)
// garante que existe no máximo 1 linha com ativo = TRUE por vez, então
// "a versão ativa" é sempre não-ambígua.
@Injectable()
export class TermoUsoServiceAtivo {
  constructor(private readonly database: DatabaseService) {}

  async executar(): Promise<TermoUsoResponseAtivo> {
    const termo = await this.database
      .getDb()
      .selectFrom('termos_de_uso')
      .select(['id_termo', 'versao', 'conteudo'])
      .where('ativo', '=', true)
      .executeTakeFirst();

    if (!termo) {
      // Não deveria acontecer num ambiente seedado - sinalizado alto (500
      // viraria 404 aqui) em vez de deixar o Cadastro seguir sem termo
      // nenhum pra aceitar.
      throw new NotFoundException(
        'Nenhuma versão de Termos de Uso está ativa no momento.',
      );
    }

    return {
      idTermo: termo.id_termo,
      versao: termo.versao,
      conteudo: termo.conteudo,
    };
  }
}
