const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { sequelize, shouldSyncOnStart } = require('../../models');
const { projectRoot, mutableUploadsRoot, legacyUploadsRoot } = require('../../utils/UploadPaths');

const MIGRATIONS_DIR = path.join(projectRoot, 'migrations');
const STORAGE_DIR = path.join(projectRoot, 'storage');
const SAFE_DIRECTORY_COMMAND = `git config --global --add safe.directory ${projectRoot}`;

function runCommand(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: options.timeout || 12000
    }).trim();
  } catch (error) {
    if (options.fallback !== undefined) {
      return options.fallback;
    }

    const stderr = error.stderr ? String(error.stderr).trim() : '';
    const stdout = error.stdout ? String(error.stdout).trim() : '';
    const details = stderr || stdout || error.message;
    throw new Error(details);
  }
}

function parseGitIssue(message = '') {
  if (!message) return { type: '', message: '' };

  if (message.includes('detected dubious ownership in repository')) {
    return {
      type: 'safe-directory',
      message: 'O Git deste servidor ainda não confia neste diretório como repositório seguro.'
    };
  }

  if (message.includes('no upstream configured')) {
    return {
      type: 'no-upstream',
      message: 'Esta branch ainda não possui upstream configurado no Git.'
    };
  }

  return {
    type: 'unknown',
    message
  };
}

function listTrackedMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.cjs'))
    .sort();
}

async function getAppliedMigrations() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((table) => {
      if (typeof table === 'string') return table;
      if (table && typeof table.tableName === 'string') return table.tableName;
      return String(table);
    });

    if (!normalizedTables.includes('SequelizeMeta')) {
      return [];
    }

    const [rows] = await sequelize.query('SELECT name FROM SequelizeMeta ORDER BY name ASC;');
    return rows.map((row) => row.name).filter(Boolean);
  } catch (error) {
    console.error('Erro ao verificar migrations aplicadas:', error);
    return [];
  }
}

function summarizeCommits(logOutput) {
  if (!logOutput) return [];

  return logOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, ...messageParts] = line.split(' ');
      return {
        hash,
        message: messageParts.join(' ').trim()
      };
    });
}

function isWritable(dirPath) {
  try {
    fs.accessSync(dirPath, fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

class UpdateAdminService {
  async getUpdatesPageData() {
    let fetchError = '';
    let gitIssue = { type: '', message: '' };
    try {
      runCommand('git', ['fetch', '--quiet', '--prune'], { timeout: 20000 });
    } catch (error) {
      fetchError = error.message;
      gitIssue = parseGitIssue(error.message);
    }

    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const gitAvailable = !fetchError || gitIssue.type === 'no-upstream';
    const branch = gitAvailable
      ? runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { fallback: 'desconhecida' })
      : 'indisponível';
    const currentCommit = gitAvailable
      ? runCommand('git', ['rev-parse', 'HEAD'], { fallback: '' })
      : '';
    const currentShortCommit = gitAvailable
      ? runCommand('git', ['rev-parse', '--short', 'HEAD'], { fallback: '' })
      : '';

    let upstream = '';
    if (gitAvailable) {
      try {
        upstream = runCommand('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
      } catch (error) {
        const upstreamIssue = parseGitIssue(error.message);
        if (!gitIssue.type) {
          gitIssue = upstreamIssue;
        }
      }
    }

    const remoteCommit = gitAvailable && upstream
      ? runCommand('git', ['rev-parse', upstream], { fallback: '' })
      : '';
    const remoteShortCommit = gitAvailable && upstream
      ? runCommand('git', ['rev-parse', '--short', upstream], { fallback: '' })
      : '';
    const behindCount = gitAvailable && upstream
      ? Number(runCommand('git', ['rev-list', '--count', `HEAD..${upstream}`], { fallback: '0' }) || 0)
      : 0;
    const aheadCount = gitAvailable && upstream
      ? Number(runCommand('git', ['rev-list', '--count', `${upstream}..HEAD`], { fallback: '0' }) || 0)
      : 0;

    const updateCommits = gitAvailable && upstream && behindCount > 0
      ? summarizeCommits(runCommand('git', ['log', '--oneline', '--reverse', `HEAD..${upstream}`], { fallback: '' }))
      : [];

    const recentLocalCommits = gitAvailable
      ? summarizeCommits(runCommand('git', ['log', '--oneline', '--max-count', '5'], { fallback: '' }))
      : [];

    const worktreeStatus = gitAvailable
      ? runCommand('git', ['status', '--porcelain'], { fallback: '' })
      : '';
    const npmVersion = runCommand('npm', ['--version'], { fallback: 'indisponível' });

    const migrationFiles = listTrackedMigrations();
    const appliedMigrations = await getAppliedMigrations();
    const appliedSet = new Set(appliedMigrations);
    const pendingMigrations = migrationFiles.filter((file) => !appliedSet.has(file));

    const storageExists = fs.existsSync(STORAGE_DIR);
    const uploadsExists = fs.existsSync(mutableUploadsRoot);
    const storageWritable = storageExists ? isWritable(STORAGE_DIR) : false;
    const uploadsWritable = uploadsExists ? isWritable(mutableUploadsRoot) : false;

    return {
      version: packageJson.version,
      branch,
      currentCommit,
      currentShortCommit,
      upstream,
      remoteCommit,
      remoteShortCommit,
      behindCount,
      aheadCount,
      updateAvailable: gitAvailable && behindCount > 0,
      gitAvailable,
      gitIssueType: gitIssue.type,
      gitIssueMessage: gitIssue.message,
      safeDirectoryCommand: SAFE_DIRECTORY_COMMAND,
      fetchError,
      updateCommits,
      recentLocalCommits,
      worktreeDirty: Boolean(worktreeStatus),
      worktreeStatusLines: worktreeStatus ? worktreeStatus.split('\n').filter(Boolean) : [],
      nodeVersion: process.version,
      npmVersion,
      platform: `${os.platform()} ${os.release()}`,
      dbSyncOnStart: shouldSyncOnStart(),
      migrations: {
        total: migrationFiles.length,
        applied: appliedMigrations.length,
        pending: pendingMigrations.length,
        pendingItems: pendingMigrations
      },
      storage: {
        storageDir: STORAGE_DIR,
        uploadsDir: mutableUploadsRoot,
        legacyUploadsDir: legacyUploadsRoot,
        storageExists,
        uploadsExists,
        storageWritable,
        uploadsWritable
      },
      testsStatus: {
        ok: true,
        label: packageJson.scripts && packageJson.scripts.test ? 'Suite disponível para execução manual' : 'Nenhuma suíte configurada'
      },
      recommendedCommand: 'npm run app:update:prepare'
    };
  }
}

module.exports = new UpdateAdminService();
