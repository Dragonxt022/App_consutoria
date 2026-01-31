require('dotenv').config();

const { sequelize } = require('../src/models');

async function createAdmin() {
  try {
    await sequelize.sync({ force: false });
    console.log('Database synchronized');
    
    const User = require('../src/models/User');
    
    const adminExists = await User.findOne({ where: { email: 'admin@consultoria.com' } });
    
    if (!adminExists) {
      await User.create({
        name: 'Administrador',
        email: 'admin@consultoria.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Admin user created successfully');
      console.log('Email: admin@consultoria.com');
      console.log('Password: admin123');
    } else {
      console.log('Admin user already exists');
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();