import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { decifrarCpf } from '../../commons/seguranca/cpf-cifra.util';
import { DatabaseService } from '../../commons/database/database.service';
import { PERFIL_PESQUISADOR_COLUNAS_SELECT } from '../constants/perfil-pesquisador.constants';
import { PerfilPesquisadorConverter } from '../dto/converter/perfil-pesquisador.converter';
import { PerfilPesquisadorResponse } from '../dto/response/perfil-pesquisador.response';

@Injectable()
export class PerfilPesquisadorServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  // `idUsuarioAutenticado` vem de request.user.idUsuario - usado só pra
  // decidir se quem pediu é o próprio dono (dono sempre vê o próprio CPF,
  // sem precisar da permissão de sensível, mesma lógica de "ver o próprio
  // e-mail"). pol_perfil_select (04) usa public.usuario_visivel(), não
  // filtra por dono - QUALQUER sessão pode consultar o perfil de QUALQUER
  // pesquisador (perfil de pesquisador é público de propósito, é o que
  // aparece na página de campanha/perfil). O que muda por dono/permissão é
  // só se o CPF cifrado é decifrado na resposta ou vira `null`.
  async executar(
    idUsuarioAlvo: number,
    idUsuarioAutenticado: number | null,
  ): Promise<PerfilPesquisadorResponse> {
    const db = this.database.getDb();

    const linha = await db
      .selectFrom('perfil_pesquisador')
      .select(PERFIL_PESQUISADOR_COLUNAS_SELECT)
      .where('id_usuario', '=', idUsuarioAlvo)
      .executeTakeFirst();

    if (!linha) {
      throw new NotFoundException('Perfil de pesquisador não encontrado.');
    }

    const podeVerCpf = await this.podeVerCpfSensivel(
      idUsuarioAlvo,
      idUsuarioAutenticado,
    );
    const cpfDecifrado = podeVerCpf
      ? decifrarCpf(linha.cpf_criptografado)
      : null;

    return PerfilPesquisadorConverter.paraResponseDto(linha, cpfDecifrado);
  }

  private async podeVerCpfSensivel(
    idUsuarioAlvo: number,
    idUsuarioAutenticado: number | null,
  ): Promise<boolean> {
    if (
      idUsuarioAutenticado !== null &&
      idUsuarioAutenticado === idUsuarioAlvo
    ) {
      return true;
    }
    // tem_permissao() é EXECUTE-ável por app_nestjs sem GRANT explícito
    // (default do Postgres pra função nova, nunca revogado - ver comentário
    // em 06_grants.sql perto de contar_seguidores_pesquisador). Lê
    // id_usuario_atual() do próprio contexto de sessão (SET LOCAL já feito
    // pelo GlobalDbInterceptor), não precisa receber o id como parâmetro.
    const resultado = await sql<{
      tem_permissao: boolean;
    }>`SELECT public.tem_permissao('perfil_pesquisador_visualizar_sensivel') AS tem_permissao`.execute(
      this.database.getDb(),
    );
    return resultado.rows[0]?.tem_permissao ?? false;
  }
}
