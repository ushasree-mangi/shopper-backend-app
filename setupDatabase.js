const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database
let db = new sqlite3.Database('./shopperAppDatabase.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Create users table
db.run(`CREATE TABLE IF NOT EXISTS cart (
    productId INT PRIMARY KEY ,
    quantity INT NOT NULL,
    
)`, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('cart table created or already exists.');
});

// Close the database connection
db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the database connection.');
});
