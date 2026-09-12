import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import { ROTULO_TIPO_MOTIVO_DENUNCIA as ROTULO_TIPO } from '../../services/10-motivo-denuncia/constants/motivo-denuncia.constants';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { MotivoDenunciaResponse } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';

// Mesmo padrão de ExcluirConfiguracao (11-configuracoes) - ver comentário
// completo lá. Diferente de configuracao, motivo_denuncia é referenciado
// por denuncia (FK_DENUNCIA_MOTIVO) sem CASCADE - se estiver em uso, o
// backend responde 409 com uma mensagem própria (ver
// motivo-denuncia.service.remove.ts), exibida aqui pelo useErroToast
// normal.

export function ExcluirMotivoDenuncia({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [motivo, setMotivo] = useState<MotivoDenunciaResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    motivoDenunciaApi
      .buscar(auth.authFetch, id)
      .then(setMotivo)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoConfirmar = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await motivoDenunciaApi.remover(auth.authFetch, id);
      mostrar('Motivo de denúncia excluído com sucesso.', `ID: ${id} foi excluído`);
      void navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      setExcluindo(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-triangle-exclamation"
      titulo="Excluir Motivo de Denúncia"
      subtitulo="Esta ação não pode ser desfeita."
      variante="perigo"
      rodape={
        motivo && (
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="button"
              onClick={aoConfirmar}
              disabled={excluindo}
              className="btn btn-danger flex-1"
            >
              {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
            </button>
          </div>
        )
      }
    >
      {carregando ? (
        <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>
      ) : !motivo ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <div className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <SecaoFicha titulo="O que será excluído">
            <CampoFicha rotulo="Descrição" valor={motivo.descricao} largura="cheia" />
            <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO[motivo.tipo]} />
          </SecaoFicha>

          <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
            <p className="font-bold mb-1">
              <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
            </p>
            <p>
              Se este motivo já tiver sido usado em alguma denúncia, a exclusão é bloqueada pelo
              próprio banco - desative-o em vez de excluir. Se não estiver em uso, some do
              catálogo pra sempre, sem exclusão lógica.
            </p>
          </div>
        </div>
      )}
    </CartaoFormulario>
  );
}
