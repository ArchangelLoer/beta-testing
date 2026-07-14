export function initEasterEggs(app) {
    const { dados, dom } = app;
    const { definirSpriteBase, spriteBase, spriteBaseEgg, carregarSprite } =
      app.sprites;
    const dialogo = app.dialogo ?? {};
    const foto = dom.retrato;
    const container = dom.fotoContainer;
    const eggVida = dom.eggVida;
    const eggSonho = dom.eggSonho;
    const eggEntidade = dom.falaTrigger;
    const blocoNomeTexto = dom.blocoNome;
    const imagensCam = [
      "arquivos/eye1.gif",
      "arquivos/eye2.gif",
      "arquivos/eye3.gif",
    ];
    if (carregarSprite) {
      imagensCam.forEach((src) => carregarSprite(src));
    }
    const easterEggs = new Map();
    const ESTADO_EGG = {
      ativo: null,
      pendente: null,
      timerRolagem: null,
      timerExibicao: null,
      chanceDenominador: 12,
    };
    const CHANCE_BASE_DENOMINADOR = 12;
    const INTERVALO_ROLAGEM_EGG = 300_000;
    const DELAY_MIN_EGG = 5_000;
    const DELAY_MAX_EGG = 25_000;
    const eggSomAudio = new Audio("https://files.catbox.moe/f1wboq.mp3");
    eggSomAudio.preload = "auto";
    let eggSomAtivo = false;
  
    function registrarEgg(nome, fn) {
      easterEggs.set(nome, fn);
    }
  
    function existeEggEmCurso() {
      return ESTADO_EGG.ativo !== null || ESTADO_EGG.pendente !== null;
    }
  
    function limparTimerRolagem() {
      if (ESTADO_EGG.timerRolagem !== null) {
        clearTimeout(ESTADO_EGG.timerRolagem);
        ESTADO_EGG.timerRolagem = null;
      }
    }
  
    function limparTimerExibicao() {
      if (ESTADO_EGG.timerExibicao !== null) {
        clearTimeout(ESTADO_EGG.timerExibicao);
        ESTADO_EGG.timerExibicao = null;
      }
    }
  
    function iniciarTimerRolagem() {
      if (ESTADO_EGG.timerRolagem !== null) return;
      if (existeEggEmCurso()) return;
  
      ESTADO_EGG.timerRolagem = setTimeout(() => {
        ESTADO_EGG.timerRolagem = null;
        testarRolagemEgg();
      }, INTERVALO_ROLAGEM_EGG);
    }
  
    function escolherEgg() {
      const lista = Array.from(easterEggs.keys()).filter((nome) => {
        if (nome !== "som") return true;
        return !eggSomAtivo;
      });
  
      if (!lista.length) return null;
  
      return lista[Math.floor(Math.random() * lista.length)];
    }
  
    function ativarEgg(nome) {
      if (ESTADO_EGG.ativo !== null) return;
  
      const egg = easterEggs.get(nome);
  
      if (typeof egg !== "function") {
        console.warn(`Easter egg não encontrado: ${nome}`);
        return;
      }
  
      ESTADO_EGG.ativo = nome;
      egg();
    }
  
    function ativarEggAleatorio() {
      const nome = escolherEgg();
      if (!nome) return;
  
      ativarEgg(nome);
    }
  
    function concluirEgg(nome) {
      if (ESTADO_EGG.ativo === nome) {
        ESTADO_EGG.ativo = null;
      }
  
      limparTimerExibicao();
      ESTADO_EGG.pendente = null;
      iniciarTimerRolagem();
    }
  
    function agendarExibicaoPendente() {
      limparTimerExibicao();
  
      if (!ESTADO_EGG.pendente) return;
      if (document.hidden) return;
  
      const atraso =
        Math.floor(Math.random() * (DELAY_MAX_EGG - DELAY_MIN_EGG + 1)) +
        DELAY_MIN_EGG;
  
      ESTADO_EGG.timerExibicao = setTimeout(() => {
        ESTADO_EGG.timerExibicao = null;
  
        if (!ESTADO_EGG.pendente) return;
  
        if (document.hidden) {
          agendarExibicaoPendente();
          return;
        }
  
        const nome = ESTADO_EGG.pendente;
        ESTADO_EGG.pendente = null;
        ativarEgg(nome);
      }, atraso);
    }
  
    function testarRolagemEgg() {
      if (existeEggEmCurso()) return;
  
      const sorteio =
        Math.floor(Math.random() * ESTADO_EGG.chanceDenominador) + 1;
  
      if (sorteio === 1) {
        ESTADO_EGG.chanceDenominador = CHANCE_BASE_DENOMINADOR;
  
        const nome = escolherEgg();
  
        if (!nome) {
          iniciarTimerRolagem();
          return;
        }
  
        if (document.hidden) {
          ESTADO_EGG.pendente = nome;
        } else {
          ativarEgg(nome);
        }
  
        return;
      }
  
      ESTADO_EGG.chanceDenominador = Math.max(
        1,
        ESTADO_EGG.chanceDenominador - 1
      );
  
      iniciarTimerRolagem();
    }
  
    const textoSonhoOriginal = eggSonho
      ? eggSonho.querySelector("h2")?.textContent ?? ""
      : "";
    let eggVidaAtivo = false;
    let eggSonhoAtivo = false;
    let eggEntidadeAtivo = false;
    let eggRetratoAtivo = false;
    let eggNomeAtivo = false;
    let eggInvAtivo = false;
    let eggCheckAtivo = false;
    let eggCamAtivo = false;
  
    const palavrasNomeEgg = ["- ESQUEÇA", "- COMPLETO", "- PERFEITO", "- # 378"];
  
    function easterEggVida() {
      if (!eggVida || eggVidaAtivo) return;
  
      eggVidaAtivo = true;
      eggVida.textContent = "_EU TE DEI ESSA VIDA.";
  
      const restaurarTexto = () => {
        eggVida.textContent = "_O que te deu vida?";
        eggVidaAtivo = false;
        concluirEgg("vida");
      };
  
      eggVida.addEventListener("mouseenter", restaurarTexto, { once: true });
    }
  
    function easterEggSonho() {
      if (!eggSonho || eggSonhoAtivo) return;
  
      eggSonhoAtivo = true;
      eggSonho.classList.remove("hidden");
  
      const h2Sonho = eggSonho.querySelector("h2");
      if (h2Sonho) {
        h2Sonho.textContent = "_QUEM ESTÁ SONHANDO?";
  
        const restaurar = () => {
          h2Sonho.textContent = textoSonhoOriginal;
          eggSonho.classList.add("hidden");
          eggSonhoAtivo = false;
          concluirEgg("sonho");
        };
  
        h2Sonho.addEventListener("mouseenter", restaurar, { once: true });
      }
    }
  
    function easterEggEntidade() {
      if (!eggEntidade || eggEntidadeAtivo) return;
  
      eggEntidadeAtivo = true;
      eggEntidade.textContent = "EU QUERO FALAR COM VOCÊ.";
      eggEntidade.classList.add("egg-entidadeTalk-appear");
  
      const restaurarEntidade = () => {
        eggEntidade.textContent = "Você quer falar comigo?";
        eggEntidade.classList.remove("egg-entidadeTalk-appear");
        eggEntidadeAtivo = false;
        concluirEgg("entidade");
      };
  
      eggEntidade.addEventListener("mouseenter", restaurarEntidade, {
        once: true,
      });
    }
  
    function easterEggRetrato() {
      if (!foto || eggRetratoAtivo) return;
  
      eggRetratoAtivo = true;
  
      definirSpriteBase(spriteBaseEgg, false);
      container?.classList.add("egg-retrato");
  
      const restaurarRetrato = () => {
        foto.removeEventListener("mouseenter", restaurarRetrato);
        dom.falaTrigger?.removeEventListener("click", restaurarPorClique);
  
        definirSpriteBase(spriteBase, false);
        container?.classList.remove("egg-retrato");
        eggRetratoAtivo = false;
        concluirEgg("retrato");
      };
  
      const restaurarPorClique = () => {
        if (dialogo.falaBloqueada) return;
        restaurarRetrato();
      };
  
      foto.addEventListener("mouseenter", restaurarRetrato);
      dom.falaTrigger?.addEventListener("click", restaurarPorClique);
    }
  
    function easterEggInv() {
      if (!app.inventario || eggInvAtivo) return;
  
      const domVazios = Array.from(
        document.querySelectorAll("#inventario-grid .item-slot.vazio")
      );
      const slotsVazios = domVazios.map((el) => parseInt(el.dataset.index, 10));
  
      if (slotsVazios.length === 0) {
        concluirEgg("inv");
        return;
      }
  
      eggInvAtivo = true;
      const alvosPossiveis = slotsVazios.slice(0, 3);
  
      let rolagem;
      while (true) {
        rolagem = Math.floor(Math.random() * 3);
        if (rolagem < alvosPossiveis.length) {
          break;
        }
      }
  
      const indexSorteado = alvosPossiveis[rolagem];
      const itemEgg = { nome: "Mão", imagem: "arquivos/ItemEgg.gif" };
      app.inventario.adicionarItemNoIndex(indexSorteado, itemEgg);
  
      const slotAtualizado = document.querySelector(
        `#inventario-grid .item-slot[data-index="${indexSorteado}"]`
      );
  
      if (slotAtualizado) {
        const removerEgg = () => {
          app.inventario.removerItemNoIndex(indexSorteado);
          eggInvAtivo = false;
          concluirEgg("inv");
        };
        slotAtualizado.addEventListener("mouseenter", removerEgg, { once: true });
      } else {
        eggInvAtivo = false;
        concluirEgg("inv");
      }
    }
  
    function easterEggCheck() {
      const checkContainer = document.getElementById("egg-check-container");
      if (!checkContainer || eggCheckAtivo) return;
  
      eggCheckAtivo = true;
      checkContainer.style.display = "block";
  
      const restaurarCheck = () => {
        checkContainer.style.display = "none";
        eggCheckAtivo = false;
        concluirEgg("check");
      };
  
      checkContainer.addEventListener("mouseenter", restaurarCheck, {
        once: true,
      });
    }
  
    function easterEggNome() {
      if (!blocoNomeTexto || eggNomeAtivo) return;
  
      eggNomeAtivo = true;
  
      const palavraAleatoria =
        palavrasNomeEgg[Math.floor(Math.random() * palavrasNomeEgg.length)];
  
      blocoNomeTexto.textContent = palavraAleatoria;
      blocoNomeTexto.classList.add("egg-nome-appear");
  
      const restaurarNome = () => {
        blocoNomeTexto.textContent = "- ▮▮▮▮▮▮▮▮▮▮";
        blocoNomeTexto.classList.remove("egg-nome-appear");
        eggNomeAtivo = false;
        concluirEgg("nome");
      };
  
      blocoNomeTexto.addEventListener("mouseenter", restaurarNome, {
        once: true,
      });
    }
  
    function easterEggSom() {
      if (eggSomAtivo) return;
  
      eggSomAtivo = true;
  
      eggSomAudio.pause();
      eggSomAudio.currentTime = 0;
  
      const liberar = () => {
        eggSomAtivo = false;
        eggSomAudio.removeEventListener("ended", liberar);
        eggSomAudio.removeEventListener("error", liberar);
      };
  
      eggSomAudio.addEventListener("ended", liberar, { once: true });
      eggSomAudio.addEventListener("error", liberar, { once: true });
    }
  
    function easterEggCam() {
      const olho = document.getElementById("egg-olho-cam");
      if (!olho || eggCamAtivo) return;
  
      eggCamAtivo = true;
  
      const imagensCam = [
        "arquivos/eye1.gif",
        "arquivos/eye2.gif",
        "arquivos/eye3.gif",
      ];
  
      const imagemSorteada =
        imagensCam[Math.floor(Math.random() * imagensCam.length)];
  
      olho.src = imagemSorteada;
      olho.classList.add("egg-olho-visivel");
  
      setTimeout(() => {
        window.alert(
          "Nenhum dispositivo de captura de vídeo foi detectado. Conecte uma webcam e tente novamente."
        );
  
        setTimeout(() => {
          olho.classList.remove("egg-olho-visivel");
          eggCamAtivo = false;
          concluirEgg("cam");
        }, 500);
      }, 50);
    }
  
    registrarEgg("som", easterEggSom);
    registrarEgg("nome", easterEggNome);
    registrarEgg("retrato", easterEggRetrato);
    registrarEgg("vida", easterEggVida);
    registrarEgg("sonho", easterEggSonho);
    registrarEgg("entidade", easterEggEntidade);
    registrarEgg("inv", easterEggInv);
    registrarEgg("check", easterEggCheck);
    registrarEgg("cam", easterEggCam);
  
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        limparTimerExibicao();
        return;
      }
  
      if (ESTADO_EGG.pendente) {
        agendarExibicaoPendente();
        return;
      }
  
      if (ESTADO_EGG.ativo === null && ESTADO_EGG.timerRolagem === null) {
        iniciarTimerRolagem();
      }
    });
  
    window.addEventListener("focus", () => {
      if (ESTADO_EGG.pendente) {
        agendarExibicaoPendente();
        return;
      }
  
      if (ESTADO_EGG.ativo === null && ESTADO_EGG.timerRolagem === null) {
        iniciarTimerRolagem();
      }
    });
  
    window.addEventListener("blur", () => {
      if (document.hidden) return;
      limparTimerExibicao();
    });
  
    iniciarTimerRolagem();
  
    app.easterEggs = {
      registrarEgg,
      existeEggEmCurso,
      limparTimerRolagem,
      limparTimerExibicao,
      iniciarTimerRolagem,
      ESTADO_EGG,
      easterEggs,
    };
  
    return app.easterEggs;
  }
  