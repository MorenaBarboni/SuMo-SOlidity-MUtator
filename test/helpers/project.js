const fs = require('node:fs');
const path = require('node:path');
const appRoot = require('app-root-path');

const repository = path.resolve(__dirname, '../..');
const source = `pragma solidity ^0.8.0;
contract Counter {
    function enabled() public pure returns (bool) {
        return true;
    }
    function add(uint a, uint b) public pure returns (uint) {
        return a + b;
    }
}
`;

// A disposable installed-package layout exercises SuMo's real path resolution.
// Keeping it under test/ lets Node resolve dependencies from the repository.
module.exports = function project(t, overrides = {}) {
    // Silence routine SuMo logs only for this test. Node restores these mocks
    // automatically; stderr and test-runner diagnostics stay visible.
    t.mock.method(console, 'log', () => {});
    const root = fs.mkdtempSync(path.join(repository, 'test', '.tmp-'));
    const packageDir = path.join(root, 'node_modules', '@morenabarboni', 'sumo');
    const previousRoot = appRoot.toString();
    t.after(() => {
        appRoot.setPath(previousRoot);
        for (const key of Object.keys(require.cache)) {
            if (key.startsWith(root + path.sep)) delete require.cache[key];
        }
        fs.rmSync(root, { recursive: true, force: true });
    });
    fs.mkdirSync(packageDir, { recursive: true });
    fs.cpSync(path.join(repository, 'src'), path.join(packageDir, 'src'), { recursive: true });
    for (const name of ['index.js', 'package.json']) {
        fs.copyFileSync(path.join(repository, name), path.join(packageDir, name));
    }
    for (const name of ['contracts', 'test', 'artifacts', 'sumo/baseline/contracts', 'sumo/results/mutants']) {
        fs.mkdirSync(path.join(root, name), { recursive: true });
    }
    const config = {
        contractsDir: 'contracts', testDir: 'test', buildDir: 'artifacts',
        testingFramework: 'hardhat', skipContracts: ['mock'], skipTests: [],
        minimalOperators: false, randomSampling: false, randomMutants: 2,
        testingTimeOutInSec: 5, ...overrides
    };
    fs.writeFileSync(path.join(root, 'sumo-config.js'), `module.exports = ${JSON.stringify(config)}`);
    fs.writeFileSync(path.join(root, 'package-lock.json'), '{}');
    fs.writeFileSync(path.join(root, 'test', 'counter.js'), '// external test placeholder\n');
    const file = path.join(root, 'contracts', 'Counter.sol').replaceAll('\\', '/');
    fs.writeFileSync(file, source);
    fs.writeFileSync(path.join(root, 'sumo/baseline/contracts/Counter.sol'), source);
    // Enable just BLR and BOR so expected mutations remain small and explicit.
    fs.writeFileSync(path.join(packageDir, 'src/operators.config.json'), JSON.stringify({ BLR: true, BOR: true }));
    appRoot.setPath(root);
    // This presentation-only method writes diffs directly to stdout. Stub it
    // rather than stdout itself, which also carries Node's test results.
    const Reporter = require(path.join(packageDir, 'src/reporter'));
    t.mock.method(Reporter.prototype, 'logCompile', () => {});
    return {
        root, file, source,
        load: name => require(path.join(packageDir, 'src', name)),
        config: require(path.join(root, 'sumo-config.js'))
    };
};
