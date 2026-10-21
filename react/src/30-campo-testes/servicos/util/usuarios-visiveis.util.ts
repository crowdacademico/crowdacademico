import { usuarioApi } from '../../../services/1-usuario/api/usuario.api';
import { ErroHttp } from '../../../services/constant/api/http.util';
import type { UsuarioResponse } from '../../../services/1-usuario/type/usuario.type';
import type { UseAuthReturn } from '../../../services/3-auth/hook/use-auth';

// A lista de usuários exige usuario_visualizar_sensivel. No Campo de Testes qualquer papel testa: sem essa permissão
// (usuário comum, pesquisador), a tela segue só com a própria conta em vez de cair inteira.
export async function listarUsuariosVisiveis(auth: UseAuthReturn): Promise<UsuarioResponse[]> {
  try {
    return await usuarioApi.listar(auth.authFetch);
  } catch (erro) {
    if (erro instanceof ErroHttp && erro.status === 403) {
      return auth.usuario ? [auth.usuario] : [];
    }
    throw erro;
  }
}
