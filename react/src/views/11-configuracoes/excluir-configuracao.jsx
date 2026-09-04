import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';

export function ExcluirConfiguracao({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [configuracao, setConfiguracao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    configuracaoApi
      .buscar(auth.authFetch, id)
      .then(setConfiguracao)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoConfirmar = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await configuracaoApi.remover(auth.authFetch, id);
      mostrar('Parâmetro excluído com sucesso.', `ID: ${id} foi excluído`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      setExcluindo(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-triangle-exclamation"
      titulo="Excluir Parâmetro"
      subtitulo="Esta ação não pode ser desfeita."
      variante="perigo"
      rodape={
        configuracao && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1"
            >
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
      ) : !configuracao ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <div className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          {/* SecaoFicha/CampoFicha (10-08-2026, mesma rodada do item 3 em
              Excluir Usuário) - mesmos blocos que Consultar usa, zero
              componente duplicado. */}
          <SecaoFicha titulo="O que será excluído">
            <CampoFicha rotulo="Chave" valor={configuracao.chave} largura="cheia" />
            <CampoFicha rotulo="Valor" valor={configuracao.valor} />
            <CampoFicha rotulo="Tipo" valor={configuracao.tipo} />
            <CampoFicha rotulo="Ativo" valor={configuracao.ativo ? 'Sim' : 'Não'} />
            <CampoFicha rotulo="Descrição" valor={configuracao.descricao} largura="cheia" />
          </SecaoFicha>

          {/* Diferente de Excluir Usuário: configuração não tem exclusão
              lógica (sem coluna `deletado`) - remover aqui é DELETE de
              verdade na tabela `configuracoes` (09-08-2026, Bloco I).
              Confirmação simples (não por digitação) porque não é a conta
              de uma pessoa, mas o aviso precisa ser honesto sobre a
              diferença. */}
          <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
            <p className="font-bold mb-1">
              <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
            </p>
            <p>
              Diferente de excluir um usuário, esta linha some do banco pra sempre - não é
              exclusão lógica. Se algum código ainda ler a chave "{configuracao.chave}", ele
              vai passar a receber o valor padrão dele (ou dar erro, dependendo de como foi
              escrito). Confira se ela não está mais em uso antes de confirmar.
            </p>
          </div>
        </div>
      )}
    </CartaoFormulario>
  );
}
