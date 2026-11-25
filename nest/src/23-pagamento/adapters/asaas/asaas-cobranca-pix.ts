import { type DadosPix } from '../../dto/resultado-cobranca.dto';
import { AsaasHttpClient } from './asaas-http.client';
import { type AsaasPixQrCode } from './asaas.types';

// O que é só do Pix na cobrança do Asaas: o QR code e o "copia e cola" (GET /payments/{id}/pixQrCode), que o modal Apoiar
// mostra a quem apoia.
// O vencimento do Asaas é uma DATA e o QR continua pagável por meses depois dele: por isso o sistema CANCELA a cobrança
// quando a contribuição expira (job de reconciliação), e `expiraEm` devolvido é a expiração DO SISTEMA.
export async function dadosPixAsaas(
  http: AsaasHttpClient,
  idCobranca: string,
  expiraEm: Date,
  timeoutMs?: number,
): Promise<DadosPix> {
  const qr = await http.requisitar<AsaasPixQrCode>(
    'GET',
    `/payments/${encodeURIComponent(idCobranca)}/pixQrCode`,
    { timeoutMs },
  );
  return {
    copiaECola: qr.payload,
    qrCodeBase64: qr.encodedImage,
    expiraEm,
  };
}

// QR de TESTE, só no sandbox, quando o Asaas não consegue gerar o QR da cobrança (em 15/16-11-2026 o sandbox respondia
// "erro desconhecido" e a página dele dava 504). O sandbox nunca deixa pagar um QR dinâmico de qualquer jeito: o pagamento
// de teste é o botão "Confirmar pagamento" do painel do Asaas. Este QR só deixa a tela igual à de produção. O texto dele
// diz o que é, caso alguém o leia num app de banco.
export function pixDeTesteSandbox(
  idCobranca: string,
  expiraEm: Date,
): DadosPix {
  return {
    copiaECola: `SANDBOX-CROWDACADEMICO-TESTE|${idCobranca}|pague pelo botao Confirmar pagamento no painel do Asaas`,
    expiraEm,
    simulado: true,
    podeSimularPagamento: true,
  };
}
