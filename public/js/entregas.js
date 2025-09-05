let paginaAtualEntregas = 1;
const TAM_PAGINA_ENTREGAS = 10;
let dadosEntregas = null;
let todasEntregas = []; // Cache de todas as entregas para filtros

(async function () {
  await Auth.guard();
  await renderEntregas();
})();

async function renderEntregas() {
  try {
    // Carregar todas as entregas para filtros
    const result = await API.api(`/entregas?page=1&limit=1000`); // Carregar muitas para ter todos os dados
    todasEntregas = result.entregas;
    dadosEntregas = result;
    
    // Aplicar filtros e ordenação
    applyFilters();
    
  } catch (error) {
    console.error("Erro ao carregar entregas:", error);
    alert("Erro ao carregar entregas: " + error.message);
  }
}

function applyFilters() {
  const statusFilter = document.getElementById('filterStatus')?.value || '';
  const sortFilter = document.getElementById('filterSort')?.value || 'status';
  const searchFilter = document.getElementById('filterSearch')?.value.toLowerCase() || '';
  
  let filteredEntregas = [...todasEntregas];
  
  // Filtrar apenas status específicos
  filteredEntregas = filteredEntregas.filter(entrega => 
    entrega.status_pedido === 'Em Entrega' || 
    entrega.status_pedido === 'Entregue' || 
    entrega.status_pedido === 'cancelado'
  );
  
  // Aplicar filtro de status
  if (statusFilter) {
    filteredEntregas = filteredEntregas.filter(entrega => 
      entrega.status_pedido === statusFilter
    );
  }
  
  // Aplicar filtro de busca
  if (searchFilter) {
    filteredEntregas = filteredEntregas.filter(entrega => 
      (entrega.nome_cliente || '').toLowerCase().includes(searchFilter) ||
      (entrega.protocolo || '').toLowerCase().includes(searchFilter) ||
      (entrega.bairro || '').toLowerCase().includes(searchFilter) ||
      (entrega.entregador || '').toLowerCase().includes(searchFilter)
    );
  }
  
  // Aplicar ordenação
  filteredEntregas = sortEntregas(filteredEntregas, sortFilter);
  
  // Renderizar tabela com dados filtrados
  renderEntregasTable(filteredEntregas);
}

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

function renderEntregasTable(entregas) {
  // Renderizar tabela desktop
  const tbody = document.querySelector("#tbEntregas tbody");
  tbody.innerHTML = entregas
    .map((entrega) => `
      <tr>
        <td>${entrega.protocolo || "-"}</td>
        <td>${entrega.nome_cliente || "-"}</td>
        <td>${entrega.telefone_cliente || "-"}</td>
        <td>${entrega.mercadoria_pedido || "-"}</td>
        <td>${formatarEntregador(entrega.entregador)}</td>
        <td>${entrega.endereco || "-"}</td>
        <td>${entrega.bairro || "-"}</td>
        <td>${entrega.unidade_topgas || "-"}</td>
        <td>${getStatusIcon(entrega.status_pedido)} ${entrega.status_pedido || "pendente"}</td>
        <td>${renderTimestamps(entrega)}</td>
      </tr>
    `)
    .join("");
  
  // Renderizar visualização mobile
  const mobileContainer = document.getElementById("mobileEntregas");
  mobileContainer.innerHTML = entregas
    .map((entrega, index) => `
      <div class="delivery-item" id="delivery-${index}">
        <div class="delivery-header" onclick="toggleDeliveryDetails(${index})">
          <div class="delivery-name">${entrega.nome_cliente || "-"}</div>
          <div class="delivery-status">${getStatusIcon(entrega.status_pedido)} ${entrega.status_pedido || "pendente"}</div>
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
            <span class="detail-value">${formatarEntregador(entrega.entregador)}</span>
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
    `)
    .join("");
  
  // Recarregar ícones Lucide após renderizar a tabela
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function toggleDeliveryDetails(index) {
  const details = document.getElementById(`details-${index}`);
  const item = document.getElementById(`delivery-${index}`);
  
  if (details.classList.contains('expanded')) {
    details.classList.remove('expanded');
    item.classList.remove('expanded');
  } else {
    details.classList.add('expanded');
    item.classList.add('expanded');
  }
}

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

function formatarData(dataString) {
  if (!dataString) return "-";
  const data = new Date(dataString);
  return data.toLocaleString('pt-BR');
}

function formatarDataSimples(dataString) {
  if (!dataString) return "Aguardando...";
  const data = new Date(dataString);
  if (isNaN(data.getTime())) return "Aguardando...";
  return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function calcularTempoTotal(inicio, fim) {
  if (!inicio) return "Calculando...";
  
  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : new Date();
  
  if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
    return "Calculando...";
  }
  
  const diffMs = dataFim - dataInicio;
  if (diffMs < 0) return "Calculando...";
  
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffSegundos = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  if (diffHoras > 0) {
    return `${diffHoras}h ${diffMinutos}m`;
  } else if (diffMinutos > 0) {
    return `${diffMinutos}m ${diffSegundos}s`;
  } else {
    return `${diffSegundos}s`;
  }
}

function renderTimestamps(entrega) {
  const timestamps = [];
  
  // Pedido feito
  if (entrega.data_e_hora_inicio_pedido) {
    timestamps.push({
      label: 'Pedido feito',
      value: formatarDataSimples(entrega.data_e_hora_inicio_pedido)
    });
  }
  
  // Enviado
  if (entrega.data_e_hora_envio_pedido) {
    timestamps.push({
      label: 'Enviado',
      value: formatarDataSimples(entrega.data_e_hora_envio_pedido)
    });
  }
  
  // Finalizado
  if (entrega.data_e_hora_confirmacao_pedido) {
    timestamps.push({
      label: 'Finalizado',
      value: formatarDataSimples(entrega.data_e_hora_confirmacao_pedido)
    });
  }
  
  // Tempo total
  let tempoTotal = "Aguardando...";
  if (entrega.data_e_hora_confirmacao_pedido) {
    const tempo = calcularTempoTotal(entrega.data_e_hora_inicio_pedido, entrega.data_e_hora_confirmacao_pedido);
    tempoTotal = tempo !== "-" ? tempo : "Aguardando...";
  } else if (entrega.data_e_hora_cancelamento_pedido) {
    tempoTotal = "Cancelado";
  } else if (entrega.data_e_hora_inicio_pedido) {
    const tempo = calcularTempoTotal(entrega.data_e_hora_inicio_pedido);
    tempoTotal = tempo !== "-" ? tempo + " (em andamento)" : "Aguardando...";
  }
  
  if (timestamps.length === 0) {
    return '<div class="delivery-timestamps"><div class="timestamp-item"><span class="timestamp-label">Sem dados</span><span class="timestamp-value">Aguardando...</span></div></div>';
  }
  
  const timestampsHtml = timestamps.map(ts => 
    `<div class="timestamp-item">
      <span class="timestamp-label">${ts.label}</span>
      <span class="timestamp-value">${ts.value}</span>
    </div>`
  ).join('');
  
  const tempoTotalHtml = `
    <div class="timestamp-item timestamp-total">
      <span class="timestamp-label">Tempo total</span>
      <span class="timestamp-value">${tempoTotal}</span>
    </div>
  `;
  
  return `<div class="delivery-timestamps">${timestampsHtml}${tempoTotalHtml}</div>`;
}

function formatarEntregador(entregador) {
  if (!entregador) return "-";
  
  // Se contém dois pontos, pegar apenas a parte depois dos dois pontos
  if (entregador.includes(':')) {
    return entregador.split(':').slice(1).join(':').trim();
  }
  
  return entregador;
}

function getStatusIcon(status) {
  switch (status) {
    case 'entregue':
    case 'Entregue':
      return '✅';
    case 'em_andamento':
    case 'Em Entrega':
      return '⏳';
    case 'cancelado':
    case 'Cancelado':
      return '❌';
    case 'pendente':
      return '⏳';
    default:
      return '❓';
  }
}

async function confirmarEntrega(id) {
  if (!confirm("Tem certeza que deseja confirmar esta entrega?")) {
    return;
  }
  
  try {
    await API.api(`/entregas/${id}/confirmar`, { method: "POST" });
    alert("✅ Entrega confirmada com sucesso!");
    await renderEntregas();
    // Recarregar ícones Lucide após atualizar a tabela
    lucide.createIcons();
  } catch (e) {
    alert("❌ Falha ao confirmar entrega: " + e.message);
  }
}

async function cancelarEntrega(id) {
  if (!confirm("Tem certeza que deseja cancelar esta entrega?")) {
    return;
  }
  
  try {
    await API.api(`/entregas/${id}/cancelar`, { method: "POST" });
    alert("❌ Entrega cancelada com sucesso!");
    await renderEntregas();
    // Recarregar ícones Lucide após atualizar a tabela
    lucide.createIcons();
  } catch (e) {
    alert("❌ Falha ao cancelar entrega: " + e.message);
  }
}

async function downloadCSV() {
  try {
    const response = await fetch('/api/entregas/csv', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Erro ao gerar CSV');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio_entregas.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Erro ao baixar CSV:", error);
    alert("Erro ao baixar CSV: " + error.message);
  }
}

async function downloadCSVComPeriodo() {
  const dataInicio = document.getElementById('csvDataInicio').value;
  const dataFim = document.getElementById('csvDataFim').value;
  
  console.log("Datas selecionadas:", { dataInicio, dataFim });
  
  if (!dataInicio || !dataFim) {
    alert("Por favor, selecione o período (data início e data fim)");
    return;
  }
  
  // Validar se a data fim é maior que a data início
  if (new Date(dataFim) < new Date(dataInicio)) {
    alert("A data fim deve ser maior que a data início");
    return;
  }
  
  try {
    // Mostrar loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Gerando...";
    btn.disabled = true;
    
    const params = new URLSearchParams({
      data_inicio: dataInicio,
      data_fim: dataFim
    });
    
    console.log("URL da requisição:", `/api/entregas/csv?${params}`);
    
    const response = await fetch(`/api/entregas/csv?${params}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'text/csv,application/csv'
      }
    });
    
    console.log("Status da resposta:", response.status);
    console.log("Headers da resposta:", Object.fromEntries(response.headers.entries()));
    
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
    console.log("Blob recebido:", blob.size, "bytes", "tipo:", blob.type);
    
    if (blob.size === 0) {
      throw new Error("Arquivo CSV está vazio. Verifique se há dados no período selecionado.");
    }
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_entregas_${dataInicio}_${dataFim}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // Limpar após um tempo
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 1000);
    
    console.log("Download iniciado com sucesso");
    alert("✅ CSV gerado com sucesso!");
    
  } catch (error) {
    console.error("Erro ao baixar CSV:", error);
    alert("❌ Erro ao baixar CSV: " + error.message);
  } finally {
    // Restaurar botão
    const btn = event.target;
    btn.innerHTML = "📊 CSV";
    btn.disabled = false;
  }
}

