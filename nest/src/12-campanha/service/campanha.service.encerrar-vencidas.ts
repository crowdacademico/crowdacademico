import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';

// Fecha o gap real do RF-057, achado numa revisão de sistema (05-09-2026):
// encerrar_campanhas_vencidas() (05_regras_negocio.sql, [05-K-2]) sempre
// existiu, sempre esteve certa e testada - mas nada nunca a chamava. Sem
// isso, uma campanha cujo prazo vence continua 'ativo' pra sempre e
// continua aceitando contribuição além do prazo.
//
// `PG_POOL` direto, NUNCA `DatabaseService.getDb()` - um job agendado roda
// fora do pipeline HTTP, sem nenhuma requisição por trás. GlobalDbInterceptor
// (que é quem abre a transação e guarda o Kysely no CLS) só roda em rota
// HTTP de verdade; chamar DatabaseService.getDb() aqui lançaria o próprio
// erro que o método documenta ("chamado fora de uma requisição"). Não tem
// problema nenhum usar o Pool cru aqui: a função é SECURITY DEFINER
// (bypassa RLS por desenho, não precisa de app.id_usuario_atual setado -
// mesma categoria de registrar_falha_login/registrar_login_sucesso, que
// também rodam sem sessão de usuário).
//
// Limitação conhecida, aceita de propósito (explicação completa em
// DOCUMENTACAO_BACKEND.md, §7.4): isto só dispara enquanto o processo do
// Nest estiver de pé. Hospedagem gratuita (Render) "dorme" o serviço sem
// tráfego, e o @Cron dorme junto - não perde nenhuma campanha vencida pra
// sempre, só atrasa o encerramento até o servidor acordar de novo (a
// função sempre compara contra NOW() no momento em que roda). Mesma
// categoria de limitação já aceita em RNF-012 (disponibilidade, hospedagem
// gratuita). Se algum dia isso importar de verdade, a extensão pg_cron do
// Supabase resolve rodando dentro do próprio banco, sem depender do Nest
// estar acordado - não implementado agora por ser infraestrutura nova pra
// um problema hoje pequeno.
@Injectable()
export class CampanhaServiceEncerrarVencidas {
  private readonly logger = new Logger(CampanhaServiceEncerrarVencidas.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // A cada 15 minutos - intervalo curto o bastante pra uma campanha vencida
  // não ficar "ativo" por muito tempo depois do prazo, sem martelar o banco
  // à toa (a query é uma varredura simples por status+data_fim, barata).
  @Cron('*/15 * * * *')
  async executar(): Promise<void> {
    const resultado = await this.pool.query<{
      encerrar_campanhas_vencidas: number;
    }>('SELECT public.encerrar_campanhas_vencidas()');
    const quantidade = resultado.rows[0]?.encerrar_campanhas_vencidas ?? 0;

    if (quantidade > 0) {
      this.logger.log(
        `${quantidade} campanha(s) vencida(s) encerrada(s) automaticamente.`,
      );
    }
  }
}
