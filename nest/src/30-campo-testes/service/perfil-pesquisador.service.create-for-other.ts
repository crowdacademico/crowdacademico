import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import {
  calcularHashCpf,
  cifrarCpf,
  normalizarCpf,
} from '../../commons/seguranca/cpf-cifra.util';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoServiceFindActive } from '../../5-termo-uso/service/termo-uso.service.find-active';
import { PerfilPesquisadorRequestCreateForOther } from '../dto/perfil-pesquisador.request-create-for-other';
import { PerfilPesquisadorResponse } from '../../6-perfil-pesquisador/dto/response/perfil-pesquisador.response';
import { PerfilPesquisadorServiceFindOne } from '../../6-perfil-pesquisador/service/perfil-pesquisador.service.findone';

// criar_perfil_pesquisador_para_outro() (03_funcoes_seguranca.sql, [03-P-2]): o self-service
// (PerfilPesquisadorServiceCreate) sempre cria em nome de quem está logado (pol_perfil_insert, 04, exige
// id_usuario = id_usuario_atual()), então Admin tentando criar perfil para OUTRA pessoa sempre colidiria com o
// PRÓPRIO perfil do Admin (já existe), sem nunca criar nada de verdade para ninguém. Endpoint separado, gateado
// por permissão própria ('perfil_pesquisador_criar_para_outro'); o self-service não o usa.
//
// Aceite do Termo de Uso: o Upgrade do T1 (Bancada do Pesquisador) mostra o Termo vigente antes do formulário
// para QUALQUER conta, mesmo a de outra pessoa; o aceite é gravado em nome do ALVO (`registrar_aceite_termo` é
// SECURITY DEFINER, então grava por qualquer id_usuario passado, não só o da sessão atual). Só grava quando
// `dto.aceiteTermos` vem `true`.
@Injectable()
export class PerfilPesquisadorServiceCreateForOther {
  constructor(
    private readonly database: DatabaseService,
    private readonly findOne: PerfilPesquisadorServiceFindOne,
    private readonly termoUsoServiceAtivo: TermoUsoServiceFindActive,
  ) {}

  async executar(
    idUsuarioAlvo: number,
    dto: PerfilPesquisadorRequestCreateForOther,
    idUsuarioAutenticado: number,
    ip: string | undefined,
  ): Promise<PerfilPesquisadorResponse> {
    const cpfNormalizado = normalizarCpf(dto.cpf);
    const cpfCriptografado = cifrarCpf(cpfNormalizado);
    const cpfHash = calcularHashCpf(cpfNormalizado);
    const vinculoInstitucional =
      dto.tipoVinculo === 'institucional'
        ? (dto.vinculoInstitucional ?? null)
        : null;
    const db = this.database.getDb();

    await sql`
      SELECT public.criar_perfil_pesquisador_para_outro(
        ${idUsuarioAlvo},
        ${cpfCriptografado},
        ${cpfHash},
        ${dto.tipoVinculo}::tipo_vinculo,
        ${vinculoInstitucional},
        ${dto.tituloAcademico}::titulo_academico
      )
    `.execute(db);

    if (dto.aceiteTermos) {
      const termoAtivo = await this.termoUsoServiceAtivo.executar(
        'upgrade_pesquisador',
      );
      await sql`SELECT public.registrar_aceite_termo(${idUsuarioAlvo}, ${termoAtivo.idTermo}, ${ip ?? null})`.execute(
        db,
      );
    }

    return this.findOne.executar(idUsuarioAlvo, idUsuarioAutenticado);
  }
}
