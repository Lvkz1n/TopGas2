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
          <td>${entrega.id_pedido}</td>
          <td>${entrega.nome_cliente || "-"}</td>
          <td>${formatarData(entrega.horario_inicio)}</td>
          <td>${entrega.nome_entregador || "-"}</td>
          <td>${entrega.horario_recebimento ? formatarData(entrega.horario_recebimento) : "-"}</td>
          <td>${getStatusIcon(entrega.status_entrega)} ${entrega.status_entrega}</td>
          <td>
            ${entrega.status_entrega === 'pendente' ? 
              `<button class="btn" onclick="confirmar(${entrega.id_pedido})">Confirmar</button>` : ''
            }
            ${entrega.status_entrega === 'pendente' || entrega.status_entrega === 'em_andamento' ? 
              `<button class="btn" style="background:#ef4444" onclick="cancelar(${entrega.id_pedido})">Cancelar</button>` : ''
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
    const response = await fetch('/entregas/csv', {
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
