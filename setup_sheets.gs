
/**
 * Script de Backend para el Colegio Beltrán Prieto Figueroa.
 * ID: 1vhTFY-DLkHZIvTozAj-_ZiJDLftgkHmh494OM9EjDdQ
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Hoja de Pagos
  let pagosSheet = ss.getSheetByName("Pagos");
  if (!pagosSheet) pagosSheet = ss.insertSheet("Pagos");
  const pagosHeaders = ["id", "timestamp", "paymentDate", "cedulaRepresentative", "matricula", "level", "method", "reference", "amount", "amountBs", "exchangeRate", "observations", "status", "type", "pendingBalance"];
  pagosSheet.getRange(1, 1, 1, pagosHeaders.length).setValues([pagosHeaders]).setFontWeight("bold").setBackground("#cbd5e1");
  pagosSheet.setFrozenRows(1);

  // Hoja de Usuarios
  let usuariosSheet = ss.getSheetByName("Usuarios");
  if (!usuariosSheet) usuariosSheet = ss.insertSheet("Usuarios");
  const usuariosHeaders = ["cedula", "nombre", "matricula", "estudiantes_json"];
  usuariosSheet.getRange(1, 1, 1, usuariosHeaders.length).setValues([usuariosHeaders]).setFontWeight("bold").setBackground("#cbd5e1");
  usuariosSheet.setFrozenRows(1);

  // Hoja de Configuración
  let configSheet = ss.getSheetByName("Configuracion");
  if (!configSheet) configSheet = ss.insertSheet("Configuracion");
  const configHeaders = ["key", "value"];
  configSheet.getRange(1, 1, 1, configHeaders.length).setValues([configHeaders]).setFontWeight("bold");
}

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (action === "getConfig") {
      const sheet = ss.getSheetByName("Configuracion");
      const data = sheet.getDataRange().getValues();
      data.shift();
      let config = {};
      data.forEach(row => {
        if (row[0] === "monthlyFees") config[row[0]] = JSON.parse(row[1]);
        else if (row[0] === "exchangeRate") config[row[0]] = parseFloat(row[1]);
        else config[row[0]] = row[1];
      });
      return ContentService.createTextOutput(JSON.stringify(config)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ... resto de acciones getPayments, getRepresentatives (sin cambios significativos)
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  const data = body.data;

  try {
    if (action === "saveConfig") {
      const sheet = ss.getSheetByName("Configuracion");
      sheet.clear();
      sheet.appendRow(["key", "value"]);
      sheet.appendRow(["monthlyFees", JSON.stringify(data.monthlyFees)]);
      sheet.appendRow(["exchangeRate", data.exchangeRate]);
      sheet.appendRow(["schoolName", data.schoolName]);
      sheet.appendRow(["lastUpdated", data.lastUpdated]);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
    // ... resto de acciones (saveRepresentative, addPayment)
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
