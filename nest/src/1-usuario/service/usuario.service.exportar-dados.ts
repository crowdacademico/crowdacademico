import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { decifrarCpf } from '../../commons/seguranca/cpf-cifra.util';
import { USUARIO_COLUNAS_SELECT } from '../constants/usuario.constants';
import { UsuarioResponseExportarDados } from '../dto/response/usuario.response-exportar-dados';

// Mascara o CPF (3 primeiros + 2 últimos dígitos) - decisão de uma IA,
// confirmada em conversa (05-09-2026): incluir o CPF em texto puro exigiria
// reautenticação por senha antes de gerar a exportação, mecanismo que não
// existe em NENHUM outro lugar do sistema hoje (a exclusão de conta usa
// confirmação por digitação do e-mail, não senha) - construir isso do zero
// só pra este caso de uso não se paga. Preserva uma propriedade que o
// projeto cuidou de manter até aqui: o CPF nunca sai do banco em texto
// puro por nenhum caminho HTTP.
function mascararCpf(cpfDecifrado: string): string {
  const digitos = cpfDecifrado.replace(/\D/g, '');
  return `${digitos.slice(0, 3)}.***.***-${digitos.slice(9)}`;
}

@Injectable()
export class UsuarioServiceExportarDados {
  constructor(private readonly database: DatabaseService) {}

  async executar(idUsuario: number): Promise<UsuarioResponseExportarDados> {
    const db = this.database.getDb();

    const usuario = await db
      .selectFrom('usuario')
      .select(USUARIO_COLUNAS_SELECT)
      .where('id_usuario', '=', idUsuario)
      .executeTakeFirst();
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const [
      perfil,
      links,
      campanhas,
      comentarios,
      seguindoCampanhas,
      seguindoPesquisadores,
      contribuicoes,
      aceitesTermos,
      sessoes,
    ] = await Promise.all([
      db
        .selectFrom('perfil_pesquisador')
        .selectAll()
        .where('id_usuario', '=', idUsuario)
        .executeTakeFirst(),
      db
        .selectFrom('link_academico as la')
        .innerJoin('tipo_link as tl', 'tl.id_tipolink', 'la.id_tipolink')
        .select(['tl.nome as tipo', 'la.url', 'la.rotulo', 'la.ordem'])
        .where('la.id_usuario', '=', idUsuario)
        .orderBy('la.ordem')
        .execute(),
      db
        .selectFrom('campanha')
        .select([
          'id_campanha',
          'titulo',
          'descricao',
          'status',
          'modelo',
          'meta_financeira',
          'valor_bruto_arrecadado',
          'criado_em',
        ])
        .where('id_usuario', '=', idUsuario)
        .orderBy('criado_em', 'desc')
        .execute(),
      // Só o que ELE escreveu (id_pesquisador = titular) - nunca comentário
      // recebido de outro pesquisador nas campanhas dele (dado de terceiro).
      db
        .selectFrom('comentario')
        .select(['id_campanha', 'conteudo', 'endossado', 'criado_em'])
        .where('id_pesquisador', '=', idUsuario)
        .orderBy('criado_em', 'desc')
        .execute(),
      db
        .selectFrom('seguir_campanha')
        .select(['id_campanha', 'seguido_em'])
        .where('id_usuario', '=', idUsuario)
        .execute(),
      db
        .selectFrom('seguir_pesquisador')
        .select(['id_pesquisador', 'seguido_em'])
        .where('id_usuario', '=', idUsuario)
        .execute(),
      // Só contribuição IDENTIFICADA (id_usuario preenchido) - contribuição
      // anônima nunca é ligada a nenhuma conta, não existe "minha
      // contribuição anônima" pra exportar.
      db
        .selectFrom('contribuicao')
        .select([
          'id_campanha',
          'valor',
          'meio_pagamento',
          'status',
          'anonima',
          'criado_em',
        ])
        .where('id_usuario', '=', idUsuario)
        .orderBy('criado_em', 'desc')
        .execute(),
      db
        .selectFrom('usuario_termo')
        .select(['id_termo', 'aceito_em'])
        .where('id_usuario', '=', idUsuario)
        .execute(),
      // Mesmo filtro de UsuarioServiceListarLogins - renovação silenciosa de
      // token não conta como "sessão" pra este propósito.
      db
        .selectFrom('sessao')
        .select(['criado_em', 'ip'])
        .where('id_usuario', '=', idUsuario)
        .where('origem', '=', 'login')
        .orderBy('criado_em', 'desc')
        .execute(),
    ]);

    // Satélites de campanha (orçamento/cronograma/atualizações) buscados
    // numa 2ª rodada, filtrados pelas campanhas já encontradas - evita um
    // N+1 (uma query por campanha) sem precisar de JOIN triplo/quádruplo
    // numa query só.
    const idsCampanhas = campanhas.map((c) => c.id_campanha);
    const [orcamentos, marcos, atualizacoes] =
      idsCampanhas.length === 0
        ? [[], [], []]
        : await Promise.all([
            db
              .selectFrom('orcamento_campanha')
              .select(['id_campanha', 'categoria', 'descricao', 'valor'])
              .where('id_campanha', 'in', idsCampanhas)
              .execute(),
            db
              .selectFrom('marco_cronograma')
              .select(['id_campanha', 'titulo', 'descricao', 'data_prevista'])
              .where('id_campanha', 'in', idsCampanhas)
              .execute(),
            db
              .selectFrom('atualizacao_campanha')
              .select([
                'id_campanha',
                'titulo',
                'conteudo',
                'fase',
                'publicado_em',
              ])
              .where('id_campanha', 'in', idsCampanhas)
              .execute(),
          ]);

    // Score só existe (score_pesquisador) se ele já é/foi pesquisador -
    // mesma consulta de PerfilPesquisadorServiceFindOneScore, mas
    // tolerante a "nenhuma linha" em vez de lançar 404 (aqui é só mais uma
    // seção do pacote, não o objetivo principal da chamada).
    const linhasScore = perfil
      ? await db
          .selectFrom('score_pesquisador as sp')
          .innerJoin(
            'score_config as sc',
            'sc.id_score_config',
            'sp.id_score_config',
          )
          .select(['sp.score_total'])
          .where('sp.id_usuario', '=', idUsuario)
          .limit(1)
          .execute()
      : [];

    // Rastro em log_auditoria (item 3 de PROXIMOS_PASSOS.md - "toda exportação deve deixar
    // rastro"). app_nestjs não tem GRANT INSERT em log_auditoria de
    // propósito (só a trigger de banco escreve lá) - por isso via função
    // SECURITY DEFINER dedicada, não um .insertInto() direto (que falharia
    // com 42501, permissão negada). Ver registrar_exportacao_dados()
    // (03_funcoes_seguranca.sql, [03-O]).
    await sql`SELECT public.registrar_exportacao_dados(${idUsuario})`.execute(
      db,
    );

    const secoesIncluidas = [
      'conta',
      perfil ? 'perfil_pesquisador' : null,
      'links_academicos',
      'campanhas',
      'comentarios_escritos',
      'seguindo_campanhas',
      'seguindo_pesquisadores',
      'contribuicoes',
      'aceites_termos',
      'sessoes',
      perfil && linhasScore.length > 0 ? 'score' : null,
    ].filter((secao): secao is string => secao !== null);

    return {
      geradoEm: new Date(),
      secoesIncluidas,
      conta: {
        idUsuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        emailVerificado: usuario.email_verificado,
        criadoEm: usuario.criado_em,
        ultimoLoginEm: usuario.ultimo_login_em,
      },
      perfilPesquisador: perfil
        ? {
            cpfMascarado: mascararCpf(decifrarCpf(perfil.cpf_criptografado)),
            tituloAcademico: perfil.titulo_academico,
            tipoVinculo: perfil.tipo_vinculo,
            vinculoInstitucional: perfil.vinculo_institucional,
            statusPesquisador: perfil.status_pesquisador,
            ativadoEm: perfil.ativado_em,
            scoreAtual: perfil.score_atual,
          }
        : null,
      linksAcademicos: links.map((l) => ({
        tipo: l.tipo,
        url: l.url,
        rotulo: l.rotulo,
        ordem: l.ordem,
      })),
      campanhas: campanhas.map((c) => ({
        idCampanha: c.id_campanha,
        titulo: c.titulo,
        descricao: c.descricao,
        status: c.status,
        modelo: c.modelo,
        metaFinanceira: c.meta_financeira,
        valorBrutoArrecadado: c.valor_bruto_arrecadado,
        criadoEm: c.criado_em,
        orcamento: orcamentos
          .filter((o) => o.id_campanha === c.id_campanha)
          .map((o) => ({
            categoria: o.categoria,
            descricao: o.descricao,
            valor: o.valor,
          })),
        cronograma: marcos
          .filter((m) => m.id_campanha === c.id_campanha)
          .map((m) => ({
            titulo: m.titulo,
            descricao: m.descricao,
            dataPrevista: m.data_prevista,
          })),
        atualizacoes: atualizacoes
          .filter((a) => a.id_campanha === c.id_campanha)
          .map((a) => ({
            titulo: a.titulo,
            conteudo: a.conteudo,
            fase: a.fase,
            publicadoEm: a.publicado_em,
          })),
      })),
      comentariosEscritos: comentarios.map((c) => ({
        idCampanha: c.id_campanha,
        conteudo: c.conteudo,
        endossado: c.endossado,
        criadoEm: c.criado_em,
      })),
      seguindoCampanhas: seguindoCampanhas.map((s) => ({
        idCampanha: s.id_campanha,
        seguidoEm: s.seguido_em,
      })),
      seguindoPesquisadores: seguindoPesquisadores.map((s) => ({
        idPesquisador: s.id_pesquisador,
        seguidoEm: s.seguido_em,
      })),
      contribuicoes: contribuicoes.map((c) => ({
        idCampanha: c.id_campanha,
        valor: c.valor,
        meioPagamento: c.meio_pagamento,
        status: c.status,
        anonima: c.anonima,
        criadoEm: c.criado_em,
      })),
      aceitesTermos: aceitesTermos.map((a) => ({
        idTermo: a.id_termo,
        aceitoEm: a.aceito_em,
      })),
      sessoes: sessoes.map((s) => ({ logadoEm: s.criado_em, ip: s.ip })),
    };
  }
}
