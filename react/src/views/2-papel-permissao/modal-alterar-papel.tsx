import { useState } from 'react';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { papelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { PapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';

interface ModalAlterarPapelProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  papel: PapelResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

// Alterar - migrado de página pra modal (14-09-2026, continuação da
// migração CRUD→Modal pedida pelo Lucas). Recebe a linha (`papel:
// PapelResponse`) inteira do chamador - mesmo motivo de modal-motivo-
// denuncia.tsx - o que elimina o "busca a lista inteira e filtra pelo id"
// que a página antiga precisava fazer (não existe `GET /papel/:id`).
//
// Só "nome" é editável (`codigo`, ver 01_extensoes_enums_tabelas.sql
// [01-B], nunca é exposto/editável - as triggers de RBAC leem `codigo`,
// não `nome`, então renomear é seguro). Sem Consultar/Excluir pra papel (a
// listagem já mostra id/nome; excluir um papel usado em usuario_papel/
// papel_permissao é decisão maior, fora de escopo).
export function ModalAlterarPapel({ auth, papel, aoFechar, aoAtualizado }: ModalAlterarPapelProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [nome, setNome] = useState(papel.nome);
  const [enviando, setEnviando] = useState(false);

  const sujo = nome !== papel.nome;
  useAvisoAlteracaoNaoSalva(sujo);

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  const aoSalvar = async () => {
    limparErro();
    setEnviando(true);
    try {
      await papelApi.atualizar(auth.authFetch, papel.idPapel, { nome });
      mostrar('Papel alterado com sucesso.', `ID: ${papel.idPapel} foi alterado`);
      aoAtualizado();
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo={`Alterar "${papel.nome}"`}
      subtitulo="Só o nome exibido muda, o identificador interno usado pelas regras do sistema nunca é afetado."
      aoFechar={fechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={fechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void aoSalvar()}
            disabled={enviando || !sujo || nome.trim() === ''}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <CampoSomenteLeitura rotulo="id" valor={papel.idPapel} />

      <div>
        <label className="rotulo-campo">Nome</label>
        <input
          type="text"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          required
          maxLength={50}
          className="input-padrao"
        />
      </div>
    </ModalFicha>
  );
}
