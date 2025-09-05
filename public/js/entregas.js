let paginaAtualEntregas = 1;
const TAM_PAGINA_ENTREGAS = 10;
let dadosEntregas = null;

(async function () {
  await Auth.guard();
  await renderEntregas();
})();

async function renderEntregas() {
  try {
    const result = await API.api(`/entregas?page=${paginaAtualEntregas}&limit=${TAM_PAGINA_ENTREGAS}`);
    dadosEntregas = result;
    
    const tbody = document.querySelector("#tbEntregas tbody");
    tbody.innerHTML = result.entregas
      .map((entrega) => `
        <tr>
          <td>${entrega.id}</td>
          <td>${entrega.protocolo || "-"}</td>
          <td>${entrega.nome_cliente || "-"}</td>
          <td>${entrega.telefone_cliente || "-"}</td>
          <td>${entrega.mercadoria_pedido || "-"}</td>
          <td>${entrega.entregador || "-"}</td>
          <td>${entrega.telefone_entregador || "-"}</td>
          <td>${entrega.endereco || "-"}</td>
          <td>${entrega.cidade || "-"}</td>
          <td>${entrega.bairro || "-"}</td>
          <td>${entrega.ponto_de_referencia || "-"}</td>
          <td>${getStatusIcon(entrega.status_pedido)} ${entrega.status_pedido || "pendente"}</td>
          <td>${renderTimestamps(entrega)}</td>
          <td>
            ${entrega.status_pedido === 'pendente' ? 
              `<button class="btn" onclick="confirmar(${entrega.id})">Confirmar</button>` : ''
            }
            ${entrega.status_pedido === 'pendente' || entrega.status_pedido === 'em_andamento' ? 
              `<button class="btn" style="background:#ef4444" onclick="cancelar(${entrega.id})">Cancelar</button>` : ''
            }
          </td>
        </tr>
      `)
      .join("");
    
    renderPaginacaoEntregas();
  } catch (error) {
    console.error("Erro ao carregar entregas:", error);
    alert("Erro ao carregar entregas: " + error.message);
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
  if (!dataString) return "-";
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function calcularTempoTotal(inicio, fim) {
  if (!inicio) return "-";
  
  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : new Date();
  
  const diffMs = dataFim - dataInicio;
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
  
  // Cancelado
  if (entrega.data_e_hora_cancelamento_pedido) {
    timestamps.push({
      label: 'Cancelado',
      value: formatarDataSimples(entrega.data_e_hora_cancelamento_pedido)
    });
  }
  
  // Tempo total
  let tempoTotal = "-";
  if (entrega.data_e_hora_confirmacao_pedido) {
    tempoTotal = calcularTempoTotal(entrega.data_e_hora_inicio_pedido, entrega.data_e_hora_confirmacao_pedido);
  } else if (entrega.data_e_hora_cancelamento_pedido) {
    tempoTotal = "Cancelado";
  } else if (entrega.data_e_hora_inicio_pedido) {
    tempoTotal = calcularTempoTotal(entrega.data_e_hora_inicio_pedido) + " (em andamento)";
  }
  
  if (timestamps.length === 0) {
    return '<div class="delivery-timestamps"><div class="timestamp-item"><span class="timestamp-label">Sem dados</span><span class="timestamp-value">-</span></div></div>';
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

function getStatusIcon(status) {
  switch (status) {
    case 'entregue':
      return '✅';
    case 'em_andamento':
      return '⏳';
    case 'cancelado':
      return '❌';
    case 'pendente':
      return '⏳';
    default:
      return '❓';
  }
}

async function confirmar(id) {
  try {
    await API.api(`/entregas/${id}/confirmar`, { method: "POST" });
    alert("Entrega confirmada!");
    await renderEntregas();
  } catch (e) {
    alert("Falha: " + e.message);
  }
}

async function cancelar(id) {
  try {
    await API.api(`/entregas/${id}/cancelar`, { method: "POST" });
    alert("Entrega cancelada!");
    await renderEntregas();
  } catch (e) {
    alert("Falha: " + e.message);
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
