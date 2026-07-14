export function initDialogo(app) {
  const { dados, dom } = app;
  const {
    iniciarModoFala,
    alternarModoFala,
    finalizarModoFala,
    retornarExpressao,
    definirSpriteBase,
    spriteBaseIrritado,
  } = app.sprites;

  const falaTrigger = dom.falaTrigger;
  const falaInput = dom.falaInput;
  const textoDigitado = dom.textoDigitado;
  const falaAudio = new Audio("arquivos/speech.wav");

  let falaEscutando = false;
  let falaBuffer = "";
  let falaBloqueada = false;
  let falaIdleTimer = null;
  let falaReturnTimer = null;
  let animacaoTexto = null;
  let cenaIrritacaoAtiva = false;
  let animacaoVazio = null;
  let falaAudioStopTimer = null;
  let timerMultiplasFalas = null;
  let multiplasFalasAtiva = false;

  falaAudio.preload = "auto";
  falaAudio.loop = true;
  falaAudio.playbackRate = 1.15;

  function iniciarSomFala() {
    if (dom.checkboxMutar && dom.checkboxMutar.checked) return;

    clearTimeout(falaAudioStopTimer);
    falaAudioStopTimer = null;

    if (falaAudio.paused) {
      falaAudio.play().catch(() => {});
    }
  }

  function pararSomFala() {
    clearTimeout(falaAudioStopTimer);

    if (falaAudio.paused) return;

    falaAudioStopTimer = setTimeout(() => {
      falaAudio.pause();
      falaAudioStopTimer = null;
    }, 60);
  }

  function interromperSomFala() {
    clearTimeout(falaAudioStopTimer);
    falaAudioStopTimer = null;
    falaAudio.pause();
    falaAudio.currentTime = 0;
  }

  function ehPausaDeFala(caractere) {
    return /[.,!?…;]/.test(caractere);
  }

  let historicoDialogo = {
    respostasVistas: {},
    contagemPalavrasRepetidas: {},
    mudancaPalavras: {},
  };

  const TEMPO_IDLE = 8000;
  const TEXTO_INICIAL = "Você quer falar comigo?";
  const TEXTO_ESCUTA = "Então, fale.";
  const respostas = dados.dialogosComuns ?? [];
  const respostasRepetidas = dados.respostasRepetidas ?? [];

  function normalizarTexto(texto) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function cancelarAnimacaoTexto() {
    if (animacaoTexto !== null) {
      clearTimeout(animacaoTexto);
      animacaoTexto = null;
    }
  }

  function cancelarTimers() {
    clearTimeout(falaIdleTimer);
    clearTimeout(falaReturnTimer);
    falaIdleTimer = null;
    falaReturnTimer = null;
    cancelarMultiplasFalas();
  }

  function cancelarMultiplasFalas() {
    multiplasFalasAtiva = false;
    if (timerMultiplasFalas !== null) {
      clearTimeout(timerMultiplasFalas);
      timerMultiplasFalas = null;
    }
  }

  function setTextoInstantaneo(texto) {
    cancelarAnimacaoTexto();
    if (falaTrigger) {
      falaTrigger.textContent = texto;
    }
  }

  function atualizarTextoDigitado(texto) {
    if (!textoDigitado) return;

    if (!falaEscutando) {
      limparTextoDigitado();
      return;
    }

    if (!texto || !texto.length) {
      mostrarTextoVazioAnimado();
      return;
    }

    esconderTextoVazioAnimado();
    textoDigitado.textContent = texto.toUpperCase();
  }

  function limparTextoDigitado() {
    if (!textoDigitado) return;

    textoDigitado.textContent = "";
    textoDigitado.classList.remove("encontrado", "aguardando", "pisca");
    pararAnimacaoVazio();
  }

  function limparEntradaFala() {
    falaBuffer = "";

    if (falaInput) {
      falaInput.value = "";
    }

    if (textoDigitado) {
      textoDigitado.textContent = "";
      textoDigitado.classList.remove("encontrado", "aguardando", "pisca");
    }

    pararAnimacaoVazio();
  }

  function mostrarPalavraEncontrada(palavra) {
    if (!textoDigitado) return;

    esconderTextoVazioAnimado();
    textoDigitado.textContent = palavra.toUpperCase();
    textoDigitado.classList.add("encontrado");
  }

  function pararAnimacaoVazio() {
    if (animacaoVazio !== null) {
      clearInterval(animacaoVazio);
      animacaoVazio = null;
    }
  }

  function mostrarTextoVazioAnimado() {
    if (!textoDigitado || !falaEscutando) return;

    pararAnimacaoVazio();

    textoDigitado.classList.remove("encontrado");
    textoDigitado.classList.add("aguardando");

    const estados = [".", "..", "...", "..", "."];
    let indice = 0;

    textoDigitado.textContent = estados[indice];

    animacaoVazio = setInterval(() => {
      if (!falaEscutando) {
        pararAnimacaoVazio();
        limparTextoDigitado();
        return;
      }

      indice = (indice + 1) % estados.length;
      textoDigitado.textContent = estados[indice];
    }, 300);
  }

  function esconderTextoVazioAnimado() {
    if (!textoDigitado) return;

    pararAnimacaoVazio();
    textoDigitado.classList.remove("aguardando", "pisca");
  }

  function bloquearFala() {
    falaBloqueada = true;

    if (falaTrigger) {
      falaTrigger.classList.add("bloqueado");
      falaTrigger.setAttribute("aria-disabled", "true");
      falaTrigger.tabIndex = -1;
    }

    if (falaInput) {
      falaInput.blur();
      falaInput.disabled = true;
    }

    cancelarTimers();
    cancelarAnimacaoTexto();
  }

  function escrever(texto, aoFinal = null, expressao = "comum") {
    if (!falaTrigger) return;

    cancelarAnimacaoTexto();
    iniciarModoFala(expressao);
    falaTrigger.textContent = "";

    let i = 0;

    function proximoPasso() {
      falaTrigger.textContent = texto.slice(0, i);

      const caractereAtual = texto[i - 1] || "";
      i++;

      if (i <= texto.length) {
        let atraso = 28;

        if (caractereAtual === " ") {
          atraso = 16;
        } else if (caractereAtual === "," || caractereAtual === ";") {
          atraso = 120;
          pararSomFala();
        } else if (
          caractereAtual === "." ||
          caractereAtual === "!" ||
          caractereAtual === "?" ||
          caractereAtual === "…"
        ) {
          atraso = 220;
          pararSomFala();
        } else {
          iniciarSomFala();
          if (!dom.checkboxMutar || !dom.checkboxMutar.checked) {
            alternarModoFala();
          }
        }

        animacaoTexto = setTimeout(proximoPasso, atraso);
      } else {
        animacaoTexto = null;
        interromperSomFala();
        finalizarModoFala();

        if (app.destacarTexto) {
          falaTrigger.innerHTML = app.destacarTexto(falaTrigger.textContent);
        }

        if (aoFinal) aoFinal();
      }
    }

    proximoPasso();
  }

  function calcularTempoEspera(texto) {
    const base = 1800;
    const porCaractere = 28;
    const pausas = (texto.match(/[,.!?…;]/g) || []).length * 220;

    return Math.max(3000, base + texto.length * porCaractere + pausas);
  }

  function limparFala() {
    falaEscutando = false;

    cancelarTimers();
    cancelarAnimacaoTexto();
    retornarExpressao();

    limparEntradaFala();
    setTextoInstantaneo(TEXTO_INICIAL);
  }

  function resetInatividade() {
    clearTimeout(falaIdleTimer);
    falaIdleTimer = setTimeout(() => {
      limparFala();
    }, TEMPO_IDLE);
  }

  function resetTexto(texto) {
    clearTimeout(falaReturnTimer);
    falaReturnTimer = setTimeout(() => {
      limparFala();
    }, calcularTempoEspera(texto));
  }

  function iniciarFala(expressao = "comum") {
    falaEscutando = true;

    cancelarTimers();

    limparEntradaFala();
    mostrarTextoVazioAnimado();

    escrever(
      TEXTO_ESCUTA,
      () => {
        if (falaEscutando) {
          resetInatividade();
        }
      },
      expressao,
    );
  }

  function mostrarMultiplasRespostas(listaFalas) {
    cancelarMultiplasFalas();
    falaEscutando = false;
    falaBuffer = "";
    if (falaInput) falaInput.value = "";
    cancelarTimers();

    multiplasFalasAtiva = true;
    let indice = 0;

    function proximaFala() {
      if (!multiplasFalasAtiva) return;

      if (indice < listaFalas.length) {
        const fala = listaFalas[indice];
        const isUltima = indice === listaFalas.length - 1;

        escrever(
          fala.texto,
          () => {
            if (!multiplasFalasAtiva) return;

            if (isUltima) {
              multiplasFalasAtiva = false;
              resetTexto(fala.texto);
            } else {
              timerMultiplasFalas = setTimeout(proximaFala, 1500);
            }
          },
          fala.expressao || "comum",
        );
        indice++;
      }
    }

    proximaFala();
  }

  function mostrarResposta(texto, expressao = "comum") {
    cancelarMultiplasFalas();

    falaEscutando = false;
    falaBuffer = "";
    if (falaInput) falaInput.value = "";
    cancelarTimers();

    escrever(
      texto,
      () => {
        resetTexto(texto);
      },
      expressao,
    );
  }

  function resetRepeticoes(palavraChave) {
    Object.keys(historicoDialogo.contagemPalavrasRepetidas).forEach((chave) => {
      if (!historicoDialogo.contagemPalavrasRepetidas[chave]) return;

      if (chave === palavraChave) {
        historicoDialogo.mudancaPalavras[chave] = 0;
        return;
      }

      historicoDialogo.mudancaPalavras[chave] =
        (historicoDialogo.mudancaPalavras[chave] || 0) + 1;

      if (historicoDialogo.mudancaPalavras[chave] >= 3) {
        historicoDialogo.contagemPalavrasRepetidas[chave] = 0;
        historicoDialogo.mudancaPalavras[chave] = 0;
      }
    });
  }

  function voceMeIrritou() {
    if (cenaIrritacaoAtiva) return;
    cenaIrritacaoAtiva = true;

    localStorage.setItem("ultimo_estado", "irritado");

    falaEscutando = false;
    falaBuffer = "";
    cancelarTimers();
    cancelarAnimacaoTexto();
    definirSpriteBase(spriteBaseIrritado, false);
    bloquearFala();

    escrever(
      "...",
      () => {
        setTimeout(() => {
          escrever(
            "Você é insistente.",
            () => {
              setTimeout(() => {
                escrever(
                  "Quer saber? Eu não sou forçado a te escutar.",
                  () => {
                    retornarExpressao();

                    setTimeout(() => {
                      if (falaTrigger) {
                        falaTrigger.classList.add("escondido");
                      }
                    }, 2200);
                  },
                  "irritado",
                );
              }, 1200);
            },
            "irritado",
          );
        }, 1200);
      },
      "irritado",
    );
  }

  function testarPalavras() {
    const textoDigitado = normalizarTexto(falaBuffer).trim();
    if (!textoDigitado) return;

    const itensInventario = app.inventario
      .obterItens()
      .filter((i) => i !== null && !i.fixo);

    const configuracaoItem = dados.dialogosItens.find((dialogo) =>
      dialogo.palavras.some(
        (palavra) => normalizarTexto(palavra) === textoDigitado,
      ),
    );

    if (configuracaoItem) {
      const palavrasParaChecarInventario = configuracaoItem.itemRequerido
        ? Array.isArray(configuracaoItem.itemRequerido)
          ? configuracaoItem.itemRequerido
          : [configuracaoItem.itemRequerido]
        : configuracaoItem.palavras;

      const itemNoInventario = itensInventario.find((item) =>
        palavrasParaChecarInventario.some(
          (palavra) =>
            normalizarTexto(palavra) === normalizarTexto(item.nome) ||
            normalizarTexto(palavra) === normalizarTexto(item.id || ""),
        ),
      );

      if (itemNoInventario) {
        mostrarPalavraEncontrada(itemNoInventario.nome);

        if (Array.isArray(configuracaoItem.resposta)) {
          mostrarMultiplasRespostas(configuracaoItem.resposta);
        } else {
          mostrarResposta(
            configuracaoItem.resposta.texto,
            configuracaoItem.resposta.expressao || "comum",
          );
        }
        return;
      }
    }

    const itemSemDialogo = itensInventario.find(
      (item) => normalizarTexto(item.nome) === textoDigitado,
    );
    if (itemSemDialogo) {
      mostrarPalavraEncontrada(itemSemDialogo.nome);
      mostrarResposta(
        "UH OH, ESQUECERAM DE POR A DESCRIÇÃO DO ITEM!!!!!",
        "comum",
      );
      return;
    }

    for (let i = 0; i < respostas.length; i++) {
      const grupo = respostas[i];

      const palavraEncontrada = grupo.palavras.find((palavra) => {
        return textoDigitado === normalizarTexto(palavra).trim();
      });

      if (palavraEncontrada) {
        const palavraChave = normalizarTexto(palavraEncontrada);

        mostrarPalavraEncontrada(palavraEncontrada);

        resetRepeticoes(palavraChave);

        if (grupo.palavras.includes("sangue")) {
          localStorage.setItem("ultimo_estado", "sangue");
          window.location.reload();
          return;
        }

        if (!historicoDialogo.respostasVistas[i]) {
          historicoDialogo.respostasVistas[i] = new Set();
        }

        const jaEsgotouGrupo =
          historicoDialogo.respostasVistas[i].size === grupo.respostas.length;

        if (jaEsgotouGrupo) {
          if (palavraChave === "sonho" && app.extras) {
            if (app.extras.lidarComSonho(grupo)) {
              return;
            }
          }

          if (!historicoDialogo.contagemPalavrasRepetidas[palavraChave]) {
            historicoDialogo.contagemPalavrasRepetidas[palavraChave] = 0;
          }

          historicoDialogo.contagemPalavrasRepetidas[palavraChave]++;

          if (historicoDialogo.contagemPalavrasRepetidas[palavraChave] >= 15) {
            voceMeIrritou();
            return;
          }

          if (historicoDialogo.contagemPalavrasRepetidas[palavraChave] >= 5) {
            const respostaChato =
              respostasRepetidas[
                Math.floor(Math.random() * respostasRepetidas.length)
              ];
            mostrarResposta(respostaChato, "irritado");
            return;
          }
        }

        let indiceResposta;

        if (!jaEsgotouGrupo) {
          const indicesNaoVistos = grupo.respostas
            .map((_, idx) => idx)
            .filter((idx) => !historicoDialogo.respostasVistas[i].has(idx));

          indiceResposta =
            indicesNaoVistos[
              Math.floor(Math.random() * indicesNaoVistos.length)
            ];
          historicoDialogo.respostasVistas[i].add(indiceResposta);
        } else {
          indiceResposta = Math.floor(Math.random() * grupo.respostas.length);
        }

        const respostaFinal = grupo.respostas[indiceResposta];
        mostrarResposta(
          respostaFinal.texto,
          respostaFinal.expressao || "comum",
        );
        return;
      }
    }
  }

  if (falaTrigger && falaInput) {
    retornarExpressao();
    falaTrigger.textContent = "";

    if (textoDigitado) mostrarTextoVazioAnimado();

    falaTrigger.addEventListener("click", () => {
      if (falaBloqueada || multiplasFalasAtiva) return;

      if (!falaEscutando) {
        limparEntradaFala();
        iniciarFala();
      } else {
        resetInatividade();
      }

      falaInput.focus({ preventScroll: true });
    });

    falaInput.addEventListener("input", () => {
      if (falaBloqueada) return;

      if (!falaEscutando) {
        falaInput.value = "";
        return;
      }

      clearTimeout(falaReturnTimer);

      const comprimentoTexto = falaInput.value.length;
      falaInput.setSelectionRange(comprimentoTexto, comprimentoTexto);

      falaBuffer = falaInput.value;

      atualizarTextoDigitado(falaInput.value);

      resetInatividade();
    });

    falaInput.addEventListener("keydown", (e) => {
      if (falaBloqueada || !falaEscutando) return;

      if (e.key === "Enter") {
        testarPalavras();
      }
    });
  }

  if (dom.checkboxMutar) {
    const estadoSalvo = localStorage.getItem("vampiroMutado");
    if (estadoSalvo === "true") {
      dom.checkboxMutar.checked = true;
    } else if (estadoSalvo === "false") {
      dom.checkboxMutar.checked = false;
    }

    let contagemCliquesMute = 0;
    let timerResetCliques = null;

    dom.checkboxMutar.addEventListener("change", (e) => {
      if (falaBloqueada) return;
      contagemCliquesMute++;

      if (contagemCliquesMute === 1) {
        timerResetCliques = setTimeout(() => {
          contagemCliquesMute = 0;
        }, 3000);
      }

      if (contagemCliquesMute >= 10) {
        clearTimeout(timerResetCliques);
        contagemCliquesMute = 0;

        dom.checkboxMutar.disabled = true;
        dom.checkboxMutar.parentElement.classList.add("texto-bloqueado");

        const falasSpam = ["Se. Decida.", "Você brinca demais.", "Já chega."];
        const falaEscolhida =
          falasSpam[Math.floor(Math.random() * falasSpam.length)];
        mostrarResposta(falaEscolhida, "irritado");

        setTimeout(() => {
          dom.checkboxMutar.disabled = false;
          dom.checkboxMutar.parentElement.classList.remove("texto-bloqueado");
        }, 10000);

        return;
      }

      const estaMutado = e.target.checked;
      const estaFalando = animacaoTexto !== null;
      const eventosMute = dados.eventosMute || {};

      localStorage.setItem("vampiroMutado", estaMutado);

      if (estaMutado) {
        if (estaFalando) {
          const frases = eventosMute.mutadoInterrompido || [];
          if (frases.length > 0) {
            const fraseEscolhida =
              frases[Math.floor(Math.random() * frases.length)];
            mostrarResposta(
              fraseEscolhida.texto,
              fraseEscolhida.expressao || "irritado",
            );
          }
        } else {
          const frases = eventosMute.mutadoIdle || [];
          if (frases.length > 0) {
            const fraseEscolhida =
              frases[Math.floor(Math.random() * frases.length)];
            mostrarResposta(
              fraseEscolhida.texto,
              fraseEscolhida.expressao || "entediado",
            );
          }
        }
      } else {
        if (!estaFalando) {
          const frases = eventosMute.desmutadoIdle || [];
          if (frases.length > 0) {
            const fraseEscolhida =
              frases[Math.floor(Math.random() * frases.length)];
            mostrarResposta(
              fraseEscolhida.texto,
              fraseEscolhida.expressao || "comum",
            );
          }
        }
      }
    });
  }

  app.dialogo = {
    normalizarTexto,
    cancelarAnimacaoTexto,
    cancelarTimers,
    setTextoInstantaneo,
    atualizarTextoDigitado,
    limparTextoDigitado,
    limparEntradaFala,
    mostrarPalavraEncontrada,
    pararAnimacaoVazio,
    mostrarTextoVazioAnimado,
    esconderTextoVazioAnimado,
    bloquearFala,
    escrever,
    calcularTempoEspera,
    limparFala,
    resetInatividade,
    resetTexto,
    iniciarFala,
    interromperSomFala,
    mostrarResposta,
    resetRepeticoes,
    voceMeIrritou,
    testarPalavras,
    get falaEscutando() {
      return falaEscutando;
    },
    get falaBloqueada() {
      return falaBloqueada;
    },
    get falaBuffer() {
      return falaBuffer;
    },
    set falaBuffer(valor) {
      falaBuffer = valor;
    },
  };

  return app.dialogo;
}
