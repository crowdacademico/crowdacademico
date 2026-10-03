import { contarCaracteres } from '../../services/constant/util/validacao.util';

// Contagem de caracteres de um campo de texto livre, contra o limite que vem de `configuracoes` (RF-072). Conta
// caracteres de verdade, como o `char_length` do banco: um emoji vale 1, e não 2 (o `.length` do JavaScript
// conta 2). Passou do limite, fica vermelho; quem barra de verdade continua sendo o banco.
export function ContadorCaracteres({ texto, limite, id }: { texto: string; limite: number; id?: string }) {
  const total = contarCaracteres(texto);
  const passou = total > limite;
  return (
    <p id={id} className={'legenda mt-1 texto-herdado ' + (passou ? 'texto-erro enfase' : 'texto-fraco')}>
      {total.toLocaleString('pt-BR')} de {limite.toLocaleString('pt-BR')} caracteres
    </p>
  );
}
