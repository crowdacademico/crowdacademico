import { randomUUID } from 'crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ARMAZENAMENTO_SERVICE,
  PASTA_PENDENTE,
} from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import {
  EXTENSAO_POR_MIME,
  TAMANHO_MAXIMO_BYTES_POR_MIME,
  TipoMimePermitido,
} from '../arquivo.constants';
import { ArquivoRequestIniciarUpload } from '../dto/request/arquivo.request-iniciar-upload';
import { ArquivoResponseUploadIniciado } from '../dto/response/arquivo.response-upload-iniciado';

@Injectable()
export class ArquivoServiceIniciarUpload {
  constructor(
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(
    dto: ArquivoRequestIniciarUpload,
  ): Promise<ArquivoResponseUploadIniciado> {
    // class-validator (@IsIn) já garante que dto.tipoMime é um dos 4
    // valores da lista — o cast só declara isso pro TypeScript, pra poder
    // indexar os Records abaixo por tipo.
    const tipoMime = dto.tipoMime as TipoMimePermitido;

    const tamanhoMaximo = TAMANHO_MAXIMO_BYTES_POR_MIME[tipoMime];
    if (dto.tamanhoBytes > tamanhoMaximo) {
      throw new BadRequestException(
        `Arquivo excede o tamanho máximo permitido para ${tipoMime} ` +
          `(${Math.round(tamanhoMaximo / 1024 / 1024)} MB).`,
      );
    }

    // Nome do objeto SEMPRE gerado aqui, nunca a partir do que o cliente
    // manda — é isso que faz o restante da validação (tipo/tamanho) valer
    // alguma coisa. Ver doc de arquitetura: "quem escolhe o nome e as
    // regras da URL é o Nest, nunca o navegador".
    const extensao = EXTENSAO_POR_MIME[tipoMime];
    const chave = `${PASTA_PENDENTE}${randomUUID()}.${extensao}`;

    // Único tipo com risco real de "abrir na página" em vez de baixar —
    // grava o Content-Disposition já na hora do upload (metadado do
    // próprio objeto), servido depois pelo bucket/CDN sem precisar de
    // nenhuma lógica extra na leitura.
    const contentDisposition =
      tipoMime === 'application/pdf'
        ? `attachment; filename="${sanitizarNomeParaCabecalho(dto.nomeOriginal)}"`
        : undefined;

    const uploadPreAssinado = await this.armazenamento.gerarUploadPreAssinado(
      {
        chave,
        tipoMime,
        tamanhoMaximoBytes: dto.tamanhoBytes,
        contentDisposition,
      },
    );

    return {
      chave,
      urlUpload: uploadPreAssinado.urlUpload,
      metodo: uploadPreAssinado.metodo,
      cabecalhosObrigatorios: uploadPreAssinado.cabecalhosObrigatorios,
      expiraEm: uploadPreAssinado.expiraEm,
    };
  }
}

// Um Content-Disposition mal formado (nome com aspas/quebra de linha) pode
// injetar cabeçalhos extras na resposta — tira aspas e qualquer caractere
// de controle antes de colocar o nome original dentro do cabeçalho.
function sanitizarNomeParaCabecalho(nome: string): string {
  return nome.replace(/["\r\n]/g, '');
}
