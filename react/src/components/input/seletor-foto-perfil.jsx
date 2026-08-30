import { useRef, useState } from 'react';
import { AvatarUsuario } from '../layout/avatar-usuario';
import { ErroHttp } from '../../services/constant/api/http.util';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';

// Espelha a lista aceita no backend (nest/src/25-arquivo/arquivo.constants.ts
// TIPOS_MIME_PERMITIDOS) — MENOS application/pdf, que não faz sentido como
// foto de perfil. Se um dia o backend mudar essa lista, mudar aqui também;
// isto é só uma checagem CLIENTE (evita round-trip óbvio), o backend
// confere de novo (e de verdade — assinatura mágica dos bytes) na
// confirmação, então errar aqui não é um risco de segurança, só uma UX
// pior (erro só depois de enviar).
const TIPOS_AVATAR_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
// Mesmo teto usado pelo backend pra imagens (TAMANHO_MAXIMO_BYTES_POR_MIME).
const TAMANHO_MAXIMO_AVATAR_BYTES = 10 * 1024 * 1024;

// Avatar EDITÁVEL — usa <AvatarUsuario> por baixo pra desenhar a bolinha
// (foto ou inicial colorida, sem duplicar essa lógica), e adiciona por
// cima: o botãozinho de câmera, o <input type="file"> escondido, e o fluxo
// de upload de 3 passos inteiro (iniciar -> enviar pro bucket -> confirmar
// -> devolve o novo id/URL pro componente pai via `aoAlterar`).
//
// Este componente NUNCA salva nada em `usuario` sozinho — ele só sobe o
// arquivo e devolve o `idArquivo` já confirmado. Quem usa isto (
// criar-usuario.jsx, alterar-usuario.jsx) decide quando mandar esse id pro
// backend (no create, ou no PATCH de alterar-usuario.jsx) — mesma separação
// de responsabilidade do resto do app (componente de input nunca chama
// usuarioApi diretamente).
export function SeletorFotoPerfil({
  authFetch,
  nome,
  url,
  aoAlterar,
  tamanho = 'xl',
  desabilitado = false,
}) {
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [erroLocal, setErroLocal] = useState('');

  const processarArquivo = async (arquivo) => {
    setErroLocal('');

    if (!TIPOS_AVATAR_PERMITIDOS.includes(arquivo.type)) {
      setErroLocal('Formato não aceito. Envie um JPEG, PNG ou WebP.');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_AVATAR_BYTES) {
      setErroLocal('Imagem muito grande — o tamanho máximo é 10 MB.');
      return;
    }

    setEnviando(true);
    try {
      const uploadPreAssinado = await arquivoApi.iniciarUpload(authFetch, {
        nomeOriginal: arquivo.name,
        tipoMime: arquivo.type,
        tamanhoBytes: arquivo.size,
      });

      await arquivoApi.enviarParaBucket(uploadPreAssinado, arquivo);

      const arquivoConfirmado = await arquivoApi.confirmarUpload(authFetch, {
        chave: uploadPreAssinado.chave,
        nomeOriginal: arquivo.name,
        tipoMime: arquivo.type,
        tamanhoBytes: arquivo.size,
      });

      aoAlterar(arquivoConfirmado.idArquivo, arquivoConfirmado.url);
    } catch (erroRequisicao) {
      // ErroHttp (traduzirErro) só cobre erro de VERDADE do backend
      // (iniciar/confirmar) — validação local e falha de rede no PUT pro
      // bucket (arquivoApi.enviarParaBucket) já lançam com mensagem própria
      // em português; passar essas por traduzirErro as trocaria pela
      // mensagem genérica de "não foi possível falar com o servidor" (ver
      // traduzir-erro.util.js), que aqui seria enganosa.
      setErroLocal(
        erroRequisicao instanceof ErroHttp
          ? traduzirErro(erroRequisicao)
          : erroRequisicao.message,
      );
    } finally {
      setEnviando(false);
    }
  };

  const aoSelecionarArquivo = (evento) => {
    const arquivo = evento.target.files?.[0];
    // Zera o valor do input — sem isso, escolher o MESMO arquivo duas vezes
    // seguidas (ex.: tentou, deu erro de tamanho, cortou a imagem, tentou
    // de novo com o mesmo nome) não dispara onChange na segunda vez.
    evento.target.value = '';
    if (arquivo) {
      processarArquivo(arquivo);
    }
  };

  return (
    <div>
      <div className="relative inline-block">
        <AvatarUsuario nome={nome} foto={url} tamanho={tamanho} forma="circulo" />

        {enviando && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 text-white">
            <i className="fa-solid fa-spinner fa-spin"></i>
          </div>
        )}

        {!desabilitado && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            aria-label="Alterar foto de perfil"
            title="Alterar foto de perfil"
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-dark hover:bg-black text-white flex items-center justify-center text-xs border-2 border-white shadow transition-colors disabled:opacity-60"
          >
            <i className="fa-solid fa-camera"></i>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_AVATAR_PERMITIDOS.join(',')}
          className="hidden"
          onChange={aoSelecionarArquivo}
        />
      </div>

      {erroLocal && <p className="text-red-700 text-xs font-bold mt-1.5 max-w-[10rem]">{erroLocal}</p>}
    </div>
  );
}
