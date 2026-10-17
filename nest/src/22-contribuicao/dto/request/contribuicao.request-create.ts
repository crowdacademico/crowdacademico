import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
} from 'class-validator';
import {
  MEIOS_PAGAMENTO_ACEITOS,
  type MeioPagamentoAceito,
  VALOR_MAXIMO_CONTRIBUICAO,
} from '../../constants/contribuicao.constants';

// id_usuario NUNCA vem daqui (sempre do token, quando há login): a RLS (pol_contribuicao_insert, 04) exige isso. O
// mínimo de negócio (configuracoes.valor_minimo_contribuicao, 5,00 por padrão) e "campanha ativa/no prazo" são
// regras do banco (triggers, 05), traduzidas pelo PostgresExceptionFilter: aqui só o limite técnico do tipo.
export class ContribuicaoRequestCreate {
  @IsInt()
  @IsPositive()
  idCampanha: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(VALOR_MAXIMO_CONTRIBUICAO)
  valor: number;

  @IsIn(MEIOS_PAGAMENTO_ACEITOS)
  meioPagamento: MeioPagamentoAceito;

  // Só faz sentido para quem está logado (aparecer como "anônimo" na lista de apoiadores). Sem login a contribuição
  // já é anônima por natureza (id_usuario NULL).
  @IsOptional()
  @IsBoolean()
  anonima?: boolean;
}
