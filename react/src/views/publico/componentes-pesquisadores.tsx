import { Link } from 'react-router';
import { ROTULO_TIPO_VINCULO, ROTULO_TITULO_ACADEMICO } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

interface PropsCartaoPesquisador {
  perfil: PerfilPesquisadorResponse;
}

export function CartaoPesquisador({ perfil }: PropsCartaoPesquisador) {
  const nome = perfil.nome ?? 'Pesquisador da comunidade';
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toLocaleUpperCase('pt-BR');

  return (
    <article className="cartao-pesquisador">
      <Link className="cartao-pesquisador__perfil" to={`/pesquisador/${perfil.idUsuario}`} aria-label={`Conheça o perfil de ${nome}`}>
        {perfil.avatarUrl ? (
          <img className="cartao-pesquisador__avatar" src={perfil.avatarUrl} alt="" loading="lazy" />
        ) : (
          <span className="cartao-pesquisador__avatar cartao-pesquisador__avatar--iniciais" aria-hidden="true">
            {iniciais || 'P'}
          </span>
        )}
        <span className="cartao-pesquisador__identidade">
          <strong className="cartao-pesquisador__nome">{nome}</strong>
          <span className="cartao-pesquisador__titulo">{ROTULO_TITULO_ACADEMICO[perfil.tituloAcademico]}</span>
        </span>
      </Link>
      <div className="cartao-pesquisador__detalhes">
        <span className="cartao-pesquisador__vinculo">
          <i className={`fa-solid ${perfil.tipoVinculo === 'institucional' ? 'fa-building-columns' : 'fa-flask'}`} aria-hidden="true" />
          {perfil.tipoVinculo === 'institucional'
            ? perfil.vinculoInstitucional || 'Vínculo institucional'
            : ROTULO_TIPO_VINCULO.independente}
        </span>
        <span className="cartao-pesquisador__ativo">
          <span aria-hidden="true" /> Ativo
        </span>
      </div>
      <Link className="cartao-pesquisador__cta" to={`/pesquisador/${perfil.idUsuario}`}>
        Conhecer pesquisador <i className="fa-solid fa-arrow-right" aria-hidden="true" />
      </Link>
    </article>
  );
}
