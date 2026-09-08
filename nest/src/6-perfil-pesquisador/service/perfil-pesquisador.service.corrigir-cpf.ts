import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'kysely';
import {
  calcularHashCpf,
  cifrarCpf,
  normalizarCpf,
} from '../../commons/seguranca/cpf-cifra.util';
import { DatabaseService } from '../../commons/database/database.service';
import { PerfilPesquisadorRequestCorrigirCpf } from '../dto/request/perfil-pesquisador.request-corrigir-cpf';

// corrigir_cpf_pesquisador() (03_funcoes_seguranca.sql, [03-Q]) existia no
// banco desde 22-08-2026, mas nenhum endpoint do Nest nunca chamava ela -
// achado (07-09-2026) junto do pedido de dar ao Admin poder de ver/alterar
// todos os campos do pesquisador na Bancada do Pesquisador (Campo de
// Testes, hoje parte permanente do painel).
@Injectable()
export class PerfilPesquisadorServiceCorrigirCpf {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idUsuario: number,
    dto: PerfilPesquisadorRequestCorrigirCpf,
  ): Promise<void> {
    const cpfNormalizado = normalizarCpf(dto.cpf);
    const cpfCriptografado = cifrarCpf(cpfNormalizado);
    const cpfHash = calcularHashCpf(cpfNormalizado);

    try {
      const resultado = await sql<{
        corrigir_cpf_pesquisador: boolean;
      }>`SELECT public.corrigir_cpf_pesquisador(${idUsuario}, ${cpfCriptografado}, ${cpfHash})`.execute(
        this.database.getDb(),
      );
      if (resultado.rows[0]?.corrigir_cpf_pesquisador !== true) {
        throw new NotFoundException('Perfil de pesquisador não encontrado.');
      }
    } catch (erro) {
      if (erro instanceof NotFoundException) {
        throw erro;
      }
      // A única RAISE EXCEPTION dentro da função é a checagem de permissão
      // (sem ERRCODE customizado, código P0001) - um 23505 de verdade (CPF
      // já pertence a outra conta, UK_PERFIL_PESQUISADOR_CPF_HASH) tem
      // código diferente e segue pro PostgresExceptionFilter global, não é
      // interceptado aqui.
      if ((erro as { code?: string }).code === 'P0001') {
        throw new ForbiddenException(
          (erro as Error).message ||
            'Sem permissão para corrigir CPF de pesquisador.',
        );
      }
      throw erro;
    }
  }
}
