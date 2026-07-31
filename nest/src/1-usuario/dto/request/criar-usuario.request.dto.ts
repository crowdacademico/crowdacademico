export class CriarUsuarioRequestDto {
  nome: string;
  email: string;
  // senha em texto puro só nesta borda de entrada — o service faz o hash
  // (bcrypt) antes de qualquer INSERT. Nunca chega perto de vira senha_hash
  // sem passar por bcrypt.hash().
  senha: string;
}
