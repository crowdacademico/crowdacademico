import { arquivoApi } from '../api/arquivo.api';
import { reduzirImagemNoNavegador } from './reduzir-imagem.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ArquivoResponse } from '../type/arquivo.type';

// Mesmos números do perfil 'atualizacao' em PERFIL_PROCESSAMENTO_POR_CONTEXTO (nest/src/26-arquivo/constants/arquivo.constants.ts).
const PERFIL_REDUCAO_ATUALIZACAO = { larguraMaxima: 1600, qualidade: 78 };

// Envia um anexo de atualização nos 3 passos do módulo 26-arquivo (iniciar, subir ao armazenamento, confirmar). A imagem é
// reduzida no navegador antes; o PDF vai como está. O tipo e o tamanho quem confere de verdade é o backend. O arquivo
// fica sem dono até ser ligado à atualização; se nunca for, a limpeza automática apaga.
export async function enviarAnexoAtualizacao(
  authFetch: AuthFetch,
  escolhido: File,
  aoProgresso?: (percentual: number) => void,
): Promise<ArquivoResponse> {
  const arquivo = escolhido.type.startsWith('image/')
    ? await reduzirImagemNoNavegador(escolhido, PERFIL_REDUCAO_ATUALIZACAO)
    : escolhido;
  const dados = { nomeOriginal: arquivo.name, tipoMime: arquivo.type, tamanhoBytes: arquivo.size };
  const upload = await arquivoApi.iniciarUpload(authFetch, dados);
  await arquivoApi.enviarParaBucket(upload, arquivo, aoProgresso);
  return arquivoApi.confirmarUpload(authFetch, { ...dados, chave: upload.chave, contexto: 'atualizacao' });
}
