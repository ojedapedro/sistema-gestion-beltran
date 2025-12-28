
/**
 * Backend Script para Colegio Beltrán Prieto Figueroa
 * Versión Robusta v2.3 - Estabilidad y Compatibilidad CORS
 */

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    // Intenta obtener por ID si no hay activo (necesario en algunos contextos de ejecución)
    try {
      // Reemplaza con tu ID real si el script no está contenido en la hoja
      ss = SpreadsheetApp.openById("1vhTFY-DLkHZIvTozAj-_ZiJDLftgkHmh494OM9EjDdQ");
    } catch(e) {
      throw new Error("No se pudo conectar con la base de datos de Google Sheets.");
    }
  }
  
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headers = {
      "Pagos": ["id", "timestamp", "paymentDate", "cedulaRepresentative", "matricula", "level", "method", "reference", "amount", "amountBs", "exchangeRate", "observations", "status", "type", "pendingBalance"],
      "Usuarios": ["cedula", "nombre", "matricula", "estudiantes_json", "createdAt"],
      "Configuracion": ["key", "value"]
    };
    if (headers[name]) {
      sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]).setFontWeight("bold").setBackground("#cbd5e1");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function doGet(e) {
  var action = e.parameter.action;
  try {
    var sheet;
    if (action === "getConfig") {
      sheet = getOrCreateSheet("Configuracion");
      var data = sheet.getDataRange().getValues();
      var config = {};
      if (data.length > 1) {
        data.slice(1).forEach(function(row) {
          if (!row[0]) return;
          if (row[0] === "monthlyFees") {
            try { config[row[0]] = JSON.parse(row[1]); } catch(e) { config[row[0]] = {}; }
          }
          else if (row[0] === "exchangeRate") config[row[0]] = parseFloat(row[1]);
          else config[row[0]] = row[1];
        });
      }
      return createJsonResponse(config);
    }
    
    if (action === "getRepresentatives") {
      sheet = getOrCreateSheet("Usuarios");
      var dataR = sheet.getDataRange().getValues();
      if (dataR.length <= 1) return createJsonResponse([]);
      var reps = dataR.slice(1).map(function(row) {
        return {
          cedula: row[0].toString(),
          name: row[1],
          matricula: row[2],
          students: JSON.parse(row[3] || "[]"),
          createdAt: row[4] || ""
        };
      });
      return createJsonResponse(reps);
    }

    if (action === "getPayments") {
      sheet = getOrCreateSheet("Pagos");
      var dataP = sheet.getDataRange().getValues();
      if (dataP.length <= 1) return createJsonResponse([]);
      var headers = dataP[0];
      var payments = dataP.slice(1).map(function(row) {
        var p = {};
        headers.forEach(function(h, i) { p[h] = row[i]; });
        return p;
      });
      return createJsonResponse(payments);
    }
    
    return createJsonResponse({ error: "Acción no encontrada" });
  } catch (err) {
    return createJsonResponse({ error: "Error en Servidor BPF: " + err.toString() });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var data = body.data;
    var sheet;

    if (action === "saveRepresentative") {
      sheet = getOrCreateSheet("Usuarios");
      var values = sheet.getDataRange().getValues();
      var foundIndex = -1;
      for (var i = 1; i < values.length; i++) {
        if (values[i][0].toString() === data.cedula.toString()) {
          foundIndex = i + 1;
          break;
        }
      }
      var rowData = [data.cedula, data.name, data.matricula, JSON.stringify(data.students), data.createdAt || new Date().toISOString()];
      if (foundIndex > -1) {
        sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
      return createJsonResponse({ success: true });
    }

    if (action === "addPayment") {
      sheet = getOrCreateSheet("Pagos");
      sheet.appendRow([
        data.id, data.timestamp, data.paymentDate, data.cedulaRepresentative,
        data.matricula, data.level, data.method, data.reference,
        data.amount, data.amountBs, data.exchangeRate, data.observations,
        data.status, data.type, data.pendingBalance
      ]);
      return createJsonResponse({ success: true });
    }

    if (action === "saveConfig") {
      sheet = getOrCreateSheet("Configuracion");
      sheet.clear();
      sheet.appendRow(["key", "value"]);
      sheet.appendRow(["monthlyFees", JSON.stringify(data.monthlyFees)]);
      sheet.appendRow(["exchangeRate", data.exchangeRate]);
      sheet.appendRow(["schoolName", data.schoolName]);
      sheet.appendRow(["lastUpdated", data.lastUpdated]);
      return createJsonResponse({ success: true });
    }
    
    if (action === "updatePaymentStatus") {
      sheet = getOrCreateSheet("Pagos");
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          sheet.getRange(i + 1, 13).setValue(data.status); // Columna 13 es 'status'
          break;
        }
      }
      return createJsonResponse({ success: true });
    }

    return createJsonResponse({ error: "Acción POST no reconocida" });
  } catch (err) {
    return createJsonResponse({ error: "Error procesando POST: " + err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
