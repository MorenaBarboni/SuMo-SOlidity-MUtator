const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const project = require('./helpers/project');

test('auto detection finds hybrid frameworks and conventional project directories', t => {
    const p = project(t, { testingFramework: 'auto', contractsDir: 'auto', testDir: 'auto' });
    fs.writeFileSync(path.join(p.root, 'hardhat.config.js'), 'module.exports = {}');
    fs.writeFileSync(path.join(p.root, 'foundry.toml'), '');
    const utils = p.load('utils');
    assert.deepEqual(utils.getTestingFrameworks(), ['hardhat', 'forge']);
    assert.equal(utils.getContractsDir(), p.root.replaceAll('\\', '/') + '/contracts');
    assert.equal(utils.getTestDir(), p.root.replaceAll('\\', '/') + '/test');
    assert.equal(utils.getPackageManager(), 'npm');
});

test('invalid or undetectable frameworks and missing custom build configuration fail clearly', t => {
    const p = project(t, { testingFramework: 'unsupported' });
    const utils = p.load('utils');
    assert.throws(() => utils.getTestingFrameworks(), /Unsupported testing framework/);
    p.config.testingFramework = 'auto';
    assert.throws(() => utils.getTestingFrameworks(), /Cannot automatically detect/);
    p.config.testingFramework = 'custom';
    p.config.buildDir = 'auto';
    assert.throws(() => utils.getBuildDir('custom'), /Custom test scripts require buildDir in sumo-config\.js/);
});

test('hybrid test selection routes files to their matching framework', t => {
    const utils = project(t).load('utils');
    const files = ['counter.js', 'counter.ts', 'Counter.sol', 'Counter.t.sol', 'test_counter.py', 'helper.py'];
    assert.deepEqual(utils.getTestsForFramework('hardhat', files), files.slice(0, 3));
    assert.deepEqual(utils.getTestsForFramework('forge', files), ['Counter.t.sol']);
    assert.deepEqual(utils.getTestsForFramework('brownie', files), ['test_counter.py']);
});

test('sampling respects the limit without duplicates or changing the input', t => {
    const p = project(t);
    const pruner = p.load('pruner');
    const mutations = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const original = [...mutations];
    const sample = pruner.pruneMutations(mutations);
    assert.equal(sample.length, 2);
    assert.equal(new Set(sample).size, 2);
    assert.ok(sample.every(m => mutations.includes(m)));
    assert.deepEqual(mutations, original);
    p.config.randomMutants = 10;
    assert.equal(pruner.pruneMutations(mutations).length, 3);
    p.config.randomMutants = 0;
    assert.deepEqual(pruner.pruneMutations(mutations), []);
    assert.deepEqual(pruner.pruneMutations([]), []);
});

test('external process results propagate compile failure, test failure and timeout', t => {
    const p = project(t);
    let response = { status: 0 };
    const spawn = t.mock.method(childProcess, 'spawnSync', () => response);
    // Load after mocking: testingInterface captures spawnSync when imported.
    const testing = p.load('testingInterface');
    assert.equal(testing.spawnCompile(['hardhat']), true);
    response = { status: 1 };
    assert.equal(testing.spawnCompile(['hardhat']), false);
    assert.equal(testing.spawnTest(['hardhat'], []), 1);
    response = { status: null, error: { code: 'ETIMEDOUT' } };
    assert.equal(testing.spawnTest(['hardhat'], []), 999);
    const [command, options] = spawn.mock.calls.at(-1).arguments;
    assert.match(command, /hardhat test --bail$/);
    assert.equal(options.timeout, 5000);
    assert.equal(options.cwd, p.root.replaceAll('\\', '/'));
});
