import PouchDB from 'pouchdb';

const db = new PouchDB('babines');
const remoteDB = new PouchDB('http://localhost:25725/babines');

db.sync(remoteDB, {
  live: true,
  retry: true
});

export default db;
