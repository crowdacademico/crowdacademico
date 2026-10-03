import { useState } from 'react';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { ResumoAlteracoes } from '../../components/crud/resumo-alteracoes';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Campo } from '../../components/input/campo';
import {
  papelApi,
  papelPermissaoApi,
  usuarioPapelApi,
} from '../../services/2-papel-permissao/api/papel-permissao.api';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { PapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';

interface ModalAlterarPapelProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  papel: PapelResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

// Alterar em modal. Recebe a linha (`papel: PapelResponse`) inteira do chamador, mesmo motivo de
// modal-motivo-denuncia.tsx: elimina o "busca a lista inteira e filtra pelo id" (não existe `GET /papel/:id`).
//
// Só "nome" é editável (`codigo`, ver 01_extensoes_enums_tabelas.sql [01-B], nunca é exposto/editável: as
// triggers de RBAC leem `codigo`, não `nome`, então renomear é seguro). Consultar/Excluir têm modal próprio
// (ver modal-papel.tsx): Consultar mostra as permissões do papel; Excluir é só explicativo, nunca executa (ver
// comentário completo em modal-papel.tsx sobre o ON DELETE CASCADE).
export function ModalAlterarPapel({ auth, papel, aoFechar, aoAtualizado }: ModalAlterarPapelProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [nome, setNome] = useState(papel.nome);

  // Quantos usuários e permissões o papel tem: aparecem no cabeçalho, para quem renomeia saber o alcance.
  const { dado: alcance } = useBuscar(
    () =>
      Promise.all([usuarioPapelApi.listarTudo(auth.authFetch), papelPermissaoApi.listar(auth.authFetch)]).then(
        ([vinculos, permissoes]) => ({
          pessoas: new Set(vinculos.filter((v) => v.idPapel === papel.idPapel).map((v) => v.idUsuario)).size,
          permissoes: permissoes.filter((p) => p.idPapel === papel.idPapel).length,
        }),
      ),
    [papel.idPapel],
  );

  const sujo = nome !== papel.nome;
  useAvisoAlteracaoNaoSalva(sujo);

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  // "Salvar" só espera haver alteração; com o campo obrigatório apagado, o erro aparece embaixo dele.
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({ nome: nome.trim() === '' && 'Informe o nome.' }));

  const aoSalvar = async () => {
    if (!tentarEnviar()) return;
    await executarEnviando(async () => {
      await papelApi.atualizar(auth.authFetch, papel.idPapel, { nome });
      mostrar('Papel alterado com sucesso.', `ID: ${papel.idPapel} foi alterado`);
      aoAtualizado();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Alterar "${papel.nome}"`}
      subtitulo="Só o nome exibido muda, o identificador interno usado pelas regras do sistema nunca é afetado."
      carregando={!alcance}
      badges={
        alcance ? [
          <span key="pessoas" className="badge badge-neutro">
            {alcance.pessoas} {alcance.pessoas === 1 ? 'usuário' : 'usuários'}
          </span>,
          <span key="permissoes" className="badge badge-neutro">
            {alcance.permissoes} {alcance.permissoes === 1 ? 'permissão' : 'permissões'}
          </span>,
        ] : undefined
      }
      aoFechar={fechar}
      rodape={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResumoAlteracoes mudancas={sujo ? ['nome'] : []} />
          <div className="flex-1">
            <RodapeAcoes
              aoCancelar={fechar}
              acao={{
                rotulo: 'Salvar',
                rotuloOcupado: 'Salvando...',
                ocupado: enviando,
                desabilitado: !sujo,
                aoClicar: () => void aoSalvar(),
              }}
            />
          </div>
        </div>
      }
      erro={erro}
    >
      <CampoSomenteLeitura rotulo="id" valor={papel.idPapel} />

      <Campo rotulo="Nome" erro={erroDe('nome') ?? errosCampo.nome}>
        {({ atributos }) => (
          <input
            {...atributos}
            type="text"
            value={nome}
            onChange={(evento) => {
              setNome(evento.target.value);
              limparErroCampo('nome');
            }}
            required
            maxLength={50}
            className="input-padrao"
          />
        )}
      </Campo>

      {/* Prévia: é assim que o papel aparece no cabeçalho das fichas de quem o tem. */}
      <div className="space-y-1.5">
        <p className="legenda-destaque texto-fraco">Como aparece nas fichas</p>
        <div className="paragrafo flex flex-wrap items-center gap-2 texto-herdado">
          {sujo && (
            <>
              <span className="badge badge-neutro line-through opacity-60">{papel.nome}</span>
              <i className="fa-solid fa-arrow-right texto-fraco icone-pequeno" aria-hidden="true"></i>
            </>
          )}
          <span className="badge badge-neutro">{nome.trim() || 'sem nome'}</span>
        </div>
      </div>
    </ModalFicha>
  );
}
