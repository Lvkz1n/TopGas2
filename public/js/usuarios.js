(async function loadUsers() {
  await Auth.guard({ roles: ["admin"] });

  const frm = document.getElementById("frmNovoUser");
  frm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      email: document.getElementById("nu_email").value.trim(),
      nome: document.getElementById("nu_nome").value.trim(),
      role: document.getElementById("nu_role").value,
      password: document.getElementById("nu_password").value,
      is_active: document.getElementById("nu_active").checked,
    };
    try {
      await API.api("/usuarios", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      alert("Usuário criado.");
      location.reload();
    } catch (err) {
      alert("Erro: " + err.message);
    }
  });

  await renderUsers();
})();

async function renderUsers() {
  const tbody = document.querySelector("#tbUsers tbody");
  const users = await API.api("/usuarios");

  tbody.innerHTML = users
    .map(
      (u) => `
    <tr>
      <td>${u.id}</td>
      <td>${u.email}</td>
      <td><input data-id="${u.id}" data-k="nome" class="input" value="${
        u.nome ?? ""
      }" /></td>
      <td>
        <select data-id="${u.id}" data-k="role" class="input">
          <option value="user" ${
            u.role === "user" ? "selected" : ""
          }>user</option>
          <option value="admin" ${
            u.role === "admin" ? "selected" : ""
          }>admin</option>
        </select>
      </td>
      <td>
        <input type="checkbox" data-id="${u.id}" data-k="is_active" ${
        u.is_active ? "checked" : ""
      } />
      </td>
      <td>
        <button class="btn" onclick="saveUser(${u.id})">Salvar</button>
        <button class="btn" style="background:#475569" onclick="setPass(${
          u.id
        })">Definir senha</button>
        <button class="btn" style="background:#ef4444" onclick="delUser(${
          u.id
        })">Excluir</button>
      </td>
    </tr>
  `
    )
    .join("");
}

async function saveUser(id) {
  const row = document
    .querySelector(`#tbUsers tbody tr td input[data-id="${id}"][data-k="nome"]`)
    .closest("tr");
  const nome = row.querySelector(`input[data-id="${id}"][data-k="nome"]`).value;
  const role = row.querySelector(
    `select[data-id="${id}"][data-k="role"]`
  ).value;
  const is_active = row.querySelector(
    `input[data-id="${id}"][data-k="is_active"]`
  ).checked;

  try {
    await API.api(`/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nome, role, is_active }),
    });
    alert("Salvo!");
  } catch (err) {
    alert("Erro: " + err.message);
  }
}

async function setPass(id) {
  const password = prompt("Nova senha para o usuário ID " + id + ":");
  if (!password) return;
  try {
    await API.api(`/usuarios/${id}/set-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    alert("Senha alterada.");
  } catch (err) {
    alert("Erro: " + err.message);
  }
}

async function delUser(id) {
  if (!confirm("Excluir usuário?")) return;
  await API.api(`/usuarios/${id}`, { method: "DELETE" });
  await renderUsers();
}
