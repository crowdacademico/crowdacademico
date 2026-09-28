import { IsDateString } from 'class-validator';

// Nova data de INÍCIO da campanha. A duração é preservada pelo banco
// (deslizar_datas_campanha, 05): data_fim e os marcos do cronograma andam o
// mesmo intervalo. Formato ISO 8601, como as outras datas do sistema.
export class CampanhaRequestDeslizarDatas {
  @IsDateString()
  novaDataInicio: string;
}
