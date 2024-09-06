

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
        console.log(payload)
        console.log("above is within middleware")
        request.payload=payload
        next();

      }
    });
  }
};

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
  const {id}=dbUser 

  const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
  if (isPasswordMatched === true) {
    const payload = {
      username:username,
      userId:id,
     };
    console.log(dbUser)
    console.log(payload)
    
    const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
    response.status(201).json({ jwt_token:jwtToken });
  } else {
    
    response.status(400).json({error_msg:"Invalid Password"});
  }
}
});

//GET Products
app.get("/products/",authenticateToken, async (request, response) => {
  const getProductsQuery = `
    SELECT
      *
    FROM
      products ORDER BY RANDOM() 
      ;`;
  const productsArray = await db.all(getProductsQuery);
  response.status(201).json({products:productsArray});
});

//GET Particular Product
app.get("/products/:id/",authenticateToken, async (request, response) => {
  const {id} =request.params;
  const getProductsQuery = `
    SELECT
      *
    FROM
      products where id=${id} 
      ;`;
  const productDetails = await db.all(getProductsQuery);
  response.status(201).json({productDetails});
});


//CART API 
app.post("/cart/add",authenticateToken,async(request,response)=>{
  const {  productId, quantity } = request.body;
  const {userId}=request.payload
  console.log(userId)
  if (!userId) {
    return response.status(400).json({ error_msg: "User ID not found in token" });
  }
  console.log(`user id ${userId}`)
  try{ 
  let cartId;
  // Check if the user already has a cart
  const getCartQuery = `SELECT * FROM user_cart WHERE user_id = ?`;
  const userCartData = await db.get(getCartQuery, [userId]);

  

  if(userCartData===undefined){

    // Create a new cart for the user
    const createCartQuery = `INSERT INTO user_cart (user_id) VALUES (?)`;
    const dbResponse = await db.run(createCartQuery, [userId]);

    
  cartId = dbResponse.lastID; 
  
  }
  else{
    cartId=userCartData.cart_id 
   
  }
  
  console.log(`cart id ${cartId}`) 

  // Step 3: Check if the product is already in the cart
  const checkProductQuery = `SELECT * FROM cart WHERE cart_id = ? AND product_id = ?`;
  const existingProduct = await db.get(checkProductQuery, [cartId, productId]);

  if (existingProduct===undefined) {
    
    // Step 4: Add the product to the cart if it does not exist
    const addProductQuery = `INSERT INTO cart (cart_id, product_id, quantity) VALUES (?, ?, ?)`;
    await db.run(addProductQuery, [cartId, productId, quantity]);
    response.status(201).json({ message: "Product added to cart successfully" });
  } else {
    // Product is already in the cart, do not add again
    return response.status(400).json({ error_msg: "Product already in cart" });
  }
   
  }catch (error) {
    console.error(error);
    response.status(500).send("An error occurred while adding the product to the cart");
  }

});


// Endpoint to get cart products
app.get('/cart', authenticateToken, async (request, response) => {
  const {userId} = request.payload;
  
  try {
    // Fetch the user's cart
    const getCartQuery = `
      SELECT c.product_id, p.name, p.price, c.quantity,p.imageUrl
      FROM cart AS c
      JOIN products AS p ON c.product_id = p.id
      JOIN user_cart AS uc ON c.cart_id = uc.cart_id
      WHERE uc.user_id = ?
    `;
    
    const cartItems = await db.all(getCartQuery, [userId]);
    
    if (cartItems.length === 0) {
      return response.status(404).json({ message: 'No items in the cart' });
    }
    
    response.status(200).json({ cartItems });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Failed to fetch cart items' });
  }
});
