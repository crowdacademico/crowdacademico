import { useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';

interface ModalExcluirTermoUsoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  termo: TermoUsoResponse;
  aoFechar: () => void;
  aoExcluido: () => void;
}

// Excluir: como Criar não ativa mais sozinho, um rascunho com muito erro de português pode simplesmente ser
// apagado (para não sujar o banco). Confirmação simples (sem digitar nada, diferente de ModalExcluirUsuario): o
// backend (TermoUsoServiceExcluir) já bloqueia com 409 qualquer versão vigente ou aceita por alguém.
//
// "Excluir mesmo assim": se o 409 for especificamente o de "já foi aceita" (não o de "é a vigente", esse
// continua bloqueado sem exceção), a tela troca para o modo forçado: mostra o aviso + checkbox "entendi" +
// botão "Excluir mesmo assim", que reenvia com `forcar: true` (apaga o termo E as linhas de aceite que apontam
// para ele: decisão consciente, sabendo que perde o rastro de quem aceitou).
export function ModalExcluirTermoUso({ auth, termo, aoFechar, aoExcluido }: ModalExcluirTermoUsoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [excluindo, setExcluindo] = useState(false);
  const [modoForcado, setModoForcado] = useState(false);
  const [entendi, setEntendi] = useState(false);

  const excluir = async (forcar: boolean) => {
    limparErro();
    setExcluindo(true);
    try {
      await termoUsoApi.excluir(auth.authFetch, termo.idTermo, forcar);
      mostrar('Excluído com sucesso.', `Versão "${termo.versao}" foi excluída.`);
      aoExcluido();
      aoFechar();
    } catch (erroRequisicao) {
      const mensagem = reportarErro(erroRequisicao);
      // Só oferece o modo forçado pro caso "já foi aceita" - o de "é a
      // vigente" continua bloqueado sem exceção nenhuma (ver
      // TermoUsoServiceExcluir).
      if (mensagem.includes('já foi aceita')) {
        setModoForcado(true);
      }
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
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void excluir(modoForcado)}
            disabled={excluindo || (modoForcado && !entendi)}
            className="btn btn-danger flex-1"
          >
            {excluindo ? 'Excluindo...' : modoForcado ? 'Excluir mesmo assim' : 'Confirmar exclusão'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <SecaoFicha titulo="O que será excluído">
        <CampoFicha rotulo="id" valor={termo.idTermo} />
        <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO_TERMO[termo.tipo]} />
        <CampoFicha rotulo="Versão" valor={termo.versao} />
      </SecaoFicha>

      {modoForcado && (
        <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
          <p className="font-bold mb-1">
            <i className="fa-solid fa-triangle-exclamation mr-1"></i> Isto apaga o rastro de aceite
          </p>
          <p className="mb-3">
            Pelo menos uma pessoa já aceitou esta versão. Excluir mesmo assim apaga, junto com a
            versão, TODAS as linhas de aceite que registram quem aceitou ela - não vai mais ser
            possível provar que essas pessoas aceitaram este texto especificamente. A exclusão em
            si continua registrada no log de auditoria.
          </p>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={entendi} onChange={(evento) => setEntendi(evento.target.checked)} />
            Entendi e quero excluir mesmo assim.
          </label>
        </div>
      )}
    </ModalFicha>
  );
}
