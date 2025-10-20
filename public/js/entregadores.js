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

  const EntregadoresPage = {
    cache: [],
    filtered: [],
    isAdmin: false,
    expanded: new Set(),

    async init() {
      await this.loadEntregadores();
      this.renderHeaderActions();
    },

    async loadEntregadores(preserveFilters = true) {
      const unidadeSelect = document.getElementById("filterEntregadorUnidade");
      const buscaInput = document.getElementById("filterEntregadorBusca");
      const previousUnidade =
        preserveFilters && unidadeSelect ? unidadeSelect.value : "";
      const previousBusca =
        preserveFilters && buscaInput ? buscaInput.value : "";

      this.setLoading(true);

      try {
        const data = await API.api("/entregadores");
        this.cache = Array.isArray(data) ? data : [];
        this.expanded.clear();
        this.populateUnidades(previousUnidade);
        if (preserveFilters && buscaInput) {
          buscaInput.value = previousBusca;
        }
        this.applyFilters();
      } catch (error) {
        console.error("Erro ao carregar entregadores:", error);
        alert(
          "Nao foi possivel carregar os entregadores. " +
            (error?.message || "Tente novamente mais tarde.")
        );
      } finally {
        this.setLoading(false);
      }
    },

    populateUnidades(selectedValue = "") {
      const select = document.getElementById("filterEntregadorUnidade");
      if (!select) return;

      const unidades = Array.from(
        new Set(
          this.cache
            .map((entregador) => entregador.unidade)
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
        document.getElementById("filterEntregadorUnidade")?.value || ""
      ).toLowerCase();
      const busca = (
        document.getElementById("filterEntregadorBusca")?.value || ""
      )
        .trim()
        .toLowerCase();

      this.filtered = this.cache.filter((entregador) => {
        const matchesUnidade = unidade
          ? (entregador.unidade || "").toLowerCase() === unidade
          : true;

        const fieldsToSearch = [
          entregador.nome,
          entregador.id,
          entregador.unidade,
          entregador.telefone,
          entregador.observacoes,
        ];
        const matchesBusca = busca
          ? fieldsToSearch
              .filter((field) => field !== null && field !== undefined)
              .map((field) => field.toString().toLowerCase())
              .some((value) => value.includes(busca))
          : true;

        return matchesUnidade && matchesBusca;
      });

      this.renderEntregadores();
    },

    renderEntregadores() {
      const tbody = document.querySelector("#tbEntregadores tbody");
      const mobileList = document.getElementById("mobileEntregadores");
      const emptyState = document.getElementById("entregadoresEmptyState");

      if (!tbody) return;

      if (this.filtered.length === 0) {
        tbody.innerHTML = "";
        if (mobileList) mobileList.innerHTML = "";
        if (emptyState) emptyState.classList.remove("hidden");
        return;
      }

      if (emptyState) emptyState.classList.add("hidden");

      tbody.innerHTML = this.filtered
        .map((entregador) => this.renderDesktopRow(entregador))
        .join("");

      if (mobileList) {
        mobileList.innerHTML = this.filtered
          .map((entregador) => this.renderMobileCard(entregador))
          .join("");
      }

      Utils.updateIcons();
    },

    renderDesktopRow(entregador) {
      const isExpanded = this.expanded.has(entregador.id);
      const statusBadge = entregador.ativo
        ? ""
        : '<span class="produto-status inativo">Inativo</span>';
      const toggleIcon = isExpanded ? "chevron-up" : "chevron-down";

      const actions = [
        `<button class="btn btn-small btn-outline" data-entregador-toggle="${entregador.id}" onclick="EntregadoresPage.toggleDetails(${entregador.id})">
            <i data-lucide="${toggleIcon}"></i>
            ${isExpanded ? "Fechar" : "Detalhes"}
          </button>`,
      ];

      if (this.isAdmin) {
        actions.push(
          `<button class="btn btn-small" onclick="EntregadoresPage.editEntregador(${entregador.id})" title="Editar">
              <i data-lucide="edit-3"></i>
            </button>`
        );
        actions.push(
          `<button class="btn btn-small btn-danger" onclick="EntregadoresPage.deleteEntregador(${entregador.id})" title="Excluir">
              <i data-lucide="trash-2"></i>
            </button>`
        );
      }

      return `
        <tr class="entregador-row">
          <td>${entregador.id}</td>
          <td>
            <div class="produto-nome">${escapeHtml(entregador.nome)} ${statusBadge}</div>
            ${
              entregador.observacoes
                ? `<div class="produto-descricao">${escapeHtml(
                    entregador.observacoes
                  )}</div>`
                : ""
            }
          </td>
          <td>${escapeHtml(entregador.unidade || "-")}</td>
          <td>${escapeHtml(entregador.telefone || "-")}</td>
          <td>${this.formatOptionalCurrency(entregador.valor_frete)}</td>
          <td>
            <div class="produto-acoes">
              ${actions.join("")}
            </div>
          </td>
        </tr>
        <tr class="produto-detalhes-row ${
          isExpanded ? "" : "hidden"
        }" data-entregador-details="${entregador.id}">
          <td colspan="6">
            ${this.renderDetalhes(entregador)}
          </td>
        </tr>
      `;
    },

    renderDetalhes(entregador) {
      const itens = [
        {
          label: "Telefone",
          value: escapeHtml(entregador.telefone || "-"),
        },
        {
          label: "Valor frete",
          value: this.formatOptionalCurrency(entregador.valor_frete),
        },
        {
          label: "Status",
          value: entregador.ativo ? "Ativo" : "Inativo",
        },
      ];

      const detalhes = itens
        .map(
          (item) => `
            <div class="produto-detalhe">
              <span>${item.label}</span>
              <strong>${item.value}</strong>
            </div>
          `
        )
        .join("");

      const observacoes = entregador.observacoes
        ? `<div class="produto-observacoes"><strong>Observacoes:</strong> ${escapeHtml(
            entregador.observacoes
          )}</div>`
        : "";

      return `
        <div class="produto-detalhes">
          <div class="produto-detalhes-grid">
            ${detalhes}
          </div>
          ${observacoes}
          <div class="produto-meta">
            <span>Criado em: ${this.formatDate(entregador.created_at)}</span>
            <span>Atualizado em: ${this.formatDate(entregador.updated_at)}</span>
          </div>
        </div>
      `;
    },

    renderMobileCard(entregador) {
      return `
        <div class="produto-card">
          <div class="produto-card-header">
            <div>
              <div class="produto-card-nome">${escapeHtml(entregador.nome)}</div>
              <div class="produto-card-status">${
                entregador.ativo ? "Ativo" : "Inativo"
              }</div>
            </div>
            <div class="produto-card-valor">${this.formatOptionalCurrency(
              entregador.valor_frete
            )}</div>
          </div>
          <div class="produto-card-body">
            <div><strong>Unidade:</strong> ${escapeHtml(
              entregador.unidade || "-"
            )}</div>
            <div><strong>Telefone:</strong> ${escapeHtml(
              entregador.telefone || "-"
            )}</div>
            ${
              entregador.observacoes
                ? `<div><strong>Observacoes:</strong> ${escapeHtml(
                    entregador.observacoes
                  )}</div>`
                : ""
            }
          </div>
          <div class="produto-card-meta">
            <span>Criado: ${this.formatDate(entregador.created_at)}</span>
            <span>Atualizado: ${this.formatDate(entregador.updated_at)}</span>
          </div>
          ${
            this.isAdmin
              ? `<div class="produto-card-actions">
                  <button class="btn" onclick="EntregadoresPage.editEntregador(${entregador.id})">
                    <i data-lucide="edit-3"></i>
                    Editar
                  </button>
                  <button class="btn btn-danger" onclick="EntregadoresPage.deleteEntregador(${entregador.id})">
                    <i data-lucide="trash-2"></i>
                    Excluir
                  </button>
                </div>`
              : ""
          }
        </div>
      `;
    },

    formatOptionalCurrency(value) {
      if (value === null || value === undefined || value === "") return "-";
      const num = Number(value);
      if (Number.isNaN(num)) return "-";
      return currencyFormatter.format(num);
    },

    formatDate(value) {
      if (!value) return "-";
      return Utils.formatarData(value);
    },

    setLoading(isLoading) {
      const tbody = document.querySelector("#tbEntregadores tbody");
      const mobileList = document.getElementById("mobileEntregadores");
      if (isLoading) {
        if (tbody) {
          tbody.innerHTML = `
            <tr>
              <td colspan="6" style="text-align: center; padding: 24px;">
                Carregando entregadores...
              </td>
            </tr>
          `;
        }
        if (mobileList) {
          mobileList.innerHTML = `
            <div class="produto-card">
              <div style="text-align: center; padding: 16px;">
                Carregando entregadores...
              </div>
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
      const container = document.getElementById("entregadoresHeaderActions");
      if (!container) return;

      const buttons = [
        `<button class="btn" id="btnEntregadoresReload">
            <i data-lucide="refresh-cw"></i>
            Recarregar
          </button>`,
      ];

      if (this.isAdmin) {
        buttons.push(
          `<button class="btn" id="btnNovoEntregador" style="background: var(--orange-500); color: white;">
              <i data-lucide="plus"></i>
              Novo Entregador
            </button>`
        );
        buttons.push(
          `<button class="btn" id="btnEntregadoresCSV" style="background: var(--orange-500); color: white;">
              <i data-lucide="download"></i>
              Exportar CSV
            </button>`
        );
      }

      container.innerHTML = buttons.join("");
      Utils.setupReloadButton("btnEntregadoresReload");

      if (this.isAdmin) {
        document
          .getElementById("btnNovoEntregador")
          ?.addEventListener("click", () => this.openForm());
        document
          .getElementById("btnEntregadoresCSV")
          ?.addEventListener("click", () => this.downloadCSV());
      }

      Utils.updateIcons();
    },

    openForm(entregador = null) {
      const isEdit = Boolean(entregador);
      const title = isEdit ? "Editar Entregador" : "Novo Entregador";

      const content = `
        <form id="entregadorForm" class="produto-form">
          <div class="form-grid">
            <label class="form-field">
              <span>Nome *</span>
              <input type="text" id="entregadorNome" value="${
                entregador?.nome ? escapeHtml(entregador.nome) : ""
              }" required />
            </label>
            <label class="form-field">
              <span>Unidade</span>
              <input type="text" id="entregadorUnidade" value="${
                entregador?.unidade ? escapeHtml(entregador.unidade) : ""
              }" />
            </label>
            <label class="form-field">
              <span>Telefone</span>
              <input type="text" id="entregadorTelefone" value="${
                entregador?.telefone ? escapeHtml(entregador.telefone) : ""
              }" />
            </label>
            <label class="form-field">
              <span>Valor Frete</span>
              <input type="number" step="0.01" min="0" id="entregadorValorFrete" value="${
                entregador?.valor_frete !== null &&
                entregador?.valor_frete !== undefined
                  ? escapeHtml(Number(entregador.valor_frete).toFixed(2))
                  : ""
              }" />
            </label>
            <label class="form-field form-full">
              <span>Observações</span>
              <textarea id="entregadorObservacoes" rows="3" placeholder="Informações adicionais">${
                entregador?.observacoes
                  ? escapeHtml(entregador.observacoes)
                  : ""
              }</textarea>
            </label>
            <label class="form-field checkbox-field">
              <input type="checkbox" id="entregadorAtivo" ${
                entregador?.ativo !== false ? "checked" : ""
              } />
              <span>Entregador ativo</span>
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-muted" id="entregadorCancelar">
              Cancelar
            </button>
            <button type="submit" class="btn" style="background: var(--orange-500); color: white;">
              ${isEdit ? "Salvar alteracoes" : "Cadastrar entregador"}
            </button>
          </div>
        </form>
      `;

      const { fecharModal } = Utils.criarModal(title, content);

      document
        .getElementById("entregadorCancelar")
        ?.addEventListener("click", fecharModal);

      document
        .getElementById("entregadorForm")
        ?.addEventListener("submit", async (event) => {
          event.preventDefault();

          const payload = this.getFormPayload();
          if (!payload) return;

          try {
            if (isEdit && entregador) {
              await API.api(`/entregadores/${entregador.id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
              });
              alert("Entregador atualizado com sucesso.");
            } else {
              await API.api("/entregadores", {
                method: "POST",
                body: JSON.stringify(payload),
              });
              alert("Entregador cadastrado com sucesso.");
            }
            fecharModal();
            await this.loadEntregadores();
          } catch (error) {
            console.error("Erro ao salvar entregador:", error);
            alert(
              "Nao foi possivel salvar o entregador. " +
                (error?.details || error?.message || "")
            );
          }
        });
    },

    getFormPayload() {
      const nome = document.getElementById("entregadorNome")?.value.trim();
      const unidade = document
        .getElementById("entregadorUnidade")
        ?.value.trim();
      const telefone = document
        .getElementById("entregadorTelefone")
        ?.value.trim();
      const observacoes = document
        .getElementById("entregadorObservacoes")
        ?.value.trim();
      const ativo = document.getElementById("entregadorAtivo")?.checked ?? true;
      const valorFreteRaw = document.getElementById(
        "entregadorValorFrete"
      )?.value;

      if (!nome) {
        alert("Informe o nome do entregador.");
        return null;
      }

      let valor_frete = null;
      if (valorFreteRaw !== undefined && valorFreteRaw !== "") {
        const parsed = parseFloat(String(valorFreteRaw).replace(",", "."));
        if (Number.isNaN(parsed)) {
          alert("Informe um valor de frete válido.");
          return null;
        }
        valor_frete = parsed;
      }

      return {
        nome,
        unidade: unidade || null,
        telefone: telefone || null,
        valor_frete,
        observacoes: observacoes || null,
        ativo,
      };
    },

    toggleDetails(id) {
      const row = document.querySelector(`tr[data-entregador-details="${id}"]`);
      if (!row) return;
      row.classList.toggle("hidden");
      const expanded = !row.classList.contains("hidden");
      if (expanded) {
        this.expanded.add(id);
      } else {
        this.expanded.delete(id);
      }

      const icon = document.querySelector(
        `button[data-entregador-toggle="${id}"] i`
      );
      if (icon) {
        icon.setAttribute("data-lucide", expanded ? "chevron-up" : "chevron-down");
        Utils.updateIcons();
      }
    },

    editEntregador(id) {
      const entregador = this.cache.find((item) => item.id === id);
      if (!entregador) {
        alert("Entregador nao encontrado.");
        return;
      }
      this.openForm(entregador);
    },

    async deleteEntregador(id) {
      const entregador = this.cache.find((item) => item.id === id);
      if (!entregador) {
        alert("Entregador nao encontrado.");
        return;
      }

      const confirmed = confirm(
        `Tem certeza que deseja excluir o entregador "${entregador.nome}"?`
      );
      if (!confirmed) return;

      try {
        await API.api(`/entregadores/${id}`, { method: "DELETE" });
        alert("Entregador excluido com sucesso.");
        await this.loadEntregadores();
      } catch (error) {
        console.error("Erro ao excluir entregador:", error);
        alert(
          "Nao foi possivel excluir o entregador. " +
            (error?.details || error?.message || "")
        );
      }
    },

    async downloadCSV() {
      try {
        const response = await fetch("/api/entregadores/csv", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Falha ao gerar CSV.");
        }

        const blob = await response.blob();
        Utils.downloadFile(
          blob,
          `entregadores_${new Date().toISOString().split("T")[0]}.csv`
        );
      } catch (error) {
        console.error("Erro ao exportar CSV:", error);
        alert("Nao foi possivel exportar o CSV: " + error.message);
      }
    },
  };

  window.EntregadoresPage = EntregadoresPage;
})();

