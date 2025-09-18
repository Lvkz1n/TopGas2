// Utilitários compartilhados para o backend

/**
 * Gera CSV a partir de dados e headers
 * @param {Array} data - Array de objetos com os dados
 * @param {Array} headers - Array com os nomes das colunas
 * @param {Object} fieldMapping - Mapeamento de campos para formatação
 * @returns {string} CSV formatado
 */
export function generateCSV(data, headers, fieldMapping = {}) {
  const csvRows = [headers.join(",")];

  for (const item of data) {
    const row = headers.map((header) => {
      const fieldName =
        fieldMapping[header] || header.toLowerCase().replace(/\s+/g, "_");
      let value = item[fieldName] || "";

      // Escapar aspas e adicionar aspas se necessário
      if (
        typeof value === "string" &&
        (value.includes(",") || value.includes('"') || value.includes("\n"))
      ) {
        value = `"${value.replace(/"/g, '""')}"`;
      } else if (typeof value === "string" && value.trim() !== "") {
        value = `"${value}"`;
      }

      return value;
    });
    csvRows.push(row.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Configura headers para download de CSV
 * @param {Object} res - Response object do Express
 * @param {string} filename - Nome do arquivo
 */
export function setCSVHeaders(res, filename) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
}

/**
 * Calcula tempo total entre duas datas
 * @param {string|Date} inicio - Data/hora de início
 * @param {string|Date} fim - Data/hora de fim (opcional, usa agora se não fornecido)
 * @returns {string} Tempo formatado (ex: "2 h 30 m")
 */
export function calcularTempoTotal(inicio, fim = null) {
  if (!inicio) return "ui";

  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : new Date();

  if (isNaN(dataInicio.getTime()) || (fim && isNaN(dataFim.getTime()))) {
    return "aid";
  }

  const diffMs = dataFim - dataInicio;
  if (diffMs < 0) return "diff";

  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHoras = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffSegundos = Math.floor((diffMs % (1000 * 60)) / 1000);

  const partes = [];
  if (diffDias > 0) partes.push(`${diffDias} d`);
  if (diffHoras > 0) partes.push(`${diffHoras} h`);
  if (diffMinutos > 0) partes.push(`${diffMinutos} m`);
  if (diffSegundos > 0) partes.push(`${diffSegundos} s`);

  return partes.length === 0 ? "0 s" : partes.join(" ");
}

/**
 * Formata data para exibição
 * @param {string|Date} dataString - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatarData(dataString) {
  if (!dataString || dataString === null || dataString === "") {
    return "Aguardando...";
  }

  if (typeof dataString === "string" && dataString.includes("/")) {
    return dataString;
  }

  const data = new Date(dataString);
  if (isNaN(data.getTime())) {
    return "Aguardando...";
  }

  return (
    data.toLocaleDateString("pt-BR") +
    " " +
    data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

/**
 * Middleware para tratamento de erros
 * @param {Function} fn - Função assíncrona
 * @returns {Function} Middleware
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Valida se um ID é válido
 * @param {any} id - ID a ser validado
 * @returns {boolean} True se válido
 */
export function isValidId(id) {
  return !isNaN(id) && parseInt(id) > 0;
}
