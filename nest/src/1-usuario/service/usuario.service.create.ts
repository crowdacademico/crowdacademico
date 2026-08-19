import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { UsuarioRequestCreate } from '../dto/request/usuario.request-create';
import { UsuarioResponse } from '../dto/response/usuario.response';

const CUSTO_BCRYPT = 10;

@Injectable()
export class UsuarioServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: UsuarioRequestCreate): Promise<UsuarioResponse> {
    const senhaHash = await bcrypt.hash(dto.senha, CUSTO_BCRYPT);
    const db = this.database.getDb();

    // INSERT + atribuir_papel_padrao() não precisam mais abrir transação
    // própria aqui — a requisição inteira já roda dentro de UMA transação
    // aberta pelo GlobalDbInterceptor (commons/database), então as duas
    // chamadas abaixo já são atômicas por construção.
    const usuario = await db
      .insertInto('usuario')
      .values({ nome: dto.nome, email: dto.email, senha_hash: senhaHash })
      .returning(USUARIO_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    // SECURITY DEFINER (03_funcoes_seguranca.sql) — atribui o papel
    // 'usuario' padrão. Sem isso, o cadastro fica sem nenhum papel.
    await sql`SELECT public.atribuir_papel_padrao(${usuario.id_usuario})`.execute(
      db,
    );

    // OBSERVAÇÃO (provavelmente vai mudar): falta criar o registro em
    // verificacao_email e disparar o e-mail de confirmação — ficou de fora
    // de propósito nesta primeira versão, porque isso é território do
    // módulo 4-mail, não deste módulo 1-usuario. `email_verificado` fica
    // FALSE (o default da coluna) até esse fluxo existir.
    return UsuarioConverter.paraResponseDto(usuario);
  }
}
