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

function formatarData(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR') : 'Não definida';
}

function formatarCpf(cpf) {
  if (!cpf) return 'Não visível (sem permissão sensível ou não é o dono)';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// `nomeDimensao` vem cru do banco (snake_case, ex.: "atualizacao_campanha")
// - sem isso o rótulo colidia com o valor ao lado no grid de 2 colunas
// (CampoFicha), texto comprido demais pra largura da célula.
function formatarNomeDimensao(nome) {
  return nome
    .split('_')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

export function ConsultarPesquisador({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [score, setScore] = useState(null);
  const [nomeUsuario, setNomeUsuario] = useState(null);
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
            <CampoFicha rotulo="Ativado em" valor={formatarData(perfil.ativadoEm)} />
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
