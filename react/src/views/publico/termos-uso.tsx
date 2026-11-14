import { useEffect, useState } from 'react';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { Carregando } from '../../components/layout/carregando';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import type { TermoUsoResponseActive } from '../../services/5-termo-uso/type/termo-uso.type';

export function TermosUso() {
  const [termo, setTermo] = useState<TermoUsoResponseActive | null>(null);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro } = useErroToast({ mostraTexto: true });

  useEffect(() => {
    let ativo = true;
    termoUsoApi
      .buscarAtivo('cadastro')
      .then((resultado) => {
        if (ativo) setTermo(resultado);
      })
      .catch((erroRequisicao: unknown) => {
        if (ativo) reportarErro(erroRequisicao);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
    // O carregamento ocorre uma vez na montagem da página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fundo-pagina min-h-full py-16">
      <div className="mx-auto max-w-5xl px-4">
        <CabecalhoPagina
          className="mb-10"
          descricao="Consulte o termo vigente para conta e contribuições, fornecido pelo CrowdAcadêmico."
          titulo="Termo de Uso vigente"
        />

        {carregando && <Carregando />}
        {!carregando && erro && <MensagemErro texto={erro} />}
        {!carregando && !erro && termo && (
          <article className="fundo-cartao border borda-padrao rounded-xl p-6 sm:p-8">
            <div className="mb-6 border-b borda-padrao pb-4">
              <p className="rotulo-leitura">Versão {termo.versao}</p>
            </div>
            <div className="paragrafo texto-padrao whitespace-pre-wrap">{termo.conteudo}</div>
          </article>
        )}
      </div>
    </div>
  );
}
