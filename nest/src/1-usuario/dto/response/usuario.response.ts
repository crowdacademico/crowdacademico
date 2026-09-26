// Forma pública/segura de um usuário: nunca inclui senha_hash, tentativas_login_falhas, bloqueado_ate,
// ultimo_login_ip, deletado_por. Esses ficam só no lado do backend (auth/moderação), nunca na resposta HTTP.
//
// ultimoLoginEm é EXCEÇÃO deliberada: só a DATA do último login, sem o IP (esse continua de fora, é o mais
// sensível dos 4). Tira o "ruído" de login bem-sucedido do log de auditoria (fn_log_auditoria ignora updates só
// nessas 2 colunas, ver 05_regras_negocio.sql [05-L]) e mostra a mesma informação na Consulta de cada usuário.
export class UsuarioResponse {
  idUsuario: number;
  nome: string;
  email: string;
  idImagemPerfil: number | null;
  criadoEm: Date;
  emailVerificado: boolean;
  ultimoLoginEm: Date | null;
  // Opcional de propósito: só quem busca UM usuário por vez (findOne, update) resolve isto de verdade (1 query
  // barata a mais); findAll (a listagem) nunca preenche, para não virar N+1 resolvendo avatar de cada linha da
  // tabela. `undefined` aqui = "não resolvido", diferente de `null` = "resolvido, é o avatar padrão/sem foto".
  avatarUrl?: string | null;
}
