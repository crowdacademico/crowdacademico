import { Pool } from 'pg';
import { montarEmailDoBanco, ModeloEmailBanco } from './renderizar-template-db';

export interface MensagemMontada {
  assunto: string;
  texto: string;
  html: string;
}

export interface ModeloEmailAtivo extends ModeloEmailBanco {
  tipo_evento: string;
}

/**
 * Monta o e-mail de uma linha de `notificacao` a partir de modelo_mensagem (canal 'email').
 *
 * - Com `idModeloMensagem` (toda linha criada por enfileirar_notificacao tem): usa exatamente essa versão do modelo,
 *   a que estava vigente quando o evento aconteceu. Como o texto de um modelo é imutável no banco, uma edição feita
 *   depois pelo admin (que cria uma nova versão) não muda um e-mail que já estava na fila.
 * - Sem ele (linhas antigas): usa o modelo ativo apontado hoje pela regra do evento.
 *
 * Devolve null quando o canal de e-mail do evento está desativado (regra inativa ou inexistente) ou não há modelo.
 */
export async function montarMensagemBanco(
  pool: Pool,
  tipoEvento: string,
  dados: Record<string, unknown>,
  urlPainel?: string,
  idModeloMensagem: number | null = null,
): Promise<MensagemMontada | null> {
  const idModelo =
    Number.isInteger(idModeloMensagem) && Number(idModeloMensagem) > 0
      ? Number(idModeloMensagem)
      : null;
  const resultado = await pool.query<ModeloEmailAtivo>(
    `SELECT m.tipo_evento, m.titulo_template, m.corpo_texto_template, m.corpo_html_template
       FROM public.modelo_mensagem m
      WHERE m.tipo_evento = $1
        AND m.canal = 'email'
        AND EXISTS (
          SELECT 1 FROM public.regra_notificacao r
           WHERE r.tipo_evento = $1 AND r.canal = 'email' AND r.ativo = TRUE
        )
        AND (
          ($2::int IS NOT NULL AND m.id_modelo_mensagem = $2::int)
          OR (
            $2::int IS NULL
            AND m.ativo = TRUE
            AND EXISTS (
              SELECT 1 FROM public.regra_notificacao r
               WHERE r.tipo_evento = $1 AND r.canal = 'email' AND r.id_modelo_mensagem = m.id_modelo_mensagem
            )
          )
        )
      ORDER BY m.id_modelo_mensagem DESC
      LIMIT 1`,
    [tipoEvento, idModelo],
  );
  const modelo = resultado.rows[0];
  if (!modelo) return null;

  const conteudo = montarEmailDoBanco(modelo, tipoEvento, dados, urlPainel);
  return {
    assunto: conteudo.assunto,
    texto: conteudo.texto,
    html: conteudo.html,
  };
}
