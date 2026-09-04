import { Global, Module } from '@nestjs/common';
import { ConfiguracaoValorService } from './configuracao-valor.service';

@Global()
@Module({
  providers: [ConfiguracaoValorService],
  exports: [ConfiguracaoValorService],
})
export class ConfiguracaoValorModule {}
