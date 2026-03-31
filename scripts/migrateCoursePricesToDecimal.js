require('dotenv').config();

const { sequelize } = require('../src/models');
const { parseMoneyValue, toMoneyStorage } = require('../src/utils/money');

async function getInvalidRows() {
  const [rows] = await sequelize.query('SELECT id, price FROM Courses');

  return rows.filter((row) => {
    const originalValue = row.price == null ? '' : String(row.price).trim();
    if (!originalValue) {
      return true;
    }

    if (!/\d/.test(originalValue)) {
      return true;
    }

    const parsed = parseMoneyValue(row.price);
    return !Number.isFinite(parsed);
  });
}

async function normalizeCoursePrices() {
  const [rows] = await sequelize.query('SELECT id, price FROM Courses');

  for (const row of rows) {
    const normalized = toMoneyStorage(row.price);
    await sequelize.query('UPDATE Courses SET price = :price WHERE id = :id', {
      replacements: {
        id: row.id,
        price: normalized
      }
    });
  }
}

async function alterPriceColumn() {
  await sequelize.query(`
    ALTER TABLE Courses
    MODIFY COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00
  `);
}

async function main() {
  try {
    await sequelize.authenticate();

    const invalidRows = await getInvalidRows();
    if (invalidRows.length > 0) {
      console.error('Existem cursos com preco invalido ou vazio. Corrija antes de migrar:');
      invalidRows.forEach((row) => {
        console.error(`- Curso #${row.id}: "${row.price}"`);
      });
      process.exitCode = 1;
      return;
    }

    await normalizeCoursePrices();
    await alterPriceColumn();

    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('Courses');
    const [sampleRows] = await sequelize.query('SELECT id, price FROM Courses ORDER BY id ASC LIMIT 5');

    console.log('Migracao concluida com sucesso.');
    console.log(`Tipo final da coluna price: ${table.price.type}`);
    console.log('Amostra de valores apos migracao:');
    sampleRows.forEach((row) => {
      console.log(`- Curso #${row.id}: ${row.price}`);
    });
  } catch (error) {
    console.error('Falha ao migrar Courses.price para DECIMAL:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
