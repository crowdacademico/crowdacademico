import { useEffect, useState } from 'react';
import { CaixaAviso } from './caixa-aviso';
import { CampoFicha, SecaoFicha } from './ficha-consulta';
import { ModalFicha } from './modal-ficha';
import { RodapeAcoes } from './rodape-acoes';
import { useErroToast } from '../layout/toast/use-erro-toast';
import { useToast } from '../layout/toast/use-toast';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import type { MotivoDenunciaResponse } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';

interface ModalExcluirComentarioProps {
  autor: string;
  conteudo: string;
  // `bloquear`: exclui e impede o autor de comentar de novo nesta campanha (o comentário fica guardado, inativo).
  excluir: (bloquear: boolean) => Promise<void>;
  // Denunciar à moderação junto (só o dono da campanha denuncia o comentário que recebeu). A denúncia leva o comentário
  // e já o tira do ar (fn_denuncia_comentario_oculta, 05).
  denunciar?: (idMotivo: number) => Promise<void>;
  aoFechar: () => void;
  aoExcluido: () => void;
}

// Excluir um comentário recebido, pelo dono da campanha. Os dois jeitos guardam o comentário para a moderação
// (21-11-2026: só a moderação apaga de vez): excluir (o autor pode comentar de novo) ou excluir e bloquear (para ofensa,
// ameaça ou spam; o autor não comenta mais nesta campanha). Bloquear nunca é automático: nem todo comentário excluído
// é ofensivo. Com "Denunciar" marcado, só "Excluir e bloquear" vale: quem denuncia um comentário ofensivo não quer o
// autor de volta. O autor não é avisado de nada.
export function ModalExcluirComentario({ autor, conteudo, excluir, denunciar, aoFechar, aoExcluido }: ModalExcluirComentarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const [bloqueando, setBloqueando] = useState(false);
  const [vaiDenunciar, setVaiDenunciar] = useState(false);
  const [idMotivo, setIdMotivo] = useState('');
  const [motivos, setMotivos] = useState<MotivoDenunciaResponse[] | null>(null);
  const [faltaMotivo, setFaltaMotivo] = useState(false);

  useEffect(() => {
    if (!vaiDenunciar || motivos !== null) return;
    motivoDenunciaApi.listarPublico({ ativo: true, tipo: 'perfil' }).then(setMotivos).catch(reportarErro);
  }, [vaiDenunciar, motivos, reportarErro]);

  const confirmar = (bloquear: boolean) => {
    if (vaiDenunciar && idMotivo === '') {
      setFaltaMotivo(true);
      return;
    }
    setBloqueando(bloquear);
    void executar(async () => {
      if (vaiDenunciar && denunciar) {
        await denunciar(Number(idMotivo));
      }
      await excluir(bloquear);
      mostrar(
        vaiDenunciar
          ? 'Comentário denunciado, excluído e autor bloqueado nesta campanha.'
          : bloquear
            ? 'Comentário excluído e autor bloqueado nesta campanha.'
            : 'Comentário excluído.',
      );
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
            {
              rotulo: 'Excluir',
              rotuloOcupado: 'Excluindo...',
              ocupado: ocupado && !bloqueando,
              desabilitado: ocupado || vaiDenunciar,
              aoClicar: () => confirmar(false),
              perigo: true,
            },
            { rotulo: 'Excluir e bloquear', rotuloOcupado: 'Bloqueando...', ocupado: ocupado && bloqueando, desabilitado: ocupado, aoClicar: () => confirmar(true), perigo: true, forte: true },
          ]}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="Comentário">
        <CampoFicha rotulo="Autor" valor={autor} />
        <CampoFicha rotulo="Texto" valor={conteudo} />
      </SecaoFicha>
      <CaixaAviso
        tom="erro"
        icone="fa-circle-info"
        titulo={
          <span className="font-normal">
            <strong>Excluir:</strong> o comentário some da sua lista e da página, e o autor pode comentar de novo.{' '}
            <strong>Excluir e bloquear:</strong> igual, mas o autor não consegue mais comentar nesta campanha. Use em caso
            de ofensa, ameaça ou spam. Nos dois casos o comentário fica guardado para a moderação.
          </span>
        }
        espacado
      />
      {denunciar && (
        <div className="mt-5 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer paragrafo texto-padrao">
            <input
              type="checkbox"
              checked={vaiDenunciar}
              disabled={ocupado}
              onChange={(evento) => {
                setVaiDenunciar(evento.target.checked);
                setFaltaMotivo(false);
              }}
              className="mt-1 w-4 h-4 accent-primary"
            />
            <span>
              <span className="enfase texto-forte">Denunciar este comentário à moderação</span>
              <span className="block legenda texto-fraco">
                Para conteúdo ofensivo, discriminatório, ameaçador, ilegal ou spam. A moderação analisa o comentário, e o
                autor fica bloqueado nesta campanha ("Excluir e bloquear").
              </span>
            </span>
          </label>
          {vaiDenunciar && (
            <label className="block">
              <span className="rotulo-campo">Motivo da denúncia</span>
              <select
                value={idMotivo}
                onChange={(evento) => {
                  setIdMotivo(evento.target.value);
                  setFaltaMotivo(false);
                }}
                className={'input-padrao w-full mt-1' + (faltaMotivo ? ' input-erro' : '')}
                aria-invalid={faltaMotivo || undefined}
              >
                <option value="">{motivos === null ? 'Carregando...' : 'Escolha um motivo...'}</option>
                {(motivos ?? []).map((motivo) => (
                  <option key={motivo.idMotivo} value={motivo.idMotivo}>
                    {motivo.descricao}
                  </option>
                ))}
              </select>
              {faltaMotivo && <span className="block legenda texto-erro mt-1">Escolha o motivo da denúncia.</span>}
            </label>
          )}
        </div>
      )}
    </ModalFicha>
  );
}
