import { useState } from 'react';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { confirmacaoConfere } from '../../components/input/confirmacao-confere';
import { ConfirmacaoDigitada } from '../../components/input/confirmacao-digitada';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface ModalExcluirUsuarioProps {
  idUsuario: number;
  nome: string;
  email: string;
  emailVerificado: boolean;
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoExcluido: () => void;
}

// Excluir - exclusão LÓGICA (usuario.deletado = TRUE via excluir_conta_usuario()), confirmada digitando o e-mail. Não
// precisa buscar nada sozinho (nome/e-mail já vêm da linha da tabela do chamador).
export function ModalExcluirUsuario({ idUsuario, nome, email, emailVerificado, auth, aoFechar, aoExcluido }: ModalExcluirUsuarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado: excluindo, executar: executarExcluindo } = useEnvio(reportarErro, limparErro);
  const [confirmacao, setConfirmacao] = useState('');
  const confirmado = confirmacaoConfere(confirmacao, email);

  const excluir = async () => {
    await executarExcluindo(async () => {
      await usuarioApi.remover(auth.authFetch, idUsuario);
      mostrar('Usuário excluído com sucesso.', `ID: ${idUsuario} foi excluído`);
      aoExcluido();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Excluir "${nome}"`}
      subtitulo="Não existe botão de desfazer no painel."
      aoFechar={aoFechar}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          acao={{
            rotulo: 'Confirmar exclusão',
            rotuloOcupado: 'Excluindo...',
            ocupado: excluindo,
            desabilitado: !confirmado,
            aoClicar: () => void excluir(),
            perigo: true,
          }}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="O que será excluído">
        <CampoFicha rotulo="id" valor={idUsuario} />
        <CampoFicha rotulo="Nome" valor={nome} />
        <CampoFicha rotulo="E-mail" valor={email} largura="cheia" />
        <CampoFicha rotulo="E-mail verificado" valor={emailVerificado ? 'Sim' : 'Não'} />
      </SecaoFicha>

      <CaixaAviso titulo="O que acontece de verdade">
        <p>
          A conta é marcada como excluída (exclusão lógica), não apagada do banco: o login
          deixa de funcionar e o perfil some do público na hora, mas o registro continua
          existindo pra auditoria e conformidade com a LGPD. Não existe um botão de
          "restaurar" no painel - reverter isso hoje exige acesso direto ao banco.
        </p>
      </CaixaAviso>

      <ConfirmacaoDigitada oQue="o e-mail" esperado={email} valor={confirmacao} aoMudar={setConfirmacao} />
    </ModalFicha>
  );
}
