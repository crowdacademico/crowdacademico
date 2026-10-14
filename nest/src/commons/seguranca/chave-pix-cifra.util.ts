// Cifra/decifra da chave Pix de conta_recebimento_usuario.chave_criptografada. A chave Pix pode ser o CPF da pessoa, então
// segue a MESMA receita de perfil_pesquisador.cpf_criptografado (AES-256-GCM no processo do Node, formato
// "v1:<iv>:<tag>:<ciphertext>", chave em CPF_ENCRYPTION_KEY): quem decide o algoritmo e a versão continua sendo um lugar só,
// cpf-cifra.util.ts. Estas funções existem para o nome dizer o que está sendo cifrado; o cadastro da chave (PR-12) usa
// cifrarChavePix(), e o worker de repasse usa decifrarChavePix() só no instante de pedir a transferência.
// A chave decifrada nunca deve ir para log.
import { cifrarCpf, decifrarCpf } from './cpf-cifra.util';

export function cifrarChavePix(chavePix: string): string {
  return cifrarCpf(chavePix);
}

export function decifrarChavePix(valorSalvo: string): string {
  return decifrarCpf(valorSalvo);
}
