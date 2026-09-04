import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';

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
  iniciarUpload: (authFetch, dados) =>
    authFetch('/arquivo/upload/iniciar', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta),

  confirmarUpload: (authFetch, dados) =>
    authFetch('/arquivo/upload/confirmar', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta),

  // `uploadPreAssinado` é a resposta de iniciarUpload - `cabecalhosObrigatorios`
  // precisa ir EXATAMENTE como veio (é isso que a assinatura da URL confere,
  // ver commons/storage/s3-compativel-armazenamento.service.ts). Sem
  // tratarResposta aqui: a resposta do bucket não é JSON e não segue o
  // formato do nosso backend.
  enviarParaBucket: async (uploadPreAssinado, arquivo) => {
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

  buscar: (id) => fetch(`${API_BASE_URL}/arquivo/${id}`).then(tratarResposta),

  remover: (authFetch, id) =>
    authFetch(`/arquivo/${id}`, { method: 'DELETE' }).then(tratarResposta),

  // Devolve { url, padrao } - `url` já pronta pra `<img src>`, `padrao`
  // indica se é o avatar de sistema (usuário não tem foto cadastrada ainda,
  // ou a que tinha foi desativada). `url` pode vir `null` se nem o avatar
  // padrão foi configurado ainda (ver ArquivoServiceResolverAvatar) - quem
  // chama decide o placeholder nesse caso.
  buscarAvatarPorUsuario: (idUsuario) =>
    fetch(`${API_BASE_URL}/arquivo/avatar/${idUsuario}`).then(tratarResposta),
};
