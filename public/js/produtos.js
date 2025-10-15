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

  const ProdutosPage = {
    cache: [],
    filtered: [],
    isAdmin: false,
    loading: false,

    async init() {
      await this.loadProdutos();
      this.renderAdminActions();
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
      const busca = (
        document.getElementById("filterProdutoBusca")?.value || ""
      )
        .trim()
        .toLowerCase();

      this.filtered = this.cache.filter((produto) => {
        const matchesUnidade = unidade
          ? (produto.unidade || "").toLowerCase() === unidade
          : true;

        const matchesBusca = busca
          ? [produto.nome, produto.codigo, produto.id]
              .map((field) => (field ?? "").toString().toLowerCase())
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
        .map((produto) => {
          const statusBadge = produto.ativo
            ? ""
            : '<span class="produto-status inativo">Inativo</span>';
          const descricaoHtml = produto.descricao
            ? `<div class="produto-descricao">${escapeHtml(
                produto.descricao
              )}</div>`
            : "";
          const codigoOuId = produto.codigo
            ? escapeHtml(produto.codigo)
            : `#${produto.id}`;

          const actions = this.isAdmin
            ? `
              <div class="produto-acoes">
                <button class="btn btn-small" onclick="ProdutosPage.editProduct(${produto.id})" title="Editar produto">
                  <i data-lucide="edit-3"></i>
                </button>
                <button class="btn btn-small btn-danger" onclick="ProdutosPage.deleteProduct(${produto.id})" title="Excluir produto">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            `
            : '<span style="color: var(--muted);">-</span>';

          return `
            <tr>
              <td>${codigoOuId}</td>
              <td>
                <div class="produto-nome">${escapeHtml(produto.nome)} ${statusBadge}</div>
                ${descricaoHtml}
              </td>
              <td>${this.formatCurrency(produto.valor)}</td>
              <td>${escapeHtml(produto.unidade || "-")}</td>
              <td>${actions}</td>
            </tr>
          `;
        })
        .join("");

      if (mobileList) {
        mobileList.innerHTML = this.filtered
          .map((produto) => {
            const status = produto.ativo ? "Ativo" : "Inativo";
            return `
              <div class="produto-card">
                <div class="produto-card-header">
                  <div>
                    <div class="produto-card-nome">${escapeHtml(
                      produto.nome
                    )}</div>
                    ${
                      produto.codigo
                        ? `<div class="produto-card-codigo">Codigo: ${escapeHtml(
                            produto.codigo
                          )}</div>`
                        : ""
                    }
                  </div>
                  <div class="produto-card-valor">${this.formatCurrency(
                    produto.valor
                  )}</div>
                </div>
                <div class="produto-card-body">
                  <div><strong>Unidade:</strong> ${escapeHtml(
                    produto.unidade || "-"
                  )}</div>
                  <div><strong>Status:</strong> ${status}</div>
                  ${
                    produto.descricao
                      ? `<div class="produto-card-descricao">${escapeHtml(
                          produto.descricao
                        )}</div>`
                      : ""
                  }
                </div>
                ${
                  this.isAdmin
                    ? `
                        <div class="produto-card-actions">
                          <button class="btn" onclick="ProdutosPage.editProduct(${produto.id})">
                            <i data-lucide="edit-3"></i>
                            Editar
                          </button>
                          <button class="btn btn-danger" onclick="ProdutosPage.deleteProduct(${produto.id})">
                            <i data-lucide="trash-2"></i>
                            Excluir
                          </button>
                        </div>
                      `
                    : ""
                }
              </div>
            `;
          })
          .join("");
      }

      Utils.updateIcons();
    },

    setLoading(isLoading) {
      this.loading = isLoading;
      const tbody = document.querySelector("#tbProdutos tbody");
      if (isLoading && tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 24px;">
              Carregando produtos...
            </td>
          </tr>
        `;
      }
    },

    enableAdminFeatures() {
      this.isAdmin = true;
      this.renderAdminActions();
    },

    renderAdminActions() {
      if (!this.isAdmin) return;

      const headerActions = document.getElementById("produtoHeaderActions");
      if (headerActions) {
        headerActions.innerHTML = `
          <button class="btn" id="btnNovoProduto" style="background: var(--orange-500); color: white;">
            <i data-lucide="plus"></i>
            Novo Produto
          </button>
        `;
        document
          .getElementById("btnNovoProduto")
          ?.addEventListener("click", () => this.openForm());
      }

      const filterActions = document.getElementById("produtoActions");
      if (filterActions) {
        filterActions.innerHTML = `
          <button class="btn" id="btnProdutosAtualizar">
            <i data-lucide="refresh-cw"></i>
            Atualizar
          </button>
          <button class="btn" id="btnProdutosCSV" style="background: var(--orange-500); color: white;">
            <i data-lucide="download"></i>
            Exportar CSV
          </button>
        `;

        document
          .getElementById("btnProdutosAtualizar")
          ?.addEventListener("click", () => this.loadProdutos());

        document
          .getElementById("btnProdutosCSV")
          ?.addEventListener("click", () => this.downloadCSV());
      }

      Utils.updateIcons();
    },

    formatCurrency(valor) {
      if (valor === null || valor === undefined || Number.isNaN(valor)) {
        return "-";
      }
      return currencyFormatter.format(Number(valor));
    },

    openForm(produto = null) {
      const isEdit = Boolean(produto);
      const title = isEdit ? "Editar Produto" : "Novo Produto";

      const content = `
        <form id="produtoForm" class="produto-form">
          <div class="form-grid">
            <label class="form-field">
              <span>Codigo (opcional)</span>
              <input type="text" id="produtoCodigo" value="${
                produto?.codigo ? escapeHtml(produto.codigo) : ""
              }" placeholder="Ex: P13" />
            </label>
            <label class="form-field">
              <span>Nome *</span>
              <input type="text" id="produtoNome" value="${
                produto?.nome ? escapeHtml(produto.nome) : ""
              }" required />
            </label>
            <label class="form-field">
              <span>Valor *</span>
              <input type="number" id="produtoValor" step="0.01" min="0" value="${
                produto?.valor !== null && produto?.valor !== undefined
                  ? escapeHtml(produto.valor.toFixed(2))
                  : ""
              }" required />
            </label>
            <label class="form-field">
              <span>Unidade *</span>
              <input type="text" id="produtoUnidade" value="${
                produto?.unidade ? escapeHtml(produto.unidade) : ""
              }" required />
            </label>
            <label class="form-field form-full">
              <span>Descricao</span>
              <textarea id="produtoDescricao" rows="3" placeholder="Detalhes adicionais do produto">${
                produto?.descricao ? escapeHtml(produto.descricao) : ""
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
            <button type="button" class="btn btn-muted" id="produtoCancelar">
              Cancelar
            </button>
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

    getFormPayload() {
      const nome = document.getElementById("produtoNome")?.value.trim();
      const codigo = document.getElementById("produtoCodigo")?.value.trim();
      const descricao = document
        .getElementById("produtoDescricao")
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

      return {
        nome,
        codigo: codigo || null,
        descricao: descricao || null,
        unidade,
        valor,
        ativo,
      };
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
