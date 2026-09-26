import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

// Ponte entre regra de negócio hardcoded no Nest e configuracoes (banco): mesmo espírito do useConfiguracoes()
// do React (services/11-configuracoes), só que do lado do backend. Todo número configurável costumava ser lido
// pela própria trigger de banco (config_numero(), 03_funcoes_seguranca.sql); este serviço atende as regras de
// negócio puras do Nest (sem trigger correspondente). 25-arquivo (limites de upload) é o primeiro consumidor.
//
// Global (ver commons/storage/storage.module.ts, mesmo padrão): infra compartilhada por qualquer módulo que
// precise ler um valor de configuracoes, não só 25-arquivo.
@Injectable()
export class ConfiguracaoValorService {
  constructor(private readonly database: DatabaseService) {}

  // Só configuração GLOBAL (id_usuario IS NULL) - nenhuma regra de negócio
  // deste tipo (limite de tamanho, cota, rate limit) é por usuário hoje.
  // Se a chave não existir, estiver inativa, ou o valor não for um número
  // válido, devolve o padrão em vez de derrubar a requisição - uma
  // configuração ausente/errada não pode nunca virar 500 pro usuário final.
  async buscarNumero(chave: string, valorPadrao: number): Promise<number> {
    const linha = await this.database
      .getDb()
      .selectFrom('configuracoes')
      .select('valor')
      .where('chave', '=', chave)
      .where('id_usuario', 'is', null)
      .where('ativo', '=', true)
      .executeTakeFirst();

    if (!linha || linha.valor === null) {
      return valorPadrao;
    }
    const numero = Number(linha.valor);
    return Number.isFinite(numero) ? numero : valorPadrao;
  }
}
