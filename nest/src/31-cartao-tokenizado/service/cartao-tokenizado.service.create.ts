import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { NOME_PROVEDOR_NAO_CONFIGURADO } from '../../29-pagamento/adapters/nao-configurado/gateway-nao-configurado.adapter';
import {
  COBRANCA_GATEWAY,
  type CobrancaGatewayPort,
} from '../../29-pagamento/ports/cobranca-gateway.port';
import { CARTAO_TOKENIZADO_COLUNAS_SELECT } from '../constants/cartao-tokenizado.constants';
import { CartaoTokenizadoConverter } from '../dto/converter/cartao-tokenizado.converter';
import { CartaoTokenizadoRequestCreate } from '../dto/request/cartao-tokenizado.request-create';
import { CartaoTokenizadoResponse } from '../dto/response/cartao-tokenizado.response';

// Guarda o TOKEN que o provedor devolveu para um cartão (nunca o cartão). Sem chamada ao provedor aqui, então roda na
// transação global normal. UK_CARTAO_TOKENIZADO_USUARIO_TOKEN barra o mesmo token duas vezes (23505, traduzido pelo
// PostgresExceptionFilter).
@Injectable()
export class CartaoTokenizadoServiceCreate {
  constructor(
    private readonly database: DatabaseService,
    @Inject(COBRANCA_GATEWAY) private readonly gateway: CobrancaGatewayPort,
  ) {}

  async executar(
    dto: CartaoTokenizadoRequestCreate,
    idUsuario: number,
  ): Promise<CartaoTokenizadoResponse> {
    if (this.gateway.provedor === NOME_PROVEDOR_NAO_CONFIGURADO) {
      throw new ServiceUnavailableException(
        'Pagamento com cartão indisponível no momento.',
      );
    }
    // Defesa para o erro mais perigoso: mandar o NÚMERO do cartão no lugar do token. Token real do provedor não é uma
    // sequência só de dígitos nesse tamanho.
    if (/^\d{13,19}$/.test(dto.tokenCartao)) {
      throw new BadRequestException(
        'Envie apenas o token do cartão, nunca o número, o CVV ou a validade.',
      );
    }

    const linha = await this.database
      .getDb()
      .insertInto('cartao_tokenizado_usuario')
      .values({
        id_usuario: idUsuario,
        provedor: this.gateway.provedor,
        token_cartao: dto.tokenCartao,
        bandeira: dto.bandeira ?? null,
        ultimos_digitos: dto.ultimosDigitos,
      })
      .returning(CARTAO_TOKENIZADO_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();
    return CartaoTokenizadoConverter.paraResponseDto(linha);
  }
}
