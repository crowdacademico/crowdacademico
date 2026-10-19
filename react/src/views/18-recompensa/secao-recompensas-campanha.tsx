import { useEffect, useState } from 'react';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { Campo } from '../../components/input/campo';
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
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { RecompensaResponse } from '../../services/18-recompensa/type/recompensa.type';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';
import type { TipoRecompensa } from '../../services/constant/type/enums-do-banco.gerado';

interface SecaoRecompensasCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Dono da campanha (Alterar): cria, desativa e reativa. Quem só lê (Consultar): vê a lista.
  podeGerenciar: boolean;
}

interface FormRecompensa {
  titulo: string;
  tipo: TipoRecompensa;
  valorMinimo: string;
  descricao: string;
  idTipoLink: string;
  url: string;
}

const FORM_VAZIO: FormRecompensa = { titulo: '', tipo: ORDEM_TIPO_RECOMPENSA[0], valorMinimo: '', descricao: '', idTipoLink: '', url: '' };

// Recompensas simbólicas da campanha (RF-099 a RF-101): reconhecimento, acesso antecipado ou um conteúdo digital, cada
// uma a partir de um valor de contribuição. Sem estoque e sem entrega. O link especial só aparece para o dono, o admin e
// quem ganhou a recompensa (o banco esconde dos outros). Escolher a recompensa é na hora de contribuir (área pública).
export function SecaoRecompensasCampanha({ auth, idCampanha, podeGerenciar }: SecaoRecompensasCampanhaProps) {
  const [recompensas, setRecompensas] = useState<RecompensaResponse[] | null>(null);
  const [tiposLink, setTiposLink] = useState<TipoLinkResponse[]>([]);
  const [form, setForm] = useState<FormRecompensa>(FORM_VAZIO);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro);

  const erros = useErrosFormulario(() => ({
    titulo: form.titulo.trim() === '' && 'Informe o título.',
    valorMinimo: !(Number(form.valorMinimo) > 0) && 'Informe um valor mínimo maior que zero.',
    url: form.url.trim() !== '' && form.idTipoLink === '' && 'Escolha o tipo do link.',
  }));

  useEffect(() => {
    recompensaApi.listar(auth.authFetch, idCampanha).then(setRecompensas).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha, chaveRecarga]);

  useEffect(() => {
    if (podeGerenciar) {
      tipoLinkApi.listar(auth.authFetch, { ativo: true, escopo: 'recompensa' }).then(setTiposLink).catch(reportarErro);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, podeGerenciar]);

  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  const criar = async () => {
    if (!erros.tentarEnviar()) return;
    await executar(async () => {
      await recompensaApi.criar(auth.authFetch, {
        idCampanha,
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        valorMinimo: Number(form.valorMinimo),
        descricao: form.descricao.trim() || undefined,
        link: form.url.trim() ? { idTipoLink: Number(form.idTipoLink), url: form.url.trim() } : undefined,
      });
      mostrar('Recompensa criada.', 'Ela aparece para quem for apoiar a campanha.');
      setForm(FORM_VAZIO);
      erros.limpar();
      recarregar();
    });
  };

  const alternarAtivo = async (item: RecompensaResponse) => {
    await executar(async () => {
      await recompensaApi.alterar(auth.authFetch, item.idRecompensa, { ativo: !item.ativo });
      mostrar(item.ativo ? 'Recompensa desativada.' : 'Recompensa ativa de novo.');
      recarregar();
    });
  };

  const removerLink = async (idLink: number) => {
    await executar(async () => {
      await recompensaApi.removerLink(auth.authFetch, idLink);
      mostrar('Link removido.');
      recarregar();
    });
  };

  if (recompensas === null) {
    return null;
  }
  const visiveis = podeGerenciar ? recompensas : recompensas.filter((r) => r.ativo);

  return (
    <SecaoFicha titulo={`Recompensas (${visiveis.length})`} colunas={1}>
      {podeGerenciar && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo rotulo="Título" erro={erros.erroDe('titulo')}>
              {({ atributos, classeErro }) => (
                <input
                  {...atributos}
                  type="text"
                  maxLength={150}
                  value={form.titulo}
                  onChange={(evento) => setForm({ ...form, titulo: evento.target.value })}
                  className={'input-padrao' + classeErro}
                />
              )}
            </Campo>
            <Campo rotulo="A partir de (R$)" erro={erros.erroDe('valorMinimo')}>
              {({ atributos, classeErro }) => (
                <input
                  {...atributos}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.valorMinimo}
                  onChange={(evento) => setForm({ ...form, valorMinimo: evento.target.value })}
                  className={'input-padrao' + classeErro}
                />
              )}
            </Campo>
          </div>
          <Campo rotulo="Tipo" dica={EXEMPLO_TIPO_RECOMPENSA[form.tipo]}>
            {({ atributos }) => (
              <select
                {...atributos}
                value={form.tipo}
                onChange={(evento) => setForm({ ...form, tipo: evento.target.value as TipoRecompensa })}
                className="input-padrao"
              >
                {ORDEM_TIPO_RECOMPENSA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ROTULO_TIPO_RECOMPENSA[tipo]}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Descrição (opcional)">
            {({ atributos }) => (
              <textarea
                {...atributos}
                rows={2}
                value={form.descricao}
                onChange={(evento) => setForm({ ...form, descricao: evento.target.value })}
                className="input-padrao"
              />
            )}
          </Campo>
          <div className="grid sm:grid-cols-3 gap-3">
            <Campo rotulo="Tipo do link (opcional)" erro={erros.erroDe('url')}>
              {({ atributos, classeErro }) => (
                <select
                  {...atributos}
                  value={form.idTipoLink}
                  onChange={(evento) => setForm({ ...form, idTipoLink: evento.target.value })}
                  className={'input-padrao' + classeErro}
                >
                  <option value="">Sem link</option>
                  {tiposLink.map((tipo) => (
                    <option key={tipo.idTipolink} value={tipo.idTipolink}>
                      {tipo.nome}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <div className="sm:col-span-2">
              <Campo rotulo="Link especial (só quem ganhar vê)">
                {({ atributos }) => (
                  <input
                    {...atributos}
                    type="url"
                    maxLength={500}
                    value={form.url}
                    onChange={(evento) => setForm({ ...form, url: evento.target.value })}
                    className="input-padrao"
                  />
                )}
              </Campo>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => void criar()} disabled={ocupado} className="btn btn-primary">
              {ocupado ? 'Salvando...' : 'Criar recompensa'}
            </button>
          </div>
        </div>
      )}

      {visiveis.length === 0 ? (
        <EstadoVazio
          compacto
          icone="fa-gift"
          titulo="Nenhuma recompensa ainda."
          texto={
            podeGerenciar
              ? 'Crie a primeira acima: um agradecimento simbólico para quem apoiar a pesquisa.'
              : 'Quando o pesquisador oferecer recompensas, elas aparecem aqui.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {visiveis.map((item) => (
            <li key={item.idRecompensa} className="cartao-painel p-4 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="enfase">
                  {item.titulo} <span className="texto-fraco">a partir de {formatarMoeda(item.valorMinimo)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="badge badge-neutro">{ROTULO_TIPO_RECOMPENSA[item.tipo]}</span>
                  {!item.ativo && <span className="badge badge-concluido">Desativada</span>}
                </span>
              </div>
              {item.descricao && <p className="paragrafo texto-fraco">{item.descricao}</p>}
              {item.links.map((link) => (
                <p key={link.idLinkRecompensa} className="paragrafo flex flex-wrap items-center gap-2">
                  <i className="fa-solid fa-link" aria-hidden="true"></i>
                  <a href={link.url} target="_blank" rel="noreferrer" className="link-texto break-all">
                    {link.url}
                  </a>
                  {podeGerenciar && (
                    <button type="button" className="dica texto-erro" disabled={ocupado} onClick={() => void removerLink(link.idLinkRecompensa)}>
                      tirar o link
                    </button>
                  )}
                </p>
              ))}
              {podeGerenciar && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="dica texto-fraco">Escolhida em {item.escolhidas} contribuição(ões) paga(s).</span>
                  <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => void alternarAtivo(item)}>
                    {item.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SecaoFicha>
  );
}
