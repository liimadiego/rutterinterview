const connection = require('./connection');

connection.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopify_id INTEGER UNIQUE,
    title TEXT)`
  , (err) => {
  if (err) {
    console.error(err.message);
  }
});

connection.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopify_id INTEGER UNIQUE,
    line_items TEXT)`
  , (err) => {
  if (err) {
    console.error(err.message);
  }
});
