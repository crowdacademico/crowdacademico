import { useState } from 'react';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Campo } from '../../components/input/campo';
import { papelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { PapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';

interface ModalAlterarPapelProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  papel: PapelResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

// Alterar em modal. Recebe a linha (`papel: PapelResponse`) inteira do chamador, mesmo motivo de
// modal-motivo-denuncia.tsx: elimina o "busca a lista inteira e filtra pelo id" (não existe `GET /papel/:id`).
//
// Só "nome" é editável (`codigo`, ver 01_extensoes_enums_tabelas.sql [01-B], nunca é exposto/editável: as
// triggers de RBAC leem `codigo`, não `nome`, então renomear é seguro). Consultar/Excluir têm modal próprio
// (ver modal-papel.tsx): Consultar mostra as permissões do papel; Excluir é só explicativo, nunca executa (ver
// comentário completo em modal-papel.tsx sobre o ON DELETE CASCADE).
export function ModalAlterarPapel({ auth, papel, aoFechar, aoAtualizado }: ModalAlterarPapelProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast();
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [nome, setNome] = useState(papel.nome);

  const sujo = nome !== papel.nome;
  useAvisoAlteracaoNaoSalva(sujo);

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  const aoSalvar = async () => {
    await executarEnviando(async () => {
      await papelApi.atualizar(auth.authFetch, papel.idPapel, { nome });
      mostrar('Papel alterado com sucesso.', `ID: ${papel.idPapel} foi alterado`);
      aoAtualizado();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Alterar "${papel.nome}"`}
      subtitulo="Só o nome exibido muda, o identificador interno usado pelas regras do sistema nunca é afetado."
      aoFechar={fechar}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{
            rotulo: 'Salvar',
            rotuloOcupado: 'Salvando...',
            ocupado: enviando,
            desabilitado: !sujo || nome.trim() === '',
            aoClicar: () => void aoSalvar(),
          }}
        />
      }
      erro={erro}
    >
      <CampoSomenteLeitura rotulo="id" valor={papel.idPapel} />

      <Campo rotulo="Nome" erro={errosCampo.nome}>
        {({ atributos }) => (
          <input
            {...atributos}
            type="text"
            value={nome}
            onChange={(evento) => {
              setNome(evento.target.value);
              limparErroCampo('nome');
            }}
            required
            maxLength={50}
            className="input-padrao"
          />
        )}
      </Campo>
    </ModalFicha>
  );
}
