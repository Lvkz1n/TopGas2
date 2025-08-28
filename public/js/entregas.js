(async function () {
  await Auth.guard();
  const tbody = document.querySelector("#tbEntregas tbody");
  const rows = await API.api("/entregas");
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.id}</td>
      <td>${r.nome_cliente || "-"}</td>
      <td>${r.status_pedido}</td>
      <td>${r.entregador || "-"}</td>
      <td>
        <button class="btn" onclick="confirmar(${r.id})">Confirmar</button>
        <button class="btn" style="background:#ef4444" onclick="cancelar(${
          r.id
        })">Cancelar</button>
      </td>
    </tr>`
    )
    .join("");
})();

async function confirmar(id) {
  try {
    await API.api(`/entregas/${id}/confirmar`, { method: "POST" });
    alert("Entregue!");
    location.reload();
  } catch (e) {
    alert("Falha: " + e.message);
  }
}
async function cancelar(id) {
  try {
    await API.api(`/entregas/${id}/cancelar`, { method: "POST" });
    alert("Cancelado!");
    location.reload();
  } catch (e) {
    alert("Falha: " + e.message);
  }
}
