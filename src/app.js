const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(express.static(path.join(__dirname, 'public')));

const homeRoutes = require('./routes/home');
const authRoutes = require('./routes/auth');

app.use('/', homeRoutes);
app.use('/auth', authRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Página não encontrada' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.sync({ force: false });
    console.log('Database synchronized');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();