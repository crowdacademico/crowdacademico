// Forma pública/segura de um usuário — nunca inclui senha_hash,
// tentativas_login_falhas, bloqueado_ate, ultimo_login_ip, deletado_por.
// Esses ficam só no lado do backend (auth/moderação), nunca na resposta HTTP.
//
// ultimoLoginEm é EXCEÇÃO deliberada (07-08-2026, pedido do Lucas): só a
// DATA do último login, sem o IP (esse continua de fora, é o mais sensível
// dos 4) — pedido pra tirar o "ruído" de login bem-sucedido da tela de log
// de auditoria (fn_log_auditoria agora ignora updates só nessas 2 colunas,
// ver 05_regras_negocio.sql [05-L]) e mostrar a mesma informação, só que na
// Consulta de cada usuário em vez de uma linha nova no log a cada login.
export class UsuarioResponseDto {
  idUsuario: number;
  nome: string;
  email: string;
  idImagemPerfil: number | null;
  criadoEm: Date;
  emailVerificado: boolean;
  ultimoLoginEm: Date | null;
  // Preferência de tema/tamanho de fonte POR CONTA (10-08-2026) — NULL =
  // sem preferência salva ainda, o cliente aplica o padrão do app.
  temaPreferido: string | null;
  escalaFontePreferida: number | null;
}
