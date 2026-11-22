import { useState } from 'react';
import { CampoFicha } from '../../components/crud/ficha-consulta';
import { ModalExcluirItem } from '../../components/crud/modal-excluir-item';
import { CaixaMarcacao } from '../../components/input/caixa-marcacao';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';

interface ModalExcluirAtualizacaoProps {
  authFetch: AuthFetch;
  atualizacao: AtualizacaoCampanhaResponse;
  // Campanha e situação já em palavras, como a tela que abriu mostra.
  campanha?: string;
  situacao: string;
  // Só a moderação escolhe entre manter o registro e apagar de vez. O dono sempre mantém: o que ele publicou (um vírus,
  // um conteúdo malicioso) fica guardado como prova.
  moderacao?: boolean;
  aoFechar: () => void;
  aoExcluida: () => void;
}

// Excluir atualização (RF-053), o mesmo na tela Atualizações (moderação) e no Alterar da campanha (o dono). Excluir tira
// da página da campanha e deixa a atualização guardada como Excluída. Só a moderação vê "Manter o registro" (marcado por
// padrão): desmarcado, apaga de vez com os anexos; e a que já saiu do ar, para ela, só sai de vez.
export function ModalExcluirAtualizacao({ authFetch, atualizacao, campanha, situacao, moderacao = false, aoFechar, aoExcluida }: ModalExcluirAtualizacaoProps) {
  const [manterRegistro, setManterRegistro] = useState(true);
  // Motivo (21-11-2026): a moderação que exclui mantendo o registro explica o porquê; o pesquisador vê no Estúdio.
  const [motivo, setMotivo] = useState('');
  const podeManter = atualizacao.ativo;
  const manter = !moderacao || (podeManter && manterRegistro);
  const pedeMotivo = moderacao && manter;

  return (
    <ModalExcluirItem
      nome={atualizacao.titulo}
      campos={
        <>
          {campanha && <CampoFicha rotulo="Campanha" valor={campanha} largura="cheia" />}
          <CampoFicha rotulo="Publicada em" valor={formatarDataHora(atualizacao.publicadoEm)} />
          <CampoFicha rotulo="Situação" valor={situacao} />
          <CampoFicha rotulo="Anexos" valor={String(atualizacao.anexos.length)} />
        </>
      }
      subtitulo={manter ? (moderacao ? 'Fica guardada como Excluída; dá para apagar de vez depois.' : 'Fica guardada como Excluída.') : undefined}
      // Mantendo o registro nada se perde: o aviso vermelho fica só para o apagar de vez.
      explicacao={manter ? undefined : 'A atualização e os anexos dela são apagados de vez.'}
      extra={
        moderacao && podeManter && (
          <>
            <CaixaMarcacao rotulo="Manter o registro" marcado={manterRegistro} aoMudar={setManterRegistro} className="mt-4" />
            {pedeMotivo && (
              <div className="mt-4">
                <Campo rotulo="Motivo da exclusão (o pesquisador vê este texto)">
                  {({ atributos }) => (
                    <>
                      <textarea {...atributos} rows={3} maxLength={1000} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} className="input-padrao" />
                      <ContadorCaracteres texto={motivo} limite={1000} />
                    </>
                  )}
                </Campo>
              </div>
            )}
          </>
        )
      }
      remover={async () => {
        // Motivo em branco: o banco recusa com a mensagem certa (90044), que aparece no aviso de erro.
        if (manter) {
          await atualizacaoCampanhaApi.alterar(authFetch, atualizacao.idAtualizacao, pedeMotivo ? { ativo: false, motivoModeracao: motivo.trim() } : { ativo: false });
        } else {
          await atualizacaoCampanhaApi.excluir(authFetch, atualizacao.idAtualizacao);
        }
      }}
      mensagemSucesso={manter ? 'Atualização excluída (registro mantido).' : 'Atualização apagada de vez.'}
      aoFechar={aoFechar}
      aoExcluido={aoExcluida}
    />
  );
}
