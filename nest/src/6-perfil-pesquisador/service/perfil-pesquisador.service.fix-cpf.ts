import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import {
  calcularHashCpf,
  cifrarCpf,
  normalizarCpf,
} from '../../commons/seguranca/cpf-cifra.util';
import { DatabaseService } from '../../commons/database/database.service';
import { PerfilPesquisadorRequestFixCpf } from '../dto/request/perfil-pesquisador.request-fix-cpf';

// Chama corrigir_cpf_pesquisador() (03_funcoes_seguranca.sql, [03-Q]): correção de CPF por Admin/suporte, na
// Bancada do Pesquisador do painel.
@Injectable()
export class PerfilPesquisadorServiceFixCpf {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idUsuario: number,
    dto: PerfilPesquisadorRequestFixCpf,
  ): Promise<void> {
    const cpfNormalizado = normalizarCpf(dto.cpf);
    const cpfCriptografado = cifrarCpf(cpfNormalizado);
    const cpfHash = calcularHashCpf(cpfNormalizado);

    const resultado = await sql<{
      corrigir_cpf_pesquisador: boolean;
    }>`SELECT public.corrigir_cpf_pesquisador(${idUsuario}, ${cpfCriptografado}, ${cpfHash})`.execute(
      this.database.getDb(),
    );
    if (resultado.rows[0]?.corrigir_cpf_pesquisador !== true) {
      throw new NotFoundException('Perfil de pesquisador não encontrado.');
    }
  }
}
