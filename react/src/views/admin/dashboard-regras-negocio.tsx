import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { agruparConfiguracoes } from '../../services/11-configuracoes/constants/configuracao-grupos';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { DESCRICAO_TIPO_TERMO, ROTULO_TIPO_TERMO, TIPOS_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import { ModalAlterarTermoUso } from '../5-termo-uso/modal-alterar-termo-uso';
import { Tooltip } from '../../components/layout/tooltip';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { ConfiguracaoResponse } from '../../services/11-configuracoes/type/configuracao.type';
import type { TermoUsoResponseAtivo, TipoTermo } from '../../services/5-termo-uso/type/termo-uso.type';

interface GrupoConfiguracoes {
  grupo: string;
  itens: ConfiguracaoResponse[];
}

// Conteúdo do modal "Saiba mais" do grupo Arquivo: a explicação é grande demais para caber num tooltip, por
// isso é um modal com seções de verdade em vez de um bloco de texto só. Só existe para o grupo Arquivo por
// enquanto; se outro grupo precisar do mesmo tratamento, isso vira um objeto por grupo em vez de uma constante
// solta.
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
    titulo: 'Por que várias linhas',
    conteudo: (
      <p>
        O sistema sempre tem exatamente 1 Termo de Uso vigente <strong>por tipo</strong> -
        cadastro (aceito uma vez, na criação da conta), contribuição a campanha (aceito a
        cada contribuição) e upgrade de perfil de pesquisador (aceito ao solicitar o
        upgrade). São trilhas independentes: publicar ou tornar vigente uma versão de um
        tipo nunca afeta os outros.
      </p>
    ),
  },
  {
    titulo: 'Criar → revisar → tornar vigente',
    conteudo: (
      <p>
        Publicar uma versão nova (Criar) cria um <strong>rascunho</strong>, sem ativar nada
        automaticamente - a versão vigente atual continua no ar. Depois de revisar o texto
        (erro de português etc.), um administrador torna o rascunho vigente manualmente pelo
        botão &quot;Tornar vigente&quot;, dentro do Alterar. <strong>Alterar</strong> o
        conteúdo só é aceito enquanto NINGUÉM aceitou aquela versão ainda - assim que a 1ª
        pessoa aceitar, ela trava pra sempre (o valor probatório do aceite se perderia se o
        texto pudesse mudar depois). Veja o histórico completo (todos os tipos) em{' '}
        <Link to="/admin/termos-uso" className="texto-marca font-bold underline">
          Termos de Uso
        </Link>
        .
      </p>
    ),
  },
];

// Card "Termo de Uso": ACIMA de Segurança, com o mesmo tratamento especial que o grupo Arquivo ganha aqui
// embaixo (bloco fora do loop genérico de `grupos`, porque o dado não vem de `configuracoes`). Mostra os termos
// ativos lado a lado (o sistema sempre tem exatamente 1 de cada tipo: nunca 0 depois do seed, nunca 2 do mesmo
// tipo, uq_termos_uso_ativo, 02_indices.sql), cada um com link direto para Alterar a versão vigente ou publicar
// uma nova (pré-selecionando o tipo certo via `?tipo=`).
function CardTermoUso({ auth }: { auth: Pick<UseAuthReturn, 'authFetch'> }) {
  // Construído a partir de TIPOS_TERMO (não hardcoded aqui): um tipo novo já aparece sozinho, sem precisar
  // lembrar de atualizar este estado inicial também.
  const [termosAtivos, setTermosAtivos] = useState<Record<TipoTermo, EstadoTermoAtivo>>(() =>
    Object.fromEntries(TIPOS_TERMO.map((tipo) => [tipo, undefined])) as Record<
      TipoTermo,
      EstadoTermoAtivo
    >,
  );
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoAlterando, setTipoAlterando] = useState<TipoTermo | null>(null);
  const termoParaAlterar = tipoAlterando ? termosAtivos[tipoAlterando] : null;

  const recarregarTermoAtivo = (tipo: TipoTermo) => {
    termoUsoApi
      .buscarAtivo(tipo)
      .then((termo) => setTermosAtivos((atual) => ({ ...atual, [tipo]: termo })))
      .catch(() => setTermosAtivos((atual) => ({ ...atual, [tipo]: null })));
  };

  useEffect(() => {
    TIPOS_TERMO.forEach(recarregarTermoAtivo);
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
                    <button
                      type="button"
                      onClick={() => setTipoAlterando(tipo)}
                      className="crud-tabela__acao crud-tabela__acao--alterar"
                    >
                      <i className="fa-solid fa-pen"></i> Alterar
                    </button>
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

      {tipoAlterando && termoParaAlterar && (
        <ModalAlterarTermoUso
          auth={auth}
          tipo={tipoAlterando}
          idTermoInicial={termoParaAlterar.idTermo}
          aoFechar={() => setTipoAlterando(null)}
          aoSalvar={() => recarregarTermoAtivo(tipoAlterando)}
        />
      )}
    </div>
  );
}

// Aba "Regras do Negócio": as chaves de `configuracoes` (a aba Configurações as mostra numa tabela CRUD crua)
// aqui em uma segunda forma de olhar para o MESMO dado, agrupado por assunto, mais fácil de escanear. "Alterar"
// continua sendo a tela de sempre (modal de Parâmetros do Sistema): não duplica o formulário de edição aqui, só
// organiza a leitura.
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
