import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfiguracaoValorService } from '../../commons/configuracao/configuracao-valor.service';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ARMAZENAMENTO_SERVICE,
  PASTA_PENDENTE,
  PASTA_PUBLICO,
} from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import {
  CHAVE_CONFIG_COTA_BYTES_POR_USUARIO,
  COTA_BYTES_POR_USUARIO_PADRAO,
  QUANTIDADE_BYTES_ASSINATURA,
  TipoMimePermitido,
} from '../arquivo.constants';
import { ArquivoConverter } from '../dto/converter/arquivo.converter';
import { ArquivoRequestConfirmarUpload } from '../dto/request/arquivo.request-confirmar-upload';
import { ArquivoResponse } from '../dto/response/arquivo.response';
import { assinaturaCorrespondeAoTipo } from '../util/arquivo.assinatura.util';
import { processarImagem } from '../util/arquivo.processamento-imagem.util';

// PDF nunca passa pelo sharp (não é imagem) - os 3 tipos abaixo, sim.
const TIPOS_IMAGEM: readonly TipoMimePermitido[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Injectable()
export class ArquivoServiceConfirmarUpload {
  constructor(
    private readonly database: DatabaseService,
    private readonly configuracaoValor: ConfiguracaoValorService,
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
        'Upload não encontrado no bucket - a URL pré-assinada expira em ' +
          '5 minutos, ou o arquivo nunca chegou a ser enviado.',
      );
    }

    // Segunda camada de conferência de tamanho (a primeira já é o
    // Content-Length assinado na própria URL de upload, que o provedor
    // recusa se o navegador tentar mandar mais do que isso) - barato,
    // já fizemos o HEAD acima mesmo assim.
    if (info.tamanhoBytes !== dto.tamanhoBytes) {
      throw new BadRequestException(
        'Tamanho do arquivo enviado não corresponde ao declarado.',
      );
    }

    // O tipo que o navegador declarou é uma afirmação, não um fato - só
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
      // Limpeza imediata - não depende da regra de ciclo de vida do
      // bucket (que só varre pendente/ depois de até 24h, ver doc de
      // arquitetura) pra tirar um arquivo malicioso/mentiroso de lá.
      await this.armazenamento.excluirObjeto(dto.chave).catch(() => undefined);
      throw new BadRequestException(
        'O conteúdo do arquivo não corresponde ao tipo declarado (ex.: ' +
          'um executável renomeado para .jpg). Upload rejeitado.',
      );
    }

    // Imagem passa por sharp (redimensiona pro teto do contexto, converte
    // pra WebP, remove EXIF de brinde - ver arquivo.processamento-imagem.
    // util.ts); PDF nunca é tocado, sharp não lida com esse formato.
    // Decide ANTES de gravar em publico/, porque o tamanho final (o que
    // entra na checagem de cota abaixo) só existe depois do processamento
    // pra imagem, mas é o mesmo tamanho declarado pra PDF.
    const ehImagem = TIPOS_IMAGEM.includes(dto.tipoMime as TipoMimePermitido);

    let tipoMimeFinal: string = dto.tipoMime;
    let tamanhoFinal: number = dto.tamanhoBytes;
    let bufferProcessado: Buffer | null = null;
    let chaveDestino: string;

    if (ehImagem) {
      const bytesOriginais = await this.armazenamento.lerObjetoCompleto(
        dto.chave,
      );
      bufferProcessado = await processarImagem(bytesOriginais, dto.contexto);
      tipoMimeFinal = 'image/webp';
      tamanhoFinal = bufferProcessado.length;
      // Nome base é sempre um randomUUID (gerado em iniciar-upload.ts,
      // sem ponto no meio) - trocar só a extensão final é seguro.
      const nomeBase = dto.chave
        .slice(PASTA_PENDENTE.length)
        .replace(/\.[^.]+$/, '');
      chaveDestino = `${PASTA_PUBLICO}${nomeBase}.webp`;
    } else {
      chaveDestino = dto.chave.replace(PASTA_PENDENTE, PASTA_PUBLICO);
    }

    // Cota por usuário (01-09-2026) - checada com o tamanho FINAL (já
    // processado, pra imagem), nunca o declarado antes da compressão:
    // checar antes seria injusto (rejeitaria upload que cabe de sobra
    // depois de comprimido) e checar depois de já ter gravado em
    // publico/ deixaria arquivo órfão pra trás se estourasse. Por isso
    // fica bem aqui: depois de processar, antes de gravar o resultado.
    const db = this.database.getDb();
    const usoAtual = await db
      .selectFrom('arquivo')
      .select((eb) => eb.fn.sum<string | null>('tamanho_bytes').as('total'))
      .where('id_usuario_upload', '=', idUsuario)
      .where('ativo', '=', true)
      .executeTakeFirst();
    // SUM de coluna integer volta bigint do Postgres, e o driver `pg`
    // devolve bigint como STRING (evita perda de precisão silenciosa) -
    // sem o Number() aqui, "usoAtual + tamanhoFinal" concatenaria texto
    // em vez de somar.
    const bytesJaUsados = Number(usoAtual?.total ?? 0);
    const cotaBytesPorUsuario = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_COTA_BYTES_POR_USUARIO,
      COTA_BYTES_POR_USUARIO_PADRAO,
    );
    if (bytesJaUsados + tamanhoFinal > cotaBytesPorUsuario) {
      await this.armazenamento.excluirObjeto(dto.chave).catch(() => undefined);
      throw new BadRequestException(
        `Cota de armazenamento excedida (limite de ` +
          `${Math.round(cotaBytesPorUsuario / 1024 / 1024)}MB por conta). ` +
          `Remova algum arquivo antes de enviar um novo.`,
      );
    }

    if (ehImagem && bufferProcessado) {
      await this.armazenamento.enviarObjeto(
        chaveDestino,
        bufferProcessado,
        tipoMimeFinal,
      );
      await this.armazenamento.excluirObjeto(dto.chave);
    } else {
      await this.armazenamento.moverObjeto(dto.chave, chaveDestino);
    }

    const linha = await db
      .insertInto('arquivo')
      .values({
        chave: chaveDestino,
        nome_original: dto.nomeOriginal,
        tipo_mime: tipoMimeFinal,
        tamanho_bytes: tamanhoFinal,
        id_usuario_upload: idUsuario,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return ArquivoConverter.paraResponseDto(linha, this.armazenamento);
  }
}
