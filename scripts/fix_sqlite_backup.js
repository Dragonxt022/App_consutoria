const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Checking for backup tables...');
  
  db.run("DROP TABLE IF EXISTS Courses_backup", (err) => {
    if (err) {
      console.error('Error dropping Courses_backup:', err.message);
    } else {
      console.log('Dropped Courses_backup (if existed).');
    }
  });

  // Also clean up other potential backup tables just in case
  db.run("DROP TABLE IF EXISTS Enrollments_backup", (err) => {
    if (!err) console.log('Dropped Enrollments_backup (if existed).');
  });
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Database cleanup completed.');
});
