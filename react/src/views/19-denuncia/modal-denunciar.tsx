import { useEffect, useState } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { denunciaApi } from '../../services/19-denuncia/api/denuncia.api';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { contarCaracteres } from '../../services/constant/util/validacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { MotivoDenunciaResponse } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';
import type { AlvoDenuncia } from '../../services/19-denuncia/type/denuncia.type';

interface ModalDenunciarProps {
  authFetch: AuthFetch;
  alvo: AlvoDenuncia;
  // O nome do que está sendo denunciado (título da campanha ou nome do pesquisador), para o subtítulo.
  nomeAlvo: string;
  // Texto que já entra no relato (ex.: o comentário denunciado), que a pessoa pode completar.
  relatoInicial?: string;
  aoFechar: () => void;
  aoDenunciado?: () => void;
}

// Denunciar uma campanha (RF-106) ou o perfil de um pesquisador (RF-029): motivo obrigatório, só os ativos do tipo
// certo (RF-107), e relato opcional. O banco recusa denúncia repetida, de campanha que não está ativa, contra si
// mesmo e acima do limite por janela de tempo, e a mensagem dele aparece aqui. Pronto para a página pública.
export function ModalDenunciar({ authFetch, alvo, nomeAlvo, relatoInicial = '', aoFechar, aoDenunciado }: ModalDenunciarProps) {
  const tipo = alvo.idCampanhaAlvo !== undefined ? 'campanha' : 'perfil';
  const [motivos, setMotivos] = useState<MotivoDenunciaResponse[] | null>(null);
  const [idMotivo, setIdMotivo] = useState('');
  const [relato, setRelato] = useState(relatoInicial);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const limite = useConfiguracoes().obterNumero('limite_caracteres_relato_denuncia', 1000);

  useEffect(() => {
    motivoDenunciaApi.listarPublico({ ativo: true, tipo }).then(setMotivos).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const erros = useErrosFormulario(() => ({
    motivo: idMotivo === '' && 'Escolha o motivo da denúncia.',
    relato: contarCaracteres(relato) > limite && `O relato passou do limite de ${limite.toLocaleString('pt-BR')} caracteres.`,
  }));

  const denunciar = async () => {
    if (!erros.tentarEnviar()) return;
    await executar(async () => {
      await denunciaApi.criar(authFetch, { ...alvo, idMotivo: Number(idMotivo), relato: relato.trim() || undefined });
      mostrar('Denúncia enviada.', 'A moderação vai analisar.');
      aoDenunciado?.();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={tipo === 'campanha' ? 'Denunciar campanha' : 'Denunciar perfil'}
      subtitulo={nomeAlvo}
      carregando={motivos === null}
      aoFechar={aoFechar}
      erro={erro}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          acao={{ rotulo: 'Enviar denúncia', rotuloOcupado: 'Enviando...', ocupado, perigo: true, aoClicar: () => void denunciar() }}
        />
      }
    >
      <SecaoFicha titulo="Denúncia" colunas={1}>
        <Campo rotulo="Motivo" erro={erros.erroDe('motivo')}>
          {({ atributos, classeErro }) => (
            <select {...atributos} value={idMotivo} onChange={(evento) => setIdMotivo(evento.target.value)} className={'input-padrao' + classeErro}>
              <option value="">Escolha um motivo...</option>
              {(motivos ?? []).map((motivo) => (
                <option key={motivo.idMotivo} value={motivo.idMotivo}>
                  {motivo.descricao}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo rotulo="Relato (opcional)" erro={erros.erroDe('relato')}>
          {({ atributos, classeErro }) => (
            <>
              <textarea
                {...atributos}
                rows={5}
                value={relato}
                onChange={(evento) => setRelato(evento.target.value)}
                className={'input-padrao' + classeErro}
              />
              <ContadorCaracteres texto={relato} limite={limite} />
            </>
          )}
        </Campo>
        <p className="legenda texto-fraco">A denúncia vai para a moderação, que analisa e decide. Quem foi denunciado não sabe quem denunciou.</p>
      </SecaoFicha>
    </ModalFicha>
  );
}
