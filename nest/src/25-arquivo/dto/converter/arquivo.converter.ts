import { Selectable } from 'kysely';
import { ArquivoTable } from '../../../commons/database/db.types';
import type { ArmazenamentoService } from '../../../commons/storage/storage.service.interface';
import { ArquivoResponse } from '../response/arquivo.response';

export class ArquivoConverter {
  // Recebe `armazenamento` como parâmetro (diferente dos outros
  // converters do projeto, que são 100% estáticos/sem dependência) porque
  // montar a URL pública exige saber STORAGE_PUBLIC_BASE_URL - o converter
  // continua sem estado próprio, só delega a montagem da URL pra quem já
  // tem essa configuração carregada (o service que o chama).
  static paraResponseDto(
    linha: Selectable<ArquivoTable>,
    armazenamento: ArmazenamentoService,
  ): ArquivoResponse {
    return {
      idArquivo: linha.id_arquivo,
      url: armazenamento.montarUrlPublica(linha.chave),
      nomeOriginal: linha.nome_original,
      tipoMime: linha.tipo_mime,
      tamanhoBytes: linha.tamanho_bytes,
      ativo: linha.ativo,
      criadoEm: linha.criado_em,
      desativadoEm: linha.desativado_em,
    };
  }
}
