const path = require('node:path');

function loadWithStubs(targetPath, stubs) {
  const resolvedTarget = require.resolve(targetPath);
  const targetDir = path.dirname(resolvedTarget);
  const originalTarget = require.cache[resolvedTarget];
  const originalEntries = new Map();

  for (const [request, exports] of Object.entries(stubs)) {
    const resolvedDependency = require.resolve(request, { paths: [targetDir] });
    originalEntries.set(resolvedDependency, require.cache[resolvedDependency]);
    require.cache[resolvedDependency] = {
      id: resolvedDependency,
      filename: resolvedDependency,
      loaded: true,
      exports
    };
  }

  delete require.cache[resolvedTarget];

  try {
    return require(resolvedTarget);
  } finally {
    delete require.cache[resolvedTarget];

    if (originalTarget) {
      require.cache[resolvedTarget] = originalTarget;
    }

    for (const [resolvedDependency, originalEntry] of originalEntries.entries()) {
      if (originalEntry) {
        require.cache[resolvedDependency] = originalEntry;
      } else {
        delete require.cache[resolvedDependency];
      }
    }
  }
}

module.exports = { loadWithStubs };
