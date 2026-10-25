import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import {
  MENSAGEM_SENHA_CURTA,
  SENHA_MINIMO_CARACTERES,
} from '../../../commons/seguranca/senha.constants';

export class UsuarioRequestUpdate {
  // Só estes 3 campos existem no GRANT UPDATE de `usuario` (06_grants.sql,
  // [06-D-2]) - email_verificado, tentativas_login_falhas, bloqueado_ate,
  // deletado etc. só mudam via função do banco (03_funcoes_seguranca.sql,
  // [03-O]), nunca por UPDATE direto. Não adianta adicionar mais campos aqui
  // sem criar a função correspondente primeiro.
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome precisa ter pelo menos 2 caracteres.' })
  nome?: string;

  // `null` de propósito (botão "Remover foto"): @IsOptional() já pula toda validação quando o valor é null ou
  // undefined (comportamento documentado do class-validator), então @IsInt() só roda de verdade quando alguém
  // manda um id numérico para trocar de foto.
  @IsOptional()
  @IsInt()
  idImagemPerfil?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(SENHA_MINIMO_CARACTERES, { message: MENSAGEM_SENHA_CURTA })
  novaSenha?: string;

  // Obrigatória para trocar a senha da PRÓPRIA conta (o service confere). Em conta de outra pessoa (reset
  // administrativo, com `usuario_suspender`) fica ausente: mesmo endpoint, dois usos.
  @IsOptional()
  @IsString()
  senhaAtual?: string;
}
