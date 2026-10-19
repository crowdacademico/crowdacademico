import { useEffect, useState } from 'react';
import { BadgeStatusContribuicao } from '../../components/crud/badge-status-contribuicao';
import { BarraProgresso } from '../../components/crud/barra-progresso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { formatarDataHora, formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { StatusContribuicao } from '../../services/constant/type/enums-do-banco.gerado';

// O que o Consultar precisa de uma contribuição: serve à linha da T5 (bancada de pagamento) e à da Minha Conta.
export interface ContribuicaoConsultada {
  idContribuicao: number;
  idCampanha: number;
  valor: number;
  taxaPagamento: number;
  status: StatusContribuicao;
  criadoEm: string;
  idRepasse: number | null;
}

interface SecaoCampanhaDaContribuicaoProps {
  campanha: CampanhaResponse;
  status: StatusContribuicao;
  criadoEm: string;
  // O que dizer ao lado da situação "pendente" (a T5 aponta o botão Pagar dela).
  dicaPendente?: string;
}

// A campanha da contribuição e a situação dela, igual no "Contribuir" da T5 (logo depois de criar) e em todo Consultar:
// título, meta, arrecadado até agora com a barra, situação e a data e hora exatas (com segundos) em que foi criada.
export function SecaoCampanhaDaContribuicao({ campanha, status, criadoEm, dicaPendente }: SecaoCampanhaDaContribuicaoProps) {
  return (
    <SecaoFicha titulo="Campanha">
      <CampoFicha rotulo="Campanha" largura="cheia" valor={`#${campanha.idCampanha} ${campanha.titulo}`} />
      <CampoFicha rotulo="Meta" valor={formatarMoeda(campanha.metaFinanceira)} />
      <CampoFicha
        rotulo="Arrecadado até agora"
        valor={
          <span className="block space-y-1.5">
            <span className="block">{formatarMoeda(campanha.valorBrutoArrecadado)}</span>
            <BarraProgresso valor={campanha.valorBrutoArrecadado} total={campanha.metaFinanceira} rotulo="Arrecadado em relação à meta" />
          </span>
        }
      />
      <CampoFicha
        rotulo="Situação da contribuição"
        largura="cheia"
        valor={
          <span className="flex flex-wrap items-center gap-2">
            <BadgeStatusContribuicao status={status} />
            {status === 'pendente' && dicaPendente && <span className="texto-fraco">{dicaPendente}</span>}
          </span>
        }
      />
      <CampoFicha rotulo="Criada em" valor={formatarDataHora(criadoEm)} />
    </SecaoFicha>
  );
}

interface ModalConsultarContribuicaoProps {
  authFetch: AuthFetch;
  contribuicao: ContribuicaoConsultada;
  rotuloMeio: string;
  aoFechar: () => void;
  dicaPendente?: string;
}

// Consultar uma contribuição (T5 e Minha Conta, aba Contribuições): a campanha lida de novo (arrecadado e meta de agora)
// e o que a pessoa pagou. Campanha que a conta não pode mais ver (encerrada pela moderação, por exemplo) não impede a
// ficha: só a parte da campanha fica de fora. O código Pix, o link do cartão e o boleto só aparecem no momento de
// contribuir: o sistema não os guarda.
export function ModalConsultarContribuicao({ authFetch, contribuicao, rotuloMeio, aoFechar, dicaPendente }: ModalConsultarContribuicaoProps) {
  const [campanha, setCampanha] = useState<CampanhaResponse | null | 'indisponivel'>(null);

  useEffect(() => {
    campanhaApi
      .buscar(authFetch, String(contribuicao.idCampanha))
      .then(setCampanha)
      .catch(() => setCampanha('indisponivel'));
  }, [authFetch, contribuicao.idCampanha]);

  return (
    <ModalFicha
      titulo={`Contribuição #${contribuicao.idContribuicao}`}
      aoFechar={aoFechar}
      carregando={campanha === null}
      rodape={<RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />}
    >
      {campanha !== null && campanha !== 'indisponivel' && (
        <SecaoCampanhaDaContribuicao campanha={campanha} status={contribuicao.status} criadoEm={contribuicao.criadoEm} dicaPendente={dicaPendente} />
      )}
      {campanha === 'indisponivel' && (
        <SecaoFicha titulo="Campanha">
          <CampoFicha rotulo="Campanha" largura="cheia" valor={`#${contribuicao.idCampanha} (não está mais visível)`} />
          <CampoFicha rotulo="Situação da contribuição" valor={<BadgeStatusContribuicao status={contribuicao.status} />} />
          <CampoFicha rotulo="Criada em" valor={formatarDataHora(contribuicao.criadoEm)} />
        </SecaoFicha>
      )}
      <SecaoFicha titulo="O que a pessoa paga">
        <CampoFicha rotulo="Contribuição" valor={formatarMoeda(contribuicao.valor)} />
        <CampoFicha rotulo="Tarifa do provedor" valor={formatarMoeda(contribuicao.taxaPagamento)} />
        <CampoFicha rotulo="Total cobrado" valor={formatarMoeda(contribuicao.valor + contribuicao.taxaPagamento)} />
        <CampoFicha rotulo="Meio de pagamento" valor={rotuloMeio} />
        <CampoFicha rotulo="Repasse" valor={contribuicao.idRepasse === null ? 'Ainda não' : `#${contribuicao.idRepasse}`} />
      </SecaoFicha>
    </ModalFicha>
  );
}
