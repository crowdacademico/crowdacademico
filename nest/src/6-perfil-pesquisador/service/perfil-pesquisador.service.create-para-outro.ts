import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import {
  calcularHashCpf,
  cifrarCpf,
  normalizarCpf,
} from '../../commons/seguranca/cpf-cifra.util';
import { DatabaseService } from '../../commons/database/database.service';
import { TermoUsoServiceAtivo } from '../../5-termo-uso/service/termo-uso.service.ativo';
import { PerfilPesquisadorRequestCreateParaOutro } from '../dto/request/perfil-pesquisador.request-create-para-outro';
import { PerfilPesquisadorResponse } from '../dto/response/perfil-pesquisador.response';
import { PerfilPesquisadorServiceFindOne } from './perfil-pesquisador.service.findone';

// criar_perfil_pesquisador_para_outro() (03_funcoes_seguranca.sql, [03-R])
// - achado (07-09-2026) testando "promover outro usuário" na Bancada do
// Pesquisador: o self-service (PerfilPesquisadorServiceCreate) sempre cria
// em nome de quem está logado - pol_perfil_insert (04) exige id_usuario =
// id_usuario_atual(), então Admin tentando criar perfil pra OUTRA pessoa
// sempre colidia com o PRÓPRIO perfil do Admin (já existe), sem nunca
// criar nada de verdade pra ninguém. Endpoint separado, gateado por
// permissão própria ('perfil_pesquisador_criar_para_outro') - o
// self-service continua exatamente como estava.
//
// Aceite do Termo de Uso, OPCIONAL (14-09-2026, pedido do Lucas: o
// cadeado em T1 - Bancada do Pesquisador deve mostrar o Termo de Uso
// vigente antes do formulário pra QUALQUER conta, mesmo a de outra
// pessoa - o aceite é gravado em nome do ALVO, `registrar_aceite_termo`
// é SECURITY DEFINER, então grava por qualquer id_usuario passado, não só
// o da sessão atual). Só grava quando `dto.aceiteTermos` vem `true` - o
// card "Criar Perfil Pesquisador" que já existe dentro de
// ModalAlterarUsuario não manda esse campo, então continua funcionando
// exatamente como antes, sem gravar aceite nenhum.
@Injectable()
export class PerfilPesquisadorServiceCreateParaOutro {
  constructor(
    private readonly database: DatabaseService,
    private readonly findOne: PerfilPesquisadorServiceFindOne,
    private readonly termoUsoServiceAtivo: TermoUsoServiceAtivo,
  ) {}

  async executar(
    idUsuarioAlvo: number,
    dto: PerfilPesquisadorRequestCreateParaOutro,
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

    try {
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
    } catch (erro) {
      // A única RAISE EXCEPTION dentro da função é a checagem de permissão
      // (sem ERRCODE customizado, código P0001) - PK duplicada (usuário já
      // tem perfil, 23505) ou FK inválida (id_usuario inexistente, 23503)
      // têm código diferente e seguem pro PostgresExceptionFilter global.
      if ((erro as { code?: string }).code === 'P0001') {
        throw new ForbiddenException(
          (erro as Error).message ||
            'Sem permissão para criar perfil de pesquisador em nome de outro usuário.',
        );
      }
      throw erro;
    }

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
