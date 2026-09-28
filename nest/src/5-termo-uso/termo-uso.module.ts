import { Module } from '@nestjs/common';
import { TermoUsoControllerAlterar } from './controllers/termo-uso.controller.update';
import { TermoUsoControllerAtivar } from './controllers/termo-uso.controller.activate';
import { TermoUsoControllerAtivo } from './controllers/termo-uso.controller.find-active';
import { TermoUsoControllerBuscar } from './controllers/termo-uso.controller.findone';
import { TermoUsoControllerCriar } from './controllers/termo-uso.controller.create';
import { TermoUsoControllerExcluir } from './controllers/termo-uso.controller.remove';
import { TermoUsoControllerListar } from './controllers/termo-uso.controller.findall';
import { TermoUsoServiceAlterar } from './service/termo-uso.service.update';
import { TermoUsoServiceAtivar } from './service/termo-uso.service.activate';
import { TermoUsoServiceAtivo } from './service/termo-uso.service.find-active';
import { TermoUsoServiceBuscar } from './service/termo-uso.service.findone';
import { TermoUsoServiceCriar } from './service/termo-uso.service.create';
import { TermoUsoServiceExcluir } from './service/termo-uso.service.remove';
import { TermoUsoServiceListar } from './service/termo-uso.service.findall';

// TermoUsoServiceAtivo exportado para 3-auth reaproveitar: POST /auth/cadastro precisa saber qual id_termo é o
// ativo AGORA, resolvido pelo próprio servidor (nunca aceito de um valor vindo do cliente), para passar em
// registrar_aceite_termo() (03_funcoes_seguranca.sql, [03-D-1]).
//
// Criar/Listar: tela de administração para publicar versão nova sem precisar abrir o Supabase. Criar NUNCA
// ativa sozinho (cria-se um rascunho, a "staff" revisa, só DEPOIS um admin torna vigente manualmente).
//
// Alterar: só permitido enquanto NINGUÉM aceitou aquela versão ainda (ver TermoUsoServiceAlterar); assim que a
// 1ª pessoa aceitar, trava para sempre.
//
// Ativar: torna uma versão específica a vigente do seu tipo, sem trava de aceite (diferente de Alterar); serve
// tanto para promover um rascunho revisado quanto para reverter para uma versão antiga.
//
// Excluir: só rascunho nunca vigente e nunca aceito por ninguém, ver TermoUsoServiceExcluir.
@Module({
  controllers: [
    // TermoUsoControllerAtivo ANTES de TermoUsoControllerBuscar de propósito
    // - ver comentário em termo-uso.controller.findone.ts (os dois disputam
    // GET no mesmo prefixo, resolvido por ordem de registro). Ativar/Excluir
    // não disputam nada (métodos/profundidade de caminho diferentes de
    // todos os outros), ordem deles não importa.
    TermoUsoControllerAlterar,
    TermoUsoControllerAtivar,
    TermoUsoControllerAtivo,
    TermoUsoControllerBuscar,
    TermoUsoControllerCriar,
    TermoUsoControllerExcluir,
    TermoUsoControllerListar,
  ],
  providers: [
    TermoUsoServiceAlterar,
    TermoUsoServiceAtivar,
    TermoUsoServiceAtivo,
    TermoUsoServiceBuscar,
    TermoUsoServiceCriar,
    TermoUsoServiceExcluir,
    TermoUsoServiceListar,
  ],
  exports: [TermoUsoServiceAtivo],
})
export class TermoUsoModule {}
