(async function () {
  await Auth.guard();
  const data = await API.api("/metricas");
  
  // Atualizar métricas com base no status_pedido
  document.getElementById("m_total").textContent = data.total_pedidos || data.total_entregas || 0;
  document.getElementById("m_ok").textContent = data.finalizados || data.entregas_sucesso || 0;
  document.getElementById("m_andamento").textContent = data.em_andamento || 0;
  document.getElementById("m_cancel").textContent = data.cancelados || data.cancelamentos || 0;

  const labels = data.regioes.map((r) => r.bairro || "–");
  const values = data.regioes.map((r) => r.total);
  const ctx = document.getElementById("chartRegioes");
  new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Entregas", data: values }] },
  });
})();
