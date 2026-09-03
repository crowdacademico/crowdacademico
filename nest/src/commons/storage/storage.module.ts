import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ARMAZENAMENTO_SERVICE } from './storage.constants';
import { S3CompativelArmazenamentoService } from './s3-compativel-armazenamento.service';

// Global (mesmo padrão de DatabaseModule, commons/database) — qualquer
// módulo do app injeta @Inject(ARMAZENAMENTO_SERVICE) sem precisar
// importar StorageModule de novo, desde que ele esteja registrado uma vez
// no AppModule.
//
// TROCAR DE PROVEDOR: hoje `provide: ARMAZENAMENTO_SERVICE` aponta pra
// S3CompativelArmazenamentoService, que já cobre Supabase Storage (atual),
// Cloudflare R2, Backblaze B2, AWS S3 e MinIO só com variáveis de ambiente
// diferentes
// (ver S3CompativelArmazenamentoService). Só troque o `useExisting`
// abaixo por uma classe nova se um dia entrar um provedor com API
// genuinamente incompatível com S3 — nenhum outro módulo do app precisa
// mudar quando isso acontecer, porque todos dependem só da interface
// ArmazenamentoService (storage.service.interface.ts), nunca da classe
// concreta.
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    S3CompativelArmazenamentoService,
    {
      provide: ARMAZENAMENTO_SERVICE,
      useExisting: S3CompativelArmazenamentoService,
    },
  ],
  exports: [ARMAZENAMENTO_SERVICE],
})
export class StorageModule {}
