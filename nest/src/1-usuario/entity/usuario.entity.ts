// Espelha a linha de `usuario` como o Postgres devolve (snake_case, igual à
// coluna) — nunca inclui senha_hash aqui de propósito, ver constants/.
export class UsuarioEntity {
  id_usuario: number;
  nome: string;
  email: string;
  id_imagem_perfil: number | null;
  criado_em: Date;
  deletado: boolean;
  deletado_em: Date | null;
  deletado_por: number | null;
  email_verificado: boolean;
  tentativas_login_falhas: number;
  bloqueado_ate: Date | null;
  ultimo_login_em: Date | null;
  ultimo_login_ip: string | null;
}
