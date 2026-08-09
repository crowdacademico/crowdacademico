import { Module } from '@nestjs/common';
import { TermoUsoControllerAtivo } from './controllers/termo-uso.controller.ativo';
import { TermoUsoServiceAtivo } from './service/termo-uso.service.ativo';

// TermoUsoServiceAtivo exportado pra 3-auth reaproveitar — POST
// /auth/cadastro precisa saber qual id_termo é o ativo AGORA, resolvido
// pelo próprio servidor (nunca aceito de um valor vindo do cliente), pra
// passar em registrar_aceite_termo() (03_funcoes_seguranca.sql, [03-D-1]).
@Module({
  controllers: [TermoUsoControllerAtivo],
  providers: [TermoUsoServiceAtivo],
  exports: [TermoUsoServiceAtivo],
})
export class TermoUsoModule {}
