(async function () {
  await Auth.guard();
  const data = await API.api("/metricas");
  document.getElementById("m_total").textContent = data.total_entregas;
  document.getElementById("m_ok").textContent = data.entregas_sucesso;
  document.getElementById("m_cancel").textContent = data.cancelamentos;

  const labels = data.regioes.map((r) => r.bairro || "–");
  const values = data.regioes.map((r) => r.total);
  const ctx = document.getElementById("chartRegioes");
  new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Entregas", data: values }] },
  });
})();
