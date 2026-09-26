import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AvatarUsuario } from '../layout/avatar-usuario';
import { Dica } from '../layout/tooltip';
import type { TamanhoAvatar } from '../layout/avatar-usuario';
import { ErroHttp } from '../../services/constant/api/http.util';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import { arquivoApi } from '../../services/25-arquivo/api/arquivo.api';
import { reduzirImagemNoNavegador, TIPOS_REDUZIVEIS } from '../../services/25-arquivo/util/reduzir-imagem.util';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';

// Espelha a lista aceita no backend (nest/src/25-arquivo/arquivo.constants.ts TIPOS_MIME_PERMITIDOS) MENOS
// application/pdf, que não faz sentido como foto de perfil. Se um dia o backend mudar essa lista, mudar aqui
// também; isto é só uma checagem CLIENTE (evita round-trip óbvio), o backend confere de novo (e de verdade:
// assinatura mágica dos bytes) na confirmação, então errar aqui não é um risco de segurança, só uma UX pior
// (erro só depois de enviar). Não é config: é lista estrutural do que o processamento de imagem (`sharp`) sabe
// converter, não regra de negócio editável pelo Admin.
// (a lista mora em reduzir-imagem.util.ts, TIPOS_REDUZIVEIS)
// Teto BRUTO (antes da redução): só para recusar algo absurdo cedo (ex.: vídeo de 300MB renomeado para .jpg)
// sem gastar CPU tentando processar no canvas; não tem relação com o teto real do backend (abaixo, via config).
const TAMANHO_MAXIMO_BRUTO_BYTES = 30 * 1024 * 1024;
// Mesmos números do perfil 'avatar' em PERFIL_PROCESSAMENTO_POR_CONTEXTO
// (nest/src/25-arquivo/arquivo.constants.ts) - sem import cruzado entre
// os repositórios, mantenha os dois em sincronia manualmente se mudar.
const PERFIL_REDUCAO_AVATAR = { larguraMaxima: 512, qualidade: 80 };

// Avatar EDITÁVEL: usa <AvatarUsuario> por baixo para desenhar a bolinha (foto ou inicial colorida, sem
// duplicar essa lógica), e adiciona por cima: o botãozinho de câmera, o <input type="file"> escondido, o botão
// de remover (só aparece quando já existe uma foto), e o fluxo de upload de 3 passos inteiro (iniciar -> enviar
// para o bucket -> confirmar -> devolve o novo id/URL para o componente pai via `aoAlterar`).
//
// Este componente NUNCA salva nada em `usuario` sozinho: só sobe o arquivo (ou sinaliza a remoção dele) e
// devolve o resultado para o pai via `aoAlterar`. Quem usa isto (modal-criar-usuario.tsx, modal-usuario.tsx,
// minha-conta-page.tsx) decide quando mandar isso para o backend (no create, ou no PATCH de alterar/Minha
// Conta): mesma separação de responsabilidade do resto do app (componente de input nunca chama usuarioApi
// diretamente).
//
// `aoAlterar(idArquivo, novaUrl)`: foto nova escolhida (upload já confirmado no backend). `aoAlterar(null,
// null)` ("Remover foto"): a pessoa pediu para tirar a foto atual; quem usa este componente distingue "nenhuma
// escolha feita ainda" (não chamou aoAlterar) de "removida de propósito" (chamou com null) guardando o id como
// `undefined` por padrão, nunca `null`, exatamente para sobrar esse terceiro estado (ver
// modal-usuario.tsx/minha-conta-page.tsx).
interface SeletorFotoPerfilProps {
  authFetch: AuthFetch;
  nome?: string | null;
  url?: string | null;
  aoAlterar: (idArquivo: number | null, url: string | null) => void;
  tamanho?: TamanhoAvatar;
  desabilitado?: boolean;
}

export function SeletorFotoPerfil({
  authFetch,
  nome,
  url,
  aoAlterar,
  tamanho = 'xl',
  desabilitado = false,
}: SeletorFotoPerfilProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroLocal, setErroLocal] = useState('');

  // `arquivo_tamanho_maximo_imagem_bytes` já vive em `configuracoes` (marcada `publica`): lida daqui em vez de
  // duplicada à mão (uma constante fixa neste arquivo e no Nest ao mesmo tempo ficaria sincronizada só de boa
  // vontade). O valor padrão abaixo é só o que aparece por uma fração de segundo antes do
  // `ConfiguracoesProvider` terminar de carregar; depois disso, sempre reflete o que o Admin configurou.
  const { obterConfiguracao } = useConfiguracoes();
  const valorConfigurado = obterConfiguracao('arquivo_tamanho_maximo_imagem_bytes', 8 * 1024 * 1024);
  // `obterConfiguracao` devolve `string | number | boolean | null` (o
  // armazém de config guarda tipos heterogêneos) - narrow explícito em vez
  // de confiar que esta chave específica é sempre numérica, mesmo default
  // (8 * 1024 * 1024) preservado exatamente como padrão de verdade.
  const tamanhoMaximoAvatarBytes = typeof valorConfigurado === 'number' ? valorConfigurado : 8 * 1024 * 1024;

  const processarArquivo = async (arquivoEscolhido: File) => {
    setErroLocal('');

    if (!TIPOS_REDUZIVEIS.includes(arquivoEscolhido.type)) {
      setErroLocal('Formato não aceito. Envie um JPEG, PNG ou WebP.');
      return;
    }
    if (arquivoEscolhido.size > TAMANHO_MAXIMO_BRUTO_BYTES) {
      setErroLocal('Imagem muito grande pra processar.');
      return;
    }

    setEnviando(true);
    try {
      // Reduz no navegador ANTES de subir (Canvas API): upload mais rápido numa conexão ruim e menos risco da
      // URL pré-assinada (5 min de validade) expirar no meio do envio. Se falhar por qualquer motivo (navegador
      // sem suporte, etc.), devolve o arquivo original sem quebrar o fluxo (ver reduzir-imagem.util.ts). O
      // backend continua processando de novo com `sharp` de qualquer jeito, então isto é só uma otimização de
      // UX, nunca a autoridade final.
      const arquivo = await reduzirImagemNoNavegador(
        arquivoEscolhido,
        PERFIL_REDUCAO_AVATAR,
      );

      if (arquivo.size > tamanhoMaximoAvatarBytes) {
        // `finally` abaixo cuida de setEnviando(false) neste return também.
        // Mensagem calcula o MB a partir da config (não hardcoded) - se o
        // Admin mudar `arquivo_tamanho_maximo_imagem_bytes`, o texto some
        // sozinho.
        const megabytes = Math.round(tamanhoMaximoAvatarBytes / (1024 * 1024));
        setErroLocal(`Imagem muito grande - o tamanho máximo é ${megabytes} MB.`);
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
        // avatar) - ver PERFIL_PROCESSAMENTO_POR_CONTEXTO em
        // nest/src/25-arquivo/arquivo.constants.ts.
        contexto: 'avatar',
      });

      aoAlterar(arquivoConfirmado.idArquivo, arquivoConfirmado.url);
    } catch (erroRequisicao) {
      // ErroHttp (traduzirErro) só cobre erro de VERDADE do backend
      // (iniciar/confirmar) - validação local e falha de rede no PUT pro
      // bucket (arquivoApi.enviarParaBucket) já lançam com mensagem própria
      // em português; passar essas por traduzirErro as trocaria pela
      // mensagem genérica de "não foi possível falar com o servidor" (ver
      // traduzir-erro.util.js), que aqui seria enganosa.
      setErroLocal(
        erroRequisicao instanceof ErroHttp
          ? traduzirErro(erroRequisicao)
          : erroRequisicao instanceof Error
            ? erroRequisicao.message
            : String(erroRequisicao),
      );
    } finally {
      setEnviando(false);
    }
  };

  const aoSelecionarArquivo = (evento: ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0];
    // Zera o valor do input - sem isso, escolher o MESMO arquivo duas vezes
    // seguidas (ex.: tentou, deu erro de tamanho, cortou a imagem, tentou
    // de novo com o mesmo nome) não dispara onChange na segunda vez.
    evento.target.value = '';
    if (arquivo) {
      void processarArquivo(arquivo);
    }
  };

  // Remover foto: não apaga nada AQUI, só sinaliza a intenção para o pai (aoAlterar(null, null)); o arquivo de
  // verdade (linha desativada + bytes apagados do bucket) só some quando quem usa este componente salvar de
  // fato (PATCH /usuario com idImagemPerfil: null: usuario.service.update.ts já cuida da limpeza, mesmo caminho
  // que desativa a foto ANTIGA ao trocar por uma nova).
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
            className="dica absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-dark hover:bg-black text-white flex items-center justify-center text-xs border-2 border-white shadow transition-colors disabled:opacity-60"
          >
            <i className="fa-solid fa-camera"></i>
            <Dica texto="Alterar foto de perfil" curta />
          </button>
        )}

        {!desabilitado && url && (
          <button
            type="button"
            onClick={aoRemover}
            disabled={enviando}
            aria-label="Remover foto de perfil"
            className="dica absolute -bottom-1 -left-1 w-7 h-7 rounded-full fundo-erro-forte hover:opacity-80 texto-sobre-cor flex items-center justify-center text-xs border-2 border-white shadow transition-colors disabled:opacity-60"
          >
            <i className="fa-solid fa-trash"></i>
            <Dica texto="Remover foto de perfil" curta />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_REDUZIVEIS.join(',')}
          className="hidden"
          onChange={aoSelecionarArquivo}
        />
      </div>

      {erroLocal && <p className="texto-erro text-xs font-bold mt-1.5 max-w-[10rem]">{erroLocal}</p>}
    </div>
  );
}
