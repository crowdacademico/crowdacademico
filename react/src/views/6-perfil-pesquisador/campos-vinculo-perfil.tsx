import { useId } from 'react';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';

const TIPOS_VINCULO: TipoVinculo[] = ['institucional', 'independente'];
const TITULOS_ACADEMICOS: TituloAcademico[] = ['graduado', 'especialista', 'mestre', 'doutor'];

function ehTipoVinculo(valor: string): valor is TipoVinculo {
  return valor === 'institucional' || valor === 'independente';
}

function ehTituloAcademico(valor: string): valor is TituloAcademico {
  return valor === 'graduado' || valor === 'especialista' || valor === 'mestre' || valor === 'doutor';
}

interface CamposVinculoPerfilProps {
  tipoVinculo: TipoVinculo;
  vinculoInstitucional: string;
  tituloAcademico: TituloAcademico;
  rotuloVinculoInstitucional: string;
  aoAlterarTipoVinculo: (tipo: TipoVinculo) => void;
  aoAlterarVinculoInstitucional: (valor: string) => void;
  aoAlterarTituloAcademico: (titulo: TituloAcademico) => void;
}

// Os 3 campos abaixo (tipo de vínculo, vínculo institucional condicional, título acadêmico) são idênticos em 3
// lugares (edição e criação dentro do modal de Usuário, e ModalUpgradePesquisador, o formulário de upgrade de
// perfil em T1): só o objeto de estado por trás muda. O rótulo do campo condicional é o único texto que varia
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
}: CamposVinculoPerfilProps) {
  const idTipoVinculo = useId();
  const idVinculoInstitucional = useId();
  const idTituloAcademico = useId();
  return (
    <>
      <div>
        <label htmlFor={idTipoVinculo} className="rotulo-campo">Tipo de vínculo</label>
        <select
          id={idTipoVinculo}
          value={tipoVinculo}
          onChange={(evento) => {
            if (ehTipoVinculo(evento.target.value)) {
              aoAlterarTipoVinculo(evento.target.value);
            }
          }}
          className="input-padrao"
        >
          {TIPOS_VINCULO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </div>

      {tipoVinculo === 'institucional' && (
        <div>
          <label htmlFor={idVinculoInstitucional} className="rotulo-campo">{rotuloVinculoInstitucional}</label>
          <input
            id={idVinculoInstitucional}
            type="text"
            value={vinculoInstitucional}
            onChange={(evento) => aoAlterarVinculoInstitucional(evento.target.value)}
            className="input-padrao"
          />
        </div>
      )}

      <div>
        <label htmlFor={idTituloAcademico} className="rotulo-campo">Título acadêmico</label>
        <select
          id={idTituloAcademico}
          value={tituloAcademico}
          onChange={(evento) => {
            if (ehTituloAcademico(evento.target.value)) {
              aoAlterarTituloAcademico(evento.target.value);
            }
          }}
          className="input-padrao"
        >
          {TITULOS_ACADEMICOS.map((titulo) => (
            <option key={titulo} value={titulo}>
              {titulo}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
