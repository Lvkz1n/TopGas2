// Utilitários compartilhados para o frontend

window.Utils = {
  /**
   * Formatar data para exibição
   * @param {string|Date} dataString - Data a ser formatada
   * @returns {string} Data formatada
   */
  formatarData(dataString) {
    if (!dataString || dataString === null || dataString === "") {
      return "Aguardando...";
    }

    if (typeof dataString === "string" && dataString.includes("/")) {
      return dataString;
    }

    const data = new Date(dataString);
    if (isNaN(data.getTime())) {
      return "Aguardando...";
    }

    return (
      data.toLocaleDateString("pt-BR") +
      " " +
      data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  },

  /**
   * Verificar se a data informada representa um momento valido
   * @param {string|Date} dateValue - Valor a ser checado
   * @returns {boolean} Indica se a data e valida
   */
  isDataValida(dateValue) {
    if (!dateValue) return false;

    if (typeof dateValue === "string") {
      const trimmed = dateValue.trim();
      if (
        trimmed === "" ||
        trimmed === "0000-00-00 00:00:00" ||
        trimmed === "0000-00-00T00:00:00" ||
        trimmed.toLowerCase() === "null"
      ) {
        return false;
      }
    }

    const data = new Date(dateValue);
    return !isNaN(data.getTime());
  },

  /**
   * Formatar nome do entregador removendo prefixos
   * @param {string} entregador - Nome do entregador
   * @returns {string} Nome formatado
   */
  formatarEntregador(entregador) {
    if (!entregador) return "-";
    return entregador.includes(":")
      ? entregador.split(":").slice(1).join(":").trim()
      : entregador;
  },

  /**
   * Obter ícone do status
   * @param {string} status - Status da entrega
   * @returns {string} Emoji do ícone
   */
  getStatusIcon(status) {
    const icons = {
      entregue: "✅",
      Entregue: "✅",
      em_andamento: "⏳",
      "Em Entrega": "⏳",
      cancelado: "❌",
      Cancelado: "❌",
      pendente: "⏳",
    };
    return icons[status] || "❓";
  },

  /**
   * Determinar o estado atual da entrega baseado no status e datas
   * @param {Object} entrega - Objeto da entrega
   * @returns {string} Estado atual da entrega
   */
  getEstadoAtualEntrega(entrega) {
    if (!entrega) return "Status desconhecido";

    const status = entrega.status_pedido;
    const hasInicio = this.isDataValida(entrega.data_e_hora_inicio_pedido);
    const hasEnvio = this.isDataValida(entrega.data_e_hora_envio_pedido);
    const hasConfirmacao = this.isDataValida(
      entrega.data_e_hora_confirmacao_pedido
    );
    const hasCancelamento = this.isDataValida(
      entrega.data_e_hora_cancelamento_pedido
    );

    // Estados finais
    if (status === "Entregue" || status === "entregue" || hasConfirmacao) {
      return "✅ Entregue";
    }

    if (status === "cancelado" || status === "Cancelado" || hasCancelamento) {
      return "❌ Cancelada";
    }

    // Estados em andamento
    if (status === "Em Entrega" || status === "em_andamento" || hasEnvio) {
      return "🚚 Em rota";
    }

    if (hasInicio) {
      return "⏳ Aguardando retirada";
    }

    // Estado inicial
    return "⏸️ Pendente";
  },

  /**
   * Calcular tempo total entre duas datas
   * @param {string|Date} inicio - Data/hora de início
   * @param {string|Date} fim - Data/hora de fim (opcional, usa agora se não fornecido)
   * @returns {string} Tempo formatado (ex: "2 h 30 m")
   */
  calcularTempoTotal(inicio, fim) {
    if (!inicio) return "ui";

    const dataInicio = new Date(inicio);
    const dataFim = fim ? new Date(fim) : new Date();

    if (isNaN(dataInicio.getTime()) || (fim && isNaN(dataFim.getTime()))) {
      return "aidento";
    }

    const diffMs = dataFim - dataInicio;
    if (diffMs < 0) return "slkchefe";

    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHoras = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSegundos = Math.floor((diffMs % (1000 * 60)) / 1000);

    const partes = [];
    if (diffDias > 0) partes.push(`${diffDias} d`);
    if (diffHoras > 0) partes.push(`${diffHoras} h`);
    if (diffMinutos > 0) partes.push(`${diffMinutos} m`);
    if (diffSegundos > 0) partes.push(`${diffSegundos} s`);

    return partes.length === 0 ? "0 s" : partes.join(" ");
  },

  /**
   * Obter data de finalização
   * @param {Object} entrega - Objeto da entrega
   * @returns {string} Data formatada
   */
  getFinalizadoData(entrega) {
    if (entrega.data_e_hora_confirmacao_pedido) {
      return this.formatarData(entrega.data_e_hora_confirmacao_pedido);
    }
    if (entrega.data_e_hora_cancelamento_pedido) {
      return this.formatarData(entrega.data_e_hora_cancelamento_pedido);
    }
    return "Aguardando...";
  },

  /**
   * Criar modal genérico
   * @param {string} title - Título do modal
   * @param {string} content - Conteúdo HTML do modal
   * @param {Function} onClose - Callback para fechar modal
   * @returns {HTMLElement} Elemento do modal
   */
  criarModal(title, content, onClose = null) {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 24px;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      ">
        <h3 style="margin-top: 0; color: var(--orange-600);">${title}</h3>
        ${content}
      </div>
    `;

    const fecharModal = () => {
      if (onClose) onClose();
      document.body.removeChild(modal);
    };

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        fecharModal();
      }
    });

    document.body.appendChild(modal);
    return { modal, fecharModal };
  },

  /**
   * Download de arquivo
   * @param {Blob} blob - Blob do arquivo
   * @param {string} filename - Nome do arquivo
   */
  downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 1000);
  },

  /**
   * Atualizar ícones Lucide
   */
  updateIcons() {
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  },

  /**
   * Alternar modo noturno
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    // Aplicar tema no documento atual
    document.documentElement.setAttribute("data-theme", newTheme);

    // Salvar tema no localStorage para persistência global
    localStorage.setItem("theme", newTheme);

    // Atualizar ícone do botão
    this.updateThemeIcon(newTheme);

    // Notificar outras abas sobre a mudança de tema
    this.broadcastThemeChange(newTheme);
  },

  /**
   * Transmitir mudança de tema para outras abas
   * @param {string} theme - Novo tema
   */
  broadcastThemeChange(theme) {
    // Usar BroadcastChannel se disponível
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("theme-change");
      channel.postMessage({ theme: theme });
      channel.close();
    }

    // Fallback: usar localStorage event
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "theme",
        newValue: theme,
        url: window.location.href,
      })
    );
  },

  /**
   * Atualizar ícone do tema
   * @param {string} theme - Tema atual
   */
  updateThemeIcon(theme) {
    const themeButton = document.querySelector(".theme-toggle");
    if (themeButton) {
      const icon = themeButton.querySelector("svg");
      if (icon) {
        if (theme === "dark") {
          icon.innerHTML =
            '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
        } else {
          icon.innerHTML =
            '<path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
        }
      }
    }
  },

  /**
   * Inicializar tema
   */
  initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeIcon(savedTheme);

    // Escutar mudanças de tema de outras abas
    this.listenForThemeChanges();
  },

  /**
   * Recarregar pagina forcando atualizacao de cache
   */
  hardReload() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.update());
      });
    }
    window.location.reload(true);
  },

  /**
   * Conectar botao para executar hard reload
   * @param {string} buttonId - ID do botao
   */
  setupReloadButton(buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      this.hardReload();
    });
  },

  /**
   * Escutar mudanças de tema de outras abas
   */
  listenForThemeChanges() {
    // Escutar BroadcastChannel
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("theme-change");
      channel.addEventListener("message", (event) => {
        if (event.data && event.data.theme) {
          document.documentElement.setAttribute("data-theme", event.data.theme);
          this.updateThemeIcon(event.data.theme);
        }
      });
    }

    // Escutar localStorage changes
    window.addEventListener("storage", (event) => {
      if (event.key === "theme" && event.newValue) {
        document.documentElement.setAttribute("data-theme", event.newValue);
        this.updateThemeIcon(event.newValue);
      }
    });
  },
};
