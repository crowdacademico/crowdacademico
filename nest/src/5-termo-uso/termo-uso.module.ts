import { Module } from '@nestjs/common';
import { TermoUsoControllerAlterar } from './controllers/termo-uso.controller.alterar';
import { TermoUsoControllerAtivo } from './controllers/termo-uso.controller.ativo';
import { TermoUsoControllerBuscar } from './controllers/termo-uso.controller.buscar';
import { TermoUsoControllerCriar } from './controllers/termo-uso.controller.criar';
import { TermoUsoControllerListar } from './controllers/termo-uso.controller.listar';
import { TermoUsoServiceAlterar } from './service/termo-uso.service.alterar';
import { TermoUsoServiceAtivo } from './service/termo-uso.service.ativo';
import { TermoUsoServiceBuscar } from './service/termo-uso.service.buscar';
import { TermoUsoServiceCriar } from './service/termo-uso.service.criar';
import { TermoUsoServiceListar } from './service/termo-uso.service.listar';

// TermoUsoServiceAtivo exportado pra 3-auth reaproveitar - POST
// /auth/cadastro precisa saber qual id_termo é o ativo AGORA, resolvido
// pelo próprio servidor (nunca aceito de um valor vindo do cliente), pra
// passar em registrar_aceite_termo() (03_funcoes_seguranca.sql, [03-D-1]).
//
// Criar/Listar (13-09-2026, pedido do Lucas: "vamos acabar Termos de Uso
// por completo") - tela de administração pra publicar versão nova sem
// precisar abrir o Supabase.
//
// Alterar (mesmo dia, decisão do Lucas depois de pesar 3 opções) - só
// permitido enquanto NINGUÉM aceitou aquela versão ainda (ver
// TermoUsoServiceAlterar) - assim que a 1ª pessoa aceitar, trava pra
// sempre. Ainda SEM excluir - nenhuma versão, aceita ou não, pode
// desaparecer (rastro de auditoria).
@Module({
  controllers: [
    // TermoUsoControllerAtivo ANTES de TermoUsoControllerBuscar de propósito
    // - ver comentário em termo-uso.controller.buscar.ts (os dois disputam
    // GET no mesmo prefixo, resolvido por ordem de registro).
    TermoUsoControllerAlterar,
    TermoUsoControllerAtivo,
    TermoUsoControllerBuscar,
    TermoUsoControllerCriar,
    TermoUsoControllerListar,
  ],
  providers: [
    TermoUsoServiceAlterar,
    TermoUsoServiceAtivo,
    TermoUsoServiceBuscar,
    TermoUsoServiceCriar,
    TermoUsoServiceListar,
  ],
  exports: [TermoUsoServiceAtivo],
})
export class TermoUsoModule {}
