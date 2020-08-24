const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');
const request = require('superagent');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const authRoutes = createAuthRoutes();

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
app.get('/api/test', (req, res) => {
  res.json({
    message: `in this protected route, we get the user's id like so: ${req.userId}`
  });
});

app.get('/api/favorites', async(req, res) => {
  const userId = req.userId;


  try {
    const data = await client.query(`SELECT * from favorites
                WHERE owner_id = $1`, 
    [userId]);

    res.json(data.rows);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.get('/search', async(req, res) => {
  try {

    const searchTerms = {

      cuisine: req.body.cuisine,
      ingredients: req.body.ingredients

    };
    
    const queryString = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${process.env.API_KEY}&cuisine=${searchTerms.cuisine}&ingredients=${searchTerms.ingredients}`;
   
    const response = await request.get(queryString);
    
    res.json(response.body);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/favorites', async(req, res) => {
  try {
    const userId = req.userId;

    const newFavorite = {
      source_id: req.body.source_id,
      title: req.body.title,
      image_url: req.body.image_url,
      notes: req.body.notes
      
    };

    const data = await client.query(`
            INSERT INTO favorites (source_id, title, image_url, notes, owner_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `, [newFavorite.source_id, newFavorite.title, newFavorite.image_url, newFavorite.notes, userId]);

    res.json(data.rows[0]);


  } catch(e) {

    res.status(500).json({ error: e.message });
  }
});



app.use(require('./middleware/error'));

module.exports = app;
