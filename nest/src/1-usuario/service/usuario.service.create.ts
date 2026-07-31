import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { UsuarioConverter } from '../dto/converter/usuario.converter';
import { CriarUsuarioRequestDto } from '../dto/request/criar-usuario.request.dto';
import { UsuarioResponseDto } from '../dto/response/usuario.response.dto';
import { UsuarioEntity } from '../entity/usuario.entity';

const CUSTO_BCRYPT = 10;

@Injectable()
export class UsuarioServiceCreate {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async executar(dto: CriarUsuarioRequestDto): Promise<UsuarioResponseDto> {
    const senhaHash = await bcrypt.hash(dto.senha, CUSTO_BCRYPT);

    // INSERT + atribuir_papel_padrao() precisam estar na mesma transação
    // (ver tutorial-rodar-projeto.md, item 6) — um Client tirado do Pool,
    // não um pool.query() solto.
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const resultado = await client.query<UsuarioEntity>(
        `INSERT INTO usuario (nome, email, senha_hash)
         VALUES ($1, $2, $3)
         RETURNING id_usuario, nome, email, id_imagem_perfil, criado_em,
                   deletado, deletado_em, deletado_por, email_verificado,
                   tentativas_login_falhas, bloqueado_ate, ultimo_login_em,
                   ultimo_login_ip`,
        [dto.nome, dto.email, senhaHash],
      );
      const usuario = resultado.rows[0];

      // SECURITY DEFINER (03_funcoes_seguranca.sql) — atribui o papel
      // 'usuario' padrão. Sem isso, o cadastro fica sem nenhum papel.
      await client.query('SELECT public.atribuir_papel_padrao($1)', [
        usuario.id_usuario,
      ]);

      // OBSERVAÇÃO (provavelmente vai mudar): falta criar o registro em
      // verificacao_email e disparar o e-mail de confirmação — ficou de fora
      // de propósito nesta primeira versão, porque isso é território do
      // módulo 23-auth/24-mail, não deste módulo 1-usuario. `email_verificado`
      // fica FALSE (o default da coluna) até esse fluxo existir.
      await client.query('COMMIT');
      return UsuarioConverter.paraResponseDto(usuario);
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }
  }
}
