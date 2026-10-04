import { useState } from 'react';
import { CaixaAviso } from './caixa-aviso';
import { CampoFicha, SecaoFicha } from './ficha-consulta';
import { ModalFicha } from './modal-ficha';
import { RodapeAcoes } from './rodape-acoes';
import { useErroToast } from '../layout/toast/use-erro-toast';
import { useToast } from '../layout/toast/use-toast';
import { useEnvio } from '../../services/constant/hook/use-envio';

interface ModalExcluirComentarioProps {
  autor: string;
  conteudo: string;
  // `bloquear`: exclui e impede o autor de comentar de novo nesta campanha (o comentário fica guardado, inativo).
  excluir: (bloquear: boolean) => Promise<void>;
  aoFechar: () => void;
  aoExcluido: () => void;
}

// Excluir um comentário recebido, pelo dono da campanha. Duas saídas no mesmo modal: excluir (apaga de vez, o autor
// pode comentar de novo) ou excluir e bloquear (para ofensa, ameaça ou spam). Bloquear nunca é automático: nem todo
// comentário excluído é ofensivo. O autor não é avisado de nenhuma das duas.
export function ModalExcluirComentario({ autor, conteudo, excluir, aoFechar, aoExcluido }: ModalExcluirComentarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const [bloqueando, setBloqueando] = useState(false);

  const confirmar = (bloquear: boolean) => {
    setBloqueando(bloquear);
    void executar(async () => {
      await excluir(bloquear);
      mostrar(bloquear ? 'Comentário excluído e autor bloqueado nesta campanha.' : 'Comentário excluído.');
      aoExcluido();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Excluir comentário de ${autor}`}
      subtitulo="O autor não é avisado."
      aoFechar={aoFechar}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          acao={[
            { rotulo: 'Excluir', rotuloOcupado: 'Excluindo...', ocupado: ocupado && !bloqueando, desabilitado: ocupado, aoClicar: () => confirmar(false), perigo: true },
            { rotulo: 'Excluir e bloquear', rotuloOcupado: 'Bloqueando...', ocupado: ocupado && bloqueando, desabilitado: ocupado, aoClicar: () => confirmar(true), perigo: true },
          ]}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="Comentário">
        <CampoFicha rotulo="Autor" valor={autor} />
        <CampoFicha rotulo="Texto" valor={conteudo} />
      </SecaoFicha>
      <CaixaAviso titulo="O que acontece de verdade" tom="erro" espacado>
        <p>
          <strong>Excluir:</strong> o comentário é apagado de vez. O autor pode comentar de novo nesta campanha.
        </p>
        <p>
          <strong>Excluir e bloquear:</strong> o comentário some da sua lista, mas fica guardado, e o autor não consegue
          mais comentar nesta campanha. Use em caso de ofensa, ameaça ou spam.
        </p>
        <p>Denunciar o comentário à moderação chega junto com o módulo de denúncias.</p>
      </CaixaAviso>
    </ModalFicha>
  );
}
