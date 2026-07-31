export class AtualizarUsuarioRequestDto {
  // Só estes 3 campos existem no GRANT UPDATE de `usuario` (06_grants.sql,
  // [06-D-2]) — email_verificado, tentativas_login_falhas, bloqueado_ate,
  // deletado etc. só mudam via função do banco (03_funcoes_seguranca.sql,
  // [03-F]), nunca por UPDATE direto. Não adianta adicionar mais campos aqui
  // sem criar a função correspondente primeiro.
  nome?: string;
  idImagemPerfil?: number;
  novaSenha?: string;
}
