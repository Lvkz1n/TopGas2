let paginaAtualEntregas = 1;
const TAM_PAGINA_ENTREGAS = 10;
let dadosEntregas = null;
let todasEntregas = [];

// Inicialização
(async function () {
  await Auth.guard();
  await renderEntregas();
})();

// Funções utilitárias
const Utils = {
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
    
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  formatarEntregador(entregador) {
    if (!entregador) return "-";
    return entregador.includes(':') ? entregador.split(':').slice(1).join(':').trim() : entregador;
  },

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
  }
};

// Função principal para renderizar entregas
async function renderEntregas() {
  try {
    const result = await API.api(`/entregas?page=1&limit=1000`);
    todasEntregas = result.entregas || [];
    dadosEntregas = result;
    
    applyFilters();
    
    // Atualizar timestamps após renderização
    setTimeout(atualizarTimestamps, 100);
    
  } catch (error) {
    console.error("Erro ao carregar entregas:", error);
    alert("Erro ao carregar entregas: " + error.message);
  }
}

// Aplicar filtros e ordenação
function applyFilters() {
  const statusFilter = document.getElementById('filterStatus')?.value || '';
  const sortFilter = document.getElementById('filterSort')?.value || 'status';
  const searchFilter = document.getElementById('filterSearch')?.value.toLowerCase() || '';
  
  let filteredEntregas = todasEntregas.filter(entrega => 
    ['Em Entrega', 'Entregue', 'cancelado'].includes(entrega.status_pedido)
  );
  
  if (statusFilter) {
    filteredEntregas = filteredEntregas.filter(entrega => 
      entrega.status_pedido === statusFilter
    );
  }
  
  if (searchFilter) {
    filteredEntregas = filteredEntregas.filter(entrega => 
      (entrega.nome_cliente || '').toLowerCase().includes(searchFilter) ||
      (entrega.protocolo || '').toLowerCase().includes(searchFilter) ||
      (entrega.bairro || '').toLowerCase().includes(searchFilter) ||
      (entrega.entregador || '').toLowerCase().includes(searchFilter)
    );
  }
  
  filteredEntregas = sortEntregas(filteredEntregas, sortFilter);
  renderEntregasTable(filteredEntregas);
}

// Ordenar entregas
function sortEntregas(entregas, sortBy) {
  return entregas.sort((a, b) => {
    switch (sortBy) {
      case 'status':
        const statusOrder = { 'Em Entrega': 1, 'Entregue': 2, 'cancelado': 3 };
        return (statusOrder[a.status_pedido] || 4) - (statusOrder[b.status_pedido] || 4);
      case 'protocolo':
        return (a.protocolo || '').localeCompare(b.protocolo || '');
      case 'nome':
        return (a.nome_cliente || '').localeCompare(b.nome_cliente || '');
      case 'bairro':
        return (a.bairro || '').localeCompare(b.bairro || '');
      case 'entregador':
        return (a.entregador || '').localeCompare(b.entregador || '');
      case 'data':
        return new Date(b.data_e_hora_inicio_pedido || 0) - new Date(a.data_e_hora_inicio_pedido || 0);
      default:
        return 0;
    }
  });
}

// Renderizar tabela de entregas
function renderEntregasTable(entregas) {
  renderDesktopTable(entregas);
  renderMobileView(entregas);
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Renderizar tabela desktop
function renderDesktopTable(entregas) {
  const tbody = document.querySelector("#tbEntregas tbody");
  if (!tbody) return;
  
  tbody.innerHTML = entregas.map(entrega => `
    <tr>
      <td>${entrega.protocolo || "-"}</td>
      <td>${entrega.nome_cliente || "-"}</td>
      <td>${entrega.telefone_cliente || "-"}</td>
      <td>${entrega.mercadoria_pedido || "-"}</td>
      <td>${Utils.formatarEntregador(entrega.entregador)}</td>
      <td>${entrega.endereco || "-"}</td>
      <td>${entrega.bairro || "-"}</td>
      <td>${entrega.unidade_topgas || "-"}</td>
      <td>${Utils.getStatusIcon(entrega.status_pedido)} ${entrega.status_pedido || "pendente"}</td>
      <td>${renderTimestamps(entrega)}</td>
    </tr>
  `).join("");
}

// Renderizar visualização mobile
function renderMobileView(entregas) {
  const mobileContainer = document.getElementById("mobileEntregas");
  if (!mobileContainer) return;
  
  mobileContainer.innerHTML = entregas.map((entrega, index) => `
    <div class="delivery-item" id="delivery-${index}">
      <div class="delivery-header" onclick="toggleDeliveryDetails(${index})">
        <div class="delivery-name">${entrega.nome_cliente || "-"}</div>
        <div class="delivery-status">${Utils.getStatusIcon(entrega.status_pedido)} ${entrega.status_pedido || "pendente"}</div>
      </div>
      <div class="delivery-details" id="details-${index}">
        <div class="detail-row">
          <span class="detail-label">Protocolo:</span>
          <span class="detail-value">${entrega.protocolo || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Telefone:</span>
          <span class="detail-value">${entrega.telefone_cliente || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Pedido:</span>
          <span class="detail-value">${entrega.mercadoria_pedido || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Entregador:</span>
          <span class="detail-value">${Utils.formatarEntregador(entrega.entregador)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Endereço:</span>
          <span class="detail-value">${entrega.endereco || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Bairro:</span>
          <span class="detail-value">${entrega.bairro || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Unidade:</span>
          <span class="detail-value">${entrega.unidade_topgas || "-"}</span>
        </div>
        <div class="delivery-timestamps">
          ${renderTimestamps(entrega)}
        </div>
      </div>
    </div>
  `).join("");
}

// Renderizar timestamps
function renderTimestamps(entrega) {
  const tempoTotal = calcularTempoTotalEntrega(entrega);
  const pedidoFeito = Utils.formatarData(entrega.data_e_hora_inicio_pedido);
  const enviado = Utils.formatarData(entrega.data_e_hora_envio_pedido);
  const finalizado = getFinalizadoData(entrega);
  
  return `
    <div class="delivery-timestamps" onclick="toggleTimestamps(${entrega.id})">
      <div class="timestamp-accordion">
        <div class="timestamp-header">
          <span class="timestamp-label">Tempo total:</span>
          <span class="timestamp-value">${tempoTotal}</span>
          <span class="timestamp-arrow">▼</span>
        </div>
        <div class="timestamp-details" id="timestamps-${entrega.id}" style="display: none;">
          <div class="timestamp-item">
            <span class="timestamp-label">Pedido feito:</span>
            <span class="timestamp-value">${pedidoFeito}</span>
          </div>
          <div class="timestamp-item">
            <span class="timestamp-label">Enviado:</span>
            <span class="timestamp-value">${enviado}</span>
          </div>
          <div class="timestamp-item">
            <span class="timestamp-label">Finalizado:</span>
            <span class="timestamp-value">${finalizado}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Calcular tempo total da entrega
function calcularTempoTotalEntrega(entrega) {
  if (!entrega.data_e_hora_inicio_pedido) {
    return "Calculando...";
  }
  
  const status = entrega.status_pedido;
  const isEntregue = status === 'Entregue' || status === 'entregue';
  const isCancelado = status === 'cancelado' || status === 'Cancelado';
  
  let dataFim = null;
  
  if (isEntregue && entrega.data_e_hora_confirmacao_pedido) {
    dataFim = entrega.data_e_hora_confirmacao_pedido;
  } else if (isCancelado && entrega.data_e_hora_cancelamento_pedido) {
    dataFim = entrega.data_e_hora_cancelamento_pedido;
  } else if (entrega.data_e_hora_confirmacao_pedido) {
    dataFim = entrega.data_e_hora_confirmacao_pedido;
  } else if (entrega.data_e_hora_cancelamento_pedido) {
    dataFim = entrega.data_e_hora_cancelamento_pedido;
  }
  
  const tempoTotal = Utils.calcularTempoTotal(entrega.data_e_hora_inicio_pedido, dataFim);
  
  if (!dataFim && tempoTotal !== "Calculando...") {
    return tempoTotal + " (em andamento)";
  }
  
  return tempoTotal;
}

// Obter data de finalização
function getFinalizadoData(entrega) {
  if (entrega.data_e_hora_confirmacao_pedido) {
    return Utils.formatarData(entrega.data_e_hora_confirmacao_pedido);
  }
  if (entrega.data_e_hora_cancelamento_pedido) {
    return Utils.formatarData(entrega.data_e_hora_cancelamento_pedido);
  }
  return "Aguardando...";
}

// Atualizar timestamps
function atualizarTimestamps() {
  // Atualizar timestamps na tabela desktop
  const rows = document.querySelectorAll("#tbEntregas tbody tr");
  rows.forEach((row, index) => {
    const entrega = todasEntregas[index];
    if (entrega && row.cells[9]) {
      row.cells[9].innerHTML = renderTimestamps(entrega);
    }
  });
  
  // Atualizar timestamps na visualização mobile
  const mobileItems = document.querySelectorAll(".delivery-item");
  mobileItems.forEach((item, index) => {
    const entrega = todasEntregas[index];
    if (entrega) {
      const timestampContainer = item.querySelector(".delivery-timestamps");
      if (timestampContainer) {
        timestampContainer.innerHTML = renderTimestamps(entrega);
      }
    }
  });
}

// Funções de interação
function toggleDeliveryDetails(index) {
  const details = document.getElementById(`details-${index}`);
  const item = document.getElementById(`delivery-${index}`);
  
  if (details && item) {
    details.classList.toggle('expanded');
    item.classList.toggle('expanded');
  }
}

function toggleTimestamps(entregaId) {
  const details = document.getElementById(`timestamps-${entregaId}`);
  const accordion = details?.closest('.timestamp-accordion');
  const arrow = accordion?.querySelector('.timestamp-arrow');
  
  if (details && arrow) {
    const isHidden = details.style.display === 'none' || details.style.display === '';
    details.style.display = isHidden ? 'block' : 'none';
    arrow.textContent = isHidden ? '▲' : '▼';
    accordion.classList.toggle('expanded', isHidden);
  }
}

// Funções de paginação
function renderPaginacaoEntregas() {
  if (!dadosEntregas) return;
  
  const { paginacao } = dadosEntregas;
  const info = document.getElementById("pagInfoEntregas");
  const btnPrev = document.getElementById("btnPrevEntregas");
  const btnNext = document.getElementById("btnNextEntregas");
  
  if (info) info.textContent = `${paginacao.pagina} / ${paginacao.totalPaginas}`;
  if (btnPrev) btnPrev.disabled = paginacao.pagina <= 1;
  if (btnNext) btnNext.disabled = paginacao.pagina >= paginacao.totalPaginas;
}

function nextEntregas() {
  if (dadosEntregas && paginaAtualEntregas < dadosEntregas.paginacao.totalPaginas) {
    paginaAtualEntregas++;
    renderEntregas();
  }
}

function prevEntregas() {
  if (paginaAtualEntregas > 1) {
    paginaAtualEntregas--;
    renderEntregas();
  }
}

// Funções de ação
async function confirmarEntrega(id) {
  if (!confirm("Tem certeza que deseja confirmar esta entrega?")) return;
  
  try {
    await API.api(`/entregas/${id}/confirmar`, { method: "POST" });
    alert("✅ Entrega confirmada com sucesso!");
    await renderEntregas();
    lucide.createIcons();
    setTimeout(atualizarTimestamps, 200);
  } catch (e) {
    alert("❌ Falha ao confirmar entrega: " + e.message);
  }
}

async function cancelarEntrega(id) {
  if (!confirm("Tem certeza que deseja cancelar esta entrega?")) return;
  
  try {
    await API.api(`/entregas/${id}/cancelar`, { method: "POST" });
    alert("❌ Entrega cancelada com sucesso!");
    await renderEntregas();
    lucide.createIcons();
    setTimeout(atualizarTimestamps, 200);
  } catch (e) {
    alert("❌ Falha ao cancelar entrega: " + e.message);
  }
}

// Download CSV
async function downloadCSV() {
  try {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Gerando...";
    btn.disabled = true;
    
    const response = await fetch('/api/entregas/csv', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'text/csv,application/csv' }
    });
    
    if (!response.ok) {
      let errorMessage = `Erro ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.details || errorMessage;
      } catch (e) {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error("Arquivo CSV está vazio.");
    }
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_entregas_${new Date().toISOString().split('T')[0]}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 1000);
    
    alert("✅ CSV gerado com sucesso!");
    
  } catch (error) {
    console.error("Erro ao baixar CSV:", error);
    alert("❌ Erro ao baixar CSV: " + error.message);
  } finally {
    const btn = event.target;
    btn.innerHTML = "📊 Download CSV";
    btn.disabled = false;
  }
}