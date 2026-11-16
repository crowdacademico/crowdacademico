// RF-057: o vídeo de apresentação aparece INCORPORADO na página da campanha. A plataforma só guarda o endereço; o
// vídeo é tocado pelo YouTube ou pelo Vimeo. Esta função converte os formatos comuns de endereço desses dois no
// endereço de incorporação (o que vai no `src` do iframe). Qualquer outro endereço devolve null, e a página continua
// mostrando o link para abrir o vídeo em outra aba.
//
// YouTube pelo domínio youtube-nocookie.com (modo de privacidade aprimorada: não grava cookie de quem só abre a página).

const ID_YOUTUBE = /^[\w-]{11}$/;
const ID_VIMEO = /^\d+$/;

export function enderecoVideoIncorporado(endereco: string | null | undefined): string | null {
  if (!endereco) return null;
  let url: URL;
  try {
    url = new URL(endereco.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const partes = url.pathname.split('/').filter(Boolean);

  let idYoutube: string | null = null;
  if (host === 'youtu.be') idYoutube = partes[0] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (partes[0] === 'watch') idYoutube = url.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(partes[0] ?? '')) idYoutube = partes[1] ?? null;
  }
  if (idYoutube && ID_YOUTUBE.test(idYoutube)) return `https://www.youtube-nocookie.com/embed/${idYoutube}`;

  if (host === 'vimeo.com') {
    const id = partes.find((parte) => ID_VIMEO.test(parte));
    if (id) return `https://player.vimeo.com/video/${id}`;
  }
  if (host === 'player.vimeo.com' && partes[0] === 'video' && ID_VIMEO.test(partes[1] ?? '')) {
    return `https://player.vimeo.com/video/${partes[1]}`;
  }
  return null;
}
