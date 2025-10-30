let paginaAtualEntregas = 1;
const TAM_PAGINA_ENTREGAS = 10;
let dadosEntregas = null;
let todasEntregas = [];
let entregasFiltradas = [];
let entregadoresCache = [];
let produtosCache = [];

(async function () {
  await Auth.guard();
  configurarFiltroToggle();
  await Promise.all([carregarEntregadores(), carregarProdutos()]);
  await renderEntregas();
  setInterval(atualizarTimestamps, 60000);
})();

async function carregarEntregadores() {
  try {
    const data = await API.api("/entregadores");
    entregadoresCache = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao carregar entregadores:", error);
    entregadoresCache = [];
  }
}

async function carregarProdutos() {
  try {
    const data = await API.api("/produtos");
    produtosCache = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    produtosCache = [];
  }
}

function configurarFiltroToggle() {
  const button = document.getElementById("btnToggleFilters");
  const wrapper = document.getElementById("filtersWrapper");
  if (!button || !wrapper) return;

  button.addEventListener("click", () => {
    const isCollapsed = wrapper.classList.toggle("collapsed");
    if (!isCollapsed) {
      wrapper.classList.add("expanded");
    } else {
      wrapper.classList.remove("expanded");
    }
    setTimeout(() => Utils.updateIcons(), 120);
  });
}

function mapEntregaFrontend(entrega) {
  if (!entrega) return {};

  const entregador =
    entrega.entregador_id && Array.isArray(entregadoresCache)
      ? entregadoresCache.find(
          (item) => Number(item.id) === Number(entrega.entregador_id)
        )
      : null;

  const valorItens =
    entrega.valor_itens !== undefined && entrega.valor_itens !== null
      ? Number(entrega.valor_itens)
      : null;
  const valorFreteInformado =
    entrega.valor_frete !== undefined && entrega.valor_frete !== null
      ? Number(entrega.valor_frete)
      : null;
  const valorFreteBase =
    entregador && entregador.valor_frete !== undefined && entregador.valor_frete !== null
      ? Number(entregador.valor_frete)
      : entrega.entregador_frete_base !== undefined && entrega.entregador_frete_base !== null
      ? Number(entrega.entregador_frete_base)
      : null;
  const valorFrete = valorFreteInformado ?? valorFreteBase ?? null;

  const valorTotalBanco =
    entrega.valor_total !== undefined && entrega.valor_total !== null
      ? Number(entrega.valor_total)
      : null;
  const valorTotalCalculado =
    valorItens !== null || valorFrete !== null
      ? (valorItens || 0) + (valorFrete || 0)
      : null;

  const nomeEntregador =
    (entregador && entregador.nome) ||
    Utils.formatarEntregador(entrega.entregador_nome || entrega.entregador || "");
  const telefoneEntregador =
    (entregador && entregador.telefone) ||
    entrega.entregador_telefone ||
    entrega.telefone_entregador ||
    "";

  return {
    ...entrega,
    valor_itens: valorItens,
    valor_frete: valorFrete,
    valor_total: valorTotalBanco ?? valorTotalCalculado,
    valor_total_calculado: valorTotalCalculado,
    valor_total_bruto: valorTotalBanco,
    forma_pagamento_formatada: Utils.formatarFormaPagamento(
      entrega.forma_pagamento
    ),
    entregador_id: entrega.entregador_id
      ? Number(entrega.entregador_id)
      : entregador?.id ?? null,
    entregador_nome: nomeEntregador,
    entregador_telefone: telefoneEntregador,
    entregador_valor_frete: valorFreteBase,
  };
}

async function renderEntregas() {
  try {
    const result = await API.api(`/entregas?page=1&limit=1000`);
    const lista = Array.isArray(result.entregas) ? result.entregas : [];
    todasEntregas = lista.map(mapEntregaFrontend);
    dadosEntregas = result;

    populateFilterOptions();
    applyFilters();

    setTimeout(() => {
      atualizarTimestamps();
      Utils.updateIcons();
    }, 120);
  } catch (error) {
    console.error("Erro ao carregar entregas:", error);
    alert("Erro ao carregar entregas: " + error.message);
  }
}

function applyFilters() {
  if (!Array.isArray(todasEntregas) || todasEntregas.length === 0) {
    entregasFiltradas = [];
    renderEntregasTable([]);
    return;
  }

  const statusSelect = document.getElementById("filterStatus");
  const sortSelect = document.getElementById("filterSort");
  const searchInput = document.getElementById("filterSearch");
  const unidadeSelect = document.getElementById("filterUnidade");
  const entregadorSelect = document.getElementById("filterEntregador");
  const startInput = document.getElementById("filterStartDate");
  const endInput = document.getElementById("filterEndDate");

  const statusFilter = (statusSelect?.value || "").toLowerCase();
  const sortFilter = sortSelect?.value || "status";
  const searchFilter = (searchInput?.value || "").trim().toLowerCase();
  const unidadeFilter = (unidadeSelect?.value || "").trim().toLowerCase();
  const entregadorFilterValue = entregadorSelect?.value || "";
  const selectedEntregadorOption =
    entregadorSelect && entregadorSelect.selectedIndex >= 0
      ? entregadorSelect.options[entregadorSelect.selectedIndex]
      : null;
  const entregadorFilterName =
    (selectedEntregadorOption?.dataset?.nome || "").toLowerCase();
  const startDateValue = startInput?.value || "";
  const endDateValue = endInput?.value || "";

  syncPeriodInputBounds(startDateValue, endDateValue);

  let startDate = startDateValue
    ? new Date(`${startDateValue}T00:00:00`)
    : null;
  let endDate = endDateValue
    ? new Date(`${endDateValue}T23:59:59.999`)
    : null;

  if (startDate && isNaN(startDate.getTime())) startDate = null;
  if (endDate && isNaN(endDate.getTime())) endDate = null;

  let filtradas = [...todasEntregas];

  if (statusFilter) {
    filtradas = filtradas.filter((entrega) => {
      const status = (entrega.status_pedido || "").toLowerCase();
      return status === statusFilter;
    });
  }

  if (unidadeFilter) {
    filtradas = filtradas.filter(
      (entrega) =>
        (entrega.unidade_topgas || "").toLowerCase() === unidadeFilter
    );
  }

  if (entregadorFilterValue) {
    filtradas = filtradas.filter((entrega) => {
      const entregaId = entrega.entregador_id
        ? String(entrega.entregador_id)
        : "";
      const entregaNome = Utils.formatarEntregador(
        entrega.entregador_nome || entrega.entregador || ""
      ).toLowerCase();

      if (entregaId && entregaId === entregadorFilterValue) return true;
      if (entregadorFilterName && entregaNome === entregadorFilterName)
        return true;
      return false;
    });
  }

  if (startDate || endDate) {
    filtradas = filtradas.filter((entrega) => {
      const dataReferencia =
        parseEntregaDate(entrega.data_e_hora_inicio_pedido) ||
        parseEntregaDate(entrega.data_e_hora_envio_pedido) ||
        parseEntregaDate(entrega.data_e_hora_confirmacao_pedido) ||
        parseEntregaDate(entrega.data_finalizacao);

      if (!dataReferencia) return false;
      if (startDate && dataReferencia < startDate) return false;
      if (endDate && dataReferencia > endDate) return false;
      return true;
    });
  }

  if (searchFilter) {
    filtradas = filtradas.filter((entrega) => {
      const campos = [
        entrega.nome_cliente,
        entrega.protocolo,
        entrega.bairro,
        entrega.cidade,
        entrega.entregador_nome || entrega.entregador,
        entrega.unidade_topgas,
        entrega.telefone_cliente,
        entrega.entregador_telefone,
        entrega.forma_pagamento_formatada,
      ];

      return campos.some((campo) =>
        (campo || "").toLowerCase().includes(searchFilter)
      );
    });
  }

  filtradas = sortEntregas(filtradas, sortFilter);
  entregasFiltradas = filtradas;
  renderEntregasTable(entregasFiltradas);
  renderPaginacaoEntregas();
}

function populateFilterOptions() {
  const unidadeSelect = document.getElementById("filterUnidade");
  const entregadorSelect = document.getElementById("filterEntregador");

  if (!unidadeSelect || !entregadorSelect) {
    return;
  }

  const currentUnidade = unidadeSelect.value;
  const currentEntregador = entregadorSelect.value;

  const unidades = Array.from(
    new Set(
      (todasEntregas || [])
        .map((entrega) => (entrega.unidade_topgas || "").trim())
        .filter((value) => value)
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const entregadoresOptions =
    Array.isArray(entregadoresCache) && entregadoresCache.length
      ? entregadoresCache
          .filter((entregador) => entregador && entregador.nome)
          .map((entregador) => ({
            value: String(entregador.id),
            label: entregador.nome,
            dataset: { nome: entregador.nome.toLowerCase() },
          }))
      : Array.from(
          new Set(
            (todasEntregas || [])
              .map((entrega) =>
                Utils.formatarEntregador(
                  entrega.entregador_nome || entrega.entregador || ""
                ).trim()
              )
              .filter((value) => value && value !== "-")
          )
        ).map((nome) => ({
          value: nome.toLowerCase(),
          label: nome,
          dataset: { nome: nome.toLowerCase() },
        }));

  entregadoresOptions.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  fillSelectWithOptions(unidadeSelect, unidades, "Todas");
  if (currentUnidade && unidades.includes(currentUnidade)) {
    unidadeSelect.value = currentUnidade;
  }

  fillSelectWithOptions(entregadorSelect, entregadoresOptions, "Todos");
  if (currentEntregador) {
    const hasOption = Array.from(entregadorSelect.options).some(
      (option) => option.value === currentEntregador
    );
    if (hasOption) {
      entregadorSelect.value = currentEntregador;
    }
  }
}

function fillSelectWithOptions(selectElement, values, defaultLabel) {
  if (!selectElement) return;

  selectElement.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultLabel;
  selectElement.appendChild(defaultOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    if (value && typeof value === "object") {
      option.value =
        value.value !== undefined && value.value !== null
          ? String(value.value)
          : "";
      option.textContent =
        value.label !== undefined && value.label !== null
          ? String(value.label)
          : option.value;
      if (value.dataset && typeof value.dataset === "object") {
        Object.entries(value.dataset).forEach(([key, val]) => {
          option.dataset[key] = val;
        });
      }
    } else {
      option.value = String(value);
      option.textContent = String(value);
    }
    selectElement.appendChild(option);
  });
}

function syncPeriodInputBounds(startValue, endValue) {
  const startInput = document.getElementById("filterStartDate");
  const endInput = document.getElementById("filterEndDate");

  if (startInput) {
    startInput.max = endValue || "";
  }

  if (endInput) {
    endInput.min = startValue || "";
  }
}

function parseEntregaDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const numericDate = new Date(value);
    return isNaN(numericDate.getTime()) ? null : numericDate;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    let parsed = new Date(trimmed);
    if (isNaN(parsed.getTime()) && trimmed.includes(" ")) {
      parsed = new Date(trimmed.replace(" ", "T"));
    }

    if (isNaN(parsed.getTime()) && /^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
      const [datePart, timePart = "00:00:00"] = trimmed.split(" ");
      const [day, month, year] = datePart.split("/");
      const timePieces = timePart.split(":");
      const hour = Number(timePieces[0] || "00");
      const minute = Number(timePieces[1] || "00");
      const second = Number(timePieces[2] || "00");
      parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour,
        minute,
        second
      );
    }

    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function sortEntregas(entregas, sortBy) {
  return entregas.sort((a, b) => {
    switch (sortBy) {
      case "status": {
        const statusOrder = {
          pendente: 1,
          "em entrega": 2,
          em_andamento: 2,
          "em_andamento": 2,
          entregue: 3,
          "entregue": 3,
          cancelado: 4,
          "cancelado": 4,
        };
        const statusA = (a.status_pedido || "").toLowerCase();
        const statusB = (b.status_pedido || "").toLowerCase();
        return (statusOrder[statusA] || 99) - (statusOrder[statusB] || 99);
      }
      case "protocolo":
        return (a.protocolo || "").localeCompare(b.protocolo || "");
      case "nome":
        return (a.nome_cliente || "").localeCompare(b.nome_cliente || "");
      case "bairro":
        return (a.bairro || "").localeCompare(b.bairro || "");
      case "entregador":
        return (a.entregador_nome || a.entregador || "").localeCompare(
          b.entregador_nome || b.entregador || ""
        );
      case "data": {
        const dataA =
          parseEntregaDate(a.data_e_hora_inicio_pedido) ||
          parseEntregaDate(a.data_finalizacao) ||
          new Date(0);
        const dataB =
          parseEntregaDate(b.data_e_hora_inicio_pedido) ||
          parseEntregaDate(b.data_finalizacao) ||
          new Date(0);
        return dataB - dataA;
      }
      default:
        return 0;
    }
  });
}

function renderEntregasTable(entregas) {
  if (!entregas || entregas.length === 0) {
    const tbody = document.querySelector("#tbEntregas tbody");
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="11" class="table-empty">Nenhuma entrega encontrada</td></tr>';
    }

    const mobileContainer = document.getElementById("mobileEntregas");
    if (mobileContainer) {
      mobileContainer.innerHTML =
        '<div class="table-empty">Nenhuma entrega encontrada</div>';
    }
    return;
  }

  renderDesktopTable(entregas);
  renderMobileView(entregas);
  Utils.updateIcons();
}

function renderDesktopTable(entregas) {
  const tbody = document.querySelector("#tbEntregas tbody");
  if (!tbody) return;

  tbody.innerHTML = entregas
    .map((entrega) => {
      const statusNormalizado = (entrega.status_pedido || "").toLowerCase();
      const finalizada = statusNormalizado === "entregue";
      const cancelada = statusNormalizado === "cancelado";
      const podeFinalizar = !finalizada && !cancelada;
      const podeCancelar = !cancelada;
      const telefoneEntregador =
        entrega.entregador_telefone || entrega.telefone_entregador || "-";
      const telefoneLink =
        telefoneEntregador && telefoneEntregador !== "-"
          ? `<a class="driver-phone" href="tel:${telefoneEntregador}">${telefoneEntregador}</a>`
          : '<span class="driver-phone">-</span>';

      const actions = [];
      if (podeFinalizar) {
        actions.push(
          `<button class="btn btn-small" onclick="abrirModalFinalizacao(${entrega.id})" title="Finalizar entrega"><i data-lucide="check-circle-2"></i>Finalizar</button>`
        );
      } else {
        actions.push(
          '<span class="delivery-status-badge delivery-status-success">Finalizada</span>'
        );
      }

      if (podeCancelar) {
        actions.push(
          `<button class="btn btn-small btn-danger" onclick="cancelarEntrega(${entrega.id})" title="Cancelar entrega"><i data-lucide="x-circle"></i>Cancelar</button>`
        );
      }

      return `
      <tr data-entrega-id="${entrega.id}">
        <td>${entrega.protocolo || "-"}</td>
        <td>${entrega.nome_cliente || "-"}</td>
        <td>${entrega.telefone_cliente || "-"}</td>
        <td>${entrega.mercadoria_pedido || "-"}</td>
        <td>
          <div class="delivery-driver">
            <span class="driver-name">${entrega.entregador_nome || Utils.formatarEntregador(entrega.entregador) || "-"}</span>
            ${telefoneLink}
          </div>
        </td>
        <td>
          <div class="delivery-values">
            <span class="payment-label">${entrega.forma_pagamento_formatada || "-"}</span>
            <div class="delivery-values-breakdown">
              <span>Itens: ${Utils.formatCurrency(entrega.valor_itens)}</span>
              <span>Frete: ${Utils.formatCurrency(entrega.valor_frete)}</span>
              <span class="delivery-total">Total: ${Utils.formatCurrency(entrega.valor_total)}</span>
            </div>
          </div>
        </td>
        <td>${entrega.endereco || "-"}</td>
        <td>${entrega.bairro || "-"}</td>
        <td>${entrega.unidade_topgas || "-"}</td>
        <td class="delivery-timestamps-cell">${renderTimestamps(entrega)}</td>
        <td>
          <div class="delivery-actions">
            ${actions.join("")}
          </div>
        </td>
      </tr>
  `;
    })
    .join("");
}

function renderMobileView(entregas) {
  const mobileContainer = document.getElementById("mobileEntregas");
  if (!mobileContainer) return;

  mobileContainer.innerHTML = entregas
    .map((entrega) => {
      const statusNormalizado = (entrega.status_pedido || "").toLowerCase();
      const finalizada = statusNormalizado === "entregue";
      const cancelada = statusNormalizado === "cancelado";
      const podeFinalizar = !finalizada && !cancelada;
      const podeCancelar = !cancelada;
      const telefoneEntregador =
        entrega.entregador_telefone || entrega.telefone_entregador || "-";
      const telefoneEntregadorHtml =
        telefoneEntregador && telefoneEntregador !== "-"
          ? `<a href="tel:${telefoneEntregador}" class="detail-value">${telefoneEntregador}</a>`
          : '<span class="detail-value">-</span>';

      const actions = [];
      if (podeFinalizar) {
        actions.push(
          `<button class="btn btn-small" onclick="abrirModalFinalizacao(${entrega.id})"><i data-lucide="check-circle-2"></i>Finalizar</button>`
        );
      } else {
        actions.push(
          '<span class="delivery-status-badge delivery-status-success">Finalizada</span>'
        );
      }

      if (podeCancelar) {
        actions.push(
          `<button class="btn btn-small btn-danger" onclick="cancelarEntrega(${entrega.id})"><i data-lucide="x-circle"></i>Cancelar</button>`
        );
      }

      return `
      <div class="delivery-item" id="delivery-${entrega.id}" data-entrega-id="${entrega.id}">
        <div class="delivery-header" onclick="toggleDeliveryDetails(${entrega.id})">
          <div class="delivery-name">${entrega.nome_cliente || "-"}</div>
          <div class="delivery-status">${Utils.getStatusIcon(
            entrega.status_pedido
          )} ${entrega.status_pedido || "pendente"}</div>
        </div>
        <div class="delivery-details" id="details-${entrega.id}">
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
            <span class="detail-label">Forma pag.:</span>
            <span class="detail-value">${entrega.forma_pagamento_formatada || "-"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Entregador:</span>
            <span class="detail-value">${entrega.entregador_nome || Utils.formatarEntregador(entrega.entregador) || "-"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Contato entregador:</span>
            ${telefoneEntregadorHtml}
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
          <div class="detail-row delivery-values-mobile">
            <span class="detail-label">Valores:</span>
            <div class="detail-value">
              <div>Itens: ${Utils.formatCurrency(entrega.valor_itens)}</div>
              <div>Frete: ${Utils.formatCurrency(entrega.valor_frete)}</div>
              <div><strong>Total: ${Utils.formatCurrency(entrega.valor_total)}</strong></div>
            </div>
          </div>
          <div class="delivery-actions">
            ${actions.join("")}
          </div>
          <div class="delivery-timestamps">
            ${renderTimestamps(entrega)}
          </div>
        </div>
      </div>
  `;
    })
    .join("");
}

function renderTimestamps(entrega) {
  if (!entrega)
    return '<div class="delivery-timestamps">Erro ao carregar dados</div>';

  const estadoAtual = Utils.getEstadoAtualEntrega(entrega);
  const pedidoFeito = Utils.formatarData(entrega.data_e_hora_inicio_pedido);
  const enviado = Utils.formatarData(entrega.data_e_hora_envio_pedido);
  const finalizado = Utils.getFinalizadoData(entrega);

  return `
    <div class="delivery-timestamps" onclick="toggleTimestamps(${entrega.id})">
      <div class="timestamp-accordion">
        <div class="timestamp-header">
          <span class="timestamp-label">Status:</span>
          <span class="timestamp-value">${estadoAtual}</span>
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

function atualizarTimestamps() {
  if (!Array.isArray(entregasFiltradas) || entregasFiltradas.length === 0) {
    return;
  }

  document
    .querySelectorAll("#tbEntregas tbody tr")
    .forEach((row) => {
      const entregaId = Number(row.dataset.entregaId);
      const entrega = entregasFiltradas.find(
        (item) => Number(item.id) === entregaId
      );
      if (!entrega) return;
      const cell = row.querySelector(".delivery-timestamps-cell");
      if (cell) {
        cell.innerHTML = renderTimestamps(entrega);
      }
    });

  document.querySelectorAll(".delivery-item").forEach((item) => {
    const entregaId = Number(item.dataset.entregaId);
    const entrega = entregasFiltradas.find(
      (ent) => Number(ent.id) === entregaId
    );
    if (!entrega) return;
    const container = item.querySelector(".delivery-timestamps");
    if (container) {
      container.innerHTML = renderTimestamps(entrega);
    }
  });
}

function toggleDeliveryDetails(entregaId) {
  const details = document.getElementById(`details-${entregaId}`);
  const item = document.getElementById(`delivery-${entregaId}`);

  if (details && item) {
    details.classList.toggle("expanded");
    item.classList.toggle("expanded");
  }
}

function toggleTimestamps(entregaId) {
  const details = document.getElementById(`timestamps-${entregaId}`);
  const accordion = details?.closest(".timestamp-accordion");
  const arrow = accordion?.querySelector(".timestamp-arrow");

  if (details && arrow) {
    const isHidden =
      details.style.display === "none" || details.style.display === "";
    details.style.display = isHidden ? "block" : "none";
    arrow.textContent = isHidden ? "▲" : "▼";
    accordion.classList.toggle("expanded", isHidden);
  }
}

function renderPaginacaoEntregas() {
  if (!dadosEntregas) return;

  const { paginacao } = dadosEntregas;
  const info = document.getElementById("pagInfoEntregas");
  const btnPrev = document.getElementById("btnPrevEntregas");
  const btnNext = document.getElementById("btnNextEntregas");

  if (info)
    info.textContent = `${paginacao.pagina} / ${paginacao.totalPaginas}`;
  if (btnPrev) btnPrev.disabled = paginacao.pagina <= 1;
  if (btnNext) btnNext.disabled = paginacao.pagina >= paginacao.totalPaginas;
}

function nextEntregas() {
  if (
    dadosEntregas &&
    paginaAtualEntregas < dadosEntregas.paginacao.totalPaginas
  ) {
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

function obterEntregaPorId(id) {
  return (todasEntregas || []).find(
    (entrega) => Number(entrega.id) === Number(id)
  );
}

function normalizarTexto(texto) {
  if (!texto) return "";
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function encontrarProdutoParaEntrega(entrega) {
  if (!entrega || !Array.isArray(produtosCache) || !produtosCache.length) {
    return null;
  }

  const descricao = normalizarTexto(entrega.mercadoria_pedido || "");
  if (!descricao) return null;

  return (
    produtosCache.find((produto) => {
      const nomeNormalizado = normalizarTexto(produto.nome);
      return nomeNormalizado && descricao.includes(nomeNormalizado);
    }) || null
  );
}

function sugerirValorItens(entrega, formaPagamento) {
  if (!entrega) return null;
  if (entrega.valor_itens !== null && entrega.valor_itens !== undefined) {
    return Number(entrega.valor_itens);
  }

  const produto = encontrarProdutoParaEntrega(entrega);
  if (!produto) return null;

  const forma = (formaPagamento || "").toLowerCase();
  switch (forma) {
    case "pix":
      return produto.valor_pix !== null ? Number(produto.valor_pix) : null;
    case "debito":
    case "débito":
      return produto.valor_debito !== null ? Number(produto.valor_debito) : null;
    case "credito":
    case "crédito":
      return produto.valor_credito !== null ? Number(produto.valor_credito) : null;
    default:
      return produto.valor !== null ? Number(produto.valor) : null;
  }
}

function parseCurrencyInput(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const sanitized = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  if (!sanitized) return null;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function abrirModalFinalizacao(entregaId) {
  const entrega = obterEntregaPorId(entregaId);
  if (!entrega) {
    alert("Entrega não encontrada.");
    return;
  }

  const formaPagamentoPadrao = (entrega.forma_pagamento || "dinheiro").toLowerCase();
  const valorItensSugerido =
    sugerirValorItens(entrega, formaPagamentoPadrao) ?? null;
  const valorFretePadrao =
    entrega.valor_frete ?? entrega.entregador_valor_frete ?? 0;

  const entregadoresOptions = [
    '<option value="">Manter atual</option>',
    ...(Array.isArray(entregadoresCache)
      ? entregadoresCache.map(
          (entregador) =>
            `<option value="${entregador.id}" ${
              Number(entregador.id) === Number(entrega.entregador_id)
                ? "selected"
                : ""
            }>${entregador.nome}</option>`
        )
      : []),
  ].join("");

  const modalHtml = `
    <form id="formFinalizarEntrega" class="modal-form">
      <div class="modal-field">
        <label>Mercadoria</label>
        <p class="field-readonly">${entrega.mercadoria_pedido || "-"}</p>
      </div>
      <div class="modal-field">
        <label>Entregador</label>
        <select id="finalizarEntregador">${entregadoresOptions}</select>
      </div>
      <div class="modal-field">
        <label>Forma de pagamento</label>
        <select id="finalizarFormaPagamento">
          <option value="dinheiro" ${
            formaPagamentoPadrao === "dinheiro" ? "selected" : ""
          }>Dinheiro</option>
          <option value="pix" ${
            formaPagamentoPadrao === "pix" ? "selected" : ""
          }>Pix</option>
          <option value="debito" ${
            formaPagamentoPadrao === "debito" || formaPagamentoPadrao === "débito"
              ? "selected"
              : ""
          }>Débito</option>
          <option value="credito" ${
            formaPagamentoPadrao === "credito" || formaPagamentoPadrao === "crédito"
              ? "selected"
              : ""
          }>Crédito</option>
        </select>
      </div>
      <div class="modal-grid">
        <div class="modal-field">
          <label>Valor dos itens</label>
          <input type="number" step="0.01" id="finalizarValorItens" value="${
            valorItensSugerido !== null
              ? valorItensSugerido.toFixed(2)
              : ""
          }" placeholder="0,00" />
        </div>
        <div class="modal-field">
          <label>Valor do frete</label>
          <input type="number" step="0.01" id="finalizarValorFrete" value="${
            Number(valorFretePadrao || 0).toFixed(2)
          }" placeholder="0,00" />
        </div>
      </div>
      <div class="modal-summary" id="finalizarResumoTotal">
        Total: <strong>${Utils.formatCurrency(
          (valorItensSugerido || 0) + Number(valorFretePadrao || 0)
        )}</strong>
      </div>
      <div class="modal-field">
        <label>Observações</label>
        <textarea id="finalizarObservacoes" rows="3">${
          entrega.observacoes || ""
        }</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-muted" id="btnCancelarModal">Cancelar</button>
        <button type="submit" class="btn btn-primary">Finalizar entrega</button>
      </div>
    </form>
  `;

  const { modal, fecharModal } = Utils.criarModal(
    `Finalizar entrega #${entrega.protocolo || entrega.id}`,
    modalHtml
  );

  const form = modal.querySelector("#formFinalizarEntrega");
  const entregadorSelect = modal.querySelector("#finalizarEntregador");
  const formaPagamentoSelect = modal.querySelector(
    "#finalizarFormaPagamento"
  );
  const valorItensInput = modal.querySelector("#finalizarValorItens");
  const valorFreteInput = modal.querySelector("#finalizarValorFrete");
  const observacoesInput = modal.querySelector("#finalizarObservacoes");
  const resumoTotal = modal.querySelector("#finalizarResumoTotal");
  const btnCancelar = modal.querySelector("#btnCancelarModal");

  const atualizarTotal = () => {
    const itens = parseCurrencyInput(valorItensInput.value) || 0;
    const frete = parseCurrencyInput(valorFreteInput.value) || 0;
    resumoTotal.innerHTML = `Total: <strong>${Utils.formatCurrency(
      itens + frete
    )}</strong>`;
  };

  formaPagamentoSelect.addEventListener("change", () => {
    const forma = formaPagamentoSelect.value;
    const sugestao = sugerirValorItens(entrega, forma);
    if (sugestao !== null && valorItensInput.value === "") {
      valorItensInput.value = sugestao.toFixed(2);
    }
    atualizarTotal();
  });

  valorItensInput.addEventListener("input", atualizarTotal);
  valorFreteInput.addEventListener("input", atualizarTotal);

  btnCancelar?.addEventListener("click", () => fecharModal());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formaPagamento = formaPagamentoSelect.value;
    const valorItens = parseCurrencyInput(valorItensInput.value);
    const valorFrete = parseCurrencyInput(valorFreteInput.value);

    if (valorItens === null) {
      alert("Informe um valor válido para os itens.");
      return;
    }

    const payload = {
      forma_pagamento: formaPagamento,
      valor_itens: valorItens,
      valor_frete: valorFrete,
      observacoes: observacoesInput.value || null,
    };

    if (entregadorSelect && entregadorSelect.value) {
      payload.entregador_id = Number(entregadorSelect.value);
    }

    try {
      await API.api(`/entregas/${entregaId}/finalizar`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      alert("Entrega finalizada com sucesso!");
      fecharModal();
      await renderEntregas();
    } catch (error) {
      console.error("Erro ao finalizar entrega:", error);
      alert("Erro ao finalizar entrega: " + error.message);
    }
  });

  Utils.updateIcons();
  atualizarTotal();
}

async function confirmarEntrega(id) {
  if (!confirm("Tem certeza que deseja confirmar esta entrega?")) return;

  try {
    await API.api(`/entregas/${id}/confirmar`, { method: "POST" });
    alert("✅ Entrega confirmada com sucesso!");
    await renderEntregas();
    Utils.updateIcons();
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
    Utils.updateIcons();
    setTimeout(atualizarTimestamps, 200);
  } catch (e) {
    alert("❌ Falha ao cancelar entrega: " + e.message);
  }
}

async function downloadCSV() {
  let btn = null;
  let originalText = "";

  try {
    const maybeEvent = typeof event !== "undefined" ? event : null;
    btn =
      (maybeEvent && (maybeEvent.currentTarget || maybeEvent.target)) ||
      document.getElementById("btnDownloadCSV");

    if (btn) {
      originalText = btn.textContent;
      btn.textContent = "Gerando...";
      btn.disabled = true;
    }

    if (!entregasFiltradas || entregasFiltradas.length === 0) {
      throw new Error("Nenhuma entrega encontrada com os filtros atuais.");
    }

    const csv = gerarCsvDasEntregas(entregasFiltradas);
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    if (blob.size === 0) {
      throw new Error("Não há dados para exportar.");
    }

    const filename = `relatorio_entregas_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    Utils.downloadFile(blob, filename);

    alert("CSV gerado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar CSV:", error);
    alert("Erro ao gerar CSV: " + error.message);
  } finally {
    if (btn) {
      btn.textContent = originalText || "Download CSV";
      btn.disabled = false;
    }
  }
}

function gerarCsvDasEntregas(entregas) {
  const headers = [
    "Protocolo",
    "Cliente",
    "Telefone Cliente",
    "Pedido",
    "Forma Pagamento",
    "Valor Itens",
    "Valor Frete",
    "Valor Total",
    "Entregador",
    "Telefone Entregador",
    "Unidade",
    "Status",
    "Início",
    "Envio",
    "Confirmação",
    "Cancelamento",
  ];

  const linhas = entregas.map((entrega) => [
    entrega.protocolo || "",
    entrega.nome_cliente || "",
    entrega.telefone_cliente || "",
    entrega.mercadoria_pedido || "",
    entrega.forma_pagamento_formatada ||
      Utils.formatarFormaPagamento(entrega.forma_pagamento) ||
      "",
    formatNumberBr(entrega.valor_itens),
    formatNumberBr(entrega.valor_frete),
    formatNumberBr(entrega.valor_total),
    entrega.entregador_nome || Utils.formatarEntregador(entrega.entregador) || "",
    entrega.entregador_telefone || entrega.telefone_entregador || "",
    entrega.unidade_topgas || "",
    entrega.status_pedido || "",
    formatCsvDate(entrega.data_e_hora_inicio_pedido),
    formatCsvDate(entrega.data_e_hora_envio_pedido),
    formatCsvDate(entrega.data_e_hora_confirmacao_pedido),
    formatCsvDate(entrega.data_e_hora_cancelamento_pedido),
  ]);

  const csvLinhas = [
    headers.join(";"),
    ...linhas.map((linha) => linha.map(csvEscape).join(";")),
  ];

  return csvLinhas.join("\n");
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const texto = String(value).replace(/\r?\n/g, " ");
  if (/[";]/.test(texto)) {
    return '"' + texto.replace(/"/g, '""') + '"';
  }
  return texto;
}

function formatNumberBr(valor) {
  if (valor === null || valor === undefined || valor === "") return "";
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "";
  return numero.toFixed(2).replace(".", ",");
}

function formatCsvDate(valor) {
  if (!valor) return "";
  const data = parseEntregaDate(valor);
  if (!data) return "";
  return (
    data.toLocaleDateString("pt-BR") +
    " " +
    data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}
