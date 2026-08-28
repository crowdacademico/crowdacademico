import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ARMAZENAMENTO_SERVICE,
  PASTA_PENDENTE,
  PASTA_PUBLICO,
} from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import {
  QUANTIDADE_BYTES_ASSINATURA,
  TipoMimePermitido,
} from '../arquivo.constants';
import { ArquivoConverter } from '../dto/converter/arquivo.converter';
import { ArquivoRequestConfirmarUpload } from '../dto/request/arquivo.request-confirmar-upload';
import { ArquivoResponse } from '../dto/response/arquivo.response';
import { assinaturaCorrespondeAoTipo } from '../util/arquivo.assinatura.util';

@Injectable()
export class ArquivoServiceConfirmarUpload {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(
    dto: ArquivoRequestConfirmarUpload,
    idUsuario: number,
  ): Promise<ArquivoResponse> {
    const info = await this.armazenamento.obterInfoObjeto(dto.chave);
    if (!info.existe) {
      throw new NotFoundException(
        'Upload não encontrado no bucket — a URL pré-assinada expira em ' +
          '5 minutos, ou o arquivo nunca chegou a ser enviado.',
      );
    }

    // Segunda camada de conferência de tamanho (a primeira já é o
    // Content-Length assinado na própria URL de upload, que o provedor
    // recusa se o navegador tentar mandar mais do que isso) — barato,
    // já fizemos o HEAD acima mesmo assim.
    if (info.tamanhoBytes !== dto.tamanhoBytes) {
      throw new BadRequestException(
        'Tamanho do arquivo enviado não corresponde ao declarado.',
      );
    }

    // O tipo que o navegador declarou é uma afirmação, não um fato — só
    // agora, com o arquivo de verdade no bucket, dá pra conferir a
    // assinatura real dos bytes. Ver arquivo.assinatura.util.ts.
    const primeirosBytes = await this.armazenamento.lerPrimeirosBytes(
      dto.chave,
      QUANTIDADE_BYTES_ASSINATURA,
    );
    if (
      !assinaturaCorrespondeAoTipo(
        primeirosBytes,
        dto.tipoMime as TipoMimePermitido,
      )
    ) {
      // Limpeza imediata — não depende da regra de ciclo de vida do
      // bucket (que só varre pendente/ depois de até 24h, ver doc de
      // arquitetura) pra tirar um arquivo malicioso/mentiroso de lá.
      await this.armazenamento.excluirObjeto(dto.chave).catch(() => undefined);
      throw new BadRequestException(
        'O conteúdo do arquivo não corresponde ao tipo declarado (ex.: ' +
          'um executável renomeado para .jpg). Upload rejeitado.',
      );
    }

    const chaveDestino = dto.chave.replace(PASTA_PENDENTE, PASTA_PUBLICO);
    await this.armazenamento.moverObjeto(dto.chave, chaveDestino);

    const db = this.database.getDb();
    const linha = await db
      .insertInto('arquivo')
      .values({
        chave: chaveDestino,
        nome_original: dto.nomeOriginal,
        tipo_mime: dto.tipoMime,
        tamanho_bytes: dto.tamanhoBytes,
        id_usuario_upload: idUsuario,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return ArquivoConverter.paraResponseDto(linha, this.armazenamento);
  }
}
