import { useState } from 'react';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { ModalTermo } from '../../components/crud/modal-termo';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface TelaAceiteTermoUsoProps {
  auth: Pick<UseAuthReturn, 'authFetch' | 'logout' | 'renovarSessaoAgora'>;
}

// RF-015: publicada uma versão nova do Termo de Uso (ou, para pesquisador, do termo de pesquisador), quem já tem
// conta lê e aceita antes de continuar; com os dois pendentes, um depois do outro. Toma o lugar
// do painel inteiro (AdminLayout) enquanto houver pendência, no mesmo modal de termo do Criar conta; o backend também recusa as outras rotas com 403
// TERMO_PENDENTE, então esconder a tela não basta para pular o aceite. Aceitar renova a sessão, e o token novo
// já vem sem a pendência.
export function TelaAceiteTermoUso({ auth }: TelaAceiteTermoUsoProps) {
  // Muda a cada aceite: com outro termo ainda pendente, a tela continua e busca o próximo; sem pendência, o painel
  // já tomou o lugar dela e a busca nem roda.
  const [aceites, setAceites] = useState(0);
  const {
    dado: termo,
    carregando,
    erro,
    reportarErro,
    limparErro,
    recarregar,
  } = useBuscar(() => termoUsoApi.buscarPendente(auth.authFetch), [aceites], {
    mostraTexto: true,
  });
  const dePesquisador = termo?.tipo === 'upgrade_pesquisador';
  const nomeTermo = dePesquisador ? 'Termo de Pesquisador' : 'Termo de Uso';
  const [aceitando, setAceitando] = useState(false);

  const aceitar = async () => {
    if (!termo) return;
    limparErro();
    setAceitando(true);
    try {
      await termoUsoApi.aceitar(auth.authFetch, termo.idTermo);
      await auth.renovarSessaoAgora();
      setAceites((total) => total + 1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      // 409: a versão vigente mudou enquanto a pessoa lia; mostra a nova.
      recarregar();
    } finally {
      setAceitando(false);
    }
  };

  // O X e o Esc encerram a sessão, como "Sair": com termo pendente só dá para ler, aceitar ou sair (RF-015).
  return (
    <ModalTermo
      titulo={nomeTermo}
      versao={termo?.versao}
      conteudo={carregando ? '' : (termo?.conteudo ?? null)}
      carregando={carregando}
      erro={erro}
      fecharAoClicarFora={false}
      aoFechar={() => void auth.logout()}
      rodape={
        <RodapeAcoes
          aoCancelar={() => void auth.logout()}
          rotuloCancelar="Sair"
          acao={{ rotulo: 'Li e aceito', rotuloOcupado: 'Aceitando...', ocupado: aceitando, desabilitado: !termo, aoClicar: () => void aceitar() }}
        />
      }
    />
  );
}
