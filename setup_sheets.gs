
/**
 * Backend Script Multi-Base de Datos para Colegio Beltrán Prieto Figueroa
 * Soporta Administración Central y Oficina Virtual unificadas
 */

// ID ESPECÍFICO DE LA HOJA DE CÁLCULO SISTEMA BELTRAN PRIETO FIGUEROA
var SHEET_ID = '1vhTFY-DLkHZIvTozAj-_ZiJDLftgkHmh494OM9EjDdQ';

function getOrCreateSheet(name, ssid) {
  var ss;
  try {
    var targetId = ssid || SHEET_ID;
    ss = SpreadsheetApp.openById(targetId);
  } catch(e) {
    console.error("Error abriendo hoja: " + e.toString());
    return null;
  }
  
  var sheet = ss.getSheetByName(name);
  if (!sheet && name !== "OficinaVirtual") {
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
  return sheet;
}

function normalizeHeader(h) {
  if (!h) return "";
  return h.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function doGet(e) {
  var action = e.parameter.action;
  
  if (!action) {
    return createJsonResponse({ status: "Online", message: "Servidor BPF Conectado." });
  }

  try {
    var sheet;
    
    // 1. Obtener Pagos Procesados (Pestaña "Pagos" - Base Principal)
    if (action === "getPayments") {
      sheet = getOrCreateSheet("Pagos", SHEET_ID);
      if (!sheet) return createJsonResponse({ error: "No se encontró la pestaña Pagos" });
      
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

    // 2. Obtener Pagos de Oficina Virtual (Pestaña "OficinaVirtual")
    // AHORA SOPORTA ESCRITURA: Filtramos los que ya dicen "PROCESADO"
    if (action === "getVirtualPayments") {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      sheet = ss.getSheetByName("OficinaVirtual");
      
      if (!sheet) return createJsonResponse([]);
      
      // Usamos getDisplayValues para preservar formatos de fecha y moneda visuales
      var data = sheet.getDataRange().getDisplayValues(); 
      if (data.length <= 1) return createJsonResponse([]);
      
      var headers = data[0];
      
      // Buscamos si existe columna de control de sistema
      var statusIndex = -1;
      headers.forEach(function(h, i) {
        if (normalizeHeader(h) === "estatussistema" || normalizeHeader(h) === "systemstatus") statusIndex = i;
      });

      var result = [];
      
      // Iteramos datos (empezando fila 2 -> índice 1)
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        
        // SI YA ESTÁ PROCESADO, LO SALTAMOS
        if (statusIndex > -1 && (row[statusIndex] === "PROCESADO" || row[statusIndex] === "RECHAZADO_SISTEMA")) {
          continue; 
        }

        var obj = {
          _rowIndex: i + 1 // Importante: Guardamos el número de fila real (base 1) para poder editarlo luego
        };

        headers.forEach(function(h, colIndex) {
          var headerName = h.toString();
          obj[headerName] = row[colIndex];
          
          // Normalización para mapeo inteligente
          var normH = normalizeHeader(h);
          
          if (normH.includes("cedula") || normH.includes("ci") || normH.includes("identidad")) obj["cedulaRepresentative"] = row[colIndex];
          if (normH.includes("referencia") || normH.includes("ref") || normH.includes("comprobante")) obj["reference"] = row[colIndex];
          if (normH.includes("monto") || normH.includes("amount") || normH.includes("importe")) obj["amount"] = row[colIndex];
          if (normH.includes("metodo") || normH.includes("forma") || normH.includes("banco")) obj["method"] = row[colIndex];
          if (normH.includes("fecha") || normH.includes("date") || normH.includes("marca")) obj["paymentDate"] = row[colIndex];
        });
        
        result.push(obj);
      }
      
      return createJsonResponse(result);
    }

    if (action === "getRepresentatives") {
      sheet = getOrCreateSheet("Usuarios", SHEET_ID);
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
      sheet = getOrCreateSheet("Configuracion", SHEET_ID);
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
    var sheet;

    // Acción para marcar un pago virtual como procesado en la hoja ORIGEN
    if (action === "markVirtualProcessed") {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      sheet = ss.getSheetByName("OficinaVirtual");
      var rowIndex = parseInt(data.rowIndex);
      
      if (!sheet || isNaN(rowIndex)) return createJsonResponse({ error: "Datos inválidos" });

      // Buscar o crear columna "EstatusSistema"
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var statusCol = -1;
      
      for (var i = 0; i < headers.length; i++) {
        if (normalizeHeader(headers[i]) === "estatussistema") {
          statusCol = i + 1;
          break;
        }
      }

      // Si no existe la columna, la creamos al final
      if (statusCol === -1) {
        statusCol = headers.length + 1;
        sheet.getRange(1, statusCol).setValue("EstatusSistema").setFontWeight("bold");
      }

      // Escribir el estatus en la fila correspondiente
      sheet.getRange(rowIndex, statusCol).setValue(data.status || "PROCESADO");
      
      return createJsonResponse({ success: true });
    }

    if (action === "addPayment") {
      sheet = getOrCreateSheet("Pagos", SHEET_ID);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var newRow = headers.map(function(h) {
        return data[h] !== undefined ? data[h] : "";
      });
      sheet.appendRow(newRow);
      return createJsonResponse({ success: true });
    }

    if (action === "saveRepresentative") {
      sheet = getOrCreateSheet("Usuarios", SHEET_ID);
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
      sheet = getOrCreateSheet("Pagos", SHEET_ID);
      var valuesP = sheet.getDataRange().getValues();
      for (var j = 1; j < valuesP.length; j++) {
        if (valuesP[j][0] === data.id || (data.reference && valuesP[j][7] === data.reference)) {
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
    
    if (action === "saveConfig") {
      sheet = getOrCreateSheet("Configuracion", SHEET_ID);
      sheet.clearContents();
      sheet.appendRow(["key", "value"]);
      var keys = Object.keys(data);
      keys.forEach(function(k) {
        var val = typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k];
        sheet.appendRow([k, val]);
      });
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
