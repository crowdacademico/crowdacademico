import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { CartaoFormulario } from './cartao-formulario';
import { SecaoFicha } from './ficha-consulta';
import { useToast } from '../layout/use-toast';
import { useBuscarPorId } from '../../services/constant/hook/use-buscar-por-id';

interface PaginaExcluirProps<T> {
  id: string;
  titulo: string;
  buscar: (id: string) => Promise<T>;
  excluir: (id: string) => Promise<void>;
  mensagemSucesso: string;
  detalheSucesso: string;
  // Os `<CampoFicha>` de dentro de "O que será excluído" - recebe o dado
  // já carregado, nunca chamado enquanto `carregando`/erro.
  campos: (dado: T) => ReactNode;
  // Texto do box "O que acontece de verdade" - aceita função (quando o
  // texto cita um campo do próprio dado, ex.: "a chave X") ou conteúdo
  // fixo direto.
  aviso: ReactNode | ((dado: T) => ReactNode);
}

// Extraído (14-09-2026, pedido do Lucas na auditoria de componentes) - as
// telas Excluir Configuração/Tipo de Link/Motivo de Denúncia/Área de
// Conhecimento eram ~100 linhas cada, byte a byte iguais fora de 3 coisas:
// os campos mostrados, o texto do aviso, e a chamada de API. Os próprios
// comentários de cada uma já admitiam a cópia ("Mesmo padrão de
// ExcluirConfiguracao - ver comentário completo lá") sem nunca consolidar.
//
// NÃO cobre ModalExcluirUsuario/ModalExcluirTermoUso/o Excluir de
// bancada-campanha.tsx de propósito - cada um tem uma diferença real
// (confirmação por e-mail digitado, modo forçado com 409, trava de
// campanha-demo) que um componente genérico só complicaria.
export function PaginaExcluir<T>({
  id,
  titulo,
  buscar,
  excluir,
  mensagemSucesso,
  detalheSucesso,
  campos,
  aviso,
}: PaginaExcluirProps<T>) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { dado, carregando, erro, reportarErro, limparErro } = useBuscarPorId(buscar, id);
  const [excluindo, setExcluindo] = useState(false);

  const aoConfirmar = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await excluir(id);
      mostrar(mensagemSucesso, detalheSucesso);
      void navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      setExcluindo(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-triangle-exclamation"
      titulo={titulo}
      subtitulo="Esta ação não pode ser desfeita."
      variante="perigo"
      rodape={
        dado && (
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void aoConfirmar()}
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
      ) : !dado ? (
        <p className="p-10 text-center texto-erro text-sm font-bold">{erro}</p>
      ) : (
        <div className="p-10 space-y-6">
          {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

          <SecaoFicha titulo="O que será excluído">{campos(dado)}</SecaoFicha>

          <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
            <p className="font-bold mb-1">
              <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
            </p>
            <p>{typeof aviso === 'function' ? (aviso as (dado: T) => ReactNode)(dado) : aviso}</p>
          </div>
        </div>
      )}
    </CartaoFormulario>
  );
}
