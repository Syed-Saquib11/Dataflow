// src/backend/services/fee-service.js
const feeModel = require('../models/fee-model');
const studentModel = require('../models/student-model');
const activityModel = require('../models/activity-model');

function addPayment(feeId, data, callback) {
  feeModel.addPayment(feeId, data.amount, data.method, data.paymentDate, data.note, (err, result) => {
    if (err) return callback(err);

    // Async log activity - don't block the response
    const sql = `
      SELECT s.firstName, s.lastName 
      FROM fees f 
      JOIN students s ON f.studentId = s.id 
      WHERE f.id = ?
    `;
    // We use the db from feeModel if possible, or just require it
    const db = require('../database/db');
    db.get(sql, [feeId], (dbErr, row) => {
      if (!dbErr && row) {
        const name = `${row.firstName} ${row.lastName}`.trim();
        activityModel.logActivity(
          'fee',
          'Payment Received',
          `${name} paid ₹${data.amount} via ${data.method}`,
          'payment'
        );
      }
    });

    callback(null, result);
  });
}

module.exports = {
  addPayment,
  // Proxy other methods if needed, or just use feeModel directly in main.js for simple ones
  getAllFees: feeModel.getAllFeesWithPayments,
  getPayments: feeModel.getPaymentsForFeeId,
  updateFee: feeModel.updateFeeRecord,
  deletePayment: feeModel.deletePayment
};
