import { Module } from '@nestjs/common';
import { LogAuditoriaControllerFindAll } from './controllers/log-auditoria.controller.findall';
import { LogAuditoriaControllerMinhaAtividade } from './controllers/log-auditoria.controller.minha-atividade';
import { LogAuditoriaServiceFindAll } from './service/log-auditoria.service.findall';
import { LogAuditoriaServiceMinhaAtividade } from './service/log-auditoria.service.minha-atividade';

// Só leitura, de propósito - ninguém escreve em log_auditoria pela API
// (nem teria GRANT: ver 06_grants.sql [06-L]), só a trigger SECURITY
// DEFINER grava (05_regras_negocio.sql [05-L]).
@Module({
  controllers: [
    LogAuditoriaControllerFindAll,
    LogAuditoriaControllerMinhaAtividade,
  ],
  providers: [LogAuditoriaServiceFindAll, LogAuditoriaServiceMinhaAtividade],
})
export class LogAuditoriaModule {}
