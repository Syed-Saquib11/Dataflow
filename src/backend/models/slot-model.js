const db = require('../database/db');

// We use a single row table to store the entire slot schedules matrix layout, 
// maintaining compatibility with the rich JSON format while saving locally in DB.
db.run(`
  CREATE TABLE IF NOT EXISTS slot_data (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    json_data TEXT
  )
`);

function getSlotData() {
  return new Promise((resolve, reject) => {
    db.get('SELECT json_data FROM slot_data WHERE id = 1', [], (err, row) => {
      if (err) return reject(err);
      if (row && row.json_data) {
        try {
          resolve(JSON.parse(row.json_data));
        } catch(e) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

function saveSlotData(data) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO slot_data (id, json_data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json_data = excluded.json_data',
      [JSON.stringify(data)],
      function(err) {
        if (err) return reject(err);
        resolve(true);
      }
    );
  });
}

module.exports = { getSlotData, saveSlotData };
