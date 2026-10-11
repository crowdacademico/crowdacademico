import { useEffect, useState } from 'react';
import { AvisoSoPesquisador } from '../../components/crud/aviso-so-pesquisador';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { BadgeStatusCampanha } from '../../components/crud/badge-status-campanha';
import { TabelaComentarios } from '../../components/crud/tabelas/11-tabela-comentarios';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { comentarioApi } from '../../services/17-comentario/api/comentario.api';
import { useRegrasCampanha } from '../../services/12-campanha/hook/use-regras-campanha';
import { useSituacaoPesquisador } from '../../services/6-perfil-pesquisador/hook/use-situacao-pesquisador';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { contarCaracteres } from '../../services/constant/util/validacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { ComentarioResponse } from '../../services/17-comentario/type/comentario.type';

interface ModalComentarProps {
  authFetch: AuthFetch;
  usuario: UsuarioResponse | null;
  campanha: CampanhaResponse;
  aoFechar: () => void;
}

// Comentar uma campanha como a conta logada, com as regras do comentário de verdade: só pesquisador ativo, nunca
// na própria campanha, um por campanha, limite de texto de Parâmetros. Quem não pode vê o motivo em vez do campo.
// Endossar fica com o dono da campanha, no T3.
export function ModalComentar({ authFetch, usuario, campanha, aoFechar }: ModalComentarProps) {
  const [comentarios, setComentarios] = useState<ComentarioResponse[]>([]);
  const [conteudo, setConteudo] = useState('');
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const limite = useRegrasCampanha().limiteComentario;
  const situacao = useSituacaoPesquisador(authFetch, usuario);

  useEffect(() => {
    comentarioApi.listar(authFetch, campanha.idCampanha).then(setComentarios).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, campanha.idCampanha, chaveRecarga]);

  const idUsuario = usuario?.idUsuario ?? null;
  const ehDono = campanha.idUsuario === idUsuario;
  const jaComentou = comentarios.some((comentario) => comentario.idPesquisador === idUsuario);
  const podeComentar = situacao === 'ativo' && !ehDono && !jaComentou;

  const erros = useErrosFormulario(() => ({
    conteudo:
      conteudo.trim() === ''
        ? 'Escreva o comentário.'
        : contarCaracteres(conteudo) > limite && `O comentário passou do limite de ${limite.toLocaleString('pt-BR')} caracteres.`,
  }));

  const comentar = async () => {
    if (!erros.tentarEnviar()) return;
    await executar(async () => {
      await comentarioApi.criar(authFetch, campanha.idCampanha, conteudo.trim());
      mostrar('Comentário enviado.', `Por ${usuario?.nome ?? 'você'}`);
      setConteudo('');
      erros.limpar();
      setChaveRecarga((atual) => atual + 1);
    });
  };

  const motivoSemCampo = ehDono
    ? 'Esta campanha é sua: o pesquisador não comenta a própria campanha.'
    : jaComentou && 'Você já comentou esta campanha: é um comentário por pesquisador em cada campanha.';

  return (
    <ModalFicha
      titulo="Comentar campanha"
      subtitulo={campanha.titulo}
      ajuda="Comenta como a conta logada, com as mesmas regras do comentário de verdade. Endossar fica com o dono da campanha, no T3."
      badges={[<BadgeStatusCampanha key="status" campanha={campanha} />]}
      aoFechar={aoFechar}
      erro={erro}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          rotuloCancelar="Fechar"
          acao={podeComentar ? { rotulo: 'Comentar', rotuloOcupado: 'Enviando...', ocupado, aoClicar: () => void comentar() } : undefined}
        />
      }
    >
      <div className="space-y-6">
        {situacao !== null && situacao !== 'ativo' && (
          <AvisoSoPesquisador situacao={situacao} fazem="comentam campanhas" fazer="comentar campanhas" />
        )}
        {situacao === 'ativo' && motivoSemCampo && (
          <div className="paragrafo flex items-start gap-2 rounded-lg fundo-info texto-info p-3">
            <i className="fa-solid fa-circle-info mt-0.5 shrink-0" aria-hidden="true"></i>
            <p>{motivoSemCampo}</p>
          </div>
        )}
        {podeComentar && (
          <SecaoFicha titulo="Novo comentário" colunas={1}>
            <Campo rotulo="Comentário" erro={erros.erroDe('conteudo')}>
              {({ atributos, classeErro }) => (
                <>
                  <textarea
                    {...atributos}
                    rows={4}
                    value={conteudo}
                    onChange={(evento) => setConteudo(evento.target.value)}
                    className={'input-padrao' + classeErro}
                  />
                  <ContadorCaracteres texto={conteudo} limite={limite} />
                </>
              )}
            </Campo>
          </SecaoFicha>
        )}
        <SecaoFicha titulo={`Comentários desta campanha (${comentarios.length})`} colunas={1}>
          {comentarios.length === 0 ? (
            <EstadoVazio compacto icone="fa-comments" titulo="Nenhum comentário ainda." />
          ) : (
            <TabelaComentarios comentarios={comentarios} ehDono={false} />
          )}
        </SecaoFicha>
      </div>
    </ModalFicha>
  );
}
