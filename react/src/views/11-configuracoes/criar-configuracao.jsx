import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';

// Convenção de chave (10-08-2026, rodada Claude Web "embelezar o painel",
// item 6: "o Lucas não entendeu como usar") — minúsculas, número e
// underscore, sem espaço nem acento. Mesma convenção que TODAS as chaves
// já cadastradas no seed seguem (07_seed_dados.sql), só nunca tinha virado
// validação de verdade no front — antes aceitava qualquer texto livre.
const REGEX_CHAVE_VALIDA = /^[a-z0-9_]+$/;

// Antes era um formulário embutido no fim da tabela de Configurações
// (GenericTable). Virou view própria (pedido do Lucas, 02-08-2026),
// seguindo o mesmo padrão de views/1-usuario/criar-usuario.jsx.
export function CriarConfiguracao({ auth }) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [chave, setChave] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Só valida depois que a pessoa digitou alguma coisa — chave vazia não
  // é "inválida", é só "ainda não preenchida" (o `required` do <input> já
  // cuida de bloquear o envio vazio, não precisa duplicar essa mensagem).
  const chaveInvalida = chave.length > 0 && !REGEX_CHAVE_VALIDA.test(chave);

  const aoCriar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      // Decimal aceita vírgula na digitação (convenção pt-BR, pedido do
      // Lucas) — convertida pra ponto só aqui, na hora de enviar: o banco
      // lê essa string com `::DECIMAL` (config_numero(), 03_funcoes_
      // seguranca.sql), que exige notação SQL padrão (ponto), não aceita
      // vírgula.
      const valorParaEnviar = tipo === 'decimal' ? valor.replace(',', '.') : valor;
      const configuracaoCriada = await configuracaoApi.criar(auth.authFetch, {
        chave,
        valor: valorParaEnviar,
        tipo,
        descricao,
      });
      mostrar(
        'Parâmetro cadastrado com sucesso.',
        `O novo parâmetro possui o ID: ${configuracaoCriada.idConfig}`,
      );
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-gear"
      titulo="Criar Parâmetro"
      subtitulo="Preencha os dados abaixo para cadastrar um novo parâmetro."
    >
      <form onSubmit={aoCriar} className="p-10 space-y-6">
        {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

        {/* Aviso honesto (10-08-2026, item 6) — a confusão do Lucas era
            achar que criar uma chave pelo painel já faz o sistema passar a
            usá-la. Não faz: só tem efeito se algum código já consultar
            essa chave específica (`obterConfiguracao('chave', padrao)`
            ou `config_numero()`). */}
        <div className="flex items-start gap-2 rounded-lg fundo-info texto-info p-3">
          <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
          <p className="text-xs">
            Criar uma chave nova aqui não faz o sistema passar a usá-la sozinho — só tem
            efeito se algum código já consultar essa chave específica. Serve pra ajustar um
            valor que já é lido de algum lugar (taxa, limite, prazo), não pra criar
            comportamento novo.
          </p>
        </div>

        <div>
          <label className="rotulo-campo">Chave</label>
          <input
            type="text"
            value={chave}
            onChange={(evento) => setChave(evento.target.value)}
            required
            placeholder="ex.: limite_campanhas_simultaneas"
            aria-invalid={chaveInvalida}
            className={'input-padrao font-mono' + (chaveInvalida ? ' border-red-500' : '')}
          />
          {chaveInvalida ? (
            <p className="text-xs text-red-600 font-semibold mt-1">
              Só letras minúsculas, números e underscore — sem espaço, maiúscula ou acento.
            </p>
          ) : (
            <p className="text-xs texto-fraco mt-1">
              Minúsculas, números e underscore (_), sem espaço nem acento.
            </p>
          )}
        </div>

        <div>
          <label className="rotulo-campo">Tipo</label>
          <select
            value={tipo}
            onChange={(evento) => {
              setTipo(evento.target.value);
              setValor('');
            }}
            required
            className="input-padrao"
          >
            <option value="" disabled>
              Selecione...
            </option>
            <option value="decimal">Decimal</option>
            <option value="inteiro">Inteiro</option>
            <option value="texto">Texto</option>
            <option value="booleano">Booleano</option>
          </select>
        </div>

        {/* Campo Valor muda de cara conforme o Tipo (10-08-2026, item 6:
            "remove a sensação de 'não sei o que digitar'") — booleano vira
            toggle (nunca deixa digitar "sim"/"verdadeiro"/"1" por engano),
            inteiro vira number sem casa decimal, decimal aceita vírgula
            (convertida pra ponto só no envio, ver aoCriar). Sem tipo
            escolhido ainda, fica desabilitado — não faz sentido digitar
            um valor sem saber que formato ele deveria ter. */}
        <div>
          <label className="rotulo-campo">Valor</label>
          {tipo === 'booleano' ? (
            <button
              type="button"
              role="switch"
              aria-checked={valor === 'true'}
              onClick={() => setValor(valor === 'true' ? 'false' : 'true')}
              className={
                'w-14 h-8 rounded-full relative transition-colors shrink-0 ' +
                (valor === 'true' ? 'bg-primary' : 'fundo-sutil border borda-forte')
              }
            >
              <span
                className={
                  'absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ' +
                  (valor === 'true' ? 'translate-x-7' : 'translate-x-1')
                }
              ></span>
            </button>
          ) : tipo === 'inteiro' ? (
            <input
              type="number"
              step="1"
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
              placeholder="ex.: 5"
              className="input-padrao"
            />
          ) : tipo === 'decimal' ? (
            <>
              <input
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(evento) => setValor(evento.target.value)}
                placeholder="ex.: 12,5"
                className="input-padrao"
              />
              <p className="text-xs texto-fraco mt-1">Use vírgula como separador decimal.</p>
            </>
          ) : (
            <input
              type="text"
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
              disabled={tipo === ''}
              placeholder={tipo === '' ? 'Escolha o tipo primeiro' : undefined}
              className="input-padrao disabled:opacity-60 disabled:cursor-not-allowed"
            />
          )}
        </div>

        <div>
          <label className="rotulo-campo">Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            className="input-padrao"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando || chaveInvalida}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>
    </CartaoFormulario>
  );
}
