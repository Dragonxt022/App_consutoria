const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const storageRoot = path.join(projectRoot, 'storage');
const uploadsRoot = process.env.UPLOADS_DIR
  ? path.isAbsolute(process.env.UPLOADS_DIR)
    ? process.env.UPLOADS_DIR
    : path.resolve(projectRoot, process.env.UPLOADS_DIR)
  : path.join(storageRoot, 'uploads');

const mutableDirectories = [
  uploadsRoot,
  path.join(storageRoot, 'private'),
  path.join(storageRoot, 'private', 'enrollment-documents'),
  path.join(uploadsRoot, 'attachments'),
  path.join(uploadsRoot, 'avatars'),
  path.join(uploadsRoot, 'banners'),
  path.join(uploadsRoot, 'blog'),
  path.join(uploadsRoot, 'blog', 'content'),
  path.join(uploadsRoot, 'blog', 'covers'),
  path.join(uploadsRoot, 'certificates'),
  path.join(uploadsRoot, 'certificates', 'signatures'),
  path.join(uploadsRoot, 'company-certificates'),
  path.join(uploadsRoot, 'courses'),
  path.join(uploadsRoot, 'courses', 'images'),
  path.join(uploadsRoot, 'courses', 'proposals'),
  path.join(uploadsRoot, 'logos'),
  path.join(uploadsRoot, 'products')
];

function step(title) {
  console.log(`\n=== ${title} ===`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(`ok  ${dirPath}`);
}

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    env: process.env,
    ...options
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function commandExists(command) {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], {
    cwd: projectRoot,
    stdio: 'ignore'
  });

  return result.status === 0;
}

function printSummary() {
  console.log('\nAtualização técnica concluída com sucesso.');
  console.log('Próximo passo recomendado: reiniciar a aplicação.');

  if (commandExists('pm2')) {
    console.log('Use: pm2 restart app-consutoria');
  } else {
    console.log('PM2 não foi encontrado no PATH desta sessão.');
  }
}

step('Preparando diretórios persistentes');
ensureDir(storageRoot);
mutableDirectories.forEach(ensureDir);

step('Instalando dependências');
run('npm', ['install', '--no-audit', '--no-fund']);

step('Compilando CSS');
run('npm', ['run', 'build-css-once']);

step('Aplicando migrations');
run('npm', ['run', 'db:migrate']);

step('Executando testes');
run('npm', ['test']);

printSummary();
