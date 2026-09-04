import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TipoLinkConverter } from '../dto/converter/tipo-link.converter';
import { TipoLinkRequestCreate } from '../dto/request/tipo-link.request-create';
import { TipoLinkResponse } from '../dto/response/tipo-link.response';

const CODIGO_PG_UNIQUE_VIOLATION = '23505';
const CODIGO_PG_RLS_VIOLATION = '42501';

@Injectable()
export class TipoLinkServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: TipoLinkRequestCreate): Promise<TipoLinkResponse> {
    // Mesmos defaults do banco (01_extensoes_enums_tabelas.sql) -
    // calculados aqui (não só deixados pro DEFAULT do INSERT) porque
    // precisam entrar na checagem de CK_TIPO_LINK_ALGUM_ESCOPO logo
    // abaixo antes de gravar.
    const permitePerfil = dto.permitePerfil ?? true;
    const permiteAtualizacao = dto.permiteAtualizacao ?? false;
    const permiteRecompensa = dto.permiteRecompensa ?? false;

    if (!permitePerfil && !permiteAtualizacao && !permiteRecompensa) {
      throw new BadRequestException(
        'Pelo menos um escopo (permitePerfil, permiteAtualizacao ou permiteRecompensa) precisa ser verdadeiro.',
      );
    }

    // regex é NULLABLE - só validado quando informado (e não nulo).
    // dominio é NOT NULL DEFAULT '{}': não precisa de validação de
    // "vazio ou não", array vazio é um valor válido (tipo aceita
    // qualquer domínio).
    if (dto.regex !== undefined && dto.regex !== null) {
      validarRegex(dto.regex);
    }

    const db = this.database.getDb();
    try {
      const linha = await db
        .insertInto('tipo_link')
        .values({
          codigo: dto.codigo,
          nome: dto.nome,
          ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
          regex: dto.regex ?? null,
          // Omitido = cai no DEFAULT '{}' do banco (mesma lógica de
          // `ativo` acima) - dominio não aceita `null`, então não tem
          // fallback `?? null` aqui.
          ...(dto.dominio !== undefined ? { dominio: dto.dominio } : {}),
          permite_perfil: permitePerfil,
          permite_atualizacao: permiteAtualizacao,
          permite_recompensa: permiteRecompensa,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return TipoLinkConverter.paraResponseDto(linha);
    } catch (erro) {
      const codigoErro = (erro as { code?: string }).code;
      if (codigoErro === CODIGO_PG_UNIQUE_VIOLATION) {
        throw new ConflictException(
          `Já existe um tipo de link com o código "${dto.codigo}".`,
        );
      }
      if (codigoErro === CODIGO_PG_RLS_VIOLATION) {
        throw new ForbiddenException(
          "Sem permissão 'tipolink_gerenciar' para cadastrar tipo de link.",
        );
      }
      throw erro;
    }
  }
}

// Exportada e reaproveitada por tipo-link.service.update.ts (mesma
// checagem nos dois lugares que aceitam `regex` no corpo). Confere que a
// string é um regex de verdade, não só um formato de texto qualquer -
// sem isso, um padrão inválido gravado aqui só quebraria mais tarde,
// longe daqui, quando 7-link-academico tentasse USAR esse regex pra
// validar uma URL.
export function validarRegex(padrao: string): void {
  try {
    new RegExp(padrao);
  } catch {
    throw new BadRequestException(
      'regex informado não é uma expressão regular válida.',
    );
  }
}
