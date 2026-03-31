// OPTIMIZED Google Apps Script for Nutrition Tracker
// Supports date range filtering to reduce data transfer
// WITH DEBUG LOGGING

function doGet(e) {
  const sheet = SpreadsheetApp.openById('1ly9FbWM7KTSddrzriIO40DaxamjORFP5K2Yy3wTDXLQ').getSheetByName('FoodLog');
  
  try {
    const action = e.parameter.action;
    
    if (action === 'load') {
      // Get optional date range parameters
      const startDate = e.parameter.startDate; // Format: YYYY-MM-DD
      const endDate = e.parameter.endDate;     // Format: YYYY-MM-DD
      
      Logger.log('Loading data with date filter: ' + startDate + ' to ' + endDate);
      
      const lastRow = sheet.getLastRow();
      
      if (lastRow <= 1) {
        Logger.log('No data in sheet');
        return ContentService.createTextOutput(JSON.stringify({
          status: 'success',
          foods: []
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Get all data
      const data = sheet.getRange(2, 1, lastRow - 1, 45).getValues();
      const headers = sheet.getRange(1, 1, 1, 45).getValues()[0];
      
      Logger.log('Total rows in sheet: ' + data.length);
      Logger.log('Headers: ' + headers.join(', '));
      
      // Convert to objects
      let foods = data.map(row => {
        const food = {};
        headers.forEach((header, index) => {
          const value = row[index];
          
          // Parse numbers
          if (header.match(/calories|protein|carbs|fat|sugar|fiber|saturated|monounsaturated|polyunsaturated|trans|cholesterol|calcium|iron|magnesium|phosphorus|potassium|sodium|zinc|vitamin|thiamin|riboflavin|niacin|folate|water|servingSize/i)) {
            food[header] = value === '' ? 0 : Number(value);
          }
          // Parse ID
          else if (header === 'id') {
            food[header] = value === '' ? Date.now() : Number(value);
          }
          // Everything else as string
          else {
            food[header] = value === '' ? '' : String(value);
          }
        });
        return food;
      });
      
      Logger.log('First 3 food dates: ' + foods.slice(0, 3).map(f => '"' + f.date + '"').join(', '));
      
      // Filter by date range if provided
      if (startDate && endDate) {
        const beforeFilter = foods.length;
        Logger.log('Filtering between "' + startDate + '" and "' + endDate + '"');
        
        foods = foods.filter(food => {
          const foodDate = String(food.date).trim(); // Ensure it's a string and trim whitespace
          const inRange = foodDate >= startDate && foodDate <= endDate;
          if (!inRange) {
            Logger.log('Excluding: ' + foodDate + ' (not in range)');
          }
          return inRange;
        });
        
        Logger.log('Filtered from ' + beforeFilter + ' to ' + foods.length + ' foods');
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        foods: foods
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const sheet = SpreadsheetApp.openById('1ly9FbWM7KTSddrzriIO40DaxamjORFP5K2Yy3wTDXLQ').getSheetByName('FoodLog');
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'sync') {
      const foods = data.foods;
      
      Logger.log('Syncing ' + foods.length + ' foods to sheet');
      Logger.log('Sample dates: ' + foods.slice(0, 3).map(f => f.date).join(', '));
      
      // Clear existing data (keep header)
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      
      // Prepare data for batch insert
      const headers = sheet.getRange(1, 1, 1, 45).getValues()[0];
      const rows = foods.map(food => {
        return headers.map(header => {
          const value = food[header];
          return value === undefined || value === null ? '' : value;
        });
      });
      
      // Insert all data at once (much faster)
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 45).setValues(rows);
      }
      
      Logger.log('Successfully synced ' + foods.length + ' foods');
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        count: foods.length
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
