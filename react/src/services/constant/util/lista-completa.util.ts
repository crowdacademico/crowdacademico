// Confere, na hora de compilar, que uma lista escrita à mão tem TODOS os valores de um tipo. Serve para as listas de
// ordem de exibição (ex.: a ordem dos status de campanha, que segue o ciclo de vida e não a ordem alfabética do
// arquivo gerado do banco). Se o banco ganhar um valor novo e ele faltar na lista, o compilador acusa, com o nome
// do valor que falta no campo `faltando` da mensagem de erro.
//
// Uso: export const ORDEM = listaCompleta<StatusCampanha>()(['rascunho', 'ativo', ...] as const);
export function listaCompleta<Todos extends string>() {
  return <Lista extends readonly Todos[]>(
    lista: Lista & ([Exclude<Todos, Lista[number]>] extends [never] ? unknown : { faltando: Exclude<Todos, Lista[number]> }),
  ): Lista => lista;
}
