// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

// Registros REAIS (não dados falsos, ver comentário grande em elenco-
// provider.jsx) que o Campo de Testes evita mexer de propósito, porque
// já nascem com uma "demo" inteira montada desde 07_seed_dados.sql:
// pesquisadores 12-22 (Ana Beatriz até Vinícius, campanha, score e
// links pré-calculados) e as campanhas 1-10 (uma por pesquisador desse
// grupo, com orçamento/cronograma/comentário/transação já seedados).
// Mexer neles pra testar quebraria a demonstração que já existe pronta.
// Continuam aparecendo nas listas/buscas normais (não têm por que sumir,
// são registros reais), só ficam com o botão de ação desabilitado
// aqui dentro do Campo de Testes, com cadeado explicando o porquê.
const PRIMEIRO_ID_PESQUISADOR_BLOQUEADO = 12;
const ULTIMO_ID_PESQUISADOR_BLOQUEADO = 22;
const ULTIMO_ID_CAMPANHA_BLOQUEADA = 10;

export function PESQUISADOR_BLOQUEADO(idUsuario) {
  return idUsuario >= PRIMEIRO_ID_PESQUISADOR_BLOQUEADO && idUsuario <= ULTIMO_ID_PESQUISADOR_BLOQUEADO;
}

export function motivoBloqueioPesquisador() {
  return 'Pesquisador de demonstração (07_seed_dados.sql), já tem campanha, score e links pré-montados. Use outro pesquisador (ou crie um perfil novo) pra testar.';
}

export function CAMPANHA_BLOQUEADA(idCampanha) {
  return idCampanha <= ULTIMO_ID_CAMPANHA_BLOQUEADA;
}

export function motivoBloqueioCampanha() {
  return 'Campanha de demonstração (07_seed_dados.sql), atrelada a um pesquisador de demonstração, já tem orçamento, cronograma e transações pré-montados. Use uma campanha #11 em diante (ou crie uma nova) pra testar.';
}
