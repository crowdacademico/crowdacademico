import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import type { ContribuicaoPixPublica } from '../../services/22-contribuicao/type/contribuicao-publica.type';

// Quanto falta para o Pix expirar, a cada segundo (RF-085). null sem prazo válido.
function useSegundosRestantes(expiraEm: string): number | null {
  const alvo = Date.parse(expiraEm);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!Number.isFinite(alvo)) return;
    const intervalo = window.setInterval(() => {
      const instante = Date.now();
      setAgora(instante);
      if (instante >= alvo) window.clearInterval(intervalo);
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, [alvo]);
  return Number.isFinite(alvo) ? Math.max(0, Math.ceil((alvo - agora) / 1000)) : null;
}

function formatarTempo(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const resto = String(segundos % 60).padStart(2, '0');
  return horas > 0 ? `${horas}h ${String(minutos).padStart(2, '0')}min ${resto}s` : `${minutos}:${resto}`;
}

interface PainelPixProps {
  pix: ContribuicaoPixPublica;
  // A mesma cobrança na página do Asaas, como alternativa (vazio no provedor de teste).
  linkPagamento?: string;
}

// O Pix gerado: QR, "copia e cola", contagem até expirar e, como alternativa, a página do Asaas. A imagem vem do Asaas;
// sem ela, o QR é desenhado aqui a partir do "copia e cola" (é o mesmo conteúdo). Usado pelo modal Apoiar e por
// /apoio-confirmado (depois de um F5).
export function PainelPix({ pix, linkPagamento }: PainelPixProps) {
  const [imagemGerada, setImagemGerada] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erroCopia, setErroCopia] = useState(false);
  const segundos = useSegundosRestantes(pix.expiraEm);
  const expirado = segundos === 0;
  const imagemAsaas = pix.qrCodeBase64 && /^[A-Za-z0-9+/]+={0,2}$/.test(pix.qrCodeBase64) ? `data:image/png;base64,${pix.qrCodeBase64}` : null;

  useEffect(() => {
    if (imagemAsaas) return;
    let ativo = true;
    QRCode.toDataURL(pix.copiaECola, { margin: 1, width: 224 })
      .then((url) => {
        if (ativo) setImagemGerada(url);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [imagemAsaas, pix.copiaECola]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setCopiado(true);
      setErroCopia(false);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErroCopia(true);
    }
  };

  const imagem = imagemAsaas ?? imagemGerada;

  if (expirado) {
    return (
      <CaixaAviso titulo="Este Pix expirou" tom="aviso">
        <p>
          O prazo do código terminou em {new Date(pix.expiraEm).toLocaleString('pt-BR')}. Não pague com ele. Se você já pagou,
          aguarde: a confirmação ainda pode chegar.
        </p>
      </CaixaAviso>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {pix.simulado && (
        <CaixaAviso titulo="QR de teste (sandbox)" tom="info">
          <p>
            O Asaas sandbox não gerou o QR desta cobrança, então este é só ilustrativo. Para testar o pagamento, abra a cobrança
            no painel do Asaas e use <strong>Confirmar pagamento</strong>. Em produção aparece o QR de verdade.
          </p>
        </CaixaAviso>
      )}
      <div className="w-60 h-60 border borda-padrao rounded-xl p-2 fundo-cartao flex items-center justify-center">
        {imagem ? (
          <img src={imagem} alt="QR Code do Pix" className="w-full h-full" />
        ) : (
          <i className="fa-brands fa-pix text-5xl texto-marca opacity-40" aria-hidden="true" />
        )}
      </div>
      <p className="paragrafo texto-padrao">Abra o app do seu banco, escolha pagar com Pix e escaneie o QR, ou use o código abaixo.</p>
      <div className="w-full text-left">
        <label htmlFor="pix-copia-cola" className="rotulo-campo">
          Pix Copia e Cola
        </label>
        <textarea id="pix-copia-cola" readOnly rows={3} value={pix.copiaECola} className="input-padrao w-full font-dado text-sm" />
        <button type="button" onClick={() => void copiar()} className="btn btn-secondary w-full mt-2">
          {copiado ? 'Copiado ✓' : 'Copiar código Pix'}
        </button>
        {erroCopia && <p className="legenda texto-erro mt-1">Não deu para copiar sozinho: selecione o código e copie.</p>}
      </div>
      {segundos !== null && (
        <p className="legenda texto-info fundo-info rounded-lg px-3 py-1.5 inline-flex items-center gap-2" role="timer">
          <i className="fa-regular fa-clock" aria-hidden="true" />
          Expira em <span className="numero">{formatarTempo(segundos)}</span>
        </p>
      )}
      {linkPagamento && (
        <a href={linkPagamento} target="_blank" rel="noreferrer" className="link-texto legenda">
          Prefere pagar pela página do Asaas? Abrir em outra aba
        </a>
      )}
    </div>
  );
}
