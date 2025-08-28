(async function () {
  await Auth.guard();

  document
    .getElementById("frmNovoCliente")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        nome_cliente: document.getElementById("c_nome").value.trim(),
        bairro: document.getElementById("c_bairro").value.trim(),
        cidade: document.getElementById("c_cidade").value.trim(),
        telefone_cliente: document.getElementById("c_tel").value.trim(),
      };
      await API.api("/clientes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await renderClientes();
      e.target.reset();
    });

  await renderClientes();
})();

async function renderClientes() {
  const tbody = document.querySelector("#tbClientes tbody");
  const rows = await API.api("/clientes");
  tbody.innerHTML = rows
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
      <td>
        <button class="btn" onclick="saveCliente(${r.id})">Salvar</button>
        <button class="btn" style="background:#ef4444" onclick="delCliente(${
          r.id
        })">Excluir</button>
      </td>
    </tr>
  `
    )
    .join("");
}

async function saveCliente(id) {
  const row = document
    .querySelector(
      `#tbClientes tbody tr td input[data-id="${id}"][data-k="nome_cliente"]`
    )
    .closest("tr");
  const body = {};
  for (const k of [
    "nome_cliente",
    "bairro",
    "cidade",
    "telefone_cliente",
    "total_pedidos_entregues",
  ]) {
    const el = row.querySelector(`[data-k="${k}"][data-id="${id}"]`);
    if (el) body[k] = el.type === "number" ? Number(el.value) : el.value;
  }
  await API.api(`/clientes/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  alert("Salvo!");
}

async function delCliente(id) {
  if (!confirm("Excluir cliente?")) return;
  await API.api(`/clientes/${id}`, { method: "DELETE" });
  await renderClientes();
}
