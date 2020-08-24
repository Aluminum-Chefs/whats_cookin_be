const client = require('../lib/client');
// import our seed data:
const favorites = require('./favorites.js');
const usersData = require('./users.js');
const { getEmoji } = require('../lib/emoji.js');
const schedules = require('./schedules.js');
const days = require('./days.js');

run();

async function run() {

  try {
    await client.connect();

    await Promise.all(
      schedules.map(schedule=> {
        return client.query(`
                    INSERT INTO schedules (name)
                    VALUES ($1)
                `,
        [schedule.name]);
      })
    );
    
    const users = await Promise.all(
      usersData.map(user => {
        return client.query(`
                      INSERT INTO users (email, hash, schedule_id)
                      VALUES ($1, $2, $3)
                      RETURNING *
                  `,
        [user.email, user.hash, user.schedule_id]);
      })
    );
      
    const user = users[0].rows[0];

    await Promise.all(
      favorites.map(favorite => {
        return client.query(`
                    INSERT INTO favorites (source_id, title, image_url, notes,  owner_id)
                    VALUES ($1, $2, $3, $4, $5)
                `,
        [favorite.source_id, favorite.title, favorite.image_url, favorite.notes, user.id]);
      })
    );
    await Promise.all(
      days.map(day => {
        return client.query(`
                  INSERT INTO days (date, schedule_id, favorite_id,  owner_id)
                  VALUES ($1, $2, $3, $4)
              `,
        [day.date, day.schedule_id, day.favorite_id, user.id]);
    
      })
    );
  
  
    


    console.log('seed data load complete', getEmoji(), getEmoji(), getEmoji());
  }
  catch(err) {
    console.log(err);
  }
  finally {
    client.end();
  }
    
}
