import { Module } from '@nestjs/common';
import { LogAuditoriaControllerFindAll } from './controllers/log-auditoria.controller.findall';
import { LogAuditoriaControllerMyActivity } from './controllers/log-auditoria.controller.my-activity';
import { LogAuditoriaServiceFindAll } from './service/log-auditoria.service.findall';
import { LogAuditoriaServiceClean } from './service/log-auditoria.service.clean';
import { LogAuditoriaServiceMyActivity } from './service/log-auditoria.service.my-activity';

// Só leitura, de propósito - ninguém escreve em log_auditoria pela API
// (nem teria GRANT: ver 06_grants.sql [06-L]), só a trigger SECURITY
// DEFINER grava (05_regras_negocio.sql [05-L]). O único jeito de apagar é o job
// de retenção abaixo, que chama a função SQL limpar_log_auditoria().
@Module({
  controllers: [
    LogAuditoriaControllerFindAll,
    LogAuditoriaControllerMyActivity,
  ],
  providers: [
    LogAuditoriaServiceFindAll,
    LogAuditoriaServiceMyActivity,
    // Job agendado: retenção do log, sem controller.
    LogAuditoriaServiceClean,
  ],
})
export class LogAuditoriaModule {}
