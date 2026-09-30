import { useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';

interface ModalExcluirTermoUsoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  termo: TermoUsoResponse;
  aoFechar: () => void;
  aoExcluido: () => void;
}

// Excluir: como Criar não ativa mais sozinho, um rascunho com muito erro de português pode simplesmente ser
// apagado (para não sujar o banco). Confirmação simples (sem digitar nada, diferente de ModalExcluirUsuario). A
// versão vigente e a versão já aceita por alguém nunca são excluídas (RF-091: o aceite é a prova do que a pessoa
// aceitou); nesses casos o backend recusa e a mensagem dele aparece aqui.
export function ModalExcluirTermoUso({ auth, termo, aoFechar, aoExcluido }: ModalExcluirTermoUsoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await termoUsoApi.excluir(auth.authFetch, termo.idTermo);
      mostrar('Excluído com sucesso.', `Versão "${termo.versao}" foi excluída.`);
      aoExcluido();
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <ModalFicha
      titulo={`Excluir "${termo.versao}"`}
      subtitulo="Não existe botão de desfazer no painel."
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
      <SecaoFicha titulo="O que será excluído">
        <CampoFicha rotulo="id" valor={termo.idTermo} />
        <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO_TERMO[termo.tipo]} />
        <CampoFicha rotulo="Versão" valor={termo.versao} />
      </SecaoFicha>
    </ModalFicha>
  );
}
