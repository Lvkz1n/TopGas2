(async function () {
  await Auth.guard();
  await renderClientes();
})();

let clientesCache = [];
let paginaAtualClientes = 1;
const TAM_PAGINA_CLIENTES = 10;

async function renderClientes() {
  const tbody = document.querySelector("#tbClientes tbody");
  const entregas = await API.api("/entregas");
  const byCliente = new Map();
  for (const e of entregas) {
    const key = `${(e.telefone_cliente || "").trim()}|${(e.nome_cliente || "").trim()}`;
    const item = byCliente.get(key) || {
      id: e.id,
      nome_cliente: e.nome_cliente || "",
      bairro: e.bairro || "",
      cidade: e.cidade || "",
      telefone_cliente: e.telefone_cliente || "",
      total_pedidos_entregues: 0,
    };
    if ((e.status_pedido || "").toLowerCase() === "entregue") {
      item.total_pedidos_entregues += 1;
    }
    if (!byCliente.has(key)) byCliente.set(key, item);
  }
  clientesCache = Array.from(byCliente.values());
  paginaAtualClientes = 1;
  renderPaginaClientes();
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
      <td>${r.id}</td>
      <td><input data-id="${r.id}" data-k="nome_cliente" class="input" value="${
        r.nome_cliente ?? ""
      }" /></td>
      <td><input data-id="${r.id}" data-k="bairro" class="input" value="${
        r.bairro ?? ""
      }" /></td>
      <td><input data-id="${r.id}" data-k="cidade" class="input" value="${
        r.cidade ?? ""
      }" /></td>
      <td><input data-id="${
        r.id
      }" data-k="telefone_cliente" class="input" value="${
        r.telefone_cliente ?? ""
      }" /></td>
      <td><input data-id="${
        r.id
      }" data-k="total_pedidos_entregues" class="input" type="number" min="0" value="${
        r.total_pedidos_entregues ?? 0
      }" /></td>
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

// Página somente leitura: funções de salvar/excluir foram removidas.
