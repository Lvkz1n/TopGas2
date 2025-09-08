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
  // Renderizar tabela desktop
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
      <td>
        <button class="btn" onclick="editarCliente(${r.id})" style="background: var(--orange-500);">
          <i data-lucide="edit" style="width: 14px; height: 14px; margin-right: 4px;"></i>
          Editar
        </button>
      </td>
    </tr>
  `
    )
    .join("");
    
  // Renderizar visualização mobile
  const mobileContainer = document.getElementById("mobileClientes");
  if (mobileContainer) {
    mobileContainer.innerHTML = pagina
      .map((r) => `
        <div class="client-item">
          <div class="client-header">
            <div class="client-name">${r.nome_cliente ?? ""}</div>
            <div class="client-orders">${r.total_pedidos_entregues ?? 0} entregas</div>
          </div>
          <div class="client-details">
            <div class="client-detail">
              <span class="client-detail-label">ID:</span>
              <span class="client-detail-value">${r.id ?? ""}</span>
            </div>
            <div class="client-detail">
              <span class="client-detail-label">Bairro:</span>
              <span class="client-detail-value">${r.bairro ?? ""}</span>
            </div>
            <div class="client-detail">
              <span class="client-detail-label">Cidade:</span>
              <span class="client-detail-value">${r.cidade ?? ""}</span>
            </div>
            <div class="client-detail">
              <span class="client-detail-label">Telefone:</span>
              <span class="client-detail-value">${r.telefone ?? ""}</span>
            </div>
          </div>
          <div style="margin-top: 12px;">
            <button class="btn" onclick="editarCliente(${r.id})" style="background: var(--orange-500); width: 100%;">
              <i data-lucide="edit" style="width: 14px; height: 14px; margin-right: 4px;"></i>
              Editar Cliente
            </button>
          </div>
        </div>
      `)
      .join("");
  }
    
  // Recarregar ícones Lucide após renderizar a tabela
  Utils.updateIcons();

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

async function editarCliente(id) {
  // Encontrar o cliente no cache
  const cliente = clientesCache.find(c => c.id === id);
  if (!cliente) {
    alert("Cliente não encontrado!");
    return;
  }
  
  const content = `
    <form id="formEditarCliente">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Nome do Cliente:</label>
          <input type="text" id="editNome" value="${cliente.nome_cliente || ''}" class="input" required>
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Telefone:</label>
          <input type="tel" id="editTelefone" value="${cliente.telefone || ''}" class="input" required>
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Bairro:</label>
          <input type="text" id="editBairro" value="${cliente.bairro || ''}" class="input">
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Cidade:</label>
          <input type="text" id="editCidade" value="${cliente.cidade || ''}" class="input">
        </div>
      </div>
      <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
        <button type="button" id="btnCancelarEdicao" style="
          background: #6b7280;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
        ">Cancelar</button>
        <button type="submit" style="
          background: var(--orange-500);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
        ">Salvar Alterações</button>
      </div>
    </form>
  `;
  
  const { modal, fecharModal } = Utils.criarModal('Editar Cliente', content);
  
  // Adicionar evento de cancelar
  document.getElementById('btnCancelarEdicao').addEventListener('click', fecharModal);
  
  // Adicionar evento de submit
  document.getElementById('formEditarCliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dadosAtualizados = {
      nome_cliente: document.getElementById('editNome').value.trim(),
      telefone: document.getElementById('editTelefone').value.trim(),
      bairro: document.getElementById('editBairro').value.trim(),
      cidade: document.getElementById('editCidade').value.trim()
    };
    
    try {
      console.log("Enviando dados para atualização:", dadosAtualizados);
      
      const response = await API.api(`/clientes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dadosAtualizados)
      });
      
      console.log("Resposta do servidor:", response);
      alert("✅ Cliente atualizado com sucesso!");
      fecharModal();
      await renderClientes(); // Recarregar a lista
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      alert("❌ Erro ao atualizar cliente: " + (error.details || error.message));
    }
  });
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
    Utils.downloadFile(blob, 'relatorio_clientes.csv');
    alert("✅ CSV gerado com sucesso!");
  } catch (error) {
    console.error("Erro ao baixar CSV:", error);
    alert("❌ Erro ao baixar CSV: " + error.message);
  }
}
