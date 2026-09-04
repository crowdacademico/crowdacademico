import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { agruparConfiguracoes } from '../../services/11-configuracoes/constants/configuracao-grupos';
import { Tooltip } from '../../components/layout/tooltip';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';

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

// Aba "Regras do Negócio" (09-08-2026, Bloco H do prompt do Claude Web) -
// as ~28 chaves de `configuracoes` viravam uma tabela CRUD crua (Aba
// Configurações, ainda existe, sem mudança) - aqui é uma segunda forma de
// olhar pro MESMO dado, agrupado por assunto, mais fácil de escanear.
// "Alterar" continua sendo a tela de sempre (/configuracoes/:id/alterar) -
// não duplica o formulário de edição aqui, só organiza a leitura.
export function DashboardRegrasNegocio({ auth }) {
  const [grupos, setGrupos] = useState(null);
  const [modalArquivoAberto, setModalArquivoAberto] = useState(false);

  useEffect(() => {
    configuracaoApi
      .listar(auth.authFetch)
      .then((lista) => setGrupos(agruparConfiguracoes(lista)))
      .catch(() => setGrupos([]));
  }, [auth.authFetch]);

  if (grupos === null) {
    return <p className="text-sm texto-fraco">Carregando...</p>;
  }

  return (
    <div className="space-y-6">
      {grupos.map(({ grupo, itens }) => (
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
      ))}

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
