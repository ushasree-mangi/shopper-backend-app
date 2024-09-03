

const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(express.json())

const PORT = process.env.PORT || 3000

const dbPath = path.join(__dirname, "shopperAppDatabase.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();


//GET Products
app.get("/products/", async (request, response) => {
  const getProductsQuery = `
    SELECT
      *
    FROM
      products  
      ;`;
  const productsArray = await db.all(getProductsQuery);
  response.send(productsArray);
});

