
/**
 * Script de Backend para el Colegio Beltrán Prieto Figueroa.
 * ID: 1vhTFY-DLkHZIvTozAj-_ZiJDLftgkHmh494OM9EjDdQ
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Hoja de Pagos
  let pagosSheet = ss.getSheetByName("Pagos");
  if (!pagosSheet) pagosSheet = ss.insertSheet("Pagos");
  const pagosHeaders = ["id", "timestamp", "paymentDate", "cedulaRepresentative", "matricula", "level", "method", "reference", "amount", "observations", "status", "type", "pendingBalance"];
  pagosSheet.getRange(1, 1, 1, pagosHeaders.length).setValues([pagosHeaders]).setFontWeight("bold").setBackground("#cbd5e1");
  pagosSheet.setFrozenRows(1);

  // Hoja de Usuarios (Representantes)
  let usuariosSheet = ss.getSheetByName("Usuarios");
  if (!usuariosSheet) usuariosSheet = ss.insertSheet("Usuarios");
  const usuariosHeaders = ["cedula", "nombre", "matricula", "estudiantes_json"]; // estudiantes_json guardará el array de alumnos
  usuariosSheet.getRange(1, 1, 1, usuariosHeaders.length).setValues([usuariosHeaders]).setFontWeight("bold").setBackground("#cbd5e1");
  usuariosSheet.setFrozenRows(1);
}

/**
 * Manejador de solicitudes GET (Consulta de datos)
 */
function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === "getPayments") {
      const sheet = ss.getSheetByName("Pagos");
      const data = sheet.getDataRange().getValues();
      const headers = data.shift();
      const json = data.map(row => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
      return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "getRepresentatives") {
      const sheet = ss.getSheetByName("Usuarios");
      const data = sheet.getDataRange().getValues();
      const headers = data.shift();
      const json = data.map(row => {
        let obj = {};
        headers.forEach((h, i) => {
          if (h === "estudiantes_json") {
            try { obj["students"] = JSON.parse(row[i]); } catch(e) { obj["students"] = []; }
          } else {
            obj[h] = row[i];
          }
        });
        return obj;
      });
      return ContentService.createTextOutput(JSON.stringify(json)).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Manejador de solicitudes POST (Registro de datos)
 */
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  const data = body.data;

  try {
    if (action === "saveRepresentative") {
      const sheet = ss.getSheetByName("Usuarios");
      const rows = sheet.getDataRange().getValues();
      let foundIndex = -1;
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0].toString() === data.cedula.toString()) {
          foundIndex = i + 1;
          break;
        }
      }

      const values = [data.cedula, data.name, data.matricula, JSON.stringify(data.students)];
      if (foundIndex > -1) {
        sheet.getRange(foundIndex, 1, 1, values.length).setValues([values]);
      } else {
        sheet.appendRow(values);
      }
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "addPayment") {
      const sheet = ss.getSheetByName("Pagos");
      sheet.appendRow([
        data.id, 
        data.timestamp, 
        data.paymentDate, 
        data.cedulaRepresentative, 
        data.matricula, 
        data.level, 
        data.method, 
        data.reference, 
        data.amount, 
        data.observations, 
        data.status, 
        data.type, 
        data.pendingBalance
      ]);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "updatePaymentStatus") {
      const sheet = ss.getSheetByName("Pagos");
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i + 1, 11).setValue(data.status); // Columna K (11) es status
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
