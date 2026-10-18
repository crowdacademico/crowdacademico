import { type DadosPix } from '../../dto/resultado-cobranca.dto';
import { AsaasHttpClient } from './asaas-http.client';
import { type AsaasPixQrCode } from './asaas.types';

// O que é só do Pix na cobrança do Asaas: o QR code e o "copia e cola" (GET /payments/{id}/pixQrCode).
// O vencimento do Asaas é uma DATA e o QR continua pagável por meses depois dele: por isso o sistema CANCELA a cobrança
// quando a contribuição expira (job de reconciliação), e `expiraEm` devolvido é a expiração DO SISTEMA.
export async function dadosPixAsaas(
  http: AsaasHttpClient,
  idCobranca: string,
  expiraEm: Date,
): Promise<DadosPix> {
  const qr = await http.requisitar<AsaasPixQrCode>(
    'GET',
    `/payments/${encodeURIComponent(idCobranca)}/pixQrCode`,
  );
  return {
    copiaECola: qr.payload,
    qrCodeBase64: qr.encodedImage,
    expiraEm,
  };
}
