import { useEffect, useState } from 'react';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { TabelaSolicitacoesEncerramento } from '../../components/crud/tabelas/13-tabela-solicitacoes-encerramento';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { solicitacaoEncerramentoApi } from '../../services/20-solicitacao-encerramento/api/solicitacao-encerramento.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { contarCaracteres } from '../../services/constant/util/validacao.util';
import { formatarData } from '../../services/constant/util/formatacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { SolicitacaoEncerramentoResponse } from '../../services/20-solicitacao-encerramento/type/solicitacao-encerramento.type';

interface SecaoEncerramentoAntecipadoProps {
  authFetch: AuthFetch;
  idCampanha: number;
  // Arrecadado confirmado: zero = nenhuma contribuição confirmada, o dono encerra sozinho (RF-064).
  valorArrecadado: number;
  aoEncerrada: () => void;
}

// Encerrar a campanha antes do prazo, no Alterar do dono (RF-064). Sem contribuição confirmada, encerra na hora; com
// contribuição, envia um pedido ao administrador, e a campanha segue recebendo apoio até a decisão. Um pedido
// pendente pode ser cancelado. Encerrar pede confirmação: não dá para desfazer.
export function SecaoEncerramentoAntecipado({ authFetch, idCampanha, valorArrecadado, aoEncerrada }: SecaoEncerramentoAntecipadoProps) {
  const [pedidos, setPedidos] = useState<SolicitacaoEncerramentoResponse[] | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const limite = useConfiguracoes().obterNumero('limite_caracteres_justificativa_encerramento', 2000);
  const encerraDireto = valorArrecadado <= 0;

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

  const enviar = async () => {
    if (!erros.tentarEnviar()) return;
    if (encerraDireto && !confirmando) {
      setConfirmando(true);
      return;
    }
    await executar(async () => {
      if (encerraDireto) {
        await solicitacaoEncerramentoApi.encerrarDireto(authFetch, idCampanha, justificativa.trim());
        mostrar('Campanha encerrada.', 'Ela não recebe mais apoio.');
        aoEncerrada();
      } else {
        await solicitacaoEncerramentoApi.pedir(authFetch, idCampanha, justificativa.trim());
        mostrar('Pedido enviado ao administrador.', 'A campanha continua recebendo apoio até a decisão.');
        setJustificativa('');
        erros.limpar();
        setChaveRecarga((atual) => atual + 1);
      }
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
    <SecaoFicha titulo="Encerrar antes do prazo" colunas={1}>
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
          <p className="legenda texto-fraco">
            {encerraDireto
              ? 'A campanha ainda não tem nenhuma contribuição confirmada: você pode encerrá-la agora, sem passar pelo administrador.'
              : 'A campanha já tem contribuição confirmada: o encerramento passa pelo administrador, que decide. Até lá, ela continua recebendo apoio.'}
          </p>
          <Campo rotulo="Por que encerrar antes do prazo" erro={erros.erroDe('justificativa')}>
            {({ atributos, classeErro }) => (
              <>
                <textarea
                  {...atributos}
                  rows={3}
                  value={justificativa}
                  onChange={(evento) => {
                    setJustificativa(evento.target.value);
                    setConfirmando(false);
                  }}
                  className={'input-padrao' + classeErro}
                />
                <ContadorCaracteres texto={justificativa} limite={limite} />
              </>
            )}
          </Campo>
          {confirmando && (
            <CaixaAviso tom="erro" icone="fa-triangle-exclamation" titulo="Encerrar a campanha agora">
              A campanha para de receber apoio na hora e não dá para desfazer.
            </CaixaAviso>
          )}
          <div>
            <button type="button" className={'btn btn-pequeno ' + (confirmando ? 'btn-danger' : 'btn-secondary')} disabled={ocupado} onClick={() => void enviar()}>
              {encerraDireto ? (confirmando ? 'Confirmar: encerrar agora' : 'Encerrar campanha agora') : 'Enviar pedido ao administrador'}
            </button>
          </div>
        </>
      )}
      {pedidos.length > 0 && <TabelaSolicitacoesEncerramento solicitacoes={pedidos} />}
    </SecaoFicha>
  );
}
