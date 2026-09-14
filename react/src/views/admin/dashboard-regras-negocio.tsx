import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { agruparConfiguracoes } from '../../services/11-configuracoes/constants/configuracao-grupos';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { DESCRICAO_TIPO_TERMO, ROTULO_TIPO_TERMO, TIPOS_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import { Tooltip } from '../../components/layout/tooltip';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { ConfiguracaoResponse } from '../../services/11-configuracoes/type/configuracao.type';
import type { TermoUsoResponseAtivo, TipoTermo } from '../../services/5-termo-uso/type/termo-uso.type';

interface GrupoConfiguracoes {
  grupo: string;
  itens: ConfiguracaoResponse[];
}

// Conteúdo do modal "Saiba mais" do grupo Arquivo (04-09-2026) - a
// explicação era grande demais pra caber num tooltip (achado do Lucas),
// por isso virou um modal com seções de verdade em vez de um bloco de
// texto só. Só existe pro grupo Arquivo por enquanto; se outro grupo
// precisar do mesmo tratamento no futuro, isso vira um objeto por grupo
// em vez de uma constante solta.
const SECOES_MODAL_ARQUIVO = [
  {
    titulo: 'Valores padrão',
    conteudo: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Tamanho mínimo: 100 bytes.</li>
        <li>Tamanho máximo: 8 MB para imagem (JPEG/PNG/WebP) e 5 MB para PDF.</li>
        <li>Cota de armazenamento: 50 MB por conta.</li>
        <li>Rate limit: até 20 uploads a cada 24h.</li>
        <li>Intervalo mínimo entre um upload e o próximo: 5 segundos.</li>
      </ul>
    ),
  },
  {
    titulo: 'Por que estes números',
    conteudo: (
      <p>
        São só o ponto de partida gravado no seed, não um teto técnico do sistema. O plano
        gratuito do Supabase Storage usado neste projeto tem <strong>1 GB de espaço
        TOTAL</strong> e um <strong>teto de 50 MB por arquivo individual</strong>. Configurar
        aqui um valor acima desse teto não adianta: o próprio Supabase recusaria o upload
        antes de qualquer regra deste sistema entrar em ação.
      </p>
    ),
  },
  {
    titulo: 'Como editar',
    conteudo: (
      <p>
        Qualquer um destes valores pode ser alterado pelo botão <strong>Alterar</strong>, na
        lista abaixo, sem precisar de deploy nem alterar código.
      </p>
    ),
  },
];

// Estado de 1 tipo de termo no card novo - carregando (undefined), ativo
// encontrado (TermoUsoResponseAtivo), ou nenhuma versão ativa desse tipo
// (null, tratado como estado real, não erro - ver `buscarTermosAtivos`).
type EstadoTermoAtivo = TermoUsoResponseAtivo | null | undefined;

const SECOES_MODAL_TERMO_USO = [
  {
    titulo: 'Por que 2 linhas',
    conteudo: (
      <p>
        O sistema sempre tem exatamente 1 Termo de Uso vigente <strong>por tipo</strong> -
        um pro aceite geral (feito uma vez, no cadastro da conta) e outro pra contribuição a
        campanha (aceito a cada contribuição). São trilhas independentes: publicar uma versão
        nova de um tipo nunca desativa o do outro.
      </p>
    ),
  },
  {
    titulo: 'Alterar x Publicar versão nova',
    conteudo: (
      <p>
        <strong>Alterar</strong> só é aceito enquanto NINGUÉM aceitou aquela versão ainda -
        assim que a 1ª pessoa aceitar, ela trava e vira só-leitura pra sempre (o valor
        probatório do aceite se perderia se o texto pudesse mudar depois). Depois disso, a
        forma de corrigir o texto é sempre publicar uma versão nova pela lista completa em{' '}
        <Link to="/admin/termos-uso" className="texto-marca font-bold underline">
          Termos de Uso
        </Link>
        , que também mostra o histórico dos 2 tipos.
      </p>
    ),
  },
];

// Card "Termo de Uso" (13-09-2026, pedido do Lucas: "uma forma inteligente
// de alterar o termo de uso vigente") - ACIMA de Segurança de propósito
// (pedido do Lucas), mesmo tratamento especial que o grupo Arquivo já
// ganha aqui embaixo (bloco fora do loop genérico de `grupos`, porque o
// dado não vem de `configuracoes`). Mostra os 2 termos ativos lado a lado
// (cadastro/contribuição - o sistema sempre tem exatamente 1 de cada,
// nunca 0 depois do seed, nunca 2 do mesmo tipo - uq_termos_uso_ativo,
// 02_indices.sql), cada um com link direto pra Alterar a versão vigente ou
// publicar uma nova (pré-selecionando o tipo certo via `?tipo=`).
function CardTermoUso({ auth }: { auth: Pick<UseAuthReturn, 'authFetch'> }) {
  const [termosAtivos, setTermosAtivos] = useState<Record<TipoTermo, EstadoTermoAtivo>>({
    cadastro: undefined,
    contribuicao: undefined,
  });
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    TIPOS_TERMO.forEach((tipo) => {
      termoUsoApi
        .buscarAtivo(tipo)
        .then((termo) => setTermosAtivos((atual) => ({ ...atual, [tipo]: termo })))
        // 404 (nenhuma versão ativa deste tipo ainda) é um estado real, não
        // uma falha de rede - vira `null` (mostra CTA de publicar a
        // primeira versão), não um toast de erro.
        .catch(() => setTermosAtivos((atual) => ({ ...atual, [tipo]: null })));
    });
  }, [auth.authFetch]);

  return (
    <div className="fundo-cartao border borda-forte rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b borda-padrao fundo-sutil flex items-center gap-2">
        <h3 className="subtitulo">Termo de Uso</h3>
        <Tooltip
          texto="Saiba mais"
          baixo
          aoClicar={() => setModalAberto(true)}
        />
      </div>
      <div className="divide-y divide-solid" style={{ borderColor: 'var(--cor-borda)' }}>
        {TIPOS_TERMO.map((tipo) => {
          const termo = termosAtivos[tipo];
          return (
            <div
              key={tipo}
              className="px-5 py-3 flex items-center justify-between gap-4 border-b borda-padrao last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold texto-padrao">{ROTULO_TIPO_TERMO[tipo]}</p>
                <p className="paragrafo-denso truncate">{DESCRICAO_TIPO_TERMO[tipo]}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {termo === undefined ? (
                  <span className="text-sm texto-fraco">Carregando...</span>
                ) : termo === null ? (
                  <Link
                    to={`/admin/termos-uso/criar?tipo=${tipo}`}
                    className="crud-tabela__acao crud-tabela__acao--alterar"
                  >
                    <i className="fa-solid fa-plus"></i> Publicar primeira versão
                  </Link>
                ) : (
                  <>
                    <span className="text-sm font-bold texto-forte">{termo.versao}</span>
                    <Link
                      to={`/admin/termos-uso/${termo.idTermo}/alterar`}
                      className="crud-tabela__acao crud-tabela__acao--alterar"
                    >
                      <i className="fa-solid fa-pen"></i> Alterar
                    </Link>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalAberto && (
        <ModalDetalhe
          titulo="Termo de Uso"
          secoes={SECOES_MODAL_TERMO_USO}
          aoFechar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}

// Aba "Regras do Negócio" (09-08-2026, Bloco H do prompt de uma IA) -
// as ~28 chaves de `configuracoes` viravam uma tabela CRUD crua (Aba
// Configurações, ainda existe, sem mudança) - aqui é uma segunda forma de
// olhar pro MESMO dado, agrupado por assunto, mais fácil de escanear.
// "Alterar" continua sendo a tela de sempre (/configuracoes/:id/alterar) -
// não duplica o formulário de edição aqui, só organiza a leitura.
interface DashboardRegrasNegocioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
}

export function DashboardRegrasNegocio({ auth }: DashboardRegrasNegocioProps) {
  const [grupos, setGrupos] = useState<GrupoConfiguracoes[] | null>(null);
  const [modalArquivoAberto, setModalArquivoAberto] = useState(false);

  useEffect(() => {
    configuracaoApi
      .listar(auth.authFetch)
      .then((lista) => setGrupos(agruparConfiguracoes(lista)))
      .catch(() => setGrupos([]));
  }, [auth.authFetch]);

  return (
    <div className="space-y-6">
      <CardTermoUso auth={auth} />

      {grupos === null ? (
        <p className="text-sm texto-fraco">Carregando...</p>
      ) : (
        grupos.map(({ grupo, itens }) => (
          <div key={grupo} className="fundo-cartao border borda-forte rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b borda-padrao fundo-sutil flex items-center gap-2">
              <h3 className="subtitulo">{grupo}</h3>
              {grupo === 'Arquivo' && (
                <Tooltip texto="Saiba mais" baixo aoClicar={() => setModalArquivoAberto(true)} />
              )}
            </div>
            <div className="divide-y divide-solid" style={{ borderColor: 'var(--cor-borda)' }}>
              {itens.map((config) => (
                <div
                  key={config.idConfig}
                  className="px-5 py-3 flex items-center justify-between gap-4 border-b borda-padrao last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold texto-padrao">{config.descricao || config.chave}</p>
                    <p className="paragrafo-denso truncate">{config.chave}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold texto-forte">
                      {config.valor ?? '-'}
                    </span>
                    <Link
                      to={`/configuracoes/${config.idConfig}/alterar`}
                      className="crud-tabela__acao crud-tabela__acao--alterar"
                    >
                      <i className="fa-solid fa-pen"></i> Alterar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {modalArquivoAberto && (
        <ModalDetalhe
          titulo="Limites de upload de arquivo"
          secoes={SECOES_MODAL_ARQUIVO}
          aoFechar={() => setModalArquivoAberto(false)}
        />
      )}
    </div>
  );
}
