(async function () {
  await Auth.guard();
  await renderClientes();
})();

let clientesCache = [];
let paginaAtualClientes = 1;
const TAM_PAGINA_CLIENTES = 10;

async function renderClientes() {
  try {
    const clientes = await API.api("/clientes");
    clientesCache = clientes;
    paginaAtualClientes = 1;
    renderPaginaClientes();
  } catch (error) {
    console.error("Erro ao carregar clientes:", error);
    alert("Erro ao carregar clientes: " + error.message);
  }
}

function renderPaginaClientes() {
  const tbody = document.querySelector("#tbClientes tbody");
  const total = clientesCache.length;
  const totalPaginas = Math.max(1, Math.ceil(total / TAM_PAGINA_CLIENTES));
  if (paginaAtualClientes > totalPaginas) paginaAtualClientes = totalPaginas;
  const inicio = (paginaAtualClientes - 1) * TAM_PAGINA_CLIENTES;
  const fim = inicio + TAM_PAGINA_CLIENTES;
  const pagina = clientesCache.slice(inicio, fim);
  tbody.innerHTML = pagina
    .map(
      (r) => `
    <tr>
     <td>${r.id ?? ""}</td>
      <td>${r.nome_cliente ?? ""}</td>
      <td>${r.bairro ?? ""}</td>
      <td>${r.cidade ?? ""}</td>
      <td>${r.telefone ?? ""}</td>
      <td>${r.total_pedidos_entregues ?? 0}</td>
    </tr>
  `
    )
    .join("");

  const info = document.getElementById("pagInfoClientes");
  const btnPrev = document.getElementById("btnPrevClientes");
  const btnNext = document.getElementById("btnNextClientes");
  if (info) info.textContent = `${paginaAtualClientes} / ${totalPaginas}`;
  if (btnPrev) btnPrev.disabled = paginaAtualClientes <= 1;
  if (btnNext) btnNext.disabled = paginaAtualClientes >= totalPaginas;
}

function nextClientes() {
  const totalPaginas = Math.max(1, Math.ceil(clientesCache.length / TAM_PAGINA_CLIENTES));
  if (paginaAtualClientes < totalPaginas) {
    paginaAtualClientes++;
    renderPaginaClientes();
  }
}

function prevClientes() {
  if (paginaAtualClientes > 1) {
    paginaAtualClientes--;
    renderPaginaClientes();
  }
}

async function downloadCSV() {
  try {
    const response = await fetch('/api/clientes/csv', {
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
    a.download = 'relatorio_clientes.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Erro ao baixar CSV:", error);
    alert("Erro ao baixar CSV: " + error.message);
  }
}
