import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

// Item 6 da lista de pendências (05-09-2026): "Request ID por requisição nos
// logs". Antes disso não existia NENHUM log de requisição neste projeto -
// só logs pontuais tipo "conectado ao banco". Sem isso, um erro relatado
// como "deu erro às 14:32" não tinha como virar "achei os 8 logs daquela
// requisição específica".
//
// Por que MIDDLEWARE, não interceptor - achado testando: o status HTTP
// final (`res.statusCode`) só fica definitivo depois que o Nest termina de
// serializar a resposta (sucesso) ou que um exception filter decide o
// código de erro - um interceptor comum roda ANTES disso acontecer de
// verdade no ciclo de vida do Express por baixo. O evento nativo
// `res.on('finish')` do Express garante que a resposta já foi enviada por
// completo pro cliente, com o status code já certo, sem depender de
// adivinhar em que ponto do pipeline do Nest o valor já está definitivo.
//
// O id em si não é gerado aqui - vem do próprio nestjs-cls
// (`ClsModule.forRoot({ middleware: { generateId: true, idGenerator: ... }
// })`, ver database.module.ts), que já roda ANTES deste middleware (é
// registrado pelo próprio DatabaseModule, importado antes de qualquer outra
// coisa em AppModule). Este arquivo só LÊ o id já pronto (`cls.getId()`) e
// decide o que logar com ele.
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Requisicao');

  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const inicio = Date.now();

    res.on('finish', () => {
      const duracaoMs = Date.now() - inicio;
      const id = this.cls.getId();
      const linha = `[${id}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duracaoMs}ms`;

      if (res.statusCode >= 500) {
        this.logger.error(linha);
      } else if (res.statusCode >= 400) {
        this.logger.warn(linha);
      } else {
        this.logger.log(linha);
      }
    });

    next();
  }
}
