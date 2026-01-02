
/**
 * Backend Script Multi-Base de Datos para Colegio Beltrán Prieto Figueroa
 * Soporta Administración Central y Oficina Virtual unificadas
 */

function getOrCreateSheet(name, ssid) {
  var ss;
  try {
    // Si se pasa un ssid en la petición, lo usamos. Si no, usamos el activo.
    ss = ssid ? SpreadsheetApp.openById(ssid) : SpreadsheetApp.getActiveSpreadsheet();
  } catch(e) {
    console.error("Error abriendo hoja: " + e.toString());
    return null;
  }
  
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    // Solo creamos automáticamente las hojas de sistema, no la de OficinaVirtual (que suele venir de un Form)
    if (name !== "OficinaVirtual") {
      sheet = ss.insertSheet(name);
      var headers = {
        "Pagos": ["id", "timestamp", "paymentDate", "cedulaRepresentative", "matricula", "level", "method", "reference", "amount", "amountBs", "exchangeRate", "observations", "status", "type", "pendingBalance", "Nombre"],
        "Usuarios": ["cedula", "nombre", "matricula", "estudiantes_json", "createdAt"],
        "Configuracion": ["key", "value"]
      };
      if (headers[name]) {
        sheet.getRange(1, 1, 1, headers[name].length).setValues([headers[name]]).setFontWeight("bold").setBackground("#cbd5e1");
        sheet.setFrozenRows(1);
      }
    }
  }
  return sheet;
}

function doGet(e) {
  var action = e.parameter.action;
  var ssid = e.parameter.ssid; // Recibir ID de hoja dinámico
  
  if (!action) {
    return createJsonResponse({ status: "Online", message: "Servidor BPF Activo. Esperando acción...", ssid_received: ssid || "Default" });
  }

  try {
    var sheet;
    
    // Obtener Pagos Procesados (Pestaña "Pagos")
    if (action === "getPayments") {
      sheet = getOrCreateSheet("Pagos", ssid);
      if (!sheet) return createJsonResponse({ error: "No se encontró la hoja Pagos en el ID proporcionado" });
      
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) return createJsonResponse([]);
      
      var headers = data[0];
      var result = data.slice(1).map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) {
          obj[h] = row[i];
        });
        return obj;
      });
      return createJsonResponse(result);
    }

    // Obtener Pagos de Oficina Virtual (Pestaña "OficinaVirtual")
    if (action === "getVirtualPayments") {
      // Intentamos obtener la hoja OficinaVirtual directamente
      var ss = ssid ? SpreadsheetApp.openById(ssid) : SpreadsheetApp.getActiveSpreadsheet();
      sheet = ss.getSheetByName("OficinaVirtual");
      
      // Si no existe, devolvemos array vacío (quizás aun no hay respuestas del form)
      if (!sheet) return createJsonResponse([]);
      
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) return createJsonResponse([]);
      
      var headers = data[0];
      // Mapeamos dinámicamente las columnas basándonos en los encabezados del formulario
      var result = data.slice(1).map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) {
          // Normalizamos las claves para facilitar el uso en el frontend (ej: "Monto (USD)" -> "monto")
          var key = h.toString().toLowerCase().trim();
          obj[h] = row[i]; // Mantenemos la original
          obj[key] = row[i]; // Versión normalizada
        });
        return obj;
      });
      return createJsonResponse(result);
    }

    if (action === "getRepresentatives") {
      sheet = getOrCreateSheet("Usuarios", ssid);
      var dataR = sheet.getDataRange().getValues();
      if (dataR.length <= 1) return createJsonResponse([]);
      return createJsonResponse(dataR.slice(1).map(function(row) {
        return {
          cedula: row[0].toString(),
          name: row[1],
          matricula: row[2],
          students: JSON.parse(row[3] || "[]"),
          createdAt: row[4] || ""
        };
      }));
    }

    if (action === "getConfig") {
      sheet = getOrCreateSheet("Configuracion", ssid);
      var dataC = sheet.getDataRange().getValues();
      var config = {};
      dataC.slice(1).forEach(function(row) {
        if (!row[0]) return;
        if (row[0] === "monthlyFees") config[row[0]] = JSON.parse(row[1]);
        else config[row[0]] = row[1];
      });
      return createJsonResponse(config);
    }

    return createJsonResponse({ error: "Acción no reconocida" });
  } catch (err) {
    return createJsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var data = body.data;
    var ssid = body.ssid; // Recibir ID de hoja dinámico en POST
    var sheet;

    if (action === "addPayment") {
      sheet = getOrCreateSheet("Pagos", ssid);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var newRow = headers.map(function(h) {
        return data[h] !== undefined ? data[h] : "";
      });
      sheet.appendRow(newRow);
      return createJsonResponse({ success: true });
    }

    if (action === "saveRepresentative") {
      sheet = getOrCreateSheet("Usuarios", ssid);
      var values = sheet.getDataRange().getValues();
      var rowIndex = -1;
      for (var i = 1; i < values.length; i++) {
        if (values[i][0].toString() === data.cedula.toString()) {
          rowIndex = i + 1;
          break;
        }
      }
      var rowData = [data.cedula, data.name, data.matricula, JSON.stringify(data.students), data.createdAt || new Date().toISOString()];
      if (rowIndex > -1) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
      return createJsonResponse({ success: true });
    }

    if (action === "updatePaymentStatus") {
      sheet = getOrCreateSheet("Pagos", ssid);
      var valuesP = sheet.getDataRange().getValues();
      for (var j = 1; j < valuesP.length; j++) {
        // Buscamos por ID o por Referencia si el ID no existe
        if (valuesP[j][0] === data.id || (data.reference && valuesP[j][7] === data.reference)) {
          // Buscamos la columna 'status' dinámicamente
          var headersP = valuesP[0];
          var statusCol = headersP.indexOf("status") + 1;
          if (statusCol > 0) {
            sheet.getRange(j + 1, statusCol).setValue(data.status);
          }
          break;
        }
      }
      return createJsonResponse({ success: true });
    }

    return createJsonResponse({ error: "Acción POST no reconocida" });
  } catch (err) {
    return createJsonResponse({ error: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
