// Estado de suspensão, devolvido por GET /usuario/:id/suspensao e GET /perfil-pesquisador/:id/suspensao. Separado de
// UsuarioResponse/PerfilPesquisadorResponse de propósito, mesmo raciocínio de `bloqueado_ate`: estado de moderação não é
// "dado de perfil", é informação sensível de segurança, só para quem está numa tela que precisa dela.
export class SuspensaoResponseDto {
  suspensoAte: Date | null;
  motivoSuspensao: string | null;
  suspensoPor: number | null;
}
