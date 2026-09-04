import { randomUUID } from 'crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfiguracaoValorService } from '../../commons/configuracao/configuracao-valor.service';
import { DatabaseService } from '../../commons/database/database.service';
import {
  ARMAZENAMENTO_SERVICE,
  PASTA_PENDENTE,
} from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import {
  chaveConfigTamanhoMaximo,
  CHAVE_CONFIG_COTA_BYTES_POR_USUARIO,
  CHAVE_CONFIG_INTERVALO_MINIMO_SEGUNDOS,
  CHAVE_CONFIG_JANELA_LIMITE_UPLOADS_MINUTOS,
  CHAVE_CONFIG_LIMITE_UPLOADS_JANELA,
  CHAVE_CONFIG_TAMANHO_MINIMO,
  COTA_BYTES_POR_USUARIO_PADRAO,
  EXTENSAO_POR_MIME,
  INTERVALO_MINIMO_SEGUNDOS_PADRAO,
  JANELA_LIMITE_UPLOADS_MINUTOS_PADRAO,
  LIMITE_UPLOADS_JANELA_PADRAO,
  TAMANHO_MAXIMO_BYTES_POR_MIME_PADRAO,
  TAMANHO_MINIMO_BYTES_PADRAO,
  TipoMimePermitido,
} from '../arquivo.constants';
import { ArquivoRequestIniciarUpload } from '../dto/request/arquivo.request-iniciar-upload';
import { ArquivoResponseUploadIniciado } from '../dto/response/arquivo.response-upload-iniciado';

@Injectable()
export class ArquivoServiceIniciarUpload {
  constructor(
    private readonly database: DatabaseService,
    private readonly configuracaoValor: ConfiguracaoValorService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(
    dto: ArquivoRequestIniciarUpload,
    idUsuario: number,
  ): Promise<ArquivoResponseUploadIniciado> {
    // class-validator (@IsIn) já garante que dto.tipoMime é um dos 4
    // valores da lista - o cast só declara isso pro TypeScript, pra poder
    // indexar os Records abaixo por tipo.
    const tipoMime = dto.tipoMime as TipoMimePermitido;

    // Tamanho mín./máx. configuráveis pelo Painel Admin (04-09-2026) -
    // cada leitura cai no padrão hardcoded se a chave não existir/estiver
    // inativa (ver ConfiguracaoValorService).
    const tamanhoMinimo = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_TAMANHO_MINIMO,
      TAMANHO_MINIMO_BYTES_PADRAO,
    );
    if (dto.tamanhoBytes < tamanhoMinimo) {
      throw new BadRequestException(
        `Arquivo abaixo do tamanho mínimo permitido ` +
          `(${tamanhoMinimo} bytes) - parece vazio ou corrompido.`,
      );
    }

    const tamanhoMaximo = await this.configuracaoValor.buscarNumero(
      chaveConfigTamanhoMaximo(tipoMime),
      TAMANHO_MAXIMO_BYTES_POR_MIME_PADRAO[tipoMime],
    );
    if (dto.tamanhoBytes > tamanhoMaximo) {
      throw new BadRequestException(
        `Arquivo excede o tamanho máximo permitido para ${tipoMime} ` +
          `(${Math.round(tamanhoMaximo / 1024 / 1024)} MB).`,
      );
    }

    // Checagem BARATA de cota, antes de gastar uma URL pré-assinada (a
    // checagem de VERDADE, com o tamanho final pós-processamento, só
    // acontece em confirmar-upload.ts - ver comentário lá). Esta aqui só
    // evita o desperdício óbvio: alguém que já estourou a cota nem chega
    // a receber URL de upload nenhuma.
    const cotaBytesPorUsuario = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_COTA_BYTES_POR_USUARIO,
      COTA_BYTES_POR_USUARIO_PADRAO,
    );
    const usoAtual = await this.database
      .getDb()
      .selectFrom('arquivo')
      .select((eb) => eb.fn.sum<string | null>('tamanho_bytes').as('total'))
      .where('id_usuario_upload', '=', idUsuario)
      .where('ativo', '=', true)
      .executeTakeFirst();
    const bytesJaUsados = Number(usoAtual?.total ?? 0);
    if (bytesJaUsados >= cotaBytesPorUsuario) {
      throw new BadRequestException(
        `Cota de armazenamento excedida (limite de ` +
          `${Math.round(cotaBytesPorUsuario / 1024 / 1024)}MB por conta). ` +
          `Remova algum arquivo antes de enviar um novo.`,
      );
    }

    // Rate limit de upload (04-09-2026) - dois limites complementares,
    // configuráveis pelo Painel Admin, conferidos contra `arquivo.
    // criado_em` (não filtra por `ativo`: mesmo um arquivo já removido
    // depois conta como "um upload que aconteceu" pra este propósito).
    const janelaMinutos = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_JANELA_LIMITE_UPLOADS_MINUTOS,
      JANELA_LIMITE_UPLOADS_MINUTOS_PADRAO,
    );
    const limiteUploadsJanela = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_LIMITE_UPLOADS_JANELA,
      LIMITE_UPLOADS_JANELA_PADRAO,
    );
    const inicioJanela = new Date(Date.now() - janelaMinutos * 60_000);
    const uploadsNaJanela = await this.database
      .getDb()
      .selectFrom('arquivo')
      .select((eb) => eb.fn.countAll().as('total'))
      .where('id_usuario_upload', '=', idUsuario)
      .where('criado_em', '>=', inicioJanela)
      .executeTakeFirst();
    if (Number(uploadsNaJanela?.total ?? 0) >= limiteUploadsJanela) {
      throw new BadRequestException(
        `Limite de ${limiteUploadsJanela} uploads a cada ` +
          `${janelaMinutos} minutos atingido. Tente novamente mais tarde.`,
      );
    }

    const intervaloMinimoSegundos = await this.configuracaoValor.buscarNumero(
      CHAVE_CONFIG_INTERVALO_MINIMO_SEGUNDOS,
      INTERVALO_MINIMO_SEGUNDOS_PADRAO,
    );
    if (intervaloMinimoSegundos > 0) {
      const ultimoUpload = await this.database
        .getDb()
        .selectFrom('arquivo')
        .select('criado_em')
        .where('id_usuario_upload', '=', idUsuario)
        .orderBy('criado_em', 'desc')
        .executeTakeFirst();
      if (ultimoUpload?.criado_em) {
        const segundosDesdeUltimo =
          (Date.now() - new Date(ultimoUpload.criado_em).getTime()) / 1000;
        if (segundosDesdeUltimo < intervaloMinimoSegundos) {
          throw new BadRequestException(
            `Aguarde ${Math.ceil(intervaloMinimoSegundos - segundosDesdeUltimo)}s ` +
              `antes de enviar outro arquivo.`,
          );
        }
      }
    }

    // Nome do objeto SEMPRE gerado aqui, nunca a partir do que o cliente
    // manda - é isso que faz o restante da validação (tipo/tamanho) valer
    // alguma coisa. Ver doc de arquitetura: "quem escolhe o nome e as
    // regras da URL é o Nest, nunca o navegador".
    const extensao = EXTENSAO_POR_MIME[tipoMime];
    const chave = `${PASTA_PENDENTE}${randomUUID()}.${extensao}`;

    // Único tipo com risco real de "abrir na página" em vez de baixar -
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
// injetar cabeçalhos extras na resposta - tira aspas e qualquer caractere
// de controle antes de colocar o nome original dentro do cabeçalho.
function sanitizarNomeParaCabecalho(nome: string): string {
  return nome.replace(/["\r\n]/g, '');
}
