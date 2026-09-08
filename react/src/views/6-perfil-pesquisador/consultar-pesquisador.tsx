import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
  classeBadgeStatusPesquisador,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { formatarCpfExibicao, formatarDataHora, formatarNomeDimensao } from '../../services/constant/utils/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { PerfilPesquisadorResponse, PerfilPesquisadorResponseScore } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

function formatarCpf(cpf: string | null): string {
  return cpf ? formatarCpfExibicao(cpf) : 'Não visível (sem permissão sensível ou não é o dono)';
}

export function ConsultarPesquisador({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<PerfilPesquisadorResponse | null>(null);
  const [score, setScore] = useState<PerfilPesquisadorResponseScore | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro } = useErroToast();

  useEffect(() => {
    Promise.all([
      perfilPesquisadorApi.buscar(auth.authFetch, id),
      perfilPesquisadorApi.buscarScore(auth.authFetch, id).catch(() => null),
      usuarioApi.buscar(auth.authFetch, id).then((u) => u.nome).catch(() => null),
    ])
      .then(([dadosPerfil, dadosScore, nome]) => {
        setPerfil(dadosPerfil);
        setScore(dadosScore);
        setNomeUsuario(nome);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!perfil) {
    return <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={nomeUsuario ?? `Usuário #${perfil.idUsuario}`}
      subtitulo={ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico] ?? perfil.tituloAcademico}
      largura="larga"
      badges={[
        <span key="status" className={`badge ${classeBadgeStatusPesquisador(perfil.statusPesquisador)}`}>
          {ROTULO_STATUS_PESQUISADOR[perfil.statusPesquisador] ?? perfil.statusPesquisador}
        </span>,
        <span key="vinculo" className="badge badge-neutro">
          {ROTULO_TIPO_VINCULO[perfil.tipoVinculo] ?? perfil.tipoVinculo}
        </span>,
      ]}
      acoes={
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full">
          Voltar
        </button>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SecaoFicha titulo="Dados">
            <CampoFicha rotulo="id" valor={perfil.idUsuario} />
            <CampoFicha rotulo="CPF" valor={formatarCpf(perfil.cpf)} />
            <CampoFicha rotulo="Vínculo institucional" valor={perfil.vinculoInstitucional ?? '-'} />
            <CampoFicha rotulo="Ativado em" valor={formatarDataHora(perfil.ativadoEm)} />
          </SecaoFicha>
        </div>

        <div className="space-y-6">
          <SecaoFicha titulo="Score (Serasa do Pesquisador)">
            {score ? (
              <>
                <CampoFicha rotulo="Pontuação" largura="cheia" valor={`${score.scoreTotal} - ${score.rotulo}`} />
                {score.dimensoes.map((dimensao) => (
                  <CampoFicha
                    key={dimensao.nomeDimensao}
                    largura="cheia"
                    rotulo={formatarNomeDimensao(dimensao.nomeDimensao)}
                    valor={`${dimensao.pontosObtidos} pts (peso ${dimensao.peso})`}
                  />
                ))}
              </>
            ) : (
              <CampoFicha rotulo="Pontuação" largura="cheia" valor="Não disponível" />
            )}
          </SecaoFicha>
        </div>
      </div>
    </FichaConsulta>
  );
}
