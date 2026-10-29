import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'kysely';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { DatabaseService } from '../../commons/database/database.service';
import { ModeloMensagemRequestNovaVersao } from '../dto/request/modelo-mensagem.request-nova-versao';
import { NotificacaoRegraRequestUpdate } from '../dto/request/notificacao-regra.request-update';
import { validarHtml, validarVariaveis } from '../util/validar-template';

const PERMISSAO = 'configuracao_gerenciar';
const SEM_PERMISSAO =
  'Você não tem permissão para configurar modelos e regras de notificação.';

/**
 * Configuração de notificações pelo admin, sem deploy: liga/desliga o canal de cada evento (regra_notificacao) e muda o
 * conteúdo criando uma NOVA versão do modelo (modelo_mensagem). O texto de uma versão nunca é editado no lugar (o banco
 * bloqueia), então avisos já enfileirados continuam mostrando o texto da época.
 */
@Injectable()
export class NotificacaoConfiguracaoService {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
  ) {}

  async listar(): Promise<{
    regras: Record<string, unknown>[];
    modelos: Record<string, unknown>[];
  }> {
    await this.autorizacao.exigirPermissao(PERMISSAO, SEM_PERMISSAO);
    const db = this.database.getDb();
    const [regras, modelos] = await Promise.all([
      sql<Record<string, unknown>>`
        SELECT r.id_regra_notificacao, r.tipo_evento, r.canal, r.ativo, r.obrigatoria,
               r.id_modelo_mensagem, r.criado_em, r.atualizado_em
          FROM public.regra_notificacao r
         ORDER BY r.tipo_evento, r.canal
      `.execute(db),
      sql<Record<string, unknown>>`
        SELECT id_modelo_mensagem, tipo_evento, canal, idioma, titulo_template, corpo_texto_template,
               corpo_html_template, versao, ativo, criado_em, atualizado_em
          FROM public.modelo_mensagem
         ORDER BY tipo_evento, canal, idioma, versao DESC
      `.execute(db),
    ]);
    return { regras: regras.rows, modelos: modelos.rows };
  }

  async atualizarRegra(
    id: number,
    dto: NotificacaoRegraRequestUpdate,
  ): Promise<Record<string, unknown>> {
    await this.autorizacao.exigirPermissao(PERMISSAO, SEM_PERMISSAO);
    if (dto.ativo === undefined) {
      throw new BadRequestException('Informe o novo estado de ativo.');
    }
    const db = this.database.getDb();
    const atualResult = await sql<{ obrigatoria: boolean }>`
      SELECT obrigatoria FROM public.regra_notificacao WHERE id_regra_notificacao = ${id}
    `.execute(db);
    const atual = atualResult.rows[0];
    if (!atual)
      throw new NotFoundException('Regra de notificação não encontrada.');
    if (atual.obrigatoria && dto.ativo === false) {
      throw new BadRequestException(
        'Esta regra é obrigatória e não pode ser desativada.',
      );
    }
    const resultado = await sql<Record<string, unknown>>`
      UPDATE public.regra_notificacao
         SET ativo = ${dto.ativo}::boolean,
             atualizado_em = NOW()
       WHERE id_regra_notificacao = ${id}
       RETURNING id_regra_notificacao, tipo_evento, canal, ativo, obrigatoria, id_modelo_mensagem, atualizado_em
    `.execute(db);
    const linha = resultado.rows[0];
    if (!linha)
      throw new NotFoundException(
        'Regra de notificação não encontrada ou sem permissão para alterá-la.',
      );
    return linha;
  }

  /**
   * Cria a próxima versão de um modelo (de e-mail ou do sino, conforme o canal do modelo de origem), a torna a ativa e
   * aponta a regra do evento para ela. A origem pode ser qualquer versão (serve também para "voltar" a um texto antigo).
   * Roda na transação da requisição: se qualquer passo falhar, nada fica pela metade.
   */
  async criarNovaVersao(
    idModeloOrigem: number,
    dto: ModeloMensagemRequestNovaVersao,
  ): Promise<Record<string, unknown>> {
    await this.autorizacao.exigirPermissao(PERMISSAO, SEM_PERMISSAO);
    const titulo = dto.titulo_template.trim();
    const corpo = dto.corpo_texto_template.trim();
    if (!titulo)
      throw new BadRequestException(
        'O título (ou assunto) não pode ficar vazio.',
      );
    if (!corpo)
      throw new BadRequestException(
        'O texto da mensagem não pode ficar vazio.',
      );
    const erroTexto =
      validarVariaveis('titulo_template', titulo) ??
      validarVariaveis('corpo_texto_template', corpo);
    if (erroTexto) throw new BadRequestException(erroTexto);

    const db = this.database.getDb();
    const origemResult = await sql<{
      tipo_evento: string;
      canal: 'email' | 'interna';
      idioma: string;
      ativo: boolean;
      titulo_template: string;
      corpo_texto_template: string;
      corpo_html_template: string | null;
    }>`
      SELECT tipo_evento, canal, idioma, ativo, titulo_template, corpo_texto_template, corpo_html_template
        FROM public.modelo_mensagem
       WHERE id_modelo_mensagem = ${idModeloOrigem}
    `.execute(db);
    const origem = origemResult.rows[0];
    if (!origem) throw new NotFoundException('Modelo não encontrado.');

    // HTML: só e-mail. Omitido = herda da origem; vazio/null = tira o HTML (o e-mail passa a ser derivado do texto).
    let html: string | null = null;
    if (origem.canal === 'email') {
      const informado = dto.corpo_html_template;
      html =
        informado === undefined
          ? origem.corpo_html_template
          : informado?.trim()
            ? informado
            : null;
    } else if (dto.corpo_html_template?.trim()) {
      throw new BadRequestException('O modelo do sino não tem HTML.');
    }
    if (html) {
      const erroHtml =
        validarHtml(html) ?? validarVariaveis('corpo_html_template', html);
      if (erroHtml) throw new BadRequestException(erroHtml);
    }

    if (
      origem.ativo &&
      origem.titulo_template === titulo &&
      origem.corpo_texto_template === corpo &&
      origem.corpo_html_template === html
    ) {
      throw new BadRequestException(
        'O conteúdo é igual ao da versão ativa; nada a salvar.',
      );
    }

    // Trava a regra do evento/canal: duas pessoas criando versão ao mesmo tempo esperam uma pela outra, em vez de
    // disputar o mesmo número de versão ou deixar duas ativas.
    const regra = await sql<{ id_regra_notificacao: number }>`
      SELECT id_regra_notificacao FROM public.regra_notificacao
       WHERE tipo_evento = ${origem.tipo_evento} AND canal = ${origem.canal}
       FOR UPDATE
    `.execute(db);
    if (!regra.rows[0]) {
      throw new BadRequestException(
        'Este modelo não está ligado a nenhuma regra de notificação; não dá para criar versão dele.',
      );
    }

    const proxima = await sql<{ proxima_versao: number }>`
      SELECT COALESCE(MAX(versao), 0)::int + 1 AS proxima_versao
        FROM public.modelo_mensagem
       WHERE tipo_evento = ${origem.tipo_evento} AND canal = ${origem.canal} AND idioma = ${origem.idioma}
    `.execute(db);
    const versao = proxima.rows[0]?.proxima_versao ?? 1;

    await sql`
      UPDATE public.modelo_mensagem SET ativo = FALSE, atualizado_em = NOW()
       WHERE tipo_evento = ${origem.tipo_evento} AND canal = ${origem.canal} AND idioma = ${origem.idioma} AND ativo = TRUE
    `.execute(db);

    const inserido = await sql<Record<string, unknown>>`
      INSERT INTO public.modelo_mensagem
        (tipo_evento, canal, idioma, titulo_template, corpo_texto_template, corpo_html_template, versao, ativo)
      VALUES
        (${origem.tipo_evento}, ${origem.canal}, ${origem.idioma}, ${titulo}, ${corpo}, ${html}, ${versao}, TRUE)
      RETURNING id_modelo_mensagem, tipo_evento, canal, idioma, titulo_template, corpo_texto_template,
                corpo_html_template, versao, ativo, criado_em, atualizado_em
    `.execute(db);
    const novo = inserido.rows[0];
    if (!novo)
      throw new BadRequestException(
        'Não foi possível criar a nova versão do modelo.',
      );

    await sql`
      UPDATE public.regra_notificacao
         SET id_modelo_mensagem = ${Number(novo.id_modelo_mensagem)}, atualizado_em = NOW()
       WHERE tipo_evento = ${origem.tipo_evento} AND canal = ${origem.canal}
    `.execute(db);
    return novo;
  }
}