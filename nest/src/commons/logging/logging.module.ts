import { Module } from '@nestjs/common';
import { RequestLoggerMiddleware } from './request-logger.middleware';

// Só existe pra dar ao RequestLoggerMiddleware um provider de verdade -
// AppModule aplica ele globalmente via configure()/MiddlewareConsumer (o
// middleware injeta ClsService no construtor, então precisa passar pelo
// container de DI do Nest, não dá pra referenciar a classe direto sem
// registrar como provider em algum módulo).
@Module({
  providers: [RequestLoggerMiddleware],
  exports: [RequestLoggerMiddleware],
})
export class LoggingModule {}
