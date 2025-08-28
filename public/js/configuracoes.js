(async function () {
  await Auth.guard({ roles: ["admin"] });

  document.getElementById("frmSetKey").addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = document.getElementById("cfg_key").value.trim();
    const value = document.getElementById("cfg_value").value.trim();
    await API.api("/configuracoes", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    });
    await renderCfg();
    e.target.reset();
  });

  await renderCfg();
})();

async function renderCfg() {
  const tbody = document.querySelector("#tbCfg tbody");
  const rows = await API.api("/configuracoes");
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.key}</td>
      <td><input data-k="value" data-key="${r.key}" class="input" value="${r.value}"/></td>
      <td>
        <button class="btn" onclick="saveCfg('${r.key}')">Salvar</button>
        <button class="btn" style="background:#ef4444" onclick="delCfg('${r.key}')">Excluir</button>
      </td>
    </tr>
  `
    )
    .join("");
}

async function saveCfg(key) {
  const value = document.querySelector(
    `input[data-key="${key}"][data-k="value"]`
  ).value;
  await API.api("/configuracoes", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
  alert("Salvo!");
}
async function delCfg(key) {
  if (!confirm("Excluir esta configuração?")) return;
  await API.api(`/configuracoes/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  await renderCfg();
}
