
/**
 * Backend Script para Colegio Beltrán Prieto Figueroa
 * Versión Robusta v2.0
 */

// Función auxiliar para obtener o crear una hoja por su nombre
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Inicializar encabezados si es una hoja nueva
    const headers = {
      "Pagos": ["id", "timestamp", "paymentDate", "cedulaRepresentative", "matricula", "level", "method", "reference", "amount", "amountBs", "exchangeRate", "observations", "status", "type", "pendingBalance"],
      "Usuarios": ["cedula", "nombre", "matricula", "estudiantes_json"],
      "Configuracion": ["key", "value"]
    };
    if (headers[name]) {
      sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]).setFontWeight("bold").setBackground("#cbd5e1");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function setupDatabase() {
  getOrCreateSheet("Pagos");
  getOrCreateSheet("Usuarios");
  getOrCreateSheet("Configuracion");
}

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === "getConfig") {
      const sheet = getOrCreateSheet("Configuracion");
      const data = sheet.getDataRange().getValues();
      let config = {};
      if (data.length > 1) {
        data.slice(1).forEach(row => {
          if (!row[0]) return;
          if (row[0] === "monthlyFees") config[row[0]] = JSON.parse(row[1]);
          else if (row[0] === "exchangeRate") config[row[0]] = parseFloat(row[1]);
          else config[row[0]] = row[1];
        });
      }
      return createJsonResponse(config);
    }
    
    if (action === "getRepresentatives") {
      const sheet = getOrCreateSheet("Usuarios");
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return createJsonResponse([]);
      
      const reps = data.slice(1).map(row => ({
        cedula: row[0].toString(),
        name: row[1],
        matricula: row[2],
        students: JSON.parse(row[3] || "[]")
      }));
      return createJsonResponse(reps);
    }

    if (action === "getPayments") {
      const sheet = getOrCreateSheet("Pagos");
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return createJsonResponse([]);
      
      const headers = data[0];
      const payments = data.slice(1).map(row => {
        let p = {};
        headers.forEach((h, i) => p[h] = row[i]);
        return p;
      });
      return createJsonResponse(payments);
    }
    
    return createJsonResponse({ error: "Acción no reconocida: " + action });
  } catch (err) {
    return createJsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(err) {
    return createJsonResponse({ error: "Cuerpo de mensaje inválido: " + err.toString() });
  }
  
  const action = body.action;
  const data = body.data;

  try {
    if (action === "saveConfig") {
      const sheet = getOrCreateSheet("Configuracion");
      sheet.clear();
      sheet.appendRow(["key", "value"]);
      sheet.appendRow(["monthlyFees", JSON.stringify(data.monthlyFees)]);
      sheet.appendRow(["exchangeRate", data.exchangeRate]);
      sheet.appendRow(["schoolName", data.schoolName]);
      sheet.appendRow(["lastUpdated", data.lastUpdated]);
      return createJsonResponse({ success: true });
    }

    if (action === "saveRepresentative") {
      const sheet = getOrCreateSheet("Usuarios");
      const values = sheet.getDataRange().getValues();
      let foundIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (values[i][0].toString() === data.cedula.toString()) {
          foundIndex = i + 1;
          break;
        }
      }
      const rowData = [data.cedula, data.name, data.matricula, JSON.stringify(data.students)];
      if (foundIndex > -1) {
        sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
      return createJsonResponse({ success: true });
    }

    if (action === "addPayment") {
      const sheet = getOrCreateSheet("Pagos");
      const rowData = [
        data.id, data.timestamp, data.paymentDate, data.cedulaRepresentative,
        data.matricula, data.level, data.method, data.reference,
        data.amount, data.amountBs, data.exchangeRate, data.observations,
        data.status, data.type, data.pendingBalance
      ];
      sheet.appendRow(rowData);
      return createJsonResponse({ success: true });
    }

    if (action === "updatePaymentStatus") {
      const sheet = getOrCreateSheet("Pagos");
      const values = sheet.getDataRange().getValues();
      const idColumn = 0; 
      const statusColumn = 12; 
      
      for (let i = 1; i < values.length; i++) {
        if (values[i][idColumn] === data.id) {
          sheet.getRange(i + 1, statusColumn + 1).setValue(data.status);
          break;
        }
      }
      return createJsonResponse({ success: true });
    }

    return createJsonResponse({ error: "Acción POST no reconocida: " + action });
  } catch (err) {
    return createJsonResponse({ error: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
