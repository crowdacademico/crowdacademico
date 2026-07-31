// Forma pública/segura de um usuário — nunca inclui senha_hash,
// tentativas_login_falhas, bloqueado_ate, ultimo_login_ip, deletado_por.
// Esses ficam só no lado do backend (auth/moderação), nunca na resposta HTTP.
export class UsuarioResponseDto {
  idUsuario: number;
  nome: string;
  email: string;
  idImagemPerfil: number | null;
  criadoEm: Date;
  emailVerificado: boolean;
}
