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
const { mungeRecipe } = require('./utils.js');

const authRoutes = createAuthRoutes();
const apiKey = process.env.API_KEY;
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
// awaiting front-end decisions
app.get('/api/search', async(req, res) => {
  try {

    const searchTerms = {

      cuisine: req.query.cuisine,
      ingredients: req.query.ingredients,
      diet: req.query.diet

    };
    
    const queryString = `https://api.spoonacular.com/recipes/complexSearch?instructionsRequired=true&apiKey=${apiKey}&cuisine=${searchTerms.cuisine}&ingredients=${searchTerms.ingredients}&diet=${searchTerms.diet}`;
  
    const response = await request.get(queryString);
    
    res.json(response.body);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

//done
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
//done
app.get('/api/favorites/:id', async(req, res) => {
  try {
    const source_id =  req.params.id;

    const queryString = `https://api.spoonacular.com/recipes/${source_id}/information?apiKey=${apiKey}`;
    
    
    const rawData = await request.get(queryString);
    const response = mungeRecipe(JSON.parse(rawData.text));
    res.json(response);

  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});
//done
app.put('/api/favorites/:id', async(req, res) => {
  try {
    const userId = req.userId;
    const favoriteId = req.params.id;
    const updatedFavorite = {
      
      source_id: req.body.source_id,
      title: req.body.title,
      image_url: req.body.image_url,
      notes: req.body.notes
      
    };

    const data = await client.query(`
            UPDATE favorites SET 
              source_id=$1, 
              title=$2,
              image_url=$3,
              notes=$4
            WHERE 
              owner_id=$5 AND id=$6 
            RETURNING *
            `, [updatedFavorite.source_id, updatedFavorite.title, updatedFavorite.image_url, updatedFavorite.notes, userId, favoriteId]);

    res.json(data.rows[0]);

  } catch(e) {

    res.status(500).json({ error: e.message });
  }

});
//done
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
//done
app.delete('/api/favorites/:id', async(req, res) => {
  try {

    const userId = req.userId;
    const favoriteId = req.params.id;
    const deletedFavorite = await client.query(`
            DELETE FROM favorites
            WHERE id = $1 
            AND owner_id = $2
            RETURNING *
            `, [favoriteId, userId]);

    res.json(deletedFavorite.rows[0]);

  } catch(e) {
    res.status(500).json({ error: e.message });

  }

});
//done
app.get('/api/days', async(req, res) => {
  try {
    const userId = req.userId;

    const data = await client.query(`
          SELECT days.day AS date, favorites.title, days.owner_id, favorites.image_url, favorites.notes
          FROM favorites
          JOIN days ON
	        favorites.id = days.favorite_id
	        WHERE days.schedule_id = (SELECT schedule_id       
          FROM users       
          WHERE users.id = $1)`, [userId]); 

    res.json(data.rows);


  } catch(e) {

    res.status(500).json({ error: e.message });
  }
});
//done
app.get('/api/days/:id', async(req, res) => {
  try {
    const dayId = req.params.id;

    const data = await client.query(`
    SELECT * 
    FROM days 
    WHERE id = $1
            `, [dayId]);

    res.json(data.rows[0]);

  } catch(e) {

    res.status(500).json({ error: e.message });
  }
});
//done
app.put('/api/days/:id', async(req, res) => {
  try {

    const userId = req.userId;
    const dayId = req.params.id;
    const updatedDay = {
      
      day: req.body.day,
      schedule_id: req.body.schedule_id,
      favorite_id: req.body.favorite_id,
    };

    const data = await client.query(`
    UPDATE days SET 
      day=$1, 
      schedule_id=$2,
      favorite_id=$3,
      owner_id=$4
    WHERE 
      id=$5 
    RETURNING *
    `, [updatedDay.day, updatedDay.schedule_id, updatedDay.favorite_id, userId, dayId]);
  

    res.json(data.rows[0]);
  
  } catch(e) {
  
    res.status(500).json({ error: e.message });
  }
});
//done
app.post('/api/days', async(req, res) => {
  try {

    
    const userId = req.userId;

    const schedule_id = await client.query(`
          SELECT schedule_id 
          FROM users
          WHERE id = $1`, [userId]);
   
    const newDay = {
      day: req.body.day,
      schedule_id: schedule_id.rows[0].schedule_id,
      favorite_id: req.body.favorite_id,
      
    };
   
    const data = await client.query(`
            INSERT INTO days (day, schedule_id, favorite_id, owner_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
  `, [newDay.day, newDay.schedule_id, newDay.favorite_id, userId]);
  
    res.json(data.rows[0]);
  
    
  
  } catch(e) {
  
    res.status(500).json({ error: e.message });
  }
}); 
//done
app.get('/schedules', async(req, res) => {
  try {
    
    const data = await client.query(`
    SELECT * 
    FROM schedules 
    `);

    res.json(data.rows);


  } catch(e) {

    res.status(500).json({ error: e.message });
  }
});
//done
app.get('/api/schedules/:id', async(req, res) => {
  try {
    const scheduleId = req.params.id;

    const data = await client.query(`
    SELECT * 
    FROM users
    WHERE users.schedule_id = $1 
    `, [scheduleId]);

    res.json(data.rows);


  } catch(e) {

    res.status(500).json({ error: e.message });
  }
});
//done
app.post('/schedules', async(req, res) => {
  try {

    const scheduleName = req.body.schedule_name;
   
    const data = await client.query(`
  INSERT INTO schedules (name)
    VALUES ($1)
    RETURNING *
  `, [scheduleName]);
  
    res.json(data.rows[0]);
  
  
  } catch(e) {
  
    res.status(500).json({ error: e.message });
  }
});
//done
app.delete('/api/schedules/:id', async(req, res) => {
  try {
    const scheduleId = req.params.id;

    const data = await client.query(`
    DELETE FROM schedules
    WHERE schedules.id=$1
    RETURNING * 
    `, [scheduleId]);

    res.json(data.rows[0]);


  } catch(e) {

    res.status(500).json({ error: e.message });
  }
});

app.use(require('./middleware/error'));

module.exports = app;
