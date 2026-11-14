import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ErroHttp } from '../../services/constant/api/http.util';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';
import { arquivoApi } from '../../services/26-arquivo/api/arquivo.api';
import { reduzirImagemNoNavegador, TIPOS_REDUZIVEIS } from '../../services/26-arquivo/util/reduzir-imagem.util';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { formatarTamanhoArquivo } from '../../services/constant/util/formatacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';

const TAMANHO_MAXIMO_BRUTO_BYTES = 30 * 1024 * 1024;
const PERFIL_REDUCAO_CAPA = { larguraMaxima: 1600, qualidade: 78 };

interface SeletorImagemCapaCampanhaProps {
  authFetch: AuthFetch;
  idArquivo: number | null;
  url: string | null;
  aoAlterar: (idArquivo: number | null, url: string | null) => void;
  desabilitado?: boolean;
}

export function SeletorImagemCapaCampanha({
  authFetch,
  idArquivo,
  url,
  aoAlterar,
  desabilitado = false,
}: SeletorImagemCapaCampanhaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const tamanhoMaximoBytes = useConfiguracoes().obterNumero('arquivo_tamanho_maximo_imagem_bytes', 8 * 1024 * 1024);

  async function enviar(arquivoOriginal: File) {
    setErro('');
    if (!TIPOS_REDUZIVEIS.includes(arquivoOriginal.type)) {
      setErro('Formato não aceito. Envie um JPEG, PNG ou WebP.');
      return;
    }
    if (arquivoOriginal.size > TAMANHO_MAXIMO_BRUTO_BYTES) {
      setErro('A imagem é muito grande para processar.');
      return;
    }

    setEnviando(true);
    try {
      const arquivo = await reduzirImagemNoNavegador(arquivoOriginal, PERFIL_REDUCAO_CAPA);
      if (arquivo.size > tamanhoMaximoBytes) {
        setErro(`Imagem muito grande. O tamanho máximo é ${formatarTamanhoArquivo(tamanhoMaximoBytes)}.`);
        return;
      }

      const dados = {
        nomeOriginal: arquivo.name,
        tipoMime: arquivo.type,
        tamanhoBytes: arquivo.size,
      };
      const upload = await arquivoApi.iniciarUpload(authFetch, dados);
      await arquivoApi.enviarParaBucket(upload, arquivo, setProgresso);
      const confirmado = await arquivoApi.confirmarUpload(authFetch, {
        ...dados,
        chave: upload.chave,
        contexto: 'campanha',
      });
      aoAlterar(confirmado.idArquivo, confirmado.url);
    } catch (falha: unknown) {
      setErro(
        falha instanceof ErroHttp
          ? traduzirErro(falha)
          : falha instanceof Error
            ? falha.message
            : String(falha),
      );
    } finally {
      setEnviando(false);
      setProgresso(null);
    }
  }

  function aoSelecionar(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (arquivo) void enviar(arquivo);
  }

  return (
    <div className="sm:col-span-2 space-y-3">
      <span className="rotulo bloco">Imagem de capa (opcional)</span>
      {url ? (
        <img
          src={url}
          alt="Prévia da imagem de capa da campanha"
          className="w-full max-h-64 rounded-xl border borda-padrao object-cover"
        />
      ) : (
        <div className="fundo-sutil border borda-padrao rounded-xl p-8 text-center texto-fraco">
          <i className="fa-regular fa-image text-3xl" aria-hidden="true" />
          <p className="paragrafo-denso mt-2">Nenhuma imagem de capa selecionada.</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Selecionar imagem de capa"
        onChange={aoSelecionar}
        disabled={desabilitado || enviando}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => inputRef.current?.click()}
          disabled={desabilitado || enviando}
        >
          <i className="fa-solid fa-upload mr-2" aria-hidden="true" />
          {enviando ? 'Enviando imagem…' : idArquivo === null ? 'Escolher imagem' : 'Trocar imagem'}
        </button>
        {(url || idArquivo !== null) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setErro('');
              aoAlterar(null, null);
            }}
            disabled={desabilitado || enviando}
          >
            Remover capa
          </button>
        )}
      </div>
      {progresso !== null && <progress className="w-full" value={progresso} max={100}>{progresso}%</progress>}
      {erro && <p className="paragrafo-denso texto-erro" role="alert">{erro}</p>}
      <p className="legenda texto-fraco">Formatos aceitos: JPEG, PNG ou WebP. A imagem é otimizada antes do envio.</p>
    </div>
  );
}
