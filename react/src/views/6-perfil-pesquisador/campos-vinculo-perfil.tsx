import { useEffect, useId, useState } from 'react';
import { Campo } from '../../components/input/campo';
import { listarInstituicoesSugeridas } from '../../services/6-perfil-pesquisador/api/instituicoes.api';
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
  // Quando o vínculo não é institucional, o campo fica no lugar, invisível, em vez de sumir: o título acadêmico não
  // pula para o lado (Alterar Usuário, grade de 3 colunas).
  reservarVinculoInstitucional?: boolean;
  // O "*" de obrigatório nos três campos (Campo): só nos formulários que marcam os obrigatórios.
  marcarObrigatorios?: boolean;
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
  reservarVinculoInstitucional = false,
  marcarObrigatorios = false,
}: CamposVinculoPerfilProps) {
  const institucional = tipoVinculo === 'institucional';
  // Sugestões da Instituição (21-11-2026): as já usadas por outros pesquisadores e uma lista inicial fixa, num <datalist>
  // nativo, que sugere enquanto a pessoa digita e continua aceitando texto livre.
  const idSugestoes = useId();
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  useEffect(() => {
    if (!institucional) return;
    let ativo = true;
    void listarInstituicoesSugeridas().then((lista) => {
      if (ativo) setSugestoes(lista);
    });
    return () => {
      ativo = false;
    };
  }, [institucional]);
  return (
    <>
      <Campo rotulo="Tipo de vínculo" obrigatorio={marcarObrigatorios}>
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

      {(institucional || reservarVinculoInstitucional) && (
        <div className={institucional ? undefined : 'invisible'} inert={!institucional} aria-hidden={!institucional || undefined}>
          <Campo rotulo={rotuloVinculoInstitucional} erro={erroVinculoInstitucional} obrigatorio={marcarObrigatorios}>
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type="text"
                list={idSugestoes}
                autoComplete="off"
                placeholder="Comece a digitar para ver sugestões"
                value={vinculoInstitucional}
                onChange={(evento) => aoAlterarVinculoInstitucional(evento.target.value)}
                className={'input-padrao' + classeErro}
              />
            )}
          </Campo>
          <datalist id={idSugestoes}>
            {sugestoes.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
        </div>
      )}

      <Campo rotulo="Título acadêmico" obrigatorio={marcarObrigatorios}>
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
