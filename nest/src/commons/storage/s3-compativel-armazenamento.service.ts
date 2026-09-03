import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SEGUNDOS_EXPIRACAO_UPLOAD } from './storage.constants';
import type {
  ArmazenamentoService,
  InfoObjeto,
  ParametrosUploadPreAssinado,
  UploadPreAssinado,
} from './storage.service.interface';

// Implementação ÚNICA pra qualquer provedor que fale o protocolo S3 —
// Supabase Storage (provedor ATUAL, ver ARQUIVO_para_configurar_modulo-
// arquivo.md e o .env real: STORAGE_ENDPOINT aponta pro endpoint S3 do
// Supabase), Cloudflare R2, Backblaze B2, AWS S3 de verdade, ou MinIO num
// ambiente self-hosted. Nenhum desses precisa de código diferente: só de
// variáveis de ambiente diferentes (endpoint, região, bucket,
// credenciais). Migrar pra R2 no futuro (avaliado 01-09-2026: Supabase
// free dá 1GB de storage + 5GB de egress/mês contra os 10GB de storage +
// egress ilimitado do R2, mas a equipe decidiu ficar no Supabase por
// enquanto, já está funcionando) é só isso — trocar STORAGE_ENDPOINT e as
// credenciais no .env, sem tocar em uma linha de TypeScript.
// CORRIGIDO 01-09-2026: este comentário dizia "Backblaze B2 (provedor
// atual)" — estava desatualizado, o .env real nunca apontou pra B2 nesta
// fase do projeto.
//
// Bibliotecas: @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner — SDK
// oficial da AWS, mas nada aqui é exclusivo da AWS: é o cliente HTTP que
// fala o protocolo, apontado pra QUALQUER endpoint compatível (é assim que
// B2 e R2 documentam a própria compatibilidade S3).
@Injectable()
export class S3CompativelArmazenamentoService implements ArmazenamentoService {
  // Client/config são construídos SOB DEMANDA (getter privado abaixo), não
  // no constructor. MOTIVO (bug real encontrado em produção, ver conversa
  // que originou este ajuste): StorageModule é @Global() e registrado no
  // AppModule — o Nest instancia esse provider já na INICIALIZAÇÃO do
  // servidor, mesmo que nenhuma rota de arquivo tenha sido chamada ainda.
  // Se as variáveis STORAGE_* faltarem no .env (ex.: time ainda decidindo
  // entre B2/R2/Supabase Storage, como aconteceu aqui), lançar erro no
  // construtor derrubava o processo Nest INTEIRO no boot — login, e
  // qualquer outra rota que nada tem a ver com arquivo, parava de
  // funcionar junto. Validação preguiçosa: só estoura (e só nesse
  // momento) quando alguém de fato tenta usar upload/leitura de arquivo,
  // com o resto do sistema funcionando normalmente até lá.
  private clienteCache: S3Client | null = null;
  private bucketCache: string | null = null;
  private urlPublicaBaseCache: string | null = null;

  constructor(private readonly config: ConfigService) {}

  private get client(): S3Client {
    this.garantirConfigurado();
    return this.clienteCache!;
  }

  private get bucket(): string {
    this.garantirConfigurado();
    return this.bucketCache!;
  }

  private get urlPublicaBase(): string {
    this.garantirConfigurado();
    return this.urlPublicaBaseCache!;
  }

  private garantirConfigurado(): void {
    if (this.clienteCache) {
      return;
    }

    const endpoint = this.variavelObrigatoria('STORAGE_ENDPOINT');
    const accessKeyId = this.variavelObrigatoria('STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = this.variavelObrigatoria(
      'STORAGE_SECRET_ACCESS_KEY',
    );
    this.bucketCache = this.variavelObrigatoria('STORAGE_BUCKET');
    this.urlPublicaBaseCache = this.variavelObrigatoria(
      'STORAGE_PUBLIC_BASE_URL',
    ).replace(/\/+$/, '');

    this.clienteCache = new S3Client({
      endpoint,
      // B2 e R2 não usam região de verdade (é um conceito da AWS) mas a
      // lib exige o campo — 'auto' funciona nos dois; STORAGE_REGION
      // continua configurável pra quem apontar isto pra AWS S3 real algum
      // dia (region importa de verdade lá).
      region: this.config.get<string>('STORAGE_REGION') ?? 'auto',
      credentials: { accessKeyId, secretAccessKey },
      // path-style (endpoint/bucket/chave) em vez de virtual-hosted
      // (bucket.endpoint/chave) — funciona sem configuração extra tanto em
      // B2 quanto em R2. Só desligar (via env) se um endpoint específico
      // exigir virtual-hosted.
      forcePathStyle:
        (this.config.get<string>('STORAGE_FORCE_PATH_STYLE') ?? 'true') ===
        'true',
    });
  }

  private variavelObrigatoria(nome: string): string {
    const valor = this.config.get<string>(nome);
    if (!valor) {
      throw new Error(
        `Variável de ambiente ${nome} não configurada — necessária pro ` +
          'módulo de armazenamento de arquivos (commons/storage). Ver ' +
          '.env.example.',
      );
    }
    return valor;
  }

  async gerarUploadPreAssinado(
    parametros: ParametrosUploadPreAssinado,
  ): Promise<UploadPreAssinado> {
    const comando = new PutObjectCommand({
      Bucket: this.bucket,
      Key: parametros.chave,
      ContentType: parametros.tipoMime,
      // Assinado junto com a URL: o navegador só consegue completar o PUT
      // mandando exatamente este tamanho — não dá pra "prometer" 800 KB e
      // subir 50 MB.
      ContentLength: parametros.tamanhoMaximoBytes,
      ...(parametros.contentDisposition
        ? { ContentDisposition: parametros.contentDisposition }
        : {}),
    });

    const urlUpload = await getSignedUrl(this.client, comando, {
      expiresIn: SEGUNDOS_EXPIRACAO_UPLOAD,
    });

    const cabecalhosObrigatorios: Record<string, string> = {
      'Content-Type': parametros.tipoMime,
    };
    if (parametros.contentDisposition) {
      cabecalhosObrigatorios['Content-Disposition'] =
        parametros.contentDisposition;
    }

    return {
      urlUpload,
      metodo: 'PUT',
      cabecalhosObrigatorios,
      expiraEm: new Date(Date.now() + SEGUNDOS_EXPIRACAO_UPLOAD * 1000),
    };
  }

  async obterInfoObjeto(chave: string): Promise<InfoObjeto> {
    try {
      const resposta = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: chave }),
      );
      return { existe: true, tamanhoBytes: resposta.ContentLength };
    } catch (erro) {
      if (this.eObjetoInexistente(erro)) {
        return { existe: false };
      }
      throw erro;
    }
  }

  async lerPrimeirosBytes(
    chave: string,
    quantidadeBytes: number,
  ): Promise<Buffer> {
    const resposta = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: chave,
        Range: `bytes=0-${quantidadeBytes - 1}`,
      }),
    );
    const bytes = await resposta.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }

  async lerObjetoCompleto(chave: string): Promise<Buffer> {
    const resposta = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: chave }),
    );
    const bytes = await resposta.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }

  async enviarObjeto(
    chave: string,
    bytes: Buffer,
    tipoMime: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: chave,
        Body: bytes,
        ContentType: tipoMime,
      }),
    );
  }

  async moverObjeto(chaveOrigem: string, chaveDestino: string): Promise<void> {
    // S3 (e compatíveis) não têm "mover" nativo — copy + delete é o padrão
    // aceito pra isso.
    const chaveOrigemCodificada = chaveOrigem
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${chaveOrigemCodificada}`,
        Key: chaveDestino,
      }),
    );
    await this.excluirObjeto(chaveOrigem);
  }

  async excluirObjeto(chave: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: chave }),
    );
  }

  montarUrlPublica(chave: string): string {
    return `${this.urlPublicaBase}/${chave}`;
  }

  private eObjetoInexistente(erro: unknown): boolean {
    const erroTipado = erro as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    return (
      erroTipado?.name === 'NotFound' ||
      erroTipado?.$metadata?.httpStatusCode === 404
    );
  }
}