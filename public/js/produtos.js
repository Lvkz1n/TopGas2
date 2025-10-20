(() => {
  const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

  const escapeHtml = (value) => {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatNumberInput = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    return num.toFixed(2);
  };

  const ProdutosPage = {
    cache: [],
    filtered: [],
    isAdmin: false,
    loading: false,
    expanded: new Set(),

    async init() {
      await this.loadProdutos();
      this.renderHeaderActions();
    },

    async loadProdutos(preserveFilters = true) {
      const unidadeSelect = document.getElementById("filterProdutoUnidade");
      const buscaInput = document.getElementById("filterProdutoBusca");
      const previousUnidade =
        preserveFilters && unidadeSelect ? unidadeSelect.value : "";
      const previousBusca =
        preserveFilters && buscaInput ? buscaInput.value : "";

      this.setLoading(true);

      try {
        const data = await API.api("/produtos");
        this.cache = Array.isArray(data) ? data : [];
        this.expanded.clear();
        this.populateUnidades(previousUnidade);
        if (preserveFilters && buscaInput) {
          buscaInput.value = previousBusca;
        }
        this.applyFilters();
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        alert(
          "Nao foi possivel carregar os produtos. " +
            (error?.message || "Tente novamente mais tarde.")
        );
      } finally {
        this.setLoading(false);
      }
    },

    populateUnidades(selectedValue = "") {
      const select = document.getElementById("filterProdutoUnidade");
      if (!select) return;

      const unidades = Array.from(
        new Set(
          this.cache
            .map((produto) => produto.unidade)
            .filter((unidade) => unidade && unidade.trim() !== "")
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR"));

      const options = [
        '<option value="">Todas</option>',
        ...unidades.map(
          (unidade) =>
            `<option value="${escapeHtml(unidade)}">${escapeHtml(
              unidade
            )}</option>`
        ),
      ];

      select.innerHTML = options.join("");
      select.value = selectedValue || "";
    },

    applyFilters() {
      const unidade = (
        document.getElementById("filterProdutoUnidade")?.value || ""
      ).toLowerCase();
      const busca = (document.getElementById("filterProdutoBusca")?.value || "")
        .trim()
        .toLowerCase();

      this.filtered = this.cache.filter((produto) => {
        const matchesUnidade = unidade
          ? (produto.unidade || "").toLowerCase() === unidade
          : true;

        const fieldsToSearch = [
          produto.nome,
          produto.id,
          produto.unidade,
          produto.observacoes,
        ];
        const matchesBusca = busca
          ? fieldsToSearch
              .filter((field) => field !== null && field !== undefined)
              .map((field) => field.toString().toLowerCase())
              .some((value) => value.includes(busca))
          : true;

        return matchesUnidade && matchesBusca;
      });

      this.renderProdutos();
    },

    renderProdutos() {
      const tbody = document.querySelector("#tbProdutos tbody");
      const mobileList = document.getElementById("mobileProdutos");
      const emptyState = document.getElementById("produtosEmptyState");

      if (!tbody) return;

      if (this.filtered.length === 0) {
        tbody.innerHTML = "";
        if (mobileList) mobileList.innerHTML = "";
        if (emptyState) emptyState.classList.remove("hidden");
        return;
      }

      if (emptyState) emptyState.classList.add("hidden");

      tbody.innerHTML = this.filtered
        .map((produto) => this.renderDesktopRow(produto))
        .join("");

      if (mobileList) {
        mobileList.innerHTML = this.filtered
          .map((produto) => this.renderMobileCard(produto))
          .join("");
      }

      Utils.updateIcons();
    },

    renderDesktopRow(produto) {
      const isExpanded = this.expanded.has(produto.id);
      const statusBadge = produto.ativo
        ? ""
        : '<span class="produto-status inativo">Inativo</span>';
      const toggleIcon = isExpanded ? "chevron-up" : "chevron-down";

      const resumo = `
        <div class="produto-resumo">
          <span>Pix: ${this.formatOptionalCurrency(produto.valor_pix)}</span>
          <span>Debito: ${this.formatOptionalCurrency(
            produto.valor_debito
          )}</span>
          <span>Credito: ${this.formatOptionalCurrency(
            produto.valor_credito
          )}</span>
        </div>
      `;

      const actions = [
        `<button class="btn btn-small btn-outline" data-produto-toggle="${
          produto.id
        }" onclick="ProdutosPage.toggleDetails(${produto.id})">
            <i data-lucide="${toggleIcon}"></i>
            ${isExpanded ? "Fechar" : "Detalhes"}
          </button>`,
      ];

      if (this.isAdmin) {
        actions.push(
          `<button class="btn btn-small" onclick="ProdutosPage.editProduct(${produto.id})" title="Editar">
              <i data-lucide="edit-3"></i>
            </button>`
        );
        actions.push(
          `<button class="btn btn-small btn-danger" onclick="ProdutosPage.deleteProduct(${produto.id})" title="Excluir">
              <i data-lucide="trash-2"></i>
            </button>`
        );
      }

      return `
        <tr class="produto-row">
          <td>${produto.id}</td>
          <td>${this.formatCurrency(produto.valor)}</td>
          <td>${escapeHtml(produto.unidade || "-")}</td>
          <td>
            <div class="produto-acoes">
              ${actions.join("")}
            </div>
          </td>
        </tr>
        <tr class="produto-detalhes-row ${
          isExpanded ? "" : "hidden"
        }" data-produto-details="${produto.id}">
          <td colspan="5">
            ${this.renderDetalhes(produto)}
          </td>
        </tr>
      `;
    },

    renderDetalhes(produto) {
      const itens = [
        {
          label: "Valor base",
          value: this.formatOptionalCurrency(produto.valor),
        },
        {
          label: "Valor Pix",
          value: this.formatOptionalCurrency(produto.valor_pix),
        },
        {
          label: "Valor debito",
          value: this.formatOptionalCurrency(produto.valor_debito),
        },
        {
          label: "Valor credito",
          value: this.formatOptionalCurrency(produto.valor_credito),
        },
        {
          label: "Entrega delivery",
          value: this.formatOptionalCurrency(produto.valor_entrega),
        },
        {
          label: "Retirada",
          value: this.formatOptionalCurrency(produto.valor_retirada),
        },
      ];

      const detalhesGrid = itens
        .map(
          (item) => `
            <div class="produto-detalhe">
              <span>${escapeHtml(item.label)}:</span>
              <strong>${item.value}</strong>
            </div>
          `
        )
        .join("");

      const observacoes = produto.observacoes
        ? `<div class="produto-observacoes"><strong>Observacoes:</strong> ${escapeHtml(
            produto.observacoes
          )}</div>`
        : "";

      return `
        <div class="produto-detalhes">
          <div class="produto-detalhes-grid">
            ${detalhesGrid}
          </div>
          ${observacoes}
          <div class="produto-meta">
            <span>Criado em: ${this.formatDate(produto.created_at)}</span>
            <span>Atualizado em: ${this.formatDate(produto.updated_at)}</span>
            <span>Status: ${produto.ativo ? "Ativo" : "Inativo"}</span>
          </div>
        </div>
      `;
    },

    renderMobileCard(produto) {
      return `
        <div class="produto-card">
          <div class="produto-card-header">
            <div>
              <div class="produto-card-nome">${escapeHtml(produto.nome)}</div>
              <div class="produto-card-status">${
                produto.ativo ? "Ativo" : "Inativo"
              }</div>
            </div>
            <div class="produto-card-valor">${this.formatCurrency(
              produto.valor
            )}</div>
          </div>
          <div class="produto-card-body">
            <div><strong>Unidade:</strong> ${escapeHtml(
              produto.unidade || "-"
            )}</div>
            <div><strong>Pix:</strong> ${this.formatOptionalCurrency(
              produto.valor_pix
            )}</div>
            <div><strong>Debito:</strong> ${this.formatOptionalCurrency(
              produto.valor_debito
            )}</div>
            <div><strong>Credito:</strong> ${this.formatOptionalCurrency(
              produto.valor_credito
            )}</div>
            <div><strong>Entrega:</strong> ${this.formatOptionalCurrency(
              produto.valor_entrega
            )}</div>
            <div><strong>Retirada:</strong> ${this.formatOptionalCurrency(
              produto.valor_retirada
            )}</div>
            ${
              produto.observacoes
                ? `<div><strong>Observacoes:</strong> ${escapeHtml(
                    produto.observacoes
                  )}</div>`
                : ""
            }
          </div>
          <div class="produto-card-meta">
            <span>Criado: ${this.formatDate(produto.created_at)}</span>
            <span>Atualizado: ${this.formatDate(produto.updated_at)}</span>
          </div>
          ${
            this.isAdmin
              ? `<div class="produto-card-actions">
                <button class="btn" onclick="ProdutosPage.editProduct(${produto.id})">
                  <i data-lucide="edit-3"></i>
                  Editar
                </button>
                <button class="btn btn-danger" onclick="ProdutosPage.deleteProduct(${produto.id})">
                  <i data-lucide="trash-2"></i>
                  Excluir
                </button>
              </div>`
              : ""
          }
        </div>
      `;
    },

    formatCurrency(valor) {
      if (
        valor === null ||
        valor === undefined ||
        Number.isNaN(Number(valor))
      ) {
        return "-";
      }
      return currencyFormatter.format(Number(valor));
    },

    formatOptionalCurrency(valor) {
      if (valor === null || valor === undefined || valor === "") {
        return "-";
      }
      const num = Number(valor);
      if (Number.isNaN(num)) return "-";
      return currencyFormatter.format(num);
    },

    formatDate(value) {
      if (!value) return "-";
      return Utils.formatarData(value);
    },

    setLoading(isLoading) {
      this.loading = isLoading;
      const tbody = document.querySelector("#tbProdutos tbody");
      const mobileList = document.getElementById("mobileProdutos");
      if (isLoading) {
        if (tbody) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; padding: 24px;">
                Carregando produtos...
              </td>
            </tr>
          `;
        }
        if (mobileList) {
          mobileList.innerHTML = `
            <div class="produto-card">
              <div style="text-align: center; padding: 16px;">Carregando produtos...</div>
            </div>
          `;
        }
      }
    },

    enableAdminFeatures() {
      this.isAdmin = true;
      this.renderHeaderActions();
    },

    renderHeaderActions() {
      const container = document.getElementById("produtoHeaderActions");
      if (!container) return;

      const buttons = [];

      if (this.isAdmin) {
        buttons.push(`
          <button class="btn" id="btnNovoProduto" style="background: var(--orange-500); color: white;">
            <i data-lucide="plus"></i>
            Novo Produto
          </button>
        `);
      }

      buttons.push(`
        <button class="btn" id="btnProdutosReload">
          <i data-lucide="refresh-cw"></i>
          Recarregar
        </button>
      `);

      if (this.isAdmin) {
        buttons.push(`
          <button class="btn" id="btnProdutosCSV" style="background: var(--orange-500); color: white;">
            <i data-lucide="download"></i>
            Exportar CSV
          </button>
        `);
      }

      container.innerHTML = `<div class="produto-header-actions">${buttons.join(
        ""
      )}</div>`;

      Utils.setupReloadButton("btnProdutosReload");

      if (this.isAdmin) {
        document
          .getElementById("btnNovoProduto")
          ?.addEventListener("click", () => this.openForm());

        document
          .getElementById("btnProdutosCSV")
          ?.addEventListener("click", () => this.downloadCSV());
      }

      Utils.updateIcons();
    },

    openForm(produto = null) {
      const isEdit = Boolean(produto);
      const title = isEdit ? "Editar Produto" : "Novo Produto";

      const content = `
        <form id="produtoForm" class="produto-form">
          <div class="form-grid">
            <label class="form-field">
              <span>Nome *</span>
              <input type="text" id="produtoNome" value="${
                produto?.nome ? escapeHtml(produto.nome) : ""
              }" required />
            </label>
            <label class="form-field">
              <span>Unidade *</span>
              <input type="text" id="produtoUnidade" value="${
                produto?.unidade ? escapeHtml(produto.unidade) : ""
              }" required />
            </label>
            <label class="form-field">
              <span>Valor base *</span>
              <input type="number" step="0.01" min="0" id="produtoValor" value="${formatNumberInput(
                produto?.valor
              )}" required />
            </label>
            <label class="form-field">
              <span>Valor Pix</span>
              <input type="number" step="0.01" min="0" id="produtoValorPix" value="${formatNumberInput(
                produto?.valor_pix
              )}" />
            </label>
            <label class="form-field">
              <span>Valor debito</span>
              <input type="number" step="0.01" min="0" id="produtoValorDebito" value="${formatNumberInput(
                produto?.valor_debito
              )}" />
            </label>
            <label class="form-field">
              <span>Valor credito</span>
              <input type="number" step="0.01" min="0" id="produtoValorCredito" value="${formatNumberInput(
                produto?.valor_credito
              )}" />
            </label>
            <label class="form-field">
              <span>Valor entrega delivery</span>
              <input type="number" step="0.01" min="0" id="produtoValorEntrega" value="${formatNumberInput(
                produto?.valor_entrega
              )}" />
            </label>
            <label class="form-field">
              <span>Valor retirada</span>
              <input type="number" step="0.01" min="0" id="produtoValorRetirada" value="${formatNumberInput(
                produto?.valor_retirada
              )}" />
            </label>
            <label class="form-field form-full">
              <span>Observacoes</span>
              <textarea id="produtoObservacoes" rows="3" placeholder="Anotacoes internas ou politicas de venda">${
                produto?.observacoes ? escapeHtml(produto.observacoes) : ""
              }</textarea>
            </label>
            <label class="form-field checkbox-field">
              <input type="checkbox" id="produtoAtivo" ${
                produto?.ativo !== false ? "checked" : ""
              } />
              <span>Produto ativo</span>
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-muted" id="produtoCancelar">Cancelar</button>
            <button type="submit" class="btn" style="background: var(--orange-500); color: white;">
              ${isEdit ? "Salvar alteracoes" : "Cadastrar produto"}
            </button>
          </div>
        </form>
      `;

      const { fecharModal } = Utils.criarModal(title, content);

      document
        .getElementById("produtoCancelar")
        ?.addEventListener("click", fecharModal);

      document
        .getElementById("produtoForm")
        ?.addEventListener("submit", async (event) => {
          event.preventDefault();

          const payload = this.getFormPayload();
          if (!payload) {
            return;
          }

          try {
            if (isEdit && produto) {
              await API.api(`/produtos/${produto.id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
              });
              alert("Produto atualizado com sucesso.");
            } else {
              await API.api("/produtos", {
                method: "POST",
                body: JSON.stringify(payload),
              });
              alert("Produto cadastrado com sucesso.");
            }

            fecharModal();
            await this.loadProdutos();
          } catch (error) {
            console.error("Erro ao salvar produto:", error);
            alert(
              "Nao foi possivel salvar o produto. " +
                (error?.details || error?.message || "")
            );
          }
        });
    },

    parseOptionalNumber(rawValue, label) {
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        return null;
      }
      const normalized = String(rawValue).replace(",", ".");
      const num = Number(normalized);
      if (Number.isNaN(num)) {
        alert(`Valor invalido para ${label}.`);
        throw new Error("invalid_number");
      }
      return num;
    },

    getFormPayload() {
      const nome = document.getElementById("produtoNome")?.value.trim();
      const observacoes = document
        .getElementById("produtoObservacoes")
        ?.value.trim();
      const unidade = document.getElementById("produtoUnidade")?.value.trim();
      const ativo = document.getElementById("produtoAtivo")?.checked ?? true;

      const valorRaw = document.getElementById("produtoValor")?.value;
      const valor =
        valorRaw !== undefined && valorRaw !== null
          ? parseFloat(String(valorRaw).replace(",", "."))
          : NaN;

      if (!nome) {
        alert("Informe o nome do produto.");
        return null;
      }

      if (!Number.isFinite(valor)) {
        alert("Informe um valor valido para o produto.");
        return null;
      }

      if (!unidade) {
        alert("Informe a unidade do produto.");
        return null;
      }

      try {
        const valor_pix = this.parseOptionalNumber(
          document.getElementById("produtoValorPix")?.value,
          "valor Pix"
        );
        const valor_debito = this.parseOptionalNumber(
          document.getElementById("produtoValorDebito")?.value,
          "valor debito"
        );
        const valor_credito = this.parseOptionalNumber(
          document.getElementById("produtoValorCredito")?.value,
          "valor credito"
        );
        const valor_entrega = this.parseOptionalNumber(
          document.getElementById("produtoValorEntrega")?.value,
          "valor de entrega"
        );
        const valor_retirada = this.parseOptionalNumber(
          document.getElementById("produtoValorRetirada")?.value,
          "valor de retirada"
        );

        return {
          nome,
          observacoes: observacoes || null,
          unidade,
          valor,
          valor_pix,
          valor_debito,
          valor_credito,
          valor_entrega,
          valor_retirada,
          ativo,
        };
      } catch (error) {
        if (error.message === "invalid_number") {
          return null;
        }
        throw error;
      }
    },

    toggleDetails(id) {
      const row = document.querySelector(`tr[data-produto-details="${id}"]`);
      if (!row) return;
      row.classList.toggle("hidden");
      const expanded = !row.classList.contains("hidden");
      if (expanded) {
        this.expanded.add(id);
      } else {
        this.expanded.delete(id);
      }

      const icon = document.querySelector(
        `button[data-produto-toggle="${id}"] i`
      );
      if (icon) {
        icon.setAttribute(
          "data-lucide",
          expanded ? "chevron-up" : "chevron-down"
        );
        Utils.updateIcons();
      }
    },

    editProduct(id) {
      const produto = this.cache.find((item) => item.id === id);
      if (!produto) {
        alert("Produto nao encontrado.");
        return;
      }
      this.openForm(produto);
    },

    async deleteProduct(id) {
      const produto = this.cache.find((item) => item.id === id);
      if (!produto) {
        alert("Produto nao encontrado.");
        return;
      }

      const confirmed = confirm(
        `Tem certeza que deseja excluir o produto "${produto.nome}"?`
      );
      if (!confirmed) return;

      try {
        await API.api(`/produtos/${id}`, { method: "DELETE" });
        alert("Produto excluido com sucesso.");
        await this.loadProdutos();
      } catch (error) {
        console.error("Erro ao excluir produto:", error);
        alert(
          "Nao foi possivel excluir o produto. " +
            (error?.details || error?.message || "")
        );
      }
    },

    async downloadCSV() {
      try {
        const response = await fetch("/api/produtos/csv", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Falha ao gerar CSV.");
        }

        const blob = await response.blob();
        Utils.downloadFile(
          blob,
          `produtos_${new Date().toISOString().split("T")[0]}.csv`
        );
      } catch (error) {
        console.error("Erro ao exportar CSV:", error);
        alert("Nao foi possivel exportar o CSV: " + error.message);
      }
    },
  };

  window.ProdutosPage = ProdutosPage;
})();
