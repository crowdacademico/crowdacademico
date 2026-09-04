// Separada de UsuarioResponse de propósito (09-08-2026, Bloco G) - mesmo
// raciocínio já usado pra `bloqueado_ate` (excluída da forma pública/geral
// do usuário): estado de moderação não é "dado de perfil", é informação
// sensível de segurança, só pra quem está numa tela que precisa dela.
export class UsuarioResponseSuspend {
  suspensoAte: Date | null;
  motivoSuspensao: string | null;
  suspensoPor: number | null;
}
