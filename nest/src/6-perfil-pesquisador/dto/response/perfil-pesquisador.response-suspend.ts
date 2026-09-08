// Espelha usuario.response-suspend.ts - mesmo raciocínio: separada de
// PerfilPesquisadorResponse de propósito, estado de moderação não é "dado
// de perfil", só pra quem está numa tela que precisa dele.
export class PerfilPesquisadorResponseSuspend {
  suspensoAte: Date | null;
  motivoSuspensao: string | null;
  suspensoPor: number | null;
}
