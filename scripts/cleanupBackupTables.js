const sequelize = require('../src/config/database');

const cleanupBackupTables = async () => {
  try {
    // Listar todas as tabelas
    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );

    const backupTables = tables[0]
      .map(t => t.name)
      .filter(name => name.includes('_backup') || name.endsWith('_old'));

    if (backupTables.length === 0) {
      console.log('✅ Nenhuma tabela de backup encontrada.');
      return;
    }

    console.log(`🗑️  Encontradas ${backupTables.length} tabela(s) de backup:`);
    console.log(backupTables);

    for (const table of backupTables) {
      await sequelize.query(`DROP TABLE IF EXISTS \`${table}\`;`);
      console.log(`✅ Deletada tabela: ${table}`);
    }

    console.log('✅ Limpeza concluída!');
  } catch (error) {
    console.error('❌ Erro ao limpar tabelas de backup:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

cleanupBackupTables();
