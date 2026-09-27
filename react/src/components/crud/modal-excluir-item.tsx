import type { ReactNode } from 'react';
import { CaixaAviso } from './caixa-aviso';
import { SecaoFicha } from './ficha-consulta';
import { ModalFicha } from './modal-ficha';
import { RodapeAcoes } from './rodape-acoes';
import { useErroToast } from '../layout/toast/use-erro-toast';
import { useToast } from '../layout/toast/use-toast';
import { useEnvio } from '../../services/constant/hook/use-envio';

interface ModalExcluirItemProps {
  // Nome do item no título ("Excluir "Lattes"").
  nome: string;
  // Os CampoFicha de "O que será excluído".
  campos: ReactNode;
  // O que o banco faz de verdade (bloqueia se em uso, apaga pra sempre se não).
  explicacao: ReactNode;
  remover: () => Promise<void>;
  mensagemSucesso: string;
  detalheSucesso?: string;
  aoFechar: () => void;
  aoExcluido: () => void;
}

// Excluir de item de catálogo (tipo de link, área, motivo): mostra o que será excluído, explica o que acontece e
// confirma. Se o item estiver em uso, o 409 do backend (com a contagem de onde está em uso) aparece no topo.
export function ModalExcluirItem({
  nome,
  campos,
  explicacao,
  remover,
  mensagemSucesso,
  detalheSucesso,
  aoFechar,
  aoExcluido,
}: ModalExcluirItemProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const { ocupado: excluindo, executar } = useEnvio(reportarErro, limparErro);

  const excluir = () =>
    executar(async () => {
      await remover();
      mostrar(mensagemSucesso, detalheSucesso);
      aoExcluido();
      aoFechar();
    });

  return (
    <ModalFicha
      titulo={`Excluir "${nome}"`}
      subtitulo="Esta ação não pode ser desfeita."
      aoFechar={aoFechar}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          acao={{
            rotulo: 'Confirmar exclusão',
            rotuloOcupado: 'Excluindo...',
            ocupado: excluindo,
            aoClicar: () => void excluir(),
            perigo: true,
          }}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="O que será excluído">{campos}</SecaoFicha>
      <CaixaAviso titulo="O que acontece de verdade" tom="erro">
        <p>{explicacao}</p>
      </CaixaAviso>
    </ModalFicha>
  );
}
