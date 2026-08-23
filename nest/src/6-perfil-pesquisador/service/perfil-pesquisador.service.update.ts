import { Injectable, NotFoundException } from '@nestjs/common';
import { decifrarCpf } from '../../commons/seguranca/cpf-cifra.util';
import { DatabaseService } from '../../commons/database/database.service';
import { PERFIL_PESQUISADOR_COLUNAS_SELECT } from '../constants/perfil-pesquisador.constants';
import { PerfilPesquisadorConverter } from '../dto/converter/perfil-pesquisador.converter';
import { PerfilPesquisadorRequestUpdate } from '../dto/request/perfil-pesquisador.request-update';
import { PerfilPesquisadorResponse } from '../dto/response/perfil-pesquisador.response';

// Nunca mexe em cpf_criptografado/cpf_hash (DTO nem tem o campo) — GRANT
// UPDATE (06) nem libera mais isso pro app_nestjs de propósito, ver
// PerfilPesquisadorRequestUpdate.
@Injectable()
export class PerfilPesquisadorServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idUsuario: number,
    dto: PerfilPesquisadorRequestUpdate,
  ): Promise<PerfilPesquisadorResponse> {
    const db = this.database.getDb();

    const linha = await db
      .updateTable('perfil_pesquisador')
      .set({
        tipo_vinculo: dto.tipoVinculo,
        vinculo_institucional:
          dto.tipoVinculo === 'institucional'
            ? dto.vinculoInstitucional!
            : null,
        titulo_academico: dto.tituloAcademico,
      })
      .where('id_usuario', '=', idUsuario)
      .returning(PERFIL_PESQUISADOR_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      // pol_perfil_update (04) só libera UPDATE pro próprio dono — 0 linhas
      // sem erro é a RLS filtrando, mesmo padrão de motivo-denuncia.service.
      // update.ts. Como quem chama este service é sempre o próprio dono
      // (ver controller), 0 linhas aqui só acontece se a pessoa ainda não
      // tem perfil de pesquisador nenhum pra atualizar.
      throw new NotFoundException(
        'Perfil de pesquisador não encontrado — crie um perfil antes de editá-lo.',
      );
    }

    // Dono sempre vê o próprio CPF de volta (mesma regra do create/findone).
    return PerfilPesquisadorConverter.paraResponseDto(
      linha,
      decifrarCpf(linha.cpf_criptografado),
    );
  }
}
