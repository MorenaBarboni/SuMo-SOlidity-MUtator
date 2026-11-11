const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const project = require('./helpers/project');

for (const [status, compiles, testResult] of [
    ['live', true, 0], ['killed', true, 1],
    ['timedout', true, 999], ['uncompilable', false, null]
]) {
    test(`mutation workflow reports ${status} and restores sources between mutants`, { timeout: 10000 }, async t => {
        const p = project(t, { skipTests: ['ignored.js'] });
        fs.mkdirSync(path.join(p.root, 'contracts/mock'));
        fs.writeFileSync(path.join(p.root, 'contracts/mock/Ignored.sol'), p.source);
        fs.writeFileSync(path.join(p.root, 'test/ignored.js'), '// excluded\n');
        const testing = p.load('testingInterface');
        let compileCalls = 0;
        const observedSources = [];
        t.mock.method(testing, 'spawnCompile', frameworks => {
            assert.deepEqual(frameworks, ['hardhat']);
            observedSources.push(fs.readFileSync(p.file, 'utf8'));
            return compileCalls++ === 0 ? true : compiles;
        });
        let testCalls = 0;
        t.mock.method(testing, 'spawnTest', (frameworks, files) => {
            assert.deepEqual(files.map(f => path.basename(f)), ['counter.js']);
            return testCalls++ === 0 ? 0 : testResult;
        });
        const Reporter = p.load('reporting/reporter');
        const summary = Reporter.prototype.logTestSummary;
        const done = new Promise(resolve => {
            t.mock.method(Reporter.prototype, 'logTestSummary', function (...times) {
                summary.apply(this, times);
                resolve();
            });
        });
        p.load('mutationRunner').test();
        await done;
        assert.equal(compileCalls, 4); // Original pretest plus three mutants.
        assert.equal(testCalls, compiles ? 4 : 1);
        assert.equal(observedSources[0], p.source);
        assert.deepEqual(new Set(observedSources.slice(1)), new Set([
            p.source.replace('return true;', 'return false;'),
            p.source.replace('a + b', 'a - b'),
            p.source.replace('a + b', 'a * b')
        ]));
        assert.equal(fs.readFileSync(p.file, 'utf8'), p.source);
        const report = JSON.parse(fs.readFileSync(path.join(p.root, 'sumo/results/mutations.json')));
        assert.deepEqual(Object.keys(report), ['Counter.sol']);
        assert.equal(report['Counter.sol'].length, 3);
        for (const mutant of report['Counter.sol']) {
            assert.equal(mutant.status, status);
            assert.ok(Number.isFinite(mutant.testingTime) && mutant.testingTime >= 0);
        }
        assert.ok(fs.existsSync(path.join(p.root, 'sumo/results/index.html')));
        const log = fs.readFileSync(path.join(p.root, 'sumo/results/sumo-log.txt'), 'utf8');
        if (status === 'live') assert.match(log, /^Mutation score\s*: 0\.00%$/m);
        if (status === 'killed') assert.match(log, /^Mutation score\s*: 100\.00%$/m);
    });
}
