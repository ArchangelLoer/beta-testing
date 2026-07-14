import { initSprites } from "./sprites.js";
import { initMemoria } from "./memorias.js";
import { initDialogo } from "./dialogos.js";
import { initBoasVindas } from "./boas-vindas.js";
import { initExtras } from "./extras.js";
import { initAusencia } from "./ausencia.js";
import { initClicks } from "./clicks.js";
import { initEasterEggs } from "./easter-eggs.js";
import { initInventario } from "./inventario.js";
import { initTerminal } from "./terminal.js";
import { initJogo } from "./jogo.js";

async function carregarDados() {
  const res = await fetch(new URL("./dados.json", import.meta.url));

  if (!res.ok) {
    throw new Error(`Não foi possível carregar dados.json (${res.status})`);
  }
  return res.json();
}

function pegarElementosDOM() {
  return {
    retrato: document.getElementById("retrato"),
    fotoContainer: document.querySelector(".foto-container"),

    eggVida: document.getElementById("egg-vida"),
    eggSonho: document.getElementById("egg-sonho"),
    blocoNome: document.getElementById("bloco-nome"),

    falaTrigger: document.getElementById("fala-trigger"),
    falaInput: document.getElementById("fala-input"),
    textoDigitado: document.getElementById("texto-digitado"),

    checkboxMutar: document.getElementById("mutar-vampiro"),
  };
}

async function iniciar() {
  try {
    const dados = await carregarDados();
    const dom = pegarElementosDOM();
    const app = {
      dados,
      dom,
    };

    app.palavrasChave = dados.dialogosComuns
      .flatMap((d) => d.palavras)
      .sort((a, b) => b.length - a.length);
    app.destacarTexto = (texto) => {
      if (!texto) return texto;
      let html = texto;
      app.palavrasChave.forEach((palavra) => {
        const regex = new RegExp(`\\b(${palavra})\\b`, "gi");
        html = html.replace(
          regex,
          '<span class="palavra-chave-destaque">$1</span>',
        );
      });
      return html;
    };

    initSprites(app);
    initMemoria(app);
    initDialogo(app);
    initBoasVindas(app);
    app.boasVindas?.();
    initExtras(app);
    initAusencia(app);
    initClicks(app);
    initEasterEggs(app);
    initInventario(app);
    
    window.app = app; 
    initJogo(app);
    initTerminal(app);

    const checkFacil = document.getElementById("modo-facil");
    if (checkFacil) {
      checkFacil.addEventListener("change", (e) => {
        if (e.target.checked) document.body.classList.add("modo-facil-ativo");
        else document.body.classList.remove("modo-facil-ativo");
      });
    }

    document
      .querySelectorAll(
        ".painel-ficha .bloco p, .painel-ficha .bloco h2, .painel-configuracoes p",
      )
      .forEach((el) => {
        el.innerHTML = app.destacarTexto(el.textContent);
      });
  } catch (erro) {
    console.error("Erro ao iniciar o site:", erro);
  }
}

document.addEventListener("DOMContentLoaded", iniciar);
