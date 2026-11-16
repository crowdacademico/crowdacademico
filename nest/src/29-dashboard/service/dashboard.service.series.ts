import { BadRequestException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import type { DashboardRequestSeries } from '../dto/request/dashboard.request-series';
import type { DashboardResponseSeries } from '../dto/response/dashboard.response-series';

interface LinhaSerie {
  periodo_inicio: Date | string;
  periodo_anterior: boolean;
  // DECIMAL chega como string do driver `pg`.
  valor_arrecadado: string;
  total_apoios: number;
  total_cadastros: number;
}

// Tetos do período escolhido: os mesmos que serie_metricas_dashboard aplica (03 [03-M-2]). Aqui a pessoa recebe a
// explicação, em vez de um gráfico cortado sem aviso.
const MAXIMO_DIAS = 731;
const MAXIMO_MESES = 120;
const DIA_MS = 86_400_000;

// AAAA-MM-DD sem passar pelo fuso do Node: o DATE do Postgres chega como Date à meia-noite LOCAL (driver pg).
function dataIso(valor: Date | string): string {
  if (typeof valor === 'string') return valor.slice(0, 10);
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');
  return `${valor.getFullYear()}-${mes}-${dia}`;
}

// Data "AAAA-MM-DD" válida de verdade (o formato o DTO já conferiu; aqui, se o dia existe: 2026-02-30 não).
function dataValida(texto: string): boolean {
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

// Os gráficos do Dashboard (16-11-2026). Quem confere a permissão (relatorio_visualizar, 92011 -> 403) e soma é
// serie_metricas_dashboard (03 [03-M-2]); aqui confere as datas escolhidas e separa o período atual (os pontos) do
// anterior (os totais). Sem datas, a função usa os últimos 30 dias.
@Injectable()
export class DashboardServiceSeries {
  constructor(private readonly database: DatabaseService) {}

  async executar(
    filtro: DashboardRequestSeries,
  ): Promise<DashboardResponseSeries> {
    const agrupar = filtro.agrupar ?? 'dia';
    const { inicio, fim } = filtro;
    for (const [nome, valor] of [
      ['início', inicio],
      ['fim', fim],
    ] as const) {
      if (valor !== undefined && !dataValida(valor)) {
        throw new BadRequestException(`A data de ${nome} não existe.`);
      }
    }
    if (inicio && fim) {
      const [a, b] = inicio <= fim ? [inicio, fim] : [fim, inicio];
      const dias = Math.round((Date.parse(b) - Date.parse(a)) / DIA_MS) + 1;
      if (agrupar === 'dia' && dias > MAXIMO_DIAS) {
        throw new BadRequestException(
          'Dia a dia, o período vai até 2 anos. Para mais, agrupe por mês.',
        );
      }
      if (agrupar === 'mes' && dias > MAXIMO_MESES * 31) {
        throw new BadRequestException('O período vai até 10 anos.');
      }
    }

    const resultado = await sql<LinhaSerie>`
      SELECT * FROM public.serie_metricas_dashboard(${inicio ?? null}::date, ${fim ?? null}::date, ${agrupar === 'mes'})
    `.execute(this.database.getDb());

    const anterior = { arrecadado: 0, apoios: 0, cadastros: 0 };
    const pontos: DashboardResponseSeries['pontos'] = [];
    for (const linha of resultado.rows) {
      const arrecadado = Number(linha.valor_arrecadado);
      if (linha.periodo_anterior) {
        anterior.arrecadado += arrecadado;
        anterior.apoios += linha.total_apoios;
        anterior.cadastros += linha.total_cadastros;
      } else {
        pontos.push({
          inicio: dataIso(linha.periodo_inicio),
          arrecadado,
          apoios: linha.total_apoios,
          cadastros: linha.total_cadastros,
        });
      }
    }
    anterior.arrecadado = Math.round(anterior.arrecadado * 100) / 100;
    return { agrupar, pontos, anterior };
  }
}
