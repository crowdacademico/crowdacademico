import { Module } from '@nestjs/common';
import { TermoUsoControllerUpdate } from './controllers/termo-uso.controller.update';
import { TermoUsoControllerActivate } from './controllers/termo-uso.controller.activate';
import { TermoUsoControllerFindActive } from './controllers/termo-uso.controller.find-active';
import { TermoUsoControllerFindOne } from './controllers/termo-uso.controller.findone';
import { TermoUsoControllerCreate } from './controllers/termo-uso.controller.create';
import { TermoUsoControllerRemove } from './controllers/termo-uso.controller.remove';
import { TermoUsoControllerFindAll } from './controllers/termo-uso.controller.findall';
import { TermoUsoControllerAccept } from './controllers/termo-uso.controller.accept';
import { TermoUsoServiceUpdate } from './service/termo-uso.service.update';
import { TermoUsoServiceActivate } from './service/termo-uso.service.activate';
import { TermoUsoServiceFindActive } from './service/termo-uso.service.find-active';
import { TermoUsoServiceFindOne } from './service/termo-uso.service.findone';
import { TermoUsoServiceCreate } from './service/termo-uso.service.create';
import { TermoUsoServiceRemove } from './service/termo-uso.service.remove';
import { TermoUsoServiceFindAll } from './service/termo-uso.service.findall';
import { TermoUsoServiceAccept } from './service/termo-uso.service.accept';

// TermoUsoServiceFindActive exportado para 3-auth reaproveitar: POST /auth/cadastro precisa saber qual id_termo é o
// ativo AGORA, resolvido pelo próprio servidor (nunca aceito de um valor vindo do cliente), para passar em
// registrar_aceite_termo() (03_funcoes_seguranca.sql, [03-D-1]).
//
// Criar/Listar: tela de administração para publicar versão nova sem precisar abrir o Supabase. Criar NUNCA
// ativa sozinho (cria-se um rascunho, a "staff" revisa, só DEPOIS um admin torna vigente manualmente).
//
// Alterar: só permitido enquanto NINGUÉM aceitou aquela versão ainda (ver TermoUsoServiceUpdate); assim que a
// 1ª pessoa aceitar, trava para sempre.
//
// Ativar: torna uma versão específica a vigente do seu tipo, sem trava de aceite (diferente de Alterar); serve
// tanto para promover um rascunho revisado quanto para reverter para uma versão antiga.
//
// Excluir: só rascunho nunca vigente e nunca aceito por ninguém, ver TermoUsoServiceRemove.
//
// Aceitar: quem já tem conta aceita a versão vigente nova (RF-015), ver TermoUsoServiceAccept.
@Module({
  controllers: [
    // TermoUsoControllerFindActive ANTES de TermoUsoControllerFindOne de propósito
    // - ver comentário em termo-uso.controller.findone.ts (os dois disputam
    // GET no mesmo prefixo, resolvido por ordem de registro). Ativar/Excluir
    // não disputam nada (métodos/profundidade de caminho diferentes de
    // todos os outros), ordem deles não importa.
    TermoUsoControllerUpdate,
    TermoUsoControllerActivate,
    TermoUsoControllerFindActive,
    TermoUsoControllerFindOne,
    TermoUsoControllerCreate,
    TermoUsoControllerRemove,
    TermoUsoControllerFindAll,
    TermoUsoControllerAccept,
  ],
  providers: [
    TermoUsoServiceUpdate,
    TermoUsoServiceActivate,
    TermoUsoServiceFindActive,
    TermoUsoServiceFindOne,
    TermoUsoServiceCreate,
    TermoUsoServiceRemove,
    TermoUsoServiceFindAll,
    TermoUsoServiceAccept,
  ],
  exports: [TermoUsoServiceFindActive],
})
export class TermoUsoModule {}
