import type { MeioPagamento } from '../../services/constant/type/enums-do-banco.gerado';

// O apoio que acabou de sair para a página de pagamento do Asaas. Fica guardado na ABA (sessionStorage) para a tela
// /apoio-confirmado, quando a pessoa volta (pelo "voltar" do navegador ou pelo retorno automático do Asaas), saber qual
// contribuição acompanhar e mostrar o protocolo. O token é o que deixa quem apoiou sem conta consultar a própria
// contribuição (X-Token-Sessao); por isso fica só nesta aba e nunca vai na URL.
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
  linkPagamento: string;
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
      typeof apoio.linkPagamento === 'string';
    return ok ? (apoio as ApoioEmAndamento) : null;
  } catch {
    return null;
  }
}

export function esquecerApoio(): void {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}
