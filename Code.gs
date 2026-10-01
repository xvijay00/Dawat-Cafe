/* ═══════════════════════════════════════════════════════════════
   DAWAT CAFE — Google Apps Script Backend (Code.gs)
   Handles order submissions, validation, duplicate protection,
   saves to Google Sheet, and sends email notifications.
   ═══════════════════════════════════════════════════════════════ */

// ── Configuration ──
const SHEET_NAME   = "Orders";
const EMAIL_TO     = "xvijaykumar000@gmail.com";
const CAFE_NAME    = "DAWAT CAFE";
const DUPLICATE_WINDOW_MINUTES = 10; // Reject duplicate orders within this window

// Sheet column headers (auto-created if sheet is empty)
const HEADERS = [
  "Order ID",
  "Time (IST)",
  "Name",
  "Phone",
  "Email",
  "Address",
  "Items",
  "Total",
  "Delivery Option",
  "Delivery Time",
  "Notes",
  "Status"
];


/**
 * doGet — Simple health check endpoint
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success",
      message: "Cafe order API is running"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * doPost — Receives order data, validates, saves, and sends email
 */
function doPost(e) {
  try {
    // Parse incoming JSON
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse("error", "Invalid JSON payload.");
    }

    // ─── Server-side Validation ───
    var errors = validateOrder(data);
    if (errors.length > 0) {
      return jsonResponse("error", errors.join(" "));
    }

    // ─── Lock to prevent race conditions ───
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000); // Wait up to 10 seconds
    } catch (lockErr) {
      return jsonResponse("error", "Server is busy. Please try again in a moment.");
    }

    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(SHEET_NAME);

      // Create sheet if it doesn't exist
      if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
      }

      // Create header row if sheet is empty
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        sheet.getRange(1, 1, 1, HEADERS.length)
          .setFontWeight("bold")
          .setBackground("#d4a853")
          .setFontColor("#1a1612");
        sheet.setFrozenRows(1);
      }

      // ─── Duplicate Protection ───
      var duplicateMsg = checkDuplicate(sheet, data.phone, data.email);
      if (duplicateMsg) {
        lock.releaseLock();
        return jsonResponse("error", duplicateMsg);
      }

      // ─── Generate Order ID ───
      var rowCount = sheet.getLastRow(); // includes header
      var orderNum = rowCount; // Row 2 = order 1, etc.
      var orderId = "ORD-" + padNumber(orderNum, 4);

      // ─── Format Data ───
      var timestamp = Utilities.formatDate(
        new Date(),
        "Asia/Kolkata",
        "dd/MM/yyyy HH:mm"
      );

      var itemsStr = data.items.map(function(item) {
        return item.qty + "x " + item.name;
      }).join(", ");

      var deliveryTime = data.deliveryTime || "";
      var email = data.email || "";
      var notes = data.notes || "";

      // ─── Write Row ───
      sheet.appendRow([
        orderId,
        timestamp,
        data.name,
        data.phone,
        email,
        data.address,
        itemsStr,
        data.total,
        data.deliveryOption,
        deliveryTime,
        notes,
        "Pending"
      ]);

      // ─── Send Email Alert ───
      try {
        sendOrderEmail(orderId, timestamp, data, itemsStr);
      } catch (emailErr) {
        // Don't fail the order if email fails
        Logger.log("Email error: " + emailErr.message);
      }

      lock.releaseLock();

      return jsonResponse("success", "Order placed successfully!", orderId);

    } catch (sheetErr) {
      lock.releaseLock();
      Logger.log("Sheet error: " + sheetErr.message);
      return jsonResponse("error", "Failed to save order. Please try again.");
    }

  } catch (err) {
    Logger.log("Unexpected error: " + err.message);
    return jsonResponse("error", "An unexpected error occurred. Please try again.");
  }
}


/**
 * validateOrder — Server-side validation (never trust the client)
 */
function validateOrder(data) {
  var errors = [];

  // Required fields
  if (!data.name || data.name.trim() === "") {
    errors.push("Name is required.");
  }

  if (!data.address || data.address.trim() === "") {
    errors.push("Delivery address is required.");
  }

  // Phone: exactly 10 digits, starting with 6-9
  if (!data.phone || !/^[6-9]\d{9}$/.test(data.phone.trim())) {
    errors.push("Valid 10-digit Indian mobile number is required.");
  }

  // Email: optional, but validate format if provided
  if (data.email && data.email.trim() !== "") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.push("Invalid email format.");
    }
  }

  // Delivery option
  var validOptions = ["Under 30 minutes", "Within 1 hour", "Tomorrow"];
  if (!data.deliveryOption || validOptions.indexOf(data.deliveryOption) === -1) {
    errors.push("Valid delivery option is required.");
  }

  // Items array
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push("At least one item must be selected.");
  }

  // Validate total is a number
  if (typeof data.total !== "number" || data.total <= 0) {
    errors.push("Invalid order total.");
  }

  return errors;
}


/**
 * checkDuplicate — Reject if same phone OR same email ordered within last N minutes
 */
function checkDuplicate(sheet, phone, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null; // Only header row

  var dataRange = sheet.getRange(2, 1, lastRow - 1, HEADERS.length);
  var values = dataRange.getValues();

  var now = new Date();
  var cutoff = new Date(now.getTime() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);

  // Columns: 0=OrderID, 1=Time, 2=Name, 3=Phone, 4=Email
  for (var i = values.length - 1; i >= 0; i--) {
    var rowTime = values[i][1]; // Time (IST) as string dd/MM/yyyy HH:mm

    // Parse IST timestamp
    var parsedTime = parseISTTimestamp(rowTime);
    if (!parsedTime || parsedTime < cutoff) {
      // Once we've gone past the cutoff, no need to check older rows
      break;
    }

    var rowPhone = String(values[i][3]).trim();
    var rowEmail = String(values[i][4]).trim().toLowerCase();

    // Check phone match
    if (rowPhone === phone.trim()) {
      return "You already placed an order recently. Please wait a few minutes before ordering again.";
    }

    // Check email match (only if email was provided)
    if (email && email.trim() !== "" && rowEmail === email.trim().toLowerCase()) {
      return "An order with this email was placed recently. Please wait a few minutes before ordering again.";
    }
  }

  return null;
}


/**
 * parseISTTimestamp — Parse "dd/MM/yyyy HH:mm" string to Date object
 */
function parseISTTimestamp(timeStr) {
  if (!timeStr || typeof timeStr !== "string") {
    // If it's already a Date object (Sheets sometimes does this)
    if (timeStr instanceof Date) return timeStr;
    return null;
  }

  var parts = timeStr.split(" ");
  if (parts.length !== 2) return null;

  var dateParts = parts[0].split("/");
  var timeParts = parts[1].split(":");

  if (dateParts.length !== 3 || timeParts.length !== 2) return null;

  var day   = parseInt(dateParts[0], 10);
  var month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
  var year  = parseInt(dateParts[2], 10);
  var hour  = parseInt(timeParts[0], 10);
  var min   = parseInt(timeParts[1], 10);

  return new Date(year, month, day, hour, min);
}


/**
 * sendOrderEmail — Send formatted email notification
 */
function sendOrderEmail(orderId, timestamp, data, itemsStr) {
  var subject = "🍽️ New Order " + orderId + " — " + CAFE_NAME;

  var body = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  body += "  " + CAFE_NAME + " — NEW ORDER\n";
  body += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
  body += "📋 Order ID:       " + orderId + "\n";
  body += "🕐 Time (IST):     " + timestamp + "\n\n";
  body += "👤 Customer:       " + data.name + "\n";
  body += "📞 Phone:          " + data.phone + "\n";
  body += "📧 Email:          " + (data.email || "Not provided") + "\n";
  body += "📍 Address:        " + data.address + "\n\n";
  body += "🍕 Items:          " + itemsStr + "\n";
  body += "💰 Total:          ₹" + data.total + "\n\n";
  body += "🚚 Delivery:       " + data.deliveryOption + "\n";

  if (data.deliveryTime) {
    body += "⏰ Preferred Time: " + data.deliveryTime + "\n";
  }

  if (data.notes) {
    body += "📝 Notes:          " + data.notes + "\n";
  }

  body += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
  body += "Status: PENDING — Please process this order.\n";

  MailApp.sendEmail({
    to: EMAIL_TO,
    subject: subject,
    body: body
  });
}


/**
 * padNumber — Pad a number with leading zeros
 */
function padNumber(num, length) {
  var str = String(num);
  while (str.length < length) {
    str = "0" + str;
  }
  return str;
}


/**
 * jsonResponse — Helper to return consistent JSON responses
 */
function jsonResponse(status, message, orderId) {
  var obj = {
    status: status,
    message: message
  };
  if (orderId) {
    obj.orderId = orderId;
  }
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
