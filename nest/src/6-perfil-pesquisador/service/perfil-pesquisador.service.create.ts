import { Injectable } from '@nestjs/common';
import {
  calcularHashCpf,
  cifrarCpf,
  normalizarCpf,
} from '../../commons/seguranca/cpf-cifra.util';
import { DatabaseService } from '../../commons/database/database.service';
import { PERFIL_PESQUISADOR_COLUNAS_SELECT } from '../constants/perfil-pesquisador.constants';
import { PerfilPesquisadorConverter } from '../dto/converter/perfil-pesquisador.converter';
import { PerfilPesquisadorRequestCreate } from '../dto/request/perfil-pesquisador.request-create';
import { PerfilPesquisadorResponse } from '../dto/response/perfil-pesquisador.response';

// "Tornar-se pesquisador" - upgrade de conta comum (não é admin criando pra
// outra pessoa, é a própria pessoa se declarando pesquisadora, mesmo
// espírito de AuthServiceCadastro pro cadastro inicial). id_usuario nunca
// vem do dto, sempre do controller (request.user.idUsuario).
//
// Duas UNIQUE constraints podem disparar 23505 aqui - a PK (id_usuario, se a
// pessoa já tem perfil) e UK_PERFIL_PESQUISADOR_CPF_HASH (se o CPF já
// pertence a outra conta). Nenhum try/catch próprio aqui: o
// PostgresExceptionFilter global (commons/database) já traduz 23505 pra 409
// com mensagem genérica, e diferenciar as duas causas por nome de
// constraint precisa de um Postgres de verdade rodando pra confirmar o
// formato exato do erro do driver `pg` - não dá pra testar isso neste
// ambiente (sem banco conectado). Ver DOCUMENTACAO_BD.md se um dia isso
// virar um problema real (mensagem genérica demais pro usuário).
@Injectable()
export class PerfilPesquisadorServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    dto: PerfilPesquisadorRequestCreate,
    idUsuario: number,
  ): Promise<PerfilPesquisadorResponse> {
    const cpfNormalizado = normalizarCpf(dto.cpf);
    const cpfCriptografado = cifrarCpf(cpfNormalizado);
    const cpfHash = calcularHashCpf(cpfNormalizado);

    const db = this.database.getDb();

    // Institucional exige vinculoInstitucional preenchido (validado no DTO);
    // independente precisa gravar NULL de verdade (nunca string vazia) -
    // CK_PERFIL_VINCULO (01) é quem barra qualquer outra combinação.
    const linha = await db
      .insertInto('perfil_pesquisador')
      .values({
        id_usuario: idUsuario,
        cpf_criptografado: cpfCriptografado,
        cpf_hash: cpfHash,
        tipo_vinculo: dto.tipoVinculo,
        vinculo_institucional:
          dto.tipoVinculo === 'institucional'
            ? dto.vinculoInstitucional!
            : null,
        titulo_academico: dto.tituloAcademico,
      })
      .returning(PERFIL_PESQUISADOR_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();

    // trg_perfil_atribui_papel_pesquisador (05) já atribuiu o papel
    // 'pesquisador' sozinha, AFTER INSERT - nada a fazer aqui.

    // Quem acabou de criar o próprio perfil sempre vê o próprio CPF de
    // volta (é o dono, não precisa da permissão de sensível pra isso -
    // mesma lógica de "ver o próprio e-mail" em qualquer outra tela).
    return PerfilPesquisadorConverter.paraResponseDto(linha, cpfNormalizado);
  }
}
