export async function initJogo(app, caminhoJson = "scripts/cenarios.json") {
  let debugMode = true;

  let cenarios = {};
  let dicionario = {};
  let erros = {};
  let eventos = {};
  let interacoesGlobais = {};

  const listaItensNome = {
    chaveCabana: "Chave Antiga",
    chaveFenda: "Chave de Fenda",
    vodka: "Vodka Askov",
    cigarro: "Cigarros",
    isqueiro: "Isqueiro Chique",
    carne: "Carne Crua",
    papelCemiterio: "Anotações do Cemitério",
    papelIgreja: "Pedaço de Papel",
    grimorio: "Grimório",
    simbolo1: "Símbolo",
    simbolo2: "Símbolo",
    simbolo3: "Símbolo",
    nota10: "Nota de 10 Reais",
    agua: "Água Benta",
    rosario: "Rosário",
    caderno: "Caderno",
    certificado: "Certidão de Óbito",
    agulhaPrateada: "Agulha Prateada",
    agulhaPreta: "Agulha Preta",
    agulhaBranca: "Agulha Branca",
  };

  let regexDicionario = [];
  const regexCacheAliases = new Map();

  const removerAcentos = (texto) =>
    texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const normalizarTexto = (texto) =>
    removerAcentos(String(texto).toLowerCase())
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function obterListaSinonimos(canonico) {
    const lista = dicionario[canonico];
    if (Array.isArray(lista) && lista.length) return lista;
    return [canonico];
  }

  app.motorJogo = {
    termAtivo: null,

    iniciar: async function(term) {
      this.termAtivo = term;
      await rodarInicializacao();
    },

    processarComando: async function(comandoBruto, term) {
      this.termAtivo = term;
      term.pause();
      await processarComandoInterno(comandoBruto);
      term.resume();
    }
  };

  let erroCritico = null;
  
  try {
    const resposta = await fetch(caminhoJson);
    const dados = await resposta.json();
    cenarios = dados.cenarios || {};
    dicionario = dados.dicionario || {};
    erros = dados.erros || {};
    eventos = dados.eventos || {};
    interacoesGlobais = dados.interacoesGlobais || {};

    for (const canonico of Object.keys(dicionario)) {
      const sinonimosLimpos = obterListaSinonimos(canonico)
        .map(normalizarTexto)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

      for (const sinonimo of sinonimosLimpos) {
        regexDicionario.push({
          canonico,
          sinonimo,
          regex: new RegExp(`(^|\\s)${escaparRegex(sinonimo)}(\\s|$)`),
        });
      }
    }
  } catch (erro) {
    console.error(`Erro ao carregar o arquivo ${caminhoJson}:`, erro);
    erroCritico = "Erro crítico: Falha ao carregar o banco de dados do cenário.";
  }

  let foiInicializado = false;
  let estadoAtual = "boot";

  let progresso = {
    inventario: [],
    descobertas: [],
    locaisVisitados: [],
    variaveis: {
      mortos: 0,
      estadoGarotaEscritorio: 1,
      puzzleTumulos: [],
      estadoPessoaBeco: 0,
      estadoLobisomem: 0,
    },
  };

  const textosIniciais = [
    "Inicializando ▮▮▮▮▮▮.OS...",
    "Sistema circulatório... OK.",
    "Sistemas Sensoriais... OK.",
    "Sistema Cognitivo... OK.",
    "Cenário ORVALHO DE KETER... ERRO CRITICO.",
    "O cenário não está completo, digite [COMEÇAR] para iniciar o reparo manual.",
  ];

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  function formatarTexto(template, valores = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, chave) => {
      return valores[chave] ?? "";
    });
  }

  function obterNomeExibicao(objeto, chaveFallback = "item") {
    if (!objeto) return chaveFallback;
    return objeto.nome || objeto.aliases?.[0] || chaveFallback;
  }

  function obterCenarioAtual() {
    return cenarios[estadoAtual] || null;
  }

  function obterRegexAlias(alias) {
    if (!regexCacheAliases.has(alias)) {
      regexCacheAliases.set(
        alias,
        new RegExp(`(^|\\s)${escaparRegex(alias)}(\\s|$)`),
      );
    }
    return regexCacheAliases.get(alias);
  }

  function localizarVerbo(comandoNormalizado) {
    const ordem = ["examinar", "pegar", "usar", "ir", "consumir", "sair"];
    const strComando = ` ${comandoNormalizado} `;

    for (const canonico of ordem) {
      const itens = regexDicionario.filter((i) => i.canonico === canonico);
      for (const item of itens) {
        if (item.regex.test(strComando)) {
          return { canonico: item.canonico, sinonimo: item.sinonimo };
        }
      }
    }
    return null;
  }

  function objetoEstaVisivel(objeto) {
    if (!objeto) return false;
    if (objeto.visivelSeDescoberta) {
      return progresso.descobertas.includes(objeto.visivelSeDescoberta);
    }
    return true;
  }

  function localizarObjeto(cenario, comandoNormalizado) {
    let melhor = null;
    const strComando = ` ${comandoNormalizado} `;

    if (cenario && cenario.interacoes) {
      for (const [chaveObjeto, objeto] of Object.entries(cenario.interacoes)) {
        if (!objetoEstaVisivel(objeto)) continue;
        const aliases = [chaveObjeto, ...(objeto.aliases || [])]
          .map(normalizarTexto)
          .filter(Boolean);

        for (const alias of aliases) {
          const regex = obterRegexAlias(alias);
          const resultado = regex.exec(strComando);
          if (!resultado) continue;
          const indice = resultado.index;
          const score = indice * 1000 - alias.length;

          if (!melhor || score < melhor.score) {
            melhor = { chaveObjeto, objeto, alias, score };
          }
        }
      }
    }

    if (interacoesGlobais) {
      for (const [chaveObjeto, objeto] of Object.entries(interacoesGlobais)) {
        if (!objetoEstaVisivel(objeto)) continue;
        const aliases = [chaveObjeto, ...(objeto.aliases || [])]
          .map(normalizarTexto)
          .filter(Boolean);

        for (const alias of aliases) {
          const regex = obterRegexAlias(alias);
          const resultado = regex.exec(strComando);
          if (!resultado) continue;
          const indice = resultado.index;
          const score = indice * 1000 - alias.length;

          if (!melhor || score < melhor.score) {
            melhor = { chaveObjeto, objeto, alias, score };
          }
        }
      }
    }
    return melhor;
  }

  function localizarAcaoUso(cenario, itemId) {
    if (!cenario || !cenario.interacoes) return null;

    for (const [chaveObjeto, objeto] of Object.entries(cenario.interacoes)) {
      let acoesUso = objeto.usar;
      if (!acoesUso) continue;

      if (!Array.isArray(acoesUso)) acoesUso = [acoesUso];

      for (const acao of acoesUso) {
        if (acao.itemId === itemId || acao.item === itemId) {
          return { chaveObjeto, objeto, acao };
        }
      }
    }
    return null;
  }

  function localizarAcaoIr(cenario, chaveObjeto) {
    if (!cenario || !cenario.interacoes) return null;
    if (chaveObjeto) {
      const objeto = cenario.interacoes[chaveObjeto];
      if (objeto?.ir) return { chaveObjeto, objeto, acao: objeto.ir };
    }
    for (const [chave, objeto] of Object.entries(cenario.interacoes)) {
      if (objeto.ir) return { chaveObjeto: chave, objeto, acao: objeto.ir };
    }
    return null;
  }

  function obterTextoErro(chave, valores = {}) {
    const texto =
      erros[chave] ||
      erros.comando_invalido ||
      "Você não vê como esse comando pode ajudar no momento.";
    return formatarTexto(texto, valores);
  }

  function cumprirCondicaoVariavel(valorAtual, requisito) {
    if (typeof requisito === "number") {
      return valorAtual === requisito;
    }

    if (typeof requisito === "object" && requisito !== null) {
      if (requisito.eq !== undefined && valorAtual !== requisito.eq)
        return false;
      if (requisito.min !== undefined && valorAtual < requisito.min)
        return false;
      if (requisito.max !== undefined && valorAtual > requisito.max)
        return false;
      if (requisito.gt !== undefined && valorAtual <= requisito.gt)
        return false;
      if (requisito.lt !== undefined && valorAtual >= requisito.lt)
        return false;
      return true;
    }

    return false;
  }

  function avaliarTexto(dado) {
    if (!dado) return null;
    if (typeof dado === "string") return dado;
    if (Array.isArray(dado)) {
      let resultado = [];
      for (const item of dado) {
        if (typeof item === "string") {
          resultado.push(item);
        } else if (typeof item === "object") {
          let passou = true;

          if (item.requerVariavel) {
            for (const [k, v] of Object.entries(item.requerVariavel)) {
              if (!cumprirCondicaoVariavel(progresso.variaveis[k] ?? 0, v))
                passou = false;
            }
          }
          if (
            item.requerDescoberta &&
            !progresso.descobertas.includes(item.requerDescoberta)
          )
            passou = false;
          if (
            item.requerNaoDescoberta &&
            progresso.descobertas.includes(item.requerNaoDescoberta)
          )
            passou = false;
          if (item.requerEstado) {
            if (progresso.variaveis.estadoPessoaBeco !== item.requerEstado)
              passou = false;
          }

          if (passou && item.texto) {
            const subTexto = avaliarTexto(item.texto);
            if (Array.isArray(subTexto)) resultado.push(...subTexto);
            else if (subTexto) resultado.push(subTexto);
          }
        }
      }
      return resultado.length > 0 ? resultado : null;
    }
    return dado;
  }

  async function avaliarTextoComEfeitos(dado) {
    if (!dado) return null;
    if (typeof dado === "string") return dado;
    if (Array.isArray(dado)) {
      let resultado = [];
      for (const item of dado) {
        if (typeof item === "string") {
          resultado.push(item);
        } else if (typeof item === "object") {
          let passou = true;

          if (item.requerVariavel) {
            for (const [k, v] of Object.entries(item.requerVariavel)) {
              if (!cumprirCondicaoVariavel(progresso.variaveis[k] ?? 0, v))
                passou = false;
            }
          }
          if (
            item.requerDescoberta &&
            !progresso.descobertas.includes(item.requerDescoberta)
          )
            passou = false;
          if (
            item.requerNaoDescoberta &&
            progresso.descobertas.includes(item.requerNaoDescoberta)
          )
            passou = false;
          if (item.requerEstado) {
            if (progresso.variaveis.estadoPessoaBeco !== item.requerEstado)
              passou = false;
          }

          if (passou && item.texto) {
            const subTexto = await avaliarTextoComEfeitos(item.texto);
            if (Array.isArray(subTexto)) resultado.push(...subTexto);
            else if (subTexto) resultado.push(subTexto);
            aplicarEfeitos(item);
          }
        }
      }
      return resultado.length > 0 ? resultado : null;
    }
    return dado;
  }

  function aplicarEfeitos(acao) {
    if (!acao) return;
    if (acao.descobre) {
      const descobertas = Array.isArray(acao.descobre)
        ? acao.descobre
        : [acao.descobre];
      for (const desc of descobertas) {
        if (!progresso.descobertas.includes(desc)) {
          progresso.descobertas.push(desc);
        }
      }
    }
    if (acao.ganhaItem && !progresso.inventario.includes(acao.ganhaItem)) {
      progresso.inventario.push(acao.ganhaItem);
    }

    if (acao.removeItem) {
      const itensRemover = Array.isArray(acao.removeItem)
        ? acao.removeItem
        : [acao.removeItem];

      progresso.inventario = progresso.inventario.filter(
        (id) => !itensRemover.includes(id),
      );
    }

    if (acao.setVariavel) {
      for (const [k, v] of Object.entries(acao.setVariavel)) {
        progresso.variaveis[k] = v;
      }
    }
    if (acao.addVariavel) {
      for (const [k, v] of Object.entries(acao.addVariavel)) {
        progresso.variaveis[k] = (progresso.variaveis[k] || 0) + v;
      }
    }
    if (acao.pushVariavel) {
      for (const [k, v] of Object.entries(acao.pushVariavel)) {
        if (!Array.isArray(progresso.variaveis[k])) progresso.variaveis[k] = [];
        progresso.variaveis[k].push(v);

        if (progresso.variaveis[k].length > 9) {
          progresso.variaveis[k].shift();
        }
      }
    }
    if (acao.efeitos) {
      aplicarEfeitos(acao.efeitos);
    }
  }

  function verificaCondicoesAcao(acao) {
    if (!acao) return true;
    if (acao.requerVariavel) {
      for (const [k, v] of Object.entries(acao.requerVariavel)) {
        if (!cumprirCondicaoVariavel(progresso.variaveis[k] ?? 0, v))
          return false;
      }
    }
    if (
      acao.requerDescoberta &&
      !progresso.descobertas.includes(acao.requerDescoberta)
    )
      return false;
    return true;
  }

async function imprimirResposta(textoRaw) { 
    const term = app.motorJogo.termAtivo;
    if (!term || !textoRaw) return;

    const maxCols = term.cols() > 5 ? term.cols() - 2 : 60; 

    let texto = textoRaw;
    
    if (Array.isArray(texto)) {
      texto = texto.map(t => wordWrap(t, maxCols));
    } else {
      texto = wordWrap(texto, maxCols);
    }

    if (Array.isArray(texto)) {
      for (let i = 0; i < texto.length; i++) {
        const linha = texto[i];
        
        if (debugMode) {
          term.echo(linha);
        } else {
          term.echo(linha, { typing: true, delay: 15 });
          await delay(300);
        }

        if (i < texto.length - 1) {
          term.echo("");
        }
      }
    } 
    else if (typeof texto === "string" && texto.includes("\n")) {
      const linhas = texto.split("\n");
      for (const linha of linhas) {
        if (debugMode) {
          term.echo(linha);
        } else {
          term.echo(linha, { typing: true, delay: 15 });
          await delay(200);
        }
      }
    } 
    else {
      if (debugMode) {
        term.echo(String(texto));
      } else {
        term.echo(String(texto), { typing: true, delay: 15 });
      }
    }
  }

  function wordWrap(texto, limiteColunas) {
    if (!texto) return "";
    const linhas = String(texto).split("\n");
    const resultado = [];

    for (const linha of linhas) {
      const palavras = linha.split(" ");
      let linhaAtual = "";

      for (const palavra of palavras) {
        if (palavra.length > limiteColunas) {
          if (linhaAtual) {
            resultado.push(linhaAtual.trimEnd());
            linhaAtual = "";
          }
          resultado.push(palavra);
        }
        else if (linhaAtual.length + palavra.length + 1 > limiteColunas) {
          resultado.push(linhaAtual.trimEnd());
          linhaAtual = palavra + " ";
        } 
        else {
          linhaAtual += palavra + " ";
        }
      }
      
      if (linhaAtual) {
        resultado.push(linhaAtual.trimEnd());
      }
    }
    return resultado.join("\n");
  }

  async function rodarInicializacao() {
    if (foiInicializado) return;
    const term = app.motorJogo.termAtivo;
    
    atualizarIndicador();
    foiInicializado = true;
    term.pause(); 
    
    if (erroCritico) {
      term.echo(erroCritico);
      term.resume();
      return;
    }

    for (const linha of textosIniciais) {
      if (debugMode) {
        term.echo(linha);
      } else {
        term.echo(linha, { typing: true, delay: 15 });
        await delay(400);
      }
    }
    
    term.resume();
    sincronizarInventarioUI();
  }

  async function responderDescricaoCenario() {
    atualizarIndicador();
    const cenario = obterCenarioAtual();
    if (!cenario) {
      await imprimirResposta("Este cenário ainda não foi definido.");
      return;
    }

    if (progresso.locaisVisitados.includes(estadoAtual)) {
      await imprimirResposta(
        await avaliarTextoComEfeitos(
          cenario.descricaoRetorno ||
            cenario.descricao ||
            "Você está de volta ao local.",
        ),
      );
    } else {
      await imprimirResposta(
        await avaliarTextoComEfeitos(
          cenario.descricao || "Este cenário ainda não possui descrição.",
        ),
      );
      progresso.locaisVisitados.push(estadoAtual);
    }
  }

  async function executarExaminar(cenario, objetoEncontrado, alvoTexto) {
    if (!objetoEncontrado) {
      if (alvoTexto && alvoTexto.length > 0) {
        await imprimirResposta(obterTextoErro("alvo_inexistente"));
        return;
      }
      const cenarioAtual = obterCenarioAtual();
      const descricao =
        cenarioAtual?.descricaoDetalhada || cenarioAtual?.descricao;
      if (descricao) {
        await imprimirResposta(await avaliarTextoComEfeitos(descricao));
        return;
      }
      await imprimirResposta(obterTextoErro("comando_invalido"));
      return;
    }

    const { objeto } = objetoEncontrado;
    const acao = objeto.examinar;

    if (!acao) {
      await imprimirResposta(obterTextoErro("item_nao_encontrado"));
      return;
    }

    if (!verificaCondicoesAcao(acao)) {
      const textoFalha = avaliarTexto(acao.falha);
      await imprimirResposta(
        textoFalha || "Você não pode se aproximar para examinar isso agora.",
      );
      return;
    }

    if (acao.descobre && !progresso.descobertas.includes(acao.descobre)) {
      await imprimirResposta(
        avaliarTexto(
          acao.descricao ||
            acao.resposta ||
            obterTextoErro("item_nao_encontrado"),
        ),
      );
      aplicarEfeitos(acao);
      return;
    }

    if (
      acao.repetida &&
      acao.descobre &&
      progresso.descobertas.includes(acao.descobre)
    ) {
      let itemVinculadoId = null;
      if (cenario && cenario.interacoes) {
        for (const [chave, obj] of Object.entries(cenario.interacoes)) {
          if (obj.pegar && obj.pegar.requerDescoberta === acao.descobre) {
            itemVinculadoId = obj.pegar.itemId || obj.itemId;
            break;
          }
        }
      }
      if (itemVinculadoId && !progresso.inventario.includes(itemVinculadoId)) {
        await imprimirResposta(
          avaliarTexto(
            acao.descricao ||
              acao.resposta ||
              obterTextoErro("item_nao_encontrado"),
          ),
        );
        return;
      }
      await imprimirResposta(avaliarTexto(acao.repetida));
      return;
    }

    await imprimirResposta(
      avaliarTexto(
        acao.descricao ||
          acao.resposta ||
          obterTextoErro("item_nao_encontrado"),
      ),
    );
    aplicarEfeitos(acao);
  }

  async function executarPegar(objetoEncontrado) {
    if (!objetoEncontrado) {
      await imprimirResposta(obterTextoErro("item_nao_encontrado"));
      return;
    }

    const { objeto } = objetoEncontrado;
    const acao = objeto.pegar;

    if (!acao) {
      await imprimirResposta(obterTextoErro("item_nao_encontrado"));
      return;
    }

    if (
      acao.requerDescoberta &&
      !progresso.descobertas.includes(acao.requerDescoberta)
    ) {
      await imprimirResposta(obterTextoErro("item_nao_encontrado"));
      return;
    }

    if (acao.requerItem && !progresso.inventario.includes(acao.requerItem)) {
      await imprimirResposta(
        avaliarTexto(acao.falha || obterTextoErro("item_nao_possuido")),
      );
      return;
    }

    const itemId = acao.itemId || objeto.itemId;
    const nomeExibicao = obterNomeExibicao(objeto);

    if (itemId && progresso.inventario.includes(itemId)) {
      await imprimirResposta(
        avaliarTexto(
          acao.jaPossui ||
            obterTextoErro("item_ja_coletado", { item: nomeExibicao }),
        ),
      );
      return;
    }

    await imprimirResposta(avaliarTexto(acao.resposta || "Você pega o item."));

    aplicarEfeitos(acao);

    if (itemId && !progresso.inventario.includes(itemId)) {
      progresso.inventario.push(itemId);
    }
  }

  async function executarUsar(objetoEncontrado, comandoNormalizado, alvoTexto) {
    if (!alvoTexto || alvoTexto.trim() === "") {
      await imprimirResposta(obterTextoErro("comando_invalido"));
      return;
    }

    const cenario = obterCenarioAtual();
    const textoDigitado = normalizarTexto(alvoTexto);
    let interacaoCorrespondente = null;

    if (cenario.interacoes) {
      for (const chave in cenario.interacoes) {
        const interacao = cenario.interacoes[chave];

        if (interacao.usar) {
          const acoesUso = Array.isArray(interacao.usar)
            ? interacao.usar
            : [interacao.usar];

          for (const acao of acoesUso) {
            const idItemConfigurado = normalizarTexto(acao.itemId);

            let matchEncontrado =
              idItemConfigurado === textoDigitado ||
              idItemConfigurado.includes(textoDigitado);

            if (!matchEncontrado && acao.aliases) {
              matchEncontrado = acao.aliases.some(
                (alias) => normalizarTexto(alias) === textoDigitado,
              );
            }

            if (matchEncontrado) {
              interacaoCorrespondente = acao;
              break;
            }
          }

          if (interacaoCorrespondente) break;
        }
      }
    }

    if (!interacaoCorrespondente) {
      await imprimirResposta(obterTextoErro("local_errado"));
      return;
    }

    const idRealItem = interacaoCorrespondente.itemId;

    const possuiItem = progresso.inventario.some(
      (item) => normalizarTexto(item) === normalizarTexto(idRealItem),
    );

    if (!possuiItem) {
      await imprimirResposta(obterTextoErro("item_nao_possuido"));
      return;
    }

    if (interacaoCorrespondente.resposta) {
      await imprimirResposta(avaliarTexto(interacaoCorrespondente.resposta));
    }

    aplicarEfeitos(interacaoCorrespondente);

    if (interacaoCorrespondente.proximoEstado) {
      estadoAtual = interacaoCorrespondente.proximoEstado;
      if (!debugMode) await delay(800);
      await responderDescricaoCenario();
    }
  }

  async function executarIr(objetoEncontrado, comandoNormalizado, alvoTexto) {
    const cenario = obterCenarioAtual();

    if (!alvoTexto || alvoTexto.trim() === "") {
      await imprimirResposta(obterTextoErro("comando_invalido"));
      return;
    }

    if (alvoTexto && (!objetoEncontrado || !objetoEncontrado.objeto.ir)) {
      await imprimirResposta(obterTextoErro("comando_invalido"));
      return;
    }

    const alvo = objetoEncontrado?.chaveObjeto || null;
    const acaoIr = localizarAcaoIr(cenario, alvo);
    if (!acaoIr) {
      await imprimirResposta(obterTextoErro("comando_invalido"));
      return;
    }

    const { acao } = acaoIr;

    if (!verificaCondicoesAcao(acao)) {
      await imprimirResposta(
        avaliarTexto(acao.falha || "Você não pode ir para lá no momento."),
      );
      return;
    }

    if (acao.resposta) {
      await imprimirResposta(avaliarTexto(acao.resposta));
    }

    aplicarEfeitos(acao);

    if (acao.proximoEstado) {
      estadoAtual = acao.proximoEstado;
      if (!debugMode) await delay(800);
      await responderDescricaoCenario();
    }
  }

  async function executarConsumir(objetoEncontrado) {
    if (!objetoEncontrado) {
      await imprimirResposta(obterTextoErro("alvo_inexistente"));
      return;
    }

    const { objeto } = objetoEncontrado;
    const acao = objeto.consumir;

    if (!acao) {
      await imprimirResposta("Isso não parece algo consumível ou atacável.");
      return;
    }

    if (!verificaCondicoesAcao(acao)) {
      await imprimirResposta(
        avaliarTexto(acao.falha || "Você não pode fazer isso no momento."),
      );
      return;
    }

    await imprimirResposta(avaliarTexto(acao.resposta || acao.descricao));
    aplicarEfeitos(acao);
  }

  async function executarSair() {
    if (estadoAtual === "cidade") {
      await imprimirResposta("Você não pode sair da cidade.");
      return;
    }

    if (estadoAtual === "cabana") {
      await imprimirResposta("Você está preso na cabana.");
      return;
    }

    let proximoEstado = "cidade";

    if (estadoAtual === "salaOculta") {
      proximoEstado = "acougue";
    } else if (estadoAtual === "banheiro") {
      proximoEstado = "bar";
    } else if (estadoAtual === "igrejaIn") {
      proximoEstado = "igrejaEx";
    }

    estadoAtual = proximoEstado;

    if (!debugMode) await delay(800);
    await responderDescricaoCenario();
  }

  function obterNomeVisual(itemId) {
    return listaItensNome[itemId] || itemId;
  }

  function sincronizarInventarioUI() {
    const targetApp = app || window.app;

    if (targetApp && targetApp.inventario && targetApp.inventario.sincronizar) {
      const itensMapeados = progresso.inventario.map((id) => ({
        id: id,
        nome: obterNomeVisual(id),
      }));

      targetApp.inventario.sincronizar(itensMapeados);
    }
  }

  function atualizarIndicador() {
    const term = app.motorJogo?.termAtivo;
    if (!term) return;

    if (estadoAtual === "boot") {
      term.set_prompt("KETER> ");
      return;
    }

    const cenario = obterCenarioAtual();
    const nomeExibicao = cenario && cenario.nome ? cenario.nome : estadoAtual;
    term.set_prompt(`KETER [${nomeExibicao}]> `);
  }

  async function checarEventosGlobais() {
    if (
      estadoAtual === "beco" &&
      progresso.descobertas.includes("entregouVodka") &&
      progresso.descobertas.includes("entregouCigarro") &&
      progresso.variaveis.estadoPessoaBeco === 0
    ) {
      progresso.variaveis.estadoPessoaBeco = 1;
      await delay(500);

      if (eventos && eventos.pessoa_satisfeita) {
        await imprimirResposta(avaliarTexto(eventos.pessoa_satisfeita.texto));
      }
    }
    if (
      estadoAtual === "cemiterio" &&
      !progresso.descobertas.includes("simboloCemiterio")
    ) {
      const hist = progresso.variaveis.puzzleTumulos || [];

      if (hist.length === 9) {
        const sequenciaCorreta = [9, 6, 3, 8, 5, 7, 4, 2, 1];

        const acertou = hist.every(
          (val, index) => val === sequenciaCorreta[index],
        );

        if (acertou) {
          progresso.descobertas.push("simboloCemiterio");
          await delay(500);
          if (eventos && eventos.puzzle_cemiterio) {
            await imprimirResposta(
              avaliarTexto(eventos.puzzle_cemiterio.texto),
            );
            aplicarEfeitos(eventos.puzzle_cemiterio);
          }
        }
      }
    }
    if (
      estadoAtual === "salaOculta" &&
      !progresso.descobertas.includes("simbolo2") &&
      progresso.variaveis.puzzleCorpoAgulhas
    ) {
      const st = progresso.variaveis.puzzleCorpoAgulhas;

      if (
        st["Branca"] === "intestino" &&
        st["Prateada"] === "deitada" &&
        st["Preta"] === "cerebro"
      ) {
        await delay(500);
        if (eventos && eventos.puzzle_corpo) {
          await imprimirResposta(avaliarTexto(eventos.puzzle_corpo.texto));
          aplicarEfeitos(eventos.puzzle_corpo);
        } else {
          progresso.descobertas.push("simbolo2");
        }
      }
    }
    if (
      estadoAtual === "igrejaIn" &&
      progresso.variaveis.puzzleIgreja === 3 &&
      !progresso.descobertas.includes("eventoIgrejaConcluido")
    ) {
      progresso.descobertas.push("eventoIgrejaConcluido");

      await delay(500);

      if (eventos && eventos.puzzle_igreja) {
        await imprimirResposta(avaliarTexto(eventos.puzzle_igreja.texto));
        aplicarEfeitos(eventos.puzzle_igreja);
      }
    }
    if (
      progresso.inventario.includes("simbolo1") &&
      progresso.inventario.includes("simbolo2") &&
      progresso.inventario.includes("simbolo3") &&
      !progresso.descobertas.includes("fimDeJogo")
    ) {
      await delay(500);

      if (eventos && eventos.finalJogo) {
        await imprimirResposta(avaliarTexto(eventos.finalJogo.texto));
        aplicarEfeitos(eventos.finalJogo);
      }
    }
  }

  async function processarAcoesPuzzleCorpo(comandoNormalizado, cenarioAtual) {
    if (!cenarioAtual.puzzleCorpo) return false;

    const str = comandoNormalizado;
    const textos = cenarioAtual.puzzleCorpo.textos;

    const verbosExaminar = [
      "examinar",
      "olhar",
      "vasculhar",
      "procurar",
      "ver",
      "analisar",
    ];

    const querExaminar = verbosExaminar.some((v) => str.includes(v));

    const mapLocais = {
      olho: "no olho",
      traqueia: "na traqueia",
      estomago: "no estômago",
      figado: "no fígado",
      coracao: "no coração",
      intestino: "no intestino",
      lingua: "na língua",
      cerebro: "no cérebro",
      deitada: "deitada sobre o corpo",
    };

    if (!progresso.variaveis.puzzleCorpoAgulhas) {
      progresso.variaveis.puzzleCorpoAgulhas = {
        Prateada: "estomago",
        Preta: "figado",
        Branca: "deitada",
        Dourada: "olho",
        Bronze: "traqueia",
      };
    }

    if (querExaminar && (str.includes("agulha") || str.includes("agulhas"))) {
      const estadoAgulhas = progresso.variaveis.puzzleCorpoAgulhas;

      let descricao = textos.inicioOlhar;

      const ordem = ["Prateada", "Preta", "Branca"];
      let noCorpo = [];
      let noInventario = [];

      for (const cor of ordem) {
        const idItem = "agulha" + cor;

        if (progresso.inventario.includes(idItem)) {
          noInventario.push(cor.toLowerCase());
        } else {
          const local = estadoAgulhas[cor];
          if (local) {
            const localFormatado = mapLocais[local] || "em " + local;
            noCorpo.push(
              formatarTexto(textos.agulhaOlhar, {
                cor: cor.toLowerCase(),
                localFormatado: localFormatado,
              }),
            );
          }
        }
      }

      if (noCorpo.length > 0) {
        if (noCorpo.length === 1) {
          descricao +=
            " " + formatarTexto(textos.meioOlhar, { corpo: noCorpo[0] });
        } else {
          const ultimaCorpo = noCorpo.pop();
          const formatado =
            noCorpo.join(", ") + textos.separadorE + ultimaCorpo;
          descricao +=
            " " + formatarTexto(textos.meioOlhar, { corpo: formatado });
        }
      }

      if (noInventario.length > 0) {
        if (noInventario.length === 1) {
          descricao += formatarTexto(textos.invUniOlhar, {
            cor: noInventario[0],
          });
        } else {
          const ultimaInv = noInventario.pop();
          const formatado =
            noInventario.join(", ") + textos.separadorE + ultimaInv;
          descricao += formatarTexto(textos.invMultOlhar, { cores: formatado });
        }
      }

      await imprimirResposta(descricao);
      return true;
    }

    if (str.includes("usar") && str.includes("agulha")) {
      let tipo = null;
      if (str.includes("prateada")) tipo = "Prateada";
      else if (str.includes("preta")) tipo = "Preta";
      else if (str.includes("branca")) tipo = "Branca";

      let local = null;
      const locais = [
        "intestino",
        "coracao",
        "coração",
        "olho",
        "traqueia",
        "figado",
        "fígado",
        "estomago",
        "estômago",
        "deitada",
        "lingua",
        "língua",
        "cerebro",
        "cérebro",
      ];

      for (const l of locais) {
        if (str.includes(l)) {
          local = l;
          break;
        }
      }

      if (!tipo || !local) {
        await imprimirResposta(textos.falhaUsarBase);
        return true;
      }

      const localMap = {
        coração: "coracao",
        fígado: "figado",
        estômago: "estomago",
        língua: "lingua",
        cérebro: "cerebro",
      };
      const localNormalizado = localMap[local] || local;
      const idItem = "agulha" + tipo;

      if (!progresso.inventario.includes(idItem)) {
        await imprimirResposta(obterTextoErro("item_nao_possuido"));
        return true;
      }

      for (const [t, l] of Object.entries(
        progresso.variaveis.puzzleCorpoAgulhas,
      )) {
        if (l === localNormalizado && t !== tipo) {
          await imprimirResposta(textos.falhaUsarOcupado);
          return true;
        }
      }

      progresso.inventario = progresso.inventario.filter((i) => i !== idItem);
      progresso.variaveis.puzzleCorpoAgulhas[tipo] = localNormalizado;

      const localFormatadoStr =
        mapLocais[localNormalizado] || "em " + localNormalizado;

      await imprimirResposta(
        formatarTexto(textos.sucessoUsar, {
          tipo: tipo.toLowerCase(),
          localFormatado: localFormatadoStr,
        }),
      );
      return true;
    }

    if (
      str.includes("pegar") &&
      (str.includes("agulha") || str.includes("agulhas"))
    ) {
      if (progresso.descobertas.includes("simbolo2")) {
        await imprimirResposta(textos.falhaPegarCompleto);
        return true;
      }

      if (str.includes("todas") || str.includes("tudo")) {
        const agulhasDinamicas = ["Prateada", "Preta", "Branca"];
        let pegouAgulha = false;

        for (const cor of agulhasDinamicas) {
          const idItem = "agulha" + cor;
          if (!progresso.inventario.includes(idItem)) {
            progresso.inventario.push(idItem);
            progresso.variaveis.puzzleCorpoAgulhas[cor] = null;
            pegouAgulha = true;
          }
        }

        if (pegouAgulha) {
          await imprimirResposta(textos.sucessoPegarTodas);
        } else {
          await imprimirResposta(textos.falhaPegarTodas);
        }
        return true;
      }

      let tipo = null;
      if (str.includes("prateada")) tipo = "Prateada";
      else if (str.includes("preta")) tipo = "Preta";
      else if (str.includes("branca")) tipo = "Branca";
      else if (str.includes("dourada") || str.includes("bronze")) {
        const t2 = str.includes("dourada") ? "dourada" : "bronze";
        await imprimirResposta(
          formatarTexto(textos.falhaPegarFixa, { tipo2: t2 }),
        );
        return true;
      }

      if (!tipo) {
        await imprimirResposta(textos.falhaPegarBase);
        return true;
      }

      const idItem = "agulha" + tipo;

      if (progresso.inventario.includes(idItem)) {
        await imprimirResposta(obterTextoErro("item_ja_coletado"));
        return true;
      }

      const localAtual = progresso.variaveis.puzzleCorpoAgulhas[tipo];

      const mapRetirada = {
        olho: "do olho",
        traqueia: "da traqueia",
        estomago: "do estômago",
        figado: "do fígado",
        coracao: "do coração",
        intestino: "do intestino",
        lingua: "da língua",
        cerebro: "do cérebro",
        deitada: "que estava deitada sobre o corpo",
      };

      const localRetirada = mapRetirada[localAtual] || "de " + localAtual;

      progresso.inventario.push(idItem);
      progresso.variaveis.puzzleCorpoAgulhas[tipo] = null;

      await imprimirResposta(
        formatarTexto(textos.sucessoPegar, {
          tipo1: tipo.toLowerCase(),
          localRetirada: localRetirada,
        }),
      );
      return true;
    }

    return false;
  }

  async function processarComandoInterno(comandoBruto) {
    const comandoNormalizado = normalizarTexto(comandoBruto);

    if (comandoNormalizado.startsWith("debug ")) {
      const partes = comandoNormalizado.split(" ");
      const subComando = partes[1];

      let itemEncontradoId = null;

      for (const itemKey of Object.keys(listaItensNome)) {
        if (itemKey.toLowerCase() === subComando) {
          itemEncontradoId = itemKey;
          break;
        }
      }

      if (itemEncontradoId) {
        if (!progresso.inventario.includes(itemEncontradoId)) {
          progresso.inventario.push(itemEncontradoId);

          if (itemEncontradoId === "grimorio") {
            progresso.variaveis.pegouGrimorio = 1;
          }
        }

        await imprimirResposta(
          `[DEBUG: ${listaItensNome[itemEncontradoId]} inserido(a) no inventário.]`,
        );
        sincronizarInventarioUI();
        return;
      }

      if (subComando === "salaoculta") {
        estadoAtual = "salaOculta";
        await imprimirResposta(
          "[DEBUG: Teletransportado para a sala de testes do Puzzle.]",
        );
        await responderDescricaoCenario();
        return;
      }

      if (subComando === "pessoabeco") {
        const estadoAlvo = parseInt(partes[2]);
        if (!isNaN(estadoAlvo) && estadoAlvo >= 0 && estadoAlvo <= 2) {
          progresso.variaveis.estadoPessoaBeco = estadoAlvo;
          await imprimirResposta(
            `[DEBUG: Estado da pessoaBeco definido para ${estadoAlvo}.]`,
          );
        } else {
          await imprimirResposta(
            "[DEBUG: Escolha de 0 a 2 (0=Acordada, 1=Dormindo, 2=Morta)]",
          );
        }
        return;
      }

      if (subComando === "lobisomem") {
        const estadoAlvo = parseInt(partes[2]);
        if (!isNaN(estadoAlvo) && estadoAlvo >= 0 && estadoAlvo <= 2) {
          progresso.variaveis.estadoLobisomem = estadoAlvo;
          await imprimirResposta(
            `[DEBUG: Estado da lobisomem definido para ${estadoAlvo}.]`,
          );
        } else {
          await imprimirResposta(
            "[DEBUG: Escolha de 0 a 2 (0=Acordada, 1=Dormindo, 2=Morta)]",
          );
        }
        return;
      }

      if (subComando === "inv") {
        const itens =
          progresso.inventario.length > 0
            ? progresso.inventario.join(", ")
            : "Nenhum item";
        await imprimirResposta(`[DEBUG: Inventário atual: [${itens}]]`);
        return;
      }

      if (subComando === "cidade") {
        estadoAtual = "cidade";
        await imprimirResposta(
          "[DEBUG: Teletransportado diretamente para a Cidade.]",
        );
        await responderDescricaoCenario();
        return;
      }

      if (subComando === "igreja") {
        estadoAtual = "igrejaEx";
        await imprimirResposta(
          "[DEBUG: Teletransportado diretamente para a igreja.]",
        );
        await responderDescricaoCenario();
        return;
      }

      if (subComando === "mortos") {
        const quantidade = parseInt(partes[2]);

        if (isNaN(quantidade) || quantidade < 0) {
          await imprimirResposta(
            "[DEBUG: Uso correto 'debug mortos <numero>]'",
          );
          return;
        }

        progresso.variaveis.mortos = quantidade;

        await imprimirResposta(
          `[DEBUG: Contador de mortos definido para ${quantidade}.]`,
        );
        return;
      }

      if (subComando === "tumulos") {
        const acaoTumulo = partes[2];
        const listaAtual = progresso.variaveis.puzzleTumulos || [];

        if (!acaoTumulo) {
          const itens = listaAtual.length > 0 ? listaAtual.join("-") : "Vazia";
          await imprimirResposta(
            `[DEBUG: Lista atual do puzzle dos túmulos: [${itens}]]`,
          );
          return;
        }

        if (acaoTumulo === "1") {
          progresso.variaveis.puzzleTumulos = [9, 6, 3, 8, 5, 7, 4, 2, 1];
          await imprimirResposta("[DEBUG: Puzzle dos túmulos resolvido.]");
          return;
        }

        if (acaoTumulo === "0") {
          progresso.variaveis.puzzleTumulos = [];

          progresso.descobertas = progresso.descobertas.filter(
            (d) => d !== "simboloCemiterio",
          );

          progresso.inventario = progresso.inventario.filter(
            (i) => i !== "simbolo1",
          );

          await imprimirResposta(
            "[DEBUG: Puzzle dos túmulos resetado. Símbolo removido do mundo e do inventário.]",
          );
          sincronizarInventarioUI();
          return;
        }

        await imprimirResposta(
          "[DEBUG: Uso correto: 'debug tumulos', 'debug tumulos 1' ou 'debug tumulos 0']",
        );
        return;
      }
    }

    if (comandoNormalizado === "debug") {
      debugMode = !debugMode;
      const term = app.motorJogo.termAtivo;
      const cor = debugMode ? "#00ff00" : "#ffcc00"; 
      const status = debugMode ? "DESATIVADA" : "ATIVADA";
      if (term) {
        term.echo(`[[b;${cor};][MODO DEBUG: Animação de texto ${status}]]`);
      }
      return;
    }
    
    if (comandoNormalizado.startsWith("debug puzzleagulha ")) {
      const partes = comandoNormalizado.split(" ");
      const valor = partes[2];

      if (!progresso.variaveis.puzzleCorpoAgulhas) {
        progresso.variaveis.puzzleCorpoAgulhas = {};
      }

      if (valor === "1") {
        progresso.variaveis.puzzleCorpoAgulhas = {
          Branca: "intestino",
          Prateada: "deitada",
          Preta: "cerebro",
        };

        if (!progresso.descobertas.includes("simbolo2")) {
          progresso.descobertas.push("simbolo2");
        }

        progresso.inventario = progresso.inventario.filter(
          (i) => i !== "caderno" && i !== "certificado",
        );

        sincronizarInventarioUI();
        await imprimirResposta(
          "DEBUG: Puzzle do corpo completo (Símbolo 2 liberado e agulhas travadas).",
        );
        return;
      } else if (valor === "0") {
        progresso.variaveis.puzzleCorpoAgulhas = {
          Branca: null,
          Prateada: null,
          Preta: null,
        };

        progresso.descobertas = progresso.descobertas.filter(
          (d) => d !== "simbolo2",
        );

        if (!progresso.inventario.includes("caderno"))
          progresso.inventario.push("caderno");
        if (!progresso.inventario.includes("certificado"))
          progresso.inventario.push("certificado");

        sincronizarInventarioUI();
        await imprimirResposta(
          "DEBUG: Puzzle do corpo incompleto (Símbolo 2 escondido e agulhas resetadas).",
        );
        return;
      }
    }

    if (estadoAtual === "boot") {
      if (
        comandoNormalizado === "comecar" ||
        comandoNormalizado === "começar"
      ) {
        estadoAtual = "cabana";
        atualizarIndicador();
        await imprimirResposta("Carregando cenário ORVALHO DE KETER... OK.");
        if (!debugMode) await delay(500);
        await imprimirResposta("Inicializando Simulação... OK.");
        await imprimirResposta(
          "Digite um comando como EXAMINAR, PEGAR ou USAR. Digite AJUDA para ver a lista de comandos.",
        );
        if (!debugMode) await delay(500);
        await responderDescricaoCenario();
      } else {
        await imprimirResposta("Comando não reconhecido.");
      }
      return;
    }

    if (comandoNormalizado === "ajuda" || comandoNormalizado === "help") {
      await imprimirResposta(interacoesGlobais["ajuda"].examinar.descricao);
      return;
    }

    const cenarioAtual = obterCenarioAtual();

    const interceptouPuzzle = await processarAcoesPuzzleCorpo(
      comandoNormalizado,
      cenarioAtual,
    );
    if (interceptouPuzzle) {
      await checarEventosGlobais();
      return;
    }

    const verboInfo = localizarVerbo(comandoNormalizado);
    if (!verboInfo) {
      await imprimirResposta(obterTextoErro("comando_invalido"));
      return;
    }

    const regexVerbo = new RegExp(
      `(^|\\s)${escaparRegex(verboInfo.sinonimo)}(\\s|$)`,
    );
    const alvoTexto = comandoNormalizado.replace(regexVerbo, " ").trim();

    const objetoEncontrado = localizarObjeto(cenarioAtual, comandoNormalizado);

    if (verboInfo.canonico === "examinar") {
      await executarExaminar(cenarioAtual, objetoEncontrado, alvoTexto);
    } else if (verboInfo.canonico === "pegar") {
      await executarPegar(objetoEncontrado);
    } else if (verboInfo.canonico === "usar") {
      await executarUsar(objetoEncontrado, comandoNormalizado, alvoTexto);
    } else if (verboInfo.canonico === "ir") {
      await executarIr(objetoEncontrado, comandoNormalizado, alvoTexto);
    } else if (verboInfo.canonico === "consumir") {
      await executarConsumir(objetoEncontrado);
    } else if (verboInfo.canonico === "sair") {
      await executarSair();
    } else {
      await imprimirResposta(obterTextoErro("comando_invalido"));
    }

    await checarEventosGlobais();
    sincronizarInventarioUI();
  }
}