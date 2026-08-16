import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { TipoLinkConverter } from '../dto/converter/tipo-link.converter';
import { AtualizarTipoLinkRequestDto } from '../dto/request/atualizar-tipo-link.request.dto';
import { TipoLinkResponseDto } from '../dto/response/tipo-link.response.dto';
import { validarRegex } from './tipo-link.service.create';

@Injectable()
export class TipoLinkServiceUpdate {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    idTipolink: number,
    dto: AtualizarTipoLinkRequestDto,
  ): Promise<TipoLinkResponseDto> {
    const db = this.database.getDb();

    // regex é NULLABLE — `null` explícito no corpo limpa o campo (não
    // precisa validar como regex, só passa null adiante). dominio é NOT
    // NULL DEFAULT '{}' — não aceita `null` (ver comentário no DTO); pra
    // "limpar" o corpo manda array vazio, que já passa direto sem
    // validação especial nenhuma aqui.
    if (dto.regex !== undefined && dto.regex !== null) {
      validarRegex(dto.regex);
    }

    // CK_TIPO_LINK_ALGUM_ESCOPO (01): só precisa checar o resultado FINAL
    // se algum dos 3 campos de escopo veio no corpo — combinando com o
    // que já está gravado pros que não vieram, pra não deixar um UPDATE
    // parcial desligar os 3 de uma vez (ex.: PATCH só com
    // `permitePerfil: false` num tipo que já tinha os outros dois FALSE).
    const algumEscopoNoCorpo =
      dto.permitePerfil !== undefined ||
      dto.permiteAtualizacao !== undefined ||
      dto.permiteRecompensa !== undefined;

    if (algumEscopoNoCorpo) {
      const atual = await db
        .selectFrom('tipo_link')
        .select(['permite_perfil', 'permite_atualizacao', 'permite_recompensa'])
        .where('id_tipolink', '=', idTipolink)
        .executeTakeFirst();

      if (!atual) {
        throw new NotFoundException(
          `Tipo de link ${idTipolink} não encontrado`,
        );
      }

      const permitePerfil = dto.permitePerfil ?? atual.permite_perfil;
      const permiteAtualizacao =
        dto.permiteAtualizacao ?? atual.permite_atualizacao;
      const permiteRecompensa =
        dto.permiteRecompensa ?? atual.permite_recompensa;

      if (!permitePerfil && !permiteAtualizacao && !permiteRecompensa) {
        throw new BadRequestException(
          'Pelo menos um escopo (permitePerfil, permiteAtualizacao ou permiteRecompensa) precisa continuar verdadeiro.',
        );
      }
    }

    const campos = {
      ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
      ...(dto.ativo !== undefined ? { ativo: dto.ativo } : {}),
      ...(dto.regex !== undefined ? { regex: dto.regex } : {}),
      ...(dto.dominio !== undefined ? { dominio: dto.dominio } : {}),
      ...(dto.permitePerfil !== undefined
        ? { permite_perfil: dto.permitePerfil }
        : {}),
      ...(dto.permiteAtualizacao !== undefined
        ? { permite_atualizacao: dto.permiteAtualizacao }
        : {}),
      ...(dto.permiteRecompensa !== undefined
        ? { permite_recompensa: dto.permiteRecompensa }
        : {}),
    };
    if (Object.keys(campos).length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const linha = await db
      .updateTable('tipo_link')
      .set(campos)
      .where('id_tipolink', '=', idTipolink)
      .returningAll()
      .executeTakeFirst();

    if (!linha) {
      // pol_tipolink_update (04): exige tem_permissao('tipolink_
      // gerenciar'). 0 linhas afetadas sem erro é a RLS filtrando —
      // diferencia de "não existe" com uma segunda consulta (SELECT já é
      // USING(true), sempre enxerga a linha se ela existir).
      const existe = await db
        .selectFrom('tipo_link')
        .select('id_tipolink')
        .where('id_tipolink', '=', idTipolink)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException(
          `Tipo de link ${idTipolink} não encontrado`,
        );
      }
      throw new ForbiddenException(
        'Sem permissão para editar este tipo de link.',
      );
    }

    return TipoLinkConverter.paraResponseDto(linha);
  }
}
