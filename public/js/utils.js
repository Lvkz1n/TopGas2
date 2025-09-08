// Utilitários compartilhados para o frontend

window.Utils = {
  /**
   * Formatar data para exibição
   * @param {string|Date} dataString - Data a ser formatada
   * @returns {string} Data formatada
   */
  formatarData(dataString) {
    if (!dataString || dataString === null || dataString === '') {
      return "Aguardando...";
    }
    
    if (typeof dataString === 'string' && dataString.includes('/')) {
      return dataString;
    }
    
    const data = new Date(dataString);
    if (isNaN(data.getTime())) {
      return "Aguardando...";
    }
    
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },

  /**
   * Formatar nome do entregador removendo prefixos
   * @param {string} entregador - Nome do entregador
   * @returns {string} Nome formatado
   */
  formatarEntregador(entregador) {
    if (!entregador) return "-";
    return entregador.includes(':') ? entregador.split(':').slice(1).join(':').trim() : entregador;
  },

  /**
   * Obter ícone do status
   * @param {string} status - Status da entrega
   * @returns {string} Emoji do ícone
   */
  getStatusIcon(status) {
    const icons = {
      'entregue': '✅',
      'Entregue': '✅',
      'em_andamento': '⏳',
      'Em Entrega': '⏳',
      'cancelado': '❌',
      'Cancelado': '❌',
      'pendente': '⏳'
    };
    return icons[status] || '❓';
  },

  /**
   * Calcular tempo total entre duas datas
   * @param {string|Date} inicio - Data/hora de início
   * @param {string|Date} fim - Data/hora de fim (opcional, usa agora se não fornecido)
   * @returns {string} Tempo formatado (ex: "2 h 30 m")
   */
  calcularTempoTotal(inicio, fim) {
    if (!inicio) return "Calculando...";
    
    const dataInicio = new Date(inicio);
    const dataFim = fim ? new Date(fim) : new Date();
    
    if (isNaN(dataInicio.getTime()) || (fim && isNaN(dataFim.getTime()))) {
      return "Calculando...";
    }
    
    const diffMs = dataFim - dataInicio;
    if (diffMs < 0) return "Calculando...";
    
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHoras = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
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
   * Calcular tempo total da entrega considerando status
   * @param {Object} entrega - Objeto da entrega
   * @returns {string} Tempo total formatado
   */
  calcularTempoTotalEntrega(entrega) {
    if (!entrega || !entrega.data_e_hora_inicio_pedido) {
      return "Calculando...";
    }
    
    const status = entrega.status_pedido;
    const isEntregue = status === 'Entregue' || status === 'entregue';
    const isCancelado = status === 'cancelado' || status === 'Cancelado';
    
    let dataFim = null;
    
    // Determinar data de fim baseada no status
    if (isEntregue && entrega.data_e_hora_confirmacao_pedido) {
      dataFim = entrega.data_e_hora_confirmacao_pedido;
    } else if (isCancelado && entrega.data_e_hora_cancelamento_pedido) {
      dataFim = entrega.data_e_hora_cancelamento_pedido;
    } else if (entrega.data_e_hora_confirmacao_pedido) {
      // Se tem data de confirmação, usar ela independente do status
      dataFim = entrega.data_e_hora_confirmacao_pedido;
    } else if (entrega.data_e_hora_cancelamento_pedido) {
      // Se tem data de cancelamento, usar ela
      dataFim = entrega.data_e_hora_cancelamento_pedido;
    }
    
    const tempoTotal = this.calcularTempoTotal(entrega.data_e_hora_inicio_pedido, dataFim);
    
    if (!dataFim && tempoTotal !== "Calculando...") {
      return tempoTotal + " (em andamento)";
    }
    
    return tempoTotal;
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
    const modal = document.createElement('div');
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
    
    modal.addEventListener('click', (e) => {
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
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
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
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  },

  /**
   * Alternar modo noturno
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Atualizar ícone do botão
    this.updateThemeIcon(newTheme);
  },

  /**
   * Atualizar ícone do tema
   * @param {string} theme - Tema atual
   */
  updateThemeIcon(theme) {
    const themeButton = document.querySelector('.theme-toggle');
    if (themeButton) {
      const icon = themeButton.querySelector('svg');
      if (icon) {
        if (theme === 'dark') {
          icon.innerHTML = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
        } else {
          icon.innerHTML = '<path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
        }
      }
    }
  },

  /**
   * Inicializar tema
   */
  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }
};
