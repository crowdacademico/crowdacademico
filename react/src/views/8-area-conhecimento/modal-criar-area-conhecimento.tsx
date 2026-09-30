import { useState } from 'react';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import {
  LIMITE_NOME_AREA_CONHECIMENTO,
  REGEX_CODIGO_CNPQ,
} from '../../services/8-area-conhecimento/constants/area-conhecimento.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { AreaConhecimentoResponse } from '../../services/8-area-conhecimento/type/area-conhecimento.type';

interface ModalCriarAreaConhecimentoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoCriado: (areaCriada: AreaConhecimentoResponse) => void;
}

// Criar em modal.
export function ModalCriarAreaConhecimento({ auth, aoFechar, aoCriado }: ModalCriarAreaConhecimentoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [codigoCnpq, setCodigoCnpq] = useState('');
  const [nome, setNome] = useState('');
  const [idPai, setIdPai] = useState('');

  // Combo "Grande área" só lista raízes de verdade (`raiz: true`): a mesma regra que
  // area-conhecimento.service.create.ts confere no INSERT já fica garantida por construção aqui.
  const { dado: grandesAreas, carregando: carregandoGrandesAreas } = useBuscar(
    () => areaConhecimentoApi.listar(auth.authFetch, { raiz: true, ativo: true }),
    [],
  );

  const codigoInvalido = codigoCnpq.length > 0 && !REGEX_CODIGO_CNPQ.test(codigoCnpq);

  // "Criar" fica sempre clicável: clicando com algo faltando, cada campo mostra o próprio erro. O formato do código
  // aparece enquanto se digita.
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    codigoCnpq: codigoCnpq.trim() === '' && 'Informe o código CNPq.',
    nome: nome.trim() === '' && 'Informe o nome.',
  }));

  const aoCriar = async () => {
    if (!tentarEnviar() || codigoInvalido) return;
    await executarEnviando(async () => {
      const areaCriada = await areaConhecimentoApi.criar(auth.authFetch, {
        codigoCnpq,
        nome,
        ...(idPai ? { idPai: Number(idPai) } : {}),
      });
      mostrar(
        'Área de conhecimento cadastrada com sucesso.',
        `A nova área possui o ID: ${areaCriada.idAreaConhecimento}`,
      );
      aoCriado(areaCriada);
      aoFechar();
    });
  };

  // Criar também pergunta antes de fechar com algo digitado, como o Alterar.
  const sujo = codigoCnpq !== '' || nome !== '' || idPai !== '';
  useAvisoAlteracaoNaoSalva(sujo);
  const fechar = () => {
    if (confirmarSaida(sujo)) aoFechar();
  };

  return (
    <ModalFicha
      titulo="Criar Área de Conhecimento"
      subtitulo="Preencha os dados abaixo para cadastrar uma nova área do conhecimento."
      aoFechar={fechar}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{
            rotulo: 'Criar',
            rotuloOcupado: 'Criando...',
            ocupado: enviando,
            aoClicar: () => void aoCriar(),
          }}
        />
      }
      erro={erro}
    >
      <Campo
        rotulo="Código CNPq"
        erro={
          codigoInvalido
            ? 'Precisa seguir o formato do CNPq: 4 níveis de 2 dígitos separados por ponto (ex.: "1.03.00.00").'
            : (erroDe('codigoCnpq') ?? errosCampo.codigoCnpq)
        }
        dica="Formato de classificação utilizado pelo CNPq: grande área.área.subárea.especialidade."
      >
        {({ atributos, classeErro }) => (
          <input
            {...atributos}
            type="text"
            value={codigoCnpq}
            onChange={(evento) => {
              setCodigoCnpq(evento.target.value);
              limparErroCampo('codigoCnpq');
            }}
            required
            placeholder="ex.: 1.03.00.00"
            className={'input-padrao font-mono' + classeErro}
          />
        )}
      </Campo>

      <Campo rotulo="Nome" erro={erroDe('nome') ?? errosCampo.nome}>
        {({ atributos, classeErro }) => (
          <input
            {...atributos}
            type="text"
            value={nome}
            onChange={(evento) => {
              setNome(evento.target.value);
              limparErroCampo('nome');
            }}
            required
            maxLength={LIMITE_NOME_AREA_CONHECIMENTO}
            className={'input-padrao' + classeErro}
          />
        )}
      </Campo>

      <Campo
        rotulo="Grande área (pai)"
        erro={errosCampo.idPai}
        dica="Deixe em branco pra cadastrar uma grande área nova; escolha uma existente pra cadastrar uma área filha dela (a hierarquia tem só 2 níveis)."
      >
        {({ atributos, classeErro }) => (
          <select
            {...atributos}
            value={idPai}
            onChange={(evento) => {
              setIdPai(evento.target.value);
              limparErroCampo('idPai');
              limparErroCampo('nome');
            }}
            disabled={carregandoGrandesAreas}
            className={'input-padrao' + classeErro}
          >
            <option value="">- Nenhuma (esta é uma grande área raiz) -</option>
            {(grandesAreas ?? []).map((area) => (
              <option key={area.idAreaConhecimento} value={area.idAreaConhecimento}>
                {area.nome}
              </option>
            ))}
          </select>
        )}
      </Campo>
    </ModalFicha>
  );
}
