export async function initTerminal(app) {
  const terminalElement = $("#terminal-computador");
  if (!terminalElement.length) return;

  let sistemaArquivos = {};

  try {
    const resposta = await fetch("scripts/files.json");
    if (!resposta.ok) throw new Error("Erro de rede");
    sistemaArquivos = await resposta.json();
  } catch (erro) {
    console.error("Falha ao carregar files.json:", erro);
    sistemaArquivos = {
      "ERRO.TXT": {
        tipo: "texto",
        conteudo: "ERRO FATAL: Nao foi possivel montar o sistema de arquivos.",
        secreto: false,
      },
    };
  }

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  function wordWrap(texto, limiteColunas) {
    if (!texto) return "";
    const linhas = String(texto).split("\\n");
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
        } else if (linhaAtual.length + palavra.length + 1 > limiteColunas) {
          resultado.push(linhaAtual.trimEnd());
          linhaAtual = palavra + " ";
        } else {
          linhaAtual += palavra + " ";
        }
      }
      if (linhaAtual) resultado.push(linhaAtual.trimEnd());
    }
    return resultado.join("\\n");
  }

  function testarImagem(src) {
    return new Promise((resolve) => {
      const imagem = new Image();
      imagem.onload = () => resolve(src);
      imagem.onerror = () => {
        const fallback = "arquivos/teste.png";
        const imagemFallback = new Image();
        imagemFallback.onload = () => resolve(fallback);
        imagemFallback.onerror = () => resolve(null);
        imagemFallback.src = fallback;
      };
      imagem.src = src;
    });
  }

  app.escrever = async function (term, textoRaw, animar = false) {
    if (!term || !textoRaw) return;
    const maxCols = term.cols() > 5 ? term.cols() - 2 : 60;
    let texto = textoRaw;
    if (!Array.isArray(texto)) texto = [String(texto)];
    texto = texto.map((t) => wordWrap(t, maxCols));

    for (let i = 0; i < texto.length; i++) {
      const linhas = texto[i].split("\\n");
      for (const linha of linhas) {
        if (!animar) {
          term.echo(linha);
        } else {
          term.echo(linha, { typing: true, delay: 15 });
          await delay(linha.length * 15 + 200);
        }
      }
      if (animar && i < texto.length - 1) await delay(300);
    }
    term.echo("");
  };

  function mudarAba(idTerminalAlvo) {
    $(".instancia-terminal").each(function () {
      const term = $(this).terminal();
      if (term) {
        term.focus(false);
        term.disable();
      }
    });

    $(".aba-cmd").removeClass("ativa");
    $(".instancia-terminal").removeClass("ativa");

    $(`.aba-cmd[data-target="${idTerminalAlvo}"]`).addClass("ativa");
    $(`#${idTerminalAlvo}`).addClass("ativa");

    const term = $(`#${idTerminalAlvo}`).terminal();
    if (term) {
      term.enable();
      setTimeout(() => term.focus(true), 150);
    }
  }

  $("#barra-abas-terminal").on("click", ".aba-cmd", function () {
    const alvo = $(this).data("target");
    mudarAba(alvo);
  });

  terminalElement.terminal(
    async function (comandoBruto, term) {
      const comando = comandoBruto.trim().toUpperCase();

      const inventario =
        app.motorJogo &&
        app.motorJogo.progresso &&
        app.motorJogo.progresso.inventario
          ? app.motorJogo.progresso.inventario
          : [];

      if (comando === "HELP" || comando === "AJUDA") {
        app.escrever(
          term,
          "Comandos disponíveis:\\n  DIR         - Lista os arquivos do diretório atual\\n  TYPE [arq]  - Lê o conteúdo de um arquivo de texto\\n  VIEW [arq]  - Visualiza um arquivo de imagem\\n  [arquivo]   - Executa um arquivo do tipo .exe ou .sys",
        );
      } else if (comando === "DIR") {
        let textoDir = "Diretório de C:\\\\%#@%?&\\\\SALVOS\\n";
        Object.keys(sistemaArquivos).forEach((arq) => {
          const dadosArq = sistemaArquivos[arq];

          if (!dadosArq.secreto) {
            // Verifica se o arquivo tem requisito e, se tiver, se o jogador possui o item
            if (
              !dadosArq.requerItem ||
              inventario.includes(dadosArq.requerItem)
            ) {
              textoDir += `\\n  ${arq}`;
            }
          }
        });
        app.escrever(term, textoDir);
      } else if (comando.startsWith("TYPE ")) {
        let arquivo = comando.split(" ")[1];

        if (!sistemaArquivos[arquivo] && sistemaArquivos[arquivo + ".TXT"]) {
          arquivo = arquivo + ".TXT";
        }

        const dadosArq = sistemaArquivos[arquivo];

        if (
          !dadosArq ||
          dadosArq.tipo !== "texto" ||
          (dadosArq.requerItem && !inventario.includes(dadosArq.requerItem))
        ) {
          app.escrever(
            term,
            `Arquivo '${arquivo}' não encontrado ou não é um arquivo de texto.`,
          );
        } else {
          app.escrever(term, dadosArq.conteudo);
        }
      } else if (comando.startsWith("VIEW ")) {
        let arquivo = comando.split(" ")[1];

        if (!sistemaArquivos[arquivo] && sistemaArquivos[arquivo + ".PNG"]) {
          arquivo = arquivo + ".PNG";
        }

        const dadosArq = sistemaArquivos[arquivo];

        if (
          !dadosArq ||
          dadosArq.tipo !== "imagem" ||
          (dadosArq.requerItem && !inventario.includes(dadosArq.requerItem))
        ) {
          app.escrever(
            term,
            `Arquivo '${arquivo}' não encontrado ou não é um formato de imagem suportado.`,
          );
        } else {
          term.echo(`Carregando visualização de [${arquivo}]...`);

          const urlBase = dadosArq.caminho || "arquivos/teste.png";
          const urlImagem = await testarImagem(urlBase);

          if (!urlImagem) {
            app.escrever(
              term,
              "Não foi possível carregar a imagem principal nem o arquivo de fallback.",
            );
            return;
          }

          const htmlImagem = `
<div style="margin:8px 0; display:inline-block;">
    <img src="${urlImagem}" alt="${arquivo}" style="max-width:300px; display:block; border:1px solid #333;">
    <div style="margin-top:8px; font-family:'Syne Mono', monospace; font-size:14px;">
        <a href="${urlImagem}" download="${arquivo}" style="color:#ffffff; text-decoration:none;">
            DOWNLOAD ${arquivo}
        </a>
    </div>
</div>`;
          term.echo(htmlImagem, { raw: true });
          term.echo("");
        }
      } else if (comando !== "") {
        const alvoExec = sistemaArquivos[comando] ? comando : comando + ".EXE";
        const dadosExec = sistemaArquivos[alvoExec];

        if (
          dadosExec &&
          dadosExec.tipo === "executavel" &&
          (!dadosExec.requerItem || inventario.includes(dadosExec.requerItem))
        ) {
          if (dadosExec.acao === "abrir_keter") {
            const idTerminalKeter = "terminal-keter";

            if ($(`#${idTerminalKeter}`).length) {
              term.echo("O KETER.EXE já está em execução em outra janela.");
              mudarAba(idTerminalKeter);
              return;
            }

            term.echo("Iniciando KETER.EXE numa nova janela...");
            $("#barra-abas-terminal").append(
              `<button class="aba-cmd" data-target="${idTerminalKeter}">[ KETER.EXE ]</button>`,
            );
            $("#container-terminais").append(
              `<div id="${idTerminalKeter}" class="instancia-terminal"></div>`,
            );

            const terminalKeter = $(`#${idTerminalKeter}`).terminal(
              async function (comandoJogo, termJogo) {
                await app.motorJogo.processarComando(comandoJogo, termJogo);
              },
              {
                greetings: "",
                prompt: "KETER> ",
                name: "keter_engine",
                attributes: {
                  autocapitalize: "off",
                  autocorrect: "off",
                  autocomplete: "off",
                  spellcheck: "false",
                  inputmode: "text",
                  dir: "ltr",
                },
              },
            );

            mudarAba(idTerminalKeter);
            app.motorJogo.iniciar(terminalKeter);
          }
        } else {
          app.escrever(
            term,
            "Comando ou nome de arquivo inválido.\\nDigite HELP ou AJUDA para listar os comandos.",
          );
        }
      }
    },
    {
      greetings: "D.DIARY OS v1.0.2\\nDigite HELP para listar os comandos.",
      prompt: "C:\\\\> ",
      attributes: {
        autocapitalize: "off",
        autocorrect: "off",
        autocomplete: "off",
        spellcheck: "false",
        inputmode: "text",
        dir: "ltr",
      },
    },
  );
}
