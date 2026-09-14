import { Module } from '@nestjs/common';
import { TermoUsoControllerAlterar } from './controllers/termo-uso.controller.alterar';
import { TermoUsoControllerAtivar } from './controllers/termo-uso.controller.ativar';
import { TermoUsoControllerAtivo } from './controllers/termo-uso.controller.ativo';
import { TermoUsoControllerBuscar } from './controllers/termo-uso.controller.buscar';
import { TermoUsoControllerCriar } from './controllers/termo-uso.controller.criar';
import { TermoUsoControllerExcluir } from './controllers/termo-uso.controller.excluir';
import { TermoUsoControllerListar } from './controllers/termo-uso.controller.listar';
import { TermoUsoServiceAlterar } from './service/termo-uso.service.alterar';
import { TermoUsoServiceAtivar } from './service/termo-uso.service.ativar';
import { TermoUsoServiceAtivo } from './service/termo-uso.service.ativo';
import { TermoUsoServiceBuscar } from './service/termo-uso.service.buscar';
import { TermoUsoServiceCriar } from './service/termo-uso.service.criar';
import { TermoUsoServiceExcluir } from './service/termo-uso.service.excluir';
import { TermoUsoServiceListar } from './service/termo-uso.service.listar';

// TermoUsoServiceAtivo exportado pra 3-auth reaproveitar - POST
// /auth/cadastro precisa saber qual id_termo é o ativo AGORA, resolvido
// pelo próprio servidor (nunca aceito de um valor vindo do cliente), pra
// passar em registrar_aceite_termo() (03_funcoes_seguranca.sql, [03-D-1]).
//
// Criar/Listar (13-09-2026, pedido do Lucas: "vamos acabar Termos de Uso
// por completo") - tela de administração pra publicar versão nova sem
// precisar abrir o Supabase. Criar NUNCA ativa sozinho (corrigido no mesmo
// dia, rodada seguinte - "não é assim que funciona": cria-se um rascunho,
// a "staff" revisa, só DEPOIS um admin torna vigente manualmente).
//
// Alterar (mesmo dia, decisão do Lucas depois de pesar 3 opções) - só
// permitido enquanto NINGUÉM aceitou aquela versão ainda (ver
// TermoUsoServiceAlterar) - assim que a 1ª pessoa aceitar, trava pra
// sempre.
//
// Ativar (mesmo dia, rodada seguinte) - torna uma versão específica a
// vigente do seu tipo, sem trava de aceite (diferente de Alterar) - serve
// tanto pra promover um rascunho revisado quanto pra reverter pra uma
// versão antiga.
//
// Excluir (mesmo dia, pedido do Lucas: "para não sujar o banco" durante o
// desenvolvimento) - só rascunho nunca vigente e nunca aceito por ninguém,
// ver TermoUsoServiceExcluir.
@Module({
  controllers: [
    // TermoUsoControllerAtivo ANTES de TermoUsoControllerBuscar de propósito
    // - ver comentário em termo-uso.controller.buscar.ts (os dois disputam
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
