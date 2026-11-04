import { useEffect, useState } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useFecharComAviso } from '../../components/crud/use-alteracao-nao-salva';
import { Campo } from '../../components/input/campo';
import { InputDinheiro } from '../../components/input/input-dinheiro';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import {
  EXEMPLO_TIPO_RECOMPENSA,
  ORDEM_TIPO_RECOMPENSA,
  ROTULO_TIPO_RECOMPENSA,
} from '../../services/18-recompensa/constants/recompensa.constants';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { RecompensaResponse } from '../../services/18-recompensa/type/recompensa.type';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';
import type { TipoRecompensa } from '../../services/constant/type/enums-do-banco.gerado';

interface ModalRecompensaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Sem ela: criar uma nova. Com ela: alterar.
  recompensa?: RecompensaResponse;
  aoFechar: () => void;
  aoSalva: () => void;
}

// Acesso antecipado e entrega digital chegam a quem apoiou pelo link especial, que é obrigatório nos dois (o banco
// recusa sem ele, 91057). Reconhecimento é o nome de quem apoiou num agradecimento: não tem o que entregar por link.
const tipoUsaLink = (tipo: TipoRecompensa) => tipo !== 'reconhecimento';

// Criar ou alterar uma recompensa simbólica (RF-103, RF-104), num modal por cima do Alterar da campanha. Depois de
// escolhida numa contribuição paga, o valor e o tipo não mudam mais: quem apoiou escolheu por eles (o padrão do Catarse e
// do Kickstarter). Trocar o link vai junto no mesmo pedido, para o link nunca faltar no meio da troca.
export function ModalRecompensa({ auth, idCampanha, recompensa, aoFechar, aoSalva }: ModalRecompensaProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const linkAtual = recompensa?.links[0] ?? null;
  const travada = (recompensa?.escolhidas ?? 0) > 0;
  const [titulo, setTitulo] = useState(recompensa?.titulo ?? '');
  const [valorMinimo, setValorMinimo] = useState(recompensa ? String(recompensa.valorMinimo) : '');
  const [tipo, setTipo] = useState<TipoRecompensa>(recompensa?.tipo ?? ORDEM_TIPO_RECOMPENSA[0]);
  const [descricao, setDescricao] = useState(recompensa?.descricao ?? '');
  const [idTipoLink, setIdTipoLink] = useState(linkAtual ? String(linkAtual.idTipoLink) : '');
  const [url, setUrl] = useState(linkAtual?.url ?? '');
  const [tiposLink, setTiposLink] = useState<TipoLinkResponse[]>([]);
  const precisaLink = tipoUsaLink(tipo);

  useEffect(() => {
    tipoLinkApi.listar(auth.authFetch, { ativo: true, escopo: 'recompensa' }).then(setTiposLink).catch(reportarErro);
  }, [auth.authFetch, reportarErro]);

  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    titulo: titulo.trim() === '' && 'Informe o título.',
    valorMinimo: !(Number(valorMinimo) > 0) && 'Informe um valor mínimo maior que zero.',
    idTipoLink: precisaLink && idTipoLink === '' && 'Escolha o tipo do link.',
    url: precisaLink && url.trim() === '' && 'Cole o link: é por ele que a recompensa chega a quem apoiou.',
  }));

  const salvar = async () => {
    if (!tentarEnviar()) return;
    const link = precisaLink ? { idTipoLink: Number(idTipoLink), url: url.trim() } : undefined;
    await executar(async () => {
      if (recompensa) {
        const linkMudou = link !== undefined && (linkAtual === null || link.url !== linkAtual.url || link.idTipoLink !== linkAtual.idTipoLink);
        await recompensaApi.alterar(auth.authFetch, recompensa.idRecompensa, {
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          ...(travada ? {} : { valorMinimo: Number(valorMinimo), tipo }),
          ...(linkMudou ? { link } : {}),
        });
        // Virou Reconhecimento: o link que sobrou não entrega nada.
        if (!precisaLink && linkAtual) {
          await recompensaApi.removerLink(auth.authFetch, linkAtual.idLinkRecompensa);
        }
        mostrar('Recompensa alterada.');
      } else {
        await recompensaApi.criar(auth.authFetch, {
          idCampanha,
          titulo: titulo.trim(),
          tipo,
          valorMinimo: Number(valorMinimo),
          descricao: descricao.trim() || undefined,
          link,
        });
        mostrar('Recompensa criada.', 'Ela aparece para quem for apoiar a campanha.');
      }
      aoSalva();
      aoFechar();
    });
  };

  const sujo = recompensa
    ? titulo !== recompensa.titulo ||
      Number(valorMinimo) !== recompensa.valorMinimo ||
      tipo !== recompensa.tipo ||
      descricao !== (recompensa.descricao ?? '') ||
      url !== (linkAtual?.url ?? '') ||
      idTipoLink !== (linkAtual ? String(linkAtual.idTipoLink) : '')
    : titulo !== '' || valorMinimo !== '' || descricao !== '' || url !== '';
  const fechar = useFecharComAviso(sujo, aoFechar);

  return (
    <ModalFicha
      titulo={recompensa ? 'Alterar Recompensa' : 'Nova Recompensa'}
      subtitulo={recompensa?.titulo}
      aoFechar={fechar}
      erro={erro}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{ rotulo: recompensa ? 'Salvar' : 'Criar', rotuloOcupado: 'Salvando...', ocupado, aoClicar: () => void salvar() }}
        />
      }
    >
      <SecaoFicha titulo="Recompensa">
        <Campo rotulo="Título" erro={erroDe('titulo')}>
          {({ atributos, classeErro }) => (
            <input
              {...atributos}
              type="text"
              maxLength={150}
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              className={'input-padrao' + classeErro}
            />
          )}
        </Campo>
        <Campo
          rotulo="A partir de"
          erro={erroDe('valorMinimo')}
          dica={travada ? `Já escolhida em ${recompensa?.escolhidas} contribuição(ões): o valor e o tipo não mudam mais.` : undefined}
        >
          {({ atributos, classeErro }) => (
            <InputDinheiro {...atributos} valor={valorMinimo} aoMudar={setValorMinimo} disabled={travada} className={'input-padrao' + classeErro} />
          )}
        </Campo>
        <Campo rotulo="Tipo" dica={EXEMPLO_TIPO_RECOMPENSA[tipo]} className="sm:col-span-2">
          {({ atributos }) => (
            <select
              {...atributos}
              value={tipo}
              disabled={travada}
              onChange={(evento) => setTipo(evento.target.value as TipoRecompensa)}
              className="input-padrao"
            >
              {ORDEM_TIPO_RECOMPENSA.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {ROTULO_TIPO_RECOMPENSA[opcao]}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo rotulo="Descrição (opcional)" className="sm:col-span-2">
          {({ atributos }) => (
            <textarea {...atributos} rows={2} value={descricao} onChange={(evento) => setDescricao(evento.target.value)} className="input-padrao" />
          )}
        </Campo>
      </SecaoFicha>

      {precisaLink && (
        <SecaoFicha titulo="Link especial (só quem ganhar vê)">
          {tiposLink.length === 0 ? (
            <p className="legenda enfase texto-erro sm:col-span-2">Nenhum tipo de link liberado para recompensa. O admin libera em Tipos de Link.</p>
          ) : (
            <>
              <Campo rotulo="Tipo do link" erro={erroDe('idTipoLink')}>
                {({ atributos, classeErro }) => (
                  <select {...atributos} value={idTipoLink} onChange={(evento) => setIdTipoLink(evento.target.value)} className={'input-padrao' + classeErro}>
                    <option value="">Escolha</option>
                    {tiposLink.map((opcao) => (
                      <option key={opcao.idTipolink} value={opcao.idTipolink}>
                        {opcao.nome}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>
              <Campo rotulo="Endereço do link" erro={erroDe('url')}>
                {({ atributos, classeErro }) => (
                  <input
                    {...atributos}
                    type="url"
                    maxLength={500}
                    value={url}
                    onChange={(evento) => setUrl(evento.target.value)}
                    className={'input-padrao' + classeErro}
                  />
                )}
              </Campo>
            </>
          )}
        </SecaoFicha>
      )}
    </ModalFicha>
  );
}
