const client = require('../lib/client');
const { getEmoji } = require('../lib/emoji.js');

// async/await needs to run in a function
run();

async function run() {

  try {
    // initiate connecting to db
    await client.connect();

    // run a query to create tables
    await client.query(`
                CREATE TABLE schedules (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(256) NOT NULL

                );

                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(256) NOT NULL,
                    hash VARCHAR(512) NOT NULL
                    schedule_id INTEGER NOT NULL REFERENCES schedules(id)
                );       

                CREATE TABLE favorites (
                    id SERIAL PRIMARY KEY,
                    source_id INTEGER NOT NULL,
                    title VARCHAR(256) NOT NULL,
                    image_url VARCHAR(256) NOT NULL,
                    notes VARCHAR(512) NOT NULL
                    owner_id INTEGER NOT NULL REFERENCES users(id)
                    );

                CREATE TABLE days (
                    id SERIAL PRIMARY KEY,
                    date VARCHAR(256) NOT NULL,
                    schedule_id INTEGER NOT NULL REFERENCES schedules(id),
                    favorite_id INTEGER NOT NULL REFERENCES favorites(id),
                    owner_id INTEGER NOT NULL REFERENCES users(id)
                    
                    );
            );

        `);

    console.log('create tables complete', getEmoji(), getEmoji(), getEmoji());
  }
  catch(err) {
    // problem? let's see the error...
    console.log(err);
  }
  finally {
    // success or failure, need to close the db connection
    client.end();
  }

}
