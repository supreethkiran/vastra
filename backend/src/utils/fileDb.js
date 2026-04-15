const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../data/db.json");

function readDb() {
  const raw = fs.readFileSync(dbPath, "utf8");
  return JSON.parse(raw);
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");
}

module.exports = {
  readDb,
  writeDb
};
