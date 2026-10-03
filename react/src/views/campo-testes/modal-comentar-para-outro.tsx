import { useEffect, useState } from 'react';
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
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { contarCaracteres } from '../../services/constant/util/validacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { ComentarioResponse } from '../../services/17-comentario/type/comentario.type';
import { EstadoVazio } from '../../components/crud/estado-vazio';

interface PesquisadorOpcao {
  idUsuario: number;
  nome: string;
}

interface ModalComentarParaOutroProps {
  authFetch: AuthFetch;
  campanha: CampanhaResponse;
  // Pesquisadores ativos (o dono da campanha já vem fora).
  pesquisadores: PesquisadorOpcao[];
  aoFechar: () => void;
}

// Comentar uma campanha em nome de um pesquisador (comentar_campanha_para_outro, 03): monta o cenário de comentário
// e endosso sem trocar de conta. As regras são as do comentário de verdade: só pesquisador, nunca na própria
// campanha, um por campanha, limite de texto de Parâmetros. Quem já comentou aparece desabilitado na lista.
export function ModalComentarParaOutro({ authFetch, campanha, pesquisadores, aoFechar }: ModalComentarParaOutroProps) {
  const [comentarios, setComentarios] = useState<ComentarioResponse[]>([]);
  const [autor, setAutor] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const limite = useRegrasCampanha().limiteComentario;

  useEffect(() => {
    comentarioApi.listar(authFetch, campanha.idCampanha).then(setComentarios).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch, campanha.idCampanha, chaveRecarga]);

  const jaComentou = new Set(comentarios.map((comentario) => comentario.idPesquisador));

  const erros = useErrosFormulario(() => ({
    autor: autor === '' && 'Escolha quem comenta.',
    conteudo:
      conteudo.trim() === ''
        ? 'Escreva o comentário.'
        : contarCaracteres(conteudo) > limite && `O comentário passou do limite de ${limite.toLocaleString('pt-BR')} caracteres.`,
  }));

  const comentar = async () => {
    if (!erros.tentarEnviar()) return;
    await executar(async () => {
      await comentarioApi.comentarParaOutro(authFetch, Number(autor), campanha.idCampanha, conteudo.trim());
      mostrar('Comentário enviado.', `Em nome de ${pesquisadores.find((p) => String(p.idUsuario) === autor)?.nome ?? autor}`);
      setAutor('');
      setConteudo('');
      erros.limpar();
      setChaveRecarga((atual) => atual + 1);
    });
  };

  return (
    <ModalFicha
      titulo="Comentar campanha"
      subtitulo={campanha.titulo}
      ajuda="Comenta em nome de um pesquisador, com as mesmas regras do comentário de verdade. Endossar fica com o dono da campanha, no T3."
      badges={[<BadgeStatusCampanha key="status" campanha={campanha} />]}
      aoFechar={aoFechar}
      erro={erro}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          rotuloCancelar="Fechar"
          acao={{ rotulo: 'Comentar', rotuloOcupado: 'Enviando...', ocupado, aoClicar: () => void comentar() }}
        />
      }
    >
      <div className="space-y-6">
        <SecaoFicha titulo="Novo comentário" colunas={1}>
          <Campo rotulo="Quem comenta" erro={erros.erroDe('autor')}>
            {({ atributos, classeErro }) => (
              <select {...atributos} value={autor} onChange={(evento) => setAutor(evento.target.value)} className={'input-padrao' + classeErro}>
                <option value="">Escolha um pesquisador...</option>
                {pesquisadores.map((pesquisador) => (
                  <option key={pesquisador.idUsuario} value={pesquisador.idUsuario} disabled={jaComentou.has(pesquisador.idUsuario)}>
                    {pesquisador.nome}
                    {jaComentou.has(pesquisador.idUsuario) ? ' (já comentou)' : ''}
                  </option>
                ))}
              </select>
            )}
          </Campo>
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
        <SecaoFicha titulo={`Comentários desta campanha (${comentarios.length})`} colunas={1}>
          {comentarios.length === 0 ? (
            <EstadoVazio compacto icone="fa-comments" titulo="Nenhum comentário ainda." texto="Escolha um pesquisador acima e escreva o primeiro." />
          ) : (
            <TabelaComentarios comentarios={comentarios} ehDono={false} />
          )}
        </SecaoFicha>
      </div>
    </ModalFicha>
  );
}
