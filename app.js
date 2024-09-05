

const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt=require('bcrypt')
const app = express();
const cors = require('cors');

const jwt=require("jsonwebtoken")
const {v4}=require("uuid")
const uuidv4=v4

const corsOptions = {
  origin: 'http://localhost:3000', // Frontend running locally on port 3000
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};


app.use(express.json())
app.use(cors(corsOptions));

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

//middleware Api 

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
   
    response.status(401).json({error_msg:"Invalid JWT Token"});
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401).json({error_msg:"Invalid JWT Token"});
      } else {
        console.log("middleware function executed")
        next();

      }
    });
  }
};


//GET Products
app.get("/products/",authenticateToken, async (request, response) => {
  const getProductsQuery = `
    SELECT
      *
    FROM
      products  
      ;`;
  const productsArray = await db.all(getProductsQuery);
  response.status(201).json({products:productsArray});
});



//Register Api
  app.post("/register/", async (request, response) => {
    
    const {username,password}=request.body
    const id=uuidv4()
    console.log(`api log : id :${id} username:${username} password ${password}`)
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      const createUserQuery = `
        INSERT INTO 
          users (id ,username, password) 
        VALUES 
          ('${id}',
            '${username}', 
            
            '${hashedPassword}'
            
          )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      console.log(dbResponse)
      response.status(201).json({ message: `Created new user with ${newUserId}` });
  
     
    } else {
      response.status(400).json({ error_msg: "User already exists" });
    }
  }); 
 
//Login Api
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400).json({ error_msg: "invalid user" });
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
        const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.status(201).json({ jwt_token:jwtToken });
    } else {
      
      response.status(400).json({error_msg:"Invalid Password"});
    }
  }
});



