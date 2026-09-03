import { useRef, useState } from 'react';
import { AvatarUsuario } from '../layout/avatar-usuario';
import { ErroHttp } from '../../services/constant/api/http.util';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';
import { reduzirImagemNoNavegador } from '../../services/25-arquivo/util/reduzir-imagem.util';

// Espelha a lista aceita no backend (nest/src/25-arquivo/arquivo.constants.ts
// TIPOS_MIME_PERMITIDOS) — MENOS application/pdf, que não faz sentido como
// foto de perfil. Se um dia o backend mudar essa lista, mudar aqui também;
// isto é só uma checagem CLIENTE (evita round-trip óbvio), o backend
// confere de novo (e de verdade — assinatura mágica dos bytes) na
// confirmação, então errar aqui não é um risco de segurança, só uma UX
// pior (erro só depois de enviar).
const TIPOS_AVATAR_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
// Mesmo teto usado pelo backend pra imagens (TAMANHO_MAXIMO_BYTES_POR_MIME,
// baixado de 10MB pra 8MB em 01-09-2026 — plano grátis do Supabase Storage
// só tem 1GB de espaço total). Checado DEPOIS de reduzirImagemNoNavegador
// (01-09-2026) — não antes: com a redução automática no cliente, uma foto
// de celular de 10-15MB vira algumas centenas de KB, então barrar pelo
// tamanho BRUTO derrubaria o próprio motivo de ter a redução.
const TAMANHO_MAXIMO_AVATAR_BYTES = 8 * 1024 * 1024;
// Teto BRUTO (antes da redução) — só pra recusar algo absurdo cedo (ex.:
// vídeo de 300MB renomeado pra .jpg) sem gastar CPU tentando processar no
// canvas; não tem relação com o teto real do backend acima.
const TAMANHO_MAXIMO_BRUTO_BYTES = 30 * 1024 * 1024;
// Mesmos números do perfil 'avatar' em PERFIL_PROCESSAMENTO_POR_CONTEXTO
// (nest/src/25-arquivo/arquivo.constants.ts) — sem import cruzado entre
// os repositórios, mantenha os dois em sincronia manualmente se mudar.
const PERFIL_REDUCAO_AVATAR = { larguraMaxima: 512, qualidade: 80 };

// Avatar EDITÁVEL — usa <AvatarUsuario> por baixo pra desenhar a bolinha
// (foto ou inicial colorida, sem duplicar essa lógica), e adiciona por
// cima: o botãozinho de câmera, o <input type="file"> escondido, o botão
// de remover (só aparece quando já existe uma foto), e o fluxo de upload
// de 3 passos inteiro (iniciar -> enviar pro bucket -> confirmar -> devolve
// o novo id/URL pro componente pai via `aoAlterar`).
//
// Este componente NUNCA salva nada em `usuario` sozinho — ele só sobe (ou
// sinaliza a remoção d)o arquivo e devolve o resultado pro pai via
// `aoAlterar`. Quem usa isto (criar-usuario.jsx, alterar-usuario.jsx,
// minha-conta-page.jsx) decide quando mandar isso pro backend (no create,
// ou no PATCH de alterar/Minha Conta) — mesma separação de
// responsabilidade do resto do app (componente de input nunca chama
// usuarioApi diretamente).
//
// `aoAlterar(idArquivo, novaUrl)` — foto nova escolhida (upload já
// confirmado no backend). `aoAlterar(null, null)` (25-08-2026, "Remover
// foto") — pessoa pediu pra tirar a foto atual; quem usa este componente
// distingue "nenhuma escolha feita ainda" (não chamou aoAlterar) de
// "removida de propósito" (chamou com null) guardando o id como
// `undefined` por padrão, nunca `null`, exatamente pra sobrar esse
// terceiro estado — ver alterar-usuario.jsx/minha-conta-page.jsx.
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

  const processarArquivo = async (arquivoEscolhido) => {
    setErroLocal('');

    if (!TIPOS_AVATAR_PERMITIDOS.includes(arquivoEscolhido.type)) {
      setErroLocal('Formato não aceito. Envie um JPEG, PNG ou WebP.');
      return;
    }
    if (arquivoEscolhido.size > TAMANHO_MAXIMO_BRUTO_BYTES) {
      setErroLocal('Imagem muito grande pra processar.');
      return;
    }

    setEnviando(true);
    try {
      // Reduz no navegador ANTES de subir (Canvas API, 01-09-2026) — upload
      // mais rápido numa conexão ruim e menos risco da URL pré-assinada (5
      // min de validade) expirar no meio do envio. Se falhar por qualquer
      // motivo (navegador sem suporte, etc.), devolve o arquivo original
      // sem quebrar o fluxo — ver reduzir-imagem.util.js. O backend
      // continua processando de novo com `sharp` de qualquer jeito, então
      // isto é só uma otimização de UX, nunca a autoridade final.
      const arquivo = await reduzirImagemNoNavegador(
        arquivoEscolhido,
        PERFIL_REDUCAO_AVATAR,
      );

      if (arquivo.size > TAMANHO_MAXIMO_AVATAR_BYTES) {
        // `finally` abaixo cuida de setEnviando(false) neste return também.
        setErroLocal('Imagem muito grande — o tamanho máximo é 8 MB.');
        return;
      }

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
        // Diz ao backend qual teto de redimensionamento usar (512px pra
        // avatar) — ver PERFIL_PROCESSAMENTO_POR_CONTEXTO em
        // nest/src/25-arquivo/arquivo.constants.ts.
        contexto: 'avatar',
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

  // Remover foto (25-08-2026, pedido do Lucas: "botão simples pra remover
  // a foto, arquivo, tudo limpo") — não apaga nada AQUI, só sinaliza a
  // intenção pro pai (aoAlterar(null, null)); o arquivo de verdade (linha
  // desativada + bytes apagados do bucket) só some quando quem usa este
  // componente salvar de fato (PATCH /usuario com idImagemPerfil: null —
  // usuario.service.update.ts já cuida da limpeza, mesmo caminho que já
  // desativa a foto ANTIGA ao trocar por uma nova).
  const aoRemover = () => {
    if (!window.confirm('Remover a foto de perfil?')) {
      return;
    }
    setErroLocal('');
    aoAlterar(null, null);
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

        {!desabilitado && url && (
          <button
            type="button"
            onClick={aoRemover}
            disabled={enviando}
            aria-label="Remover foto de perfil"
            title="Remover foto de perfil"
            className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-xs border-2 border-white shadow transition-colors disabled:opacity-60"
          >
            <i className="fa-solid fa-trash"></i>
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
