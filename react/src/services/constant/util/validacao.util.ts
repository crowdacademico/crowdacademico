// Formato mínimo de e-mail no formulário (algo@algo.algo, sem espaço), para avisar antes de enviar. A validação de
// verdade é a do Nest (`@IsEmail`); esta só evita uma ida ao servidor por erro de digitação. Usada no Cadastro e no
// Esqueci a senha.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(email: string): boolean {
  return REGEX_EMAIL.test(email.trim());
}

// Caracteres de verdade, como o `char_length` do banco: um emoji vale 1 (o `.length` do JavaScript conta 2).
// Usada no contador e na validação dos campos de texto livre com limite (RF-072).
export function contarCaracteres(texto: string): number {
  return [...texto].length;
}
