import { UsuarioEntity } from '../../entity/usuario.entity';
import { UsuarioResponseDto } from '../response/usuario.response.dto';

export class UsuarioConverter {
  static paraResponseDto(entity: UsuarioEntity): UsuarioResponseDto {
    return {
      idUsuario: entity.id_usuario,
      nome: entity.nome,
      email: entity.email,
      idImagemPerfil: entity.id_imagem_perfil,
      criadoEm: entity.criado_em,
      emailVerificado: entity.email_verificado,
    };
  }
}
