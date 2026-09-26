import { Fragment } from 'react';
import type { ReactNode } from 'react';

// E-mail, chave técnica e código são uma "palavra" só (`suporte.sistema@crowdacademico.com.br`,
// `orcamento_min_itens`): sem ponto de quebra, a coluna não encolhe e a tabela inteira passa a rolar de lado.
// `<wbr>` depois de `@` e `_` só é usado quando falta espaço de verdade, e a quebra cai sempre num ponto
// natural, nunca no meio de uma palavra. Depois de `.` não: o e-mail viraria 3 linhas (`admin@`, `crowdacademico.`,
// `com.br`) em vez de 2.
export function comQuebrasNaturais(texto: string): ReactNode {
  const partes = texto.split(/(?<=[@_])/);
  if (partes.length === 1) {
    return texto;
  }
  return partes.map((parte, indice) => (
    <Fragment key={indice}>
      {parte}
      {indice < partes.length - 1 && <wbr />}
    </Fragment>
  ));
}
