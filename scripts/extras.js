export function initExtras(app) {
    const { dados, dom } = app;
    const dialogo = app.dialogo ?? {};
    const foto = dom.retrato;
    const container = dom.fotoContainer;
  
    // arrasto
    const falasArrastoRetrato = dados.arrastoRetrato ?? [];
    let arrastoRetratoCooldown = false;
    let arrastoRetratoTimer = null;
    let arrastoRetratoVisualTimer = null;
  
    function resetarVisualArrasto() {
      container?.classList.remove("arrasto-segurando");
    }
  
    function comentarArrastoRetrato() {
      if (
        arrastoRetratoCooldown ||
        dialogo.falaBloqueada ||
        !falasArrastoRetrato.length
      )
        return;
      arrastoRetratoCooldown = true;
      dialogo.cancelarAnimacaoTexto?.();
      dialogo.cancelarTimers?.();
      dialogo.interromperSomFala?.();
  
      const falaAleatoria =
        falasArrastoRetrato[
          Math.floor(Math.random() * falasArrastoRetrato.length)
        ];
      dialogo.mostrarResposta?.(
        falaAleatoria.texto,
        falaAleatoria.expressao || "comum"
      );
  
      clearTimeout(arrastoRetratoTimer);
      arrastoRetratoTimer = setTimeout(() => {
        arrastoRetratoCooldown = false;
      }, 1200);
    }
  
    function iniciarTentativaArrastoRetrato(e) {
      if (!foto || !container) return;
      if (dialogo.falaBloqueada) return;
      
      e.preventDefault();
      clearTimeout(arrastoRetratoVisualTimer);
      resetarVisualArrasto();
      container.classList.add("arrasto-segurando");
  
      arrastoRetratoVisualTimer = setTimeout(() => {
        resetarVisualArrasto();
        comentarArrastoRetrato();
      }, 500);
    }
  
    if (foto) foto.addEventListener("dragstart", iniciarTentativaArrastoRetrato);
  
    // scary
    let contagemSonhoPosEsgotamento = 0;
  
    function lidarComSonho(grupoDialogo) {
      contagemSonhoPosEsgotamento++;
  
      if (contagemSonhoPosEsgotamento === 1) {
        [
          "arquivos/ScaryEvent1.png",
          "arquivos/ScaryEvent2.png",
          "arquivos/ScaryEvent3.png",
          "arquivos/ScaryEvent4.png",
        ].forEach((src) => app.sprites.carregarSprite?.(src));
        const preAudio = new Audio("arquivos/ScaryEventAudio.mp3");
        preAudio.load();
      }
  
      if (contagemSonhoPosEsgotamento <= 2) {
        const respostaFinal =
          grupoDialogo.respostas[
            Math.floor(Math.random() * grupoDialogo.respostas.length)
          ];
        app.dialogo.mostrarResposta(
          respostaFinal.texto,
          respostaFinal.expressao || "comum"
        );
        return true;
      } else {
        iniciarScaryEvent();
        return true;
      }
    }
  
    function iniciarScaryEvent() {
      if (document.body.classList.contains("scary-event-active")) return;
  
      document.body.classList.add("scary-event-active");
      app.dialogo.bloquearFala();
  
      app.sprites.definirSpriteBase("arquivos/ScaryEvent1.png", false);
      foto.style.cursor = "pointer";
  
      const criarSangue = (cantoEsquerdo = false) => {
        const sangue = document.createElement("div");
        sangue.innerText = "SANGUE";
        sangue.style.position = "fixed";
        sangue.style.color = "#DC143C";
        sangue.style.fontFamily = "'Nosifer', monospace";
        sangue.style.fontWeight = "bold";
        sangue.style.pointerEvents = "none";
        sangue.style.zIndex = "99999";
        
        if (cantoEsquerdo) {
          sangue.style.top = "20px";
          sangue.style.left = "20px";
          sangue.style.fontSize = "3rem";
        } else {
          const fontSize = Math.floor(Math.random() * 5 + 3);
          const angle = Math.floor(Math.random() * 40 - 20);
          
          sangue.style.fontSize = `${fontSize}rem`;
          sangue.style.transform = `rotate(${angle}deg)`;
          sangue.style.top = `${Math.random() * 90}vh`;
          sangue.style.left = `${Math.random() * 85}vw`;
        }
  
        document.body.appendChild(sangue);
      };
  
      const dispararAnimacao = () => {
        foto.removeEventListener("click", dispararAnimacao);
        foto.style.cursor = "default";
  
        const audio = new Audio("arquivos/ScaryEventAudio.mp3");
        audio
          .play()
          .catch((e) => console.log("Áudio bloqueado pelo navegador", e));
  
        setTimeout(
          () => app.sprites.aplicarSprite("arquivos/ScaryEvent2.png", false),
          2500
        );
        setTimeout(
          () => app.sprites.aplicarSprite("arquivos/ScaryEvent3.png", false),
          5500
        );
        setTimeout(
          () => app.sprites.aplicarSprite("arquivos/ScaryEvent4.png", false),
          8000
        );
  
        setTimeout(() => criarSangue(true), 5000);
        setTimeout(() => criarSangue(), 6000);
        setTimeout(() => criarSangue(), 7000);
  
        let aceleracaoTimeout;
        setTimeout(() => {
          const startTime = Date.now();
          const startDelay = 500;
          const endDelay = 20;
          const duration = 1000;
  
          const acelerar = () => {
            criarSangue();
            const elapsed = Date.now() - startTime;
  
            if (elapsed >= duration) return;
  
            const progresso = elapsed / duration;
            
            const delayAtual = startDelay * Math.pow(endDelay / startDelay, progresso);
  
            aceleracaoTimeout = setTimeout(acelerar, delayAtual);
          };
          
          acelerar();
        }, 7500);
  
        let explosaoInterval;
        setTimeout(() => {
          clearTimeout(aceleracaoTimeout);
          
          explosaoInterval = setInterval(() => {
            for (let i = 0; i < 6; i++) criarSangue();
          }, 40);
        }, 8800);
  
        setTimeout(() => {
          clearInterval(explosaoInterval);
          window.location.reload();
        }, 10000);
      };
  
      foto.addEventListener("click", dispararAnimacao);
    }
  
    app.extras = {
      lidarComSonho,
    };
  
    return app.extras;
  }
  