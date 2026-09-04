// Redimensiona/converte imagem NO NAVEGADOR antes do upload, via Canvas
// API nativa (sem biblioteca, zero custo) - complementa, não substitui, o
// processamento de verdade que o backend já faz com `sharp` em
// confirmar-upload.ts (ver nest/src/25-arquivo/util/arquivo.processamento
// -imagem.util.ts). O backend continua sendo a autoridade: o navegador
// pode mentir, alguém pode chamar a API direto sem passar por aqui. O
// ganho de fazer isso também no cliente é upload mais rápido numa conexão
// ruim (foto de celular de 5MB vira umas centenas de KB antes de sair do
// aparelho) e menos risco da URL pré-assinada (5 minutos de validade)
// expirar no meio de um envio lento.
//
// Se qualquer coisa der errado (navegador sem suporte, imagem corrompida,
// canvas "tainted"), cai pro arquivo ORIGINAL sem quebrar o upload - essa
// função é só uma otimização de UX, nunca deve ser o motivo de um upload
// falhar.

const TIPOS_REDUZIVEIS = ['image/jpeg', 'image/png', 'image/webp'];

const EXTENSAO_POR_TIPO_SAIDA = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
};

function trocarExtensao(nomeOriginal, novaExtensao) {
  const semExtensao = nomeOriginal.replace(/\.[^./\\]+$/, '');
  return `${semExtensao}.${novaExtensao}`;
}

// Tenta gerar o Blob no formato pedido - `canvas.toBlob` com 'image/webp'
// nem todo navegador honra (Safari mais antigo cai pra PNG em silêncio,
// sem erro nenhum), então confere o `.type` do resultado antes de confiar
// nele.
function paraBlob(canvas, tipoMime, qualidade) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, tipoMime, qualidade);
  });
}

/**
 * @param {File} arquivo - imagem escolhida pelo usuário
 * @param {{ larguraMaxima: number, qualidade: number }} opcoes - mesmo
 *   perfil (largura/qualidade) usado no backend pro mesmo contexto, ver
 *   PERFIL_PROCESSAMENTO_POR_CONTEXTO em arquivo.constants.ts - mantenha
 *   os dois em sincronia manualmente, não há import cruzado entre os
 *   repositórios nest/ e react/.
 * @returns {Promise<File>} o arquivo reduzido, ou o ORIGINAL se a redução
 *   falhar ou não compensar (ficar maior que o original).
 */
export async function reduzirImagemNoNavegador(arquivo, { larguraMaxima, qualidade }) {
  if (!TIPOS_REDUZIVEIS.includes(arquivo.type)) {
    return arquivo;
  }

  try {
    const bitmap = await createImageBitmap(arquivo, {
      imageOrientation: 'from-image',
    });

    const escala = Math.min(1, larguraMaxima / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    let blob = await paraBlob(canvas, 'image/webp', qualidade / 100);
    if (!blob || blob.type !== 'image/webp') {
      // Navegador não codifica WebP em canvas - cai pra JPEG (ainda com
      // qualidade ajustável, ao contrário de PNG que sempre sai sem perda
      // e, por isso, muito maior).
      blob = await paraBlob(canvas, 'image/jpeg', qualidade / 100);
    }

    if (!blob || blob.size >= arquivo.size) {
      // Não compensou (imagem já pequena/otimizada, ou o navegador não
      // conseguiu comprimir de verdade) - mantém o original, o backend
      // ainda vai processar de qualquer jeito.
      return arquivo;
    }

    const extensao = EXTENSAO_POR_TIPO_SAIDA[blob.type] ?? 'jpg';
    const nomeReduzido = trocarExtensao(arquivo.name, extensao);
    return new File([blob], nomeReduzido, { type: blob.type });
  } catch {
    // createImageBitmap/canvas indisponível ou falhou por qualquer
    // motivo - upload segue com o arquivo original, sem bloquear o
    // usuário por causa de uma otimização que é só um bônus.
    return arquivo;
  }
}
