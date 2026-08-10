import { UsuarioEntity } from '../../entity/usuario.entity';
import { UsuarioResponseDto } from '../response/usuario.response.dto';

// Pick, não UsuarioEntity inteiro: services nunca selecionam senha_hash (só
// auth.service.login.ts faz isso, isolado, e nem passa por este converter),
// então exigir a entity completa aqui quebraria a tipagem em toda query que
// usa USUARIO_COLUNAS_SELECT. Isto aceita qualquer objeto que tenha PELO
// MENOS estes 7 campos — a query pode devolver mais colunas, sem problema.
type UsuarioParaConverter = Pick<
  UsuarioEntity,
  | 'id_usuario'
  | 'nome'
  | 'email'
  | 'id_imagem_perfil'
  | 'criado_em'
  | 'email_verificado'
  | 'ultimo_login_em'
>;

// `tema_preferido`/`escala_fonte_preferida` (10-08-2026) são OPCIONAIS de
// propósito, não fazem parte de `USUARIO_COLUNAS_SELECT` — essa lista é
// usada pelo LOGIN (auth.service.login.ts), que não pode depender de uma
// migração ainda não aplicada em produção (mesma lição do SAVEPOINT em
// buscarSuspensao, "sem essa proteção, o endpoint sozinho já derrubava com
// 500"). Quem precisa dessas 2 colunas (usuario.service.findone.ts) busca
// numa query SEPARADA, protegida por SAVEPOINT, e passa aqui como
// argumento extra — ausente = `null` (mesmo significado de "sem
// preferência salva").
export class UsuarioConverter {
  static paraResponseDto(
    entity: UsuarioParaConverter,
    preferencias?: { temaPreferido: string | null; escalaFontePreferida: number | null },
  ): UsuarioResponseDto {
    return {
      idUsuario: entity.id_usuario,
      nome: entity.nome,
      email: entity.email,
      idImagemPerfil: entity.id_imagem_perfil,
      criadoEm: entity.criado_em,
      emailVerificado: entity.email_verificado,
      ultimoLoginEm: entity.ultimo_login_em,
      temaPreferido: preferencias?.temaPreferido ?? null,
      escalaFontePreferida: preferencias?.escalaFontePreferida ?? null,
    };
  }
}
