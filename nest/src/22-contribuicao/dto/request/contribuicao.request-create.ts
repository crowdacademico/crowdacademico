import {
  Equals,
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
  @IsInt({ message: 'Escolha a campanha.' })
  @IsPositive({ message: 'Escolha a campanha.' })
  idCampanha: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Informe o valor da contribuição, com até 2 casas decimais.' },
  )
  @IsPositive({
    message: 'O valor da contribuição precisa ser maior que zero.',
  })
  @Max(VALOR_MAXIMO_CONTRIBUICAO, {
    message: 'O valor da contribuição passou do máximo aceito.',
  })
  valor: number;

  @IsIn(MEIOS_PAGAMENTO_ACEITOS, {
    message: 'Escolha o meio de pagamento: Pix, cartão de crédito ou boleto.',
  })
  meioPagamento: MeioPagamentoAceito;

  // Só faz sentido para quem está logado (aparecer como "anônimo" na lista de apoiadores). Sem login a contribuição
  // já é anônima por natureza (id_usuario NULL).
  @IsOptional()
  @IsBoolean()
  anonima?: boolean;

  // RF-086: o aceite dos Termos de Uso, a caixa "Li e aceito" do modal Apoiar. Obrigatório e sempre true (16-11-2026,
  // pergunta da Alexia): antes a caixa só existia na tela, e quem chamasse a API direto criava o apoio sem ela. O aceite
  // gravado (aceite_termo_contribuicao: versão do Termo vigente, data e IP) agora prova que a pessoa marcou.
  @Equals(true, { message: 'Aceite os Termos de Uso para apoiar.' })
  aceiteTermos: boolean;

  // RF-041: obrigatório (true) em campanha flexível; o serviço checa, porque só ele sabe o modelo da campanha. Em
  // all-or-nothing é ignorado.
  @IsOptional()
  @IsBoolean()
  cienteModeloFlexivel?: boolean;
}
