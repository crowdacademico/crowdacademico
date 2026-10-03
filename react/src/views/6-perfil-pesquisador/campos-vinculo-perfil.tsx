import { Campo } from '../../components/input/campo';
import {
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';

// As listas de opções e as guardas saem dos mapas de rótulo (lista única de cada ENUM no React).
const ehTipoVinculo = (valor: string): valor is TipoVinculo => Object.hasOwn(ROTULO_TIPO_VINCULO, valor);
const ehTituloAcademico = (valor: string): valor is TituloAcademico => Object.hasOwn(ROTULO_TITULO_ACADEMICO, valor);

interface CamposVinculoPerfilProps {
  tipoVinculo: TipoVinculo;
  vinculoInstitucional: string;
  tituloAcademico: TituloAcademico;
  rotuloVinculoInstitucional: string;
  aoAlterarTipoVinculo: (tipo: TipoVinculo) => void;
  aoAlterarVinculoInstitucional: (valor: string) => void;
  aoAlterarTituloAcademico: (titulo: TituloAcademico) => void;
  erroVinculoInstitucional?: string;
}

// Os 3 campos abaixo (tipo de vínculo, vínculo institucional condicional, título acadêmico) são idênticos em 3
// lugares (edição e criação dentro do modal de Usuário, e ModalUpgradePesquisador, o formulário de upgrade de
// perfil na Bancada do Pesquisador): só o objeto de estado por trás muda. O rótulo do campo condicional é o único texto que varia
// entre os consumidores ("Vínculo institucional" na edição admin, "Instituição" na criação admin/upgrade de
// perfil), por isso vem como prop, preservando o texto exato de cada lugar.
export function CamposVinculoPerfil({
  tipoVinculo,
  vinculoInstitucional,
  tituloAcademico,
  rotuloVinculoInstitucional,
  aoAlterarTipoVinculo,
  aoAlterarVinculoInstitucional,
  aoAlterarTituloAcademico,
  erroVinculoInstitucional,
}: CamposVinculoPerfilProps) {
  return (
    <>
      <Campo rotulo="Tipo de vínculo">
        {({ atributos }) => (
          <select
            {...atributos}
            value={tipoVinculo}
            onChange={(evento) => {
              if (ehTipoVinculo(evento.target.value)) aoAlterarTipoVinculo(evento.target.value);
            }}
            className="input-padrao"
          >
            {Object.entries(ROTULO_TIPO_VINCULO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        )}
      </Campo>

      {tipoVinculo === 'institucional' && (
        <Campo rotulo={rotuloVinculoInstitucional} erro={erroVinculoInstitucional}>
          {({ atributos, classeErro }) => (
            <input
              {...atributos}
              type="text"
              value={vinculoInstitucional}
              onChange={(evento) => aoAlterarVinculoInstitucional(evento.target.value)}
              className={'input-padrao' + classeErro}
            />
          )}
        </Campo>
      )}

      <Campo rotulo="Título acadêmico">
        {({ atributos }) => (
          <select
            {...atributos}
            value={tituloAcademico}
            onChange={(evento) => {
              if (ehTituloAcademico(evento.target.value)) aoAlterarTituloAcademico(evento.target.value);
            }}
            className="input-padrao"
          >
            {Object.entries(ROTULO_TITULO_ACADEMICO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        )}
      </Campo>
    </>
  );
}
