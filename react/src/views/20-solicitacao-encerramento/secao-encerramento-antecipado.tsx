import { useEffect, useState } from 'react';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { TabelaSolicitacoesEncerramento } from '../../components/crud/tabelas/13-tabela-solicitacoes-encerramento';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Tooltip } from '../../components/layout/tooltip';
import { solicitacaoEncerramentoApi } from '../../services/20-solicitacao-encerramento/api/solicitacao-encerramento.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { contarCaracteres } from '../../services/constant/util/validacao.util';
import { formatarData } from '../../services/constant/util/formatacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { SolicitacaoEncerramentoResponse } from '../../services/20-solicitacao-encerramento/type/solicitacao-encerramento.type';
import type { ModeloCampanha } from '../../services/constant/type/enums-do-banco.gerado';

interface SecaoEncerramentoAntecipadoProps {
  authFetch: AuthFetch;
  idCampanha: number;
  modelo: ModeloCampanha;
  metaFinanceira: number;
  valorArrecadado: number;
  aoEncerrada: () => void;
}

// Encerrar a campanha antes do prazo, no Alterar do dono (RF-064). Duas ações, cada uma com o destino do dinheiro fixo:
// - Cancelar o projeto: encerra na hora, sem administrador, e todo o dinheiro já pago volta para quem apoiou. Abre a
//   janelinha de confirmação (DS-87): não dá para desfazer.
// - Encerrar antes do prazo: pedido ao administrador; aprovado, o dinheiro vai para o pesquisador. Só para campanha
//   flexível ou que já bateu a meta (o banco recusa as outras, 91051). Até a decisão a campanha segue recebendo apoio,
//   e o pedido pendente pode ser cancelado.
export function SecaoEncerramentoAntecipado({ authFetch, idCampanha, modelo, metaFinanceira, valorArrecadado, aoEncerrada }: SecaoEncerramentoAntecipadoProps) {
  const [pedidos, setPedidos] = useState<SolicitacaoEncerramentoResponse[] | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const limite = useConfiguracoes().obterNumero('limite_caracteres_justificativa_encerramento', 2000);
  const podePedir = modelo === 'flexivel' || valorArrecadado >= metaFinanceira;

  useEffect(() => {
    solicitacaoEncerramentoApi.listar(authFetch, { idCampanha }).then(setPedidos).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, idCampanha, chaveRecarga]);

  const erros = useErrosFormulario(() => ({
    justificativa:
      justificativa.trim() === ''
        ? 'Escreva por que a campanha vai ser encerrada.'
        : contarCaracteres(justificativa) > limite && `A justificativa passou do limite de ${limite.toLocaleString('pt-BR')} caracteres.`,
  }));

  if (pedidos === null) {
    return null;
  }
  const pendente = pedidos.find((pedido) => pedido.status === 'pendente');

  // Cancelar pede o OK na janelinha; o pedido ao administrador não (ele decide, e dá para desistir do pedido).
  const pedirConfirmacaoCancelar = () => {
    if (erros.tentarEnviar()) setConfirmando(true);
  };

  const cancelarProjeto = async () => {
    await executar(async () => {
      await solicitacaoEncerramentoApi.encerrarDireto(authFetch, idCampanha, justificativa.trim());
      mostrar('Projeto cancelado.', 'A campanha não recebe mais apoio e o dinheiro já pago volta para quem apoiou.');
      aoEncerrada();
    });
    setConfirmando(false);
  };

  const pedirEncerramento = async () => {
    if (!erros.tentarEnviar()) return;
    await executar(async () => {
      await solicitacaoEncerramentoApi.pedir(authFetch, idCampanha, justificativa.trim());
      mostrar('Pedido enviado ao administrador.', 'A campanha continua recebendo apoio até a decisão.');
      setJustificativa('');
      erros.limpar();
      setChaveRecarga((atual) => atual + 1);
    });
  };

  const cancelar = async (id: number) => {
    await executar(async () => {
      await solicitacaoEncerramentoApi.cancelar(authFetch, id);
      mostrar('Pedido cancelado.', 'A campanha segue ativa.');
      setChaveRecarga((atual) => atual + 1);
    });
  };

  return (
    <SecaoFicha titulo="Encerrar a campanha" colunas={1}>
      {erro && <p className="erro-campo">{erro}</p>}
      {pendente ? (
        <CaixaAviso titulo={`Pedido enviado em ${formatarData(pendente.solicitadoEm)}, esperando o administrador`}>
          <p>A campanha continua recebendo apoio até a decisão. Você pode desistir enquanto o pedido não for decidido.</p>
          <button type="button" className="btn btn-pequeno btn-secondary" disabled={ocupado} onClick={() => void cancelar(pendente.idSolicitacao)}>
            Cancelar pedido
          </button>
        </CaixaAviso>
      ) : (
        <>
          <Campo rotulo="Por que encerrar" erro={erros.erroDe('justificativa')}>
            {({ atributos, classeErro }) => (
              <>
                <textarea
                  {...atributos}
                  rows={3}
                  value={justificativa}
                  onChange={(evento) => setJustificativa(evento.target.value)}
                  className={'input-padrao' + classeErro}
                />
                <ContadorCaracteres texto={justificativa} limite={limite} />
              </>
            )}
          </Campo>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={ocupado || !podePedir}
              title={podePedir ? undefined : 'A campanha ainda não bateu a meta. Para encerrar agora, cancele o projeto.'}
              onClick={() => void pedirEncerramento()}
            >
              <i className="fa-solid fa-paper-plane" aria-hidden="true"></i> Encerrar antes do prazo
            </button>
            <Tooltip texto="O administrador decide. Aprovado, o dinheiro arrecadado vai para você. Só para campanha flexível ou que já bateu a meta." />
            <button type="button" className="btn btn-danger" disabled={ocupado} onClick={pedirConfirmacaoCancelar}>
              <i className="fa-solid fa-ban" aria-hidden="true"></i> Cancelar o projeto
            </button>
            <Tooltip texto="Encerra na hora, sem o administrador. Todo o dinheiro já pago volta para quem apoiou." />
          </div>
          {confirmando && (
            <ModalConfirmacao
              titulo="Cancelar o projeto?"
              rotuloConfirmar="Cancelar o projeto"
              rotuloOcupado="Cancelando..."
              perigo
              exigirCiencia
              ocupado={ocupado}
              aoConfirmar={() => void cancelarProjeto()}
              aoCancelar={() => setConfirmando(false)}
            >
              <p>A campanha para de receber apoio na hora e passa a constar como encerrada. Não dá para desfazer.</p>
              <p>Todo o dinheiro já pago volta para quem apoiou.</p>
              <p>A justificativa fica registrada no histórico de pedidos da campanha.</p>
            </ModalConfirmacao>
          )}
        </>
      )}
      {pedidos.length > 0 && <TabelaSolicitacoesEncerramento solicitacoes={pedidos} />}
    </SecaoFicha>
  );
}
