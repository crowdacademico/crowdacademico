// Separada de UsuarioResponse de propósito, mesmo raciocínio de `bloqueado_ate` (fora da forma pública/geral do
// usuário): estado de moderação não é "dado de perfil", é informação sensível de segurança, só para quem está
// numa tela que precisa dela.
export class UsuarioResponseSuspend {
  suspensoAte: Date | null;
  motivoSuspensao: string | null;
  suspensoPor: number | null;
}
