import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { CAMPANHA_COLUNAS_SELECT } from '../constants/campanha.constants';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaResponse } from '../dto/response/campanha.response';

// O dono envia a própria campanha para a fila de aprovação (botão explícito no fim do wizard, "Enviar para
// aprovação"; nunca transição automática quando a campanha fica completa; ver a regra em
// fn_valida_transicao_campanha, 05_regras_negocio.sql, [05-K-2]). O MESMO endpoint serve o REENVIO de uma
// campanha rejeitada ("Corrigir e reenviar", rejeitado -> aguardando_aprovacao): as duas transições têm a mesma
// autorização (dono, pesquisador ativo), e as condições próprias do reenvio (reenvios disponíveis, prazo) ficam
// no banco, com ERRCODE distinto cada uma (91025, 91026), então este serviço não repete nenhuma delas.
//
// Nenhuma checagem de permissão aqui, mesmo desenho de CampanhaServiceAprovar (mesma pasta): quem decide se
// este UPDATE é legítimo é o banco, em 3 camadas. pol_campanha_update (04) deixa a linha passar pela RLS;
// trg_campanha_valida_transicao (05) exige que seja o DONO saindo de 'rascunho' (ERRCODE 92001 para qualquer
// outro); e trg_campanha_valida_completude (05), cujo WHEN cobre esta transição, barra envio sem
// orçamento/cronograma completos (90009/90010/90011) ou com o prazo já vencido (90015). O
// PostgresExceptionFilter traduz todos esses códigos sozinho.
//
// `aprovado_em`/`id_admin` NÃO são tocados de propósito: a trigger de transição recusa a operação se eles
// mudarem aqui, o que impede este endpoint de virar um caminho de autoaprovação.
@Injectable()
export class CampanhaServiceEnviar {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<CampanhaResponse> {
    const linha = await this.database
      .getDb()
      .updateTable('campanha')
      .set({ status: 'aguardando_aprovacao' })
      .where('id_campanha', '=', id)
      .where('status', 'in', ['rascunho', 'rejeitado'])
      .returning(CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirst();

    if (!linha) {
      const existe = await this.database
        .getDb()
        .selectFrom('campanha')
        .select('status')
        .where('id_campanha', '=', id)
        .executeTakeFirst();
      if (!existe) {
        throw new NotFoundException('Campanha não encontrada.');
      }
      if (existe.status !== 'rascunho' && existe.status !== 'rejeitado') {
        throw new ForbiddenException(
          'Só uma campanha em rascunho ou rejeitada pode ser enviada para aprovação.',
        );
      }
      throw new ForbiddenException('Sem permissão para enviar esta campanha.');
    }

    return CampanhaConverter.paraResponseDto(linha);
  }
}
