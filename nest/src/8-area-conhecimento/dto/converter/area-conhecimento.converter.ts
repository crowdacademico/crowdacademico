import { AreaConhecimentoResponseDto } from '../response/area-conhecimento.response.dto';

// Shape aceita tanto o retorno "cru" de INSERT/UPDATE (.returningAll() em
// area_conhecimento, sem `nome_pai` — a coluna não existe na própria
// tabela) quanto o retorno do SELECT com LEFT JOIN em
// area-conhecimento.service.findall.ts/findone.ts (que inclui `nome_pai`
// vindo de `pai.nome`, ver mesmo padrão em 28-log-auditoria/dto/converter/
// log-auditoria.converter.ts). `nome_pai` opcional cobre os dois casos sem
// precisar de dois métodos.
interface AreaConhecimentoParaConverter {
  id_area_conhecimento: number;
  codigo_cnpq: string;
  nome: string;
  id_pai: number | null;
  ativo: boolean;
  nome_pai?: string | null;
}

export class AreaConhecimentoConverter {
  static paraResponseDto(
    linha: AreaConhecimentoParaConverter,
  ): AreaConhecimentoResponseDto {
    return {
      idAreaConhecimento: linha.id_area_conhecimento,
      codigoCnpq: linha.codigo_cnpq,
      nome: linha.nome,
      idPai: linha.id_pai,
      nomePai: linha.nome_pai ?? null,
      ativo: linha.ativo,
    };
  }
}
