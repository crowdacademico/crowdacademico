import { useEffect, useState } from 'react';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import { contribuicaoPublicaApi } from '../../services/22-contribuicao/api/contribuicao-publica.api';
import type { ContribuicaoPixPublica } from '../../services/22-contribuicao/type/contribuicao-publica.type';
import type { MeioPagamento, StatusContribuicao } from '../../services/constant/type/enums-do-banco.gerado';

// O apoio que acabou de ser criado pelo modal Apoiar. Fica guardado na ABA (sessionStorage) para a tela /apoio-confirmado
// mostrar o mesmo QR do Pix depois de um F5, ou a situação quando a pessoa volta da página do Asaas (cartão e boleto). O
// token é o que deixa quem apoiou sem conta consultar a própria contribuição (X-Token-Sessao); por isso fica só nesta aba
// e nunca vai na URL.
export interface ApoioEmAndamento {
  idContribuicao: number;
  tokenSessao: string;
  idCampanha: number;
  tituloCampanha: string;
  valor: number;
  taxaPagamento: number;
  valorCobrado: number;
  meioPagamento: MeioPagamento;
  criadoEm: string;
  // Página do Asaas (cartão), boleto do Asaas, ou alternativa ao QR (Pix). Vazio quando o provedor não mandou.
  linkPagamento: string;
  pix?: ContribuicaoPixPublica;
  // Provedor de teste (fake.local): não sai do site; o pagamento de mentira é feito pela T5 do Campo de Testes.
  provedorTeste: boolean;
}

const CHAVE = 'crowdacademico:apoio-em-andamento';

export function guardarApoio(apoio: ApoioEmAndamento): void {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(apoio));
  } catch {
    // Navegador sem armazenamento (aba privada restrita): a pessoa ainda paga; só a tela de volta fica genérica.
  }
}

export function lerApoio(): ApoioEmAndamento | null {
  try {
    const texto = sessionStorage.getItem(CHAVE);
    if (!texto) return null;
    const valor: unknown = JSON.parse(texto);
    if (typeof valor !== 'object' || valor === null) return null;
    const apoio = valor as Partial<ApoioEmAndamento>;
    const ok =
      Number.isSafeInteger(apoio.idContribuicao) &&
      Number.isSafeInteger(apoio.idCampanha) &&
      typeof apoio.tokenSessao === 'string' &&
      typeof apoio.tituloCampanha === 'string' &&
      typeof apoio.valor === 'number' &&
      typeof apoio.taxaPagamento === 'number' &&
      typeof apoio.valorCobrado === 'number' &&
      typeof apoio.meioPagamento === 'string' &&
      typeof apoio.criadoEm === 'string' &&
      typeof apoio.linkPagamento === 'string' &&
      (apoio.pix === undefined || typeof apoio.pix.copiaECola === 'string');
    return ok ? (apoio as ApoioEmAndamento) : null;
  } catch {
    return null;
  }
}

// A situação do apoio, consultada a cada 15 s enquanto o pagamento não chega. Quem confirma é o aviso do Asaas (webhook);
// a tela só mostra. Usado pelo modal Apoiar (depois de gerar o Pix) e por /apoio-confirmado.
export function useSituacaoApoio(authFetch: AuthFetch, apoio: ApoioEmAndamento | null) {
  const [status, setStatus] = useState<StatusContribuicao>('pendente');
  const [erro, setErro] = useState<string | null>(null);
  // Muda para consultar já, sem esperar os 15 s (o botão "Simular pagamento" do sandbox).
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    if (!apoio) return;
    let ativo = true;
    let espera: number | undefined;
    const consultar = async () => {
      try {
        const resultado = await contribuicaoPublicaApi.buscar(authFetch, apoio.idContribuicao, apoio.tokenSessao);
        if (!ativo) return;
        setStatus(resultado.status);
        setErro(null);
        if (resultado.status === 'pendente') espera = window.setTimeout(() => void consultar(), 15_000);
      } catch (falha: unknown) {
        if (!ativo) return;
        setErro(falha instanceof Error ? falha.message : 'Não foi possível consultar a situação do pagamento.');
        espera = window.setTimeout(() => void consultar(), 15_000);
      }
    };
    void consultar();
    return () => {
      ativo = false;
      if (espera !== undefined) window.clearTimeout(espera);
    };
  }, [authFetch, apoio, rodada]);

  return { status, erro, consultarAgora: () => setRodada((n) => n + 1) };
}
