import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { decifrarChavePix } from '../../commons/seguranca/chave-pix-cifra.util';
import { type AutorizacaoSaqueDto } from '../dto/autorizacao-saque.dto';
import { type TipoChavePix } from '../ports/repasse-gateway.port';
import {
  type CabecalhosHttp,
  WEBHOOK_VERIFIER,
  type WebhookVerifierPort,
} from '../ports/webhook-verifier.port';

interface DadosAutorizacao {
  id_repasse: number;
  valor_liquido: string;
  tipo_chave: TipoChavePix;
  chave_criptografada: string;
}

// Duas representações da mesma chave Pix? CPF/CNPJ/telefone comparam só dígitos (telefone sem o +55 do país); e-mail e
// chave aleatória comparam em minúsculas. Cada provedor devolve a chave no formato que quiser; o que importa é ser a mesma.
export function chavesPixEquivalentes(
  tipo: TipoChavePix,
  nossa: string,
  deles: string,
): boolean {
  const normalizar = (valor: string): string => {
    if (tipo === 'email' || tipo === 'aleatoria') {
      return valor.trim().toLowerCase();
    }
    const digitos = valor.replace(/\D/g, '');
    return tipo === 'telefone' &&
      digitos.length > 11 &&
      digitos.startsWith('55')
      ? digitos.slice(2)
      : digitos;
  };
  return normalizar(nossa) === normalizar(deles);
}

// Autorização de saque por webhook. O provedor, antes de EXECUTAR cada transferência pedida pela API, pergunta ao sistema
// se ela é legítima. Só aprova a que corresponde a um repasse nosso:
//   - existe um repasse 'processando' desse provedor com essa transferência (ou, se o id ainda não foi gravado, com essa
//     referência externa = chave de idempotência do repasse; dados_autorizacao_repasse, 05);
//   - o VALOR é o líquido do repasse;
//   - a CHAVE Pix de destino é a da conta de recebimento verificada do dono da campanha.
// Qualquer divergência, ou qualquer outro tipo de saída de dinheiro, é RECUSADA com o motivo. Se o banco estiver fora do ar
// responde 503 (o provedor tenta de novo e, esgotadas as tentativas, cancela a transferência, que é o lado seguro).
// Isto é o que impede que uma chave de API vazada tire dinheiro da conta: uma transferência feita fora do sistema não casa
// com nenhum repasse e é recusada. Autenticidade: token próprio da validação de saque, conferido ANTES de tudo.
@Injectable()
export class PagamentoServiceAuthorizeWithdrawal {
  private readonly logger = new Logger(
    PagamentoServiceAuthorizeWithdrawal.name,
  );

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(WEBHOOK_VERIFIER) private readonly verificador: WebhookVerifierPort,
  ) {}

  async autorizar(
    provedor: string,
    cabecalhos: CabecalhosHttp,
    corpo: unknown,
  ): Promise<unknown> {
    if (provedor !== this.verificador.provedor) {
      throw new NotFoundException();
    }
    if (!this.verificador.verificarAutenticidadeSaque(cabecalhos)) {
      throw new UnauthorizedException();
    }

    const pedido = this.verificador.extrairAutorizacaoSaque(corpo);
    const motivoRecusa = await this.avaliar(pedido);
    if (motivoRecusa) {
      this.logger.warn(
        `Saque RECUSADO (${pedido.tipo}${pedido.idTransferencia ? ` ${pedido.idTransferencia}` : ''}): ${motivoRecusa}`,
      );
    }
    return this.verificador.montarRespostaAutorizacaoSaque(
      motivoRecusa === null,
      motivoRecusa ?? undefined,
    );
  }

  // null = aprovado; texto = motivo da recusa.
  private async avaliar(pedido: AutorizacaoSaqueDto): Promise<string | null> {
    if (pedido.tipo !== 'transferencia') {
      return 'Tipo de saque não reconhecido por esta aplicação.';
    }
    if (
      (!pedido.idTransferencia && !pedido.referenciaExterna) ||
      pedido.valor === undefined ||
      !pedido.chavePixDestino
    ) {
      return 'Pedido sem os dados necessários para conferência.';
    }

    let dados: DadosAutorizacao | undefined;
    try {
      const resultado = await this.pool.query<DadosAutorizacao>(
        'SELECT * FROM public.dados_autorizacao_repasse($1::varchar, $2::text, $3::text)',
        [
          this.verificador.provedor,
          pedido.idTransferencia ?? null,
          pedido.referenciaExterna ?? null,
        ],
      );
      dados = resultado.rows.at(0);
    } catch {
      throw new ServiceUnavailableException();
    }
    if (!dados) {
      return 'A transferência não corresponde a nenhum repasse em andamento.';
    }
    if (Math.abs(Number(dados.valor_liquido) - pedido.valor) > 0.005) {
      return 'O valor da transferência difere do valor do repasse.';
    }
    let chaveNossa: string;
    try {
      chaveNossa = decifrarChavePix(dados.chave_criptografada);
    } catch {
      return 'Chave de recebimento do repasse ilegível.';
    }
    if (
      !chavesPixEquivalentes(
        dados.tipo_chave,
        chaveNossa,
        pedido.chavePixDestino,
      )
    ) {
      return 'A chave Pix de destino difere da conta de recebimento do repasse.';
    }
    return null;
  }
}
