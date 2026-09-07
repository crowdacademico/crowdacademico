import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  ArquivoResponse,
  ArquivoResponseUploadIniciado,
  AvatarResolvido,
} from '../type/arquivo.type';

// Espelha nest/src/25-arquivo - fluxo de upload em 2 passos (ver doc de
// arquitetura do módulo): iniciar (pega URL pré-assinada) -> enviarParaBucket
// (PUT direto no provedor de armazenamento, NUNCA via authFetch - é outro
// host, não deve levar Authorization nem Content-Type: application/json) ->
// confirmar (Nest valida de verdade e grava a linha em `arquivo`).
//
// GET /arquivo/:id e GET /arquivo/avatar/:idUsuario são públicos no backend
// (pol_arquivo_select é USING(true)) - chamados com fetch cru, sem
// authFetch, mesmo padrão de tipoLinkApi.listarPublico.
export const arquivoApi = {
  iniciarUpload: (authFetch: AuthFetch, dados: unknown): Promise<ArquivoResponseUploadIniciado> =>
    authFetch('/arquivo/upload/iniciar', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<ArquivoResponseUploadIniciado>),

  confirmarUpload: (authFetch: AuthFetch, dados: unknown): Promise<ArquivoResponse> =>
    authFetch('/arquivo/upload/confirmar', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<ArquivoResponse>),

  // `uploadPreAssinado` é a resposta de iniciarUpload - `cabecalhosObrigatorios`
  // precisa ir EXATAMENTE como veio (é isso que a assinatura da URL confere,
  // ver commons/storage/s3-compativel-armazenamento.service.ts). Sem
  // tratarResposta aqui: a resposta do bucket não é JSON e não segue o
  // formato do nosso backend.
  enviarParaBucket: async (
    uploadPreAssinado: ArquivoResponseUploadIniciado,
    arquivo: Blob | File,
  ): Promise<void> => {
    const resposta = await fetch(uploadPreAssinado.urlUpload, {
      method: uploadPreAssinado.metodo,
      headers: uploadPreAssinado.cabecalhosObrigatorios,
      body: arquivo,
    });
    if (!resposta.ok) {
      throw new Error(
        'Falha ao enviar o arquivo para o armazenamento (URL pode ter expirado - tente de novo).',
      );
    }
  },

  buscar: (id: number | string): Promise<ArquivoResponse> =>
    fetch(`${API_BASE_URL}/arquivo/${id}`).then(tratarResposta<ArquivoResponse>),

  remover: (authFetch: AuthFetch, id: number | string): Promise<void> =>
    authFetch(`/arquivo/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),

  // Devolve { url } - `url` já pronta pra `<img src>`, ou `null` se a
  // pessoa não tem foto cadastrada. Sem foto, quem chama não precisa
  // resolver nenhum "avatar padrão" sozinho - AvatarUsuario
  // (components/layout/avatar-usuario.jsx) já desenha iniciais com fundo
  // colorido quando `foto` é null.
  buscarAvatarPorUsuario: (idUsuario: number | string): Promise<AvatarResolvido> =>
    fetch(`${API_BASE_URL}/arquivo/avatar/${idUsuario}`).then(tratarResposta<AvatarResolvido>),
};
