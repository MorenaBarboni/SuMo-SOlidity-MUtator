const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@solidity-parser/parser');
const project = require('./helpers/project');

function generate(p) {
    const { MutationGenerator, BLROperator, BOROperator } = p.load('operators/mutationGenerator');
    const generator = new MutationGenerator([new BLROperator(), new BOROperator()]);
    const ast = parser.parse(p.source, { range: true, loc: true });
    return { generator, run: () => generator.getMutations(p.file, p.source, parser.visit.bind(parser, ast)) };
}

test('generates exact boolean and arithmetic mutants from a real Solidity AST', t => {
    const p = project(t);
    const mutations = generate(p).run();
    assert.deepEqual(mutations.map(m => [m.operator, m.original, m.replace]), [
        ['BLR', 'true', 'false'], ['BOR', ' + ', ' - '], ['BOR', ' + ', ' * ']
    ]);
    assert.equal(new Set(mutations.map(m => m.id)).size, 3);
    for (const m of mutations) {
        assert.equal(p.source.slice(m.start, m.end), m.original);
        assert.equal(m.functionName, m.operator === 'BLR' ? 'enabled' : 'add');
        const expected = m.operator === 'BLR'
            ? p.source.replace('return true;', 'return false;')
            : p.source.replace('a + b', `a${m.replace}b`);
        assert.equal(m.applyToString(p.source), expected);
        assert.doesNotThrow(() => parser.parse(expected));
    }
});

test('minimal mode produces only the single arithmetic replacement', t => {
    const p = project(t, { minimalOperators: true });
    assert.deepEqual(generate(p).run().map(m => m.replace), ['false', ' - ']);
});

test('operator selection persists and disabled operators generate no mutants', t => {
    const p = project(t);
    const { generator, run } = generate(p);
    assert.equal(generator.disable('BOR'), true);
    assert.deepEqual(run().map(m => m.operator), ['BLR']);
    const configPath = p.load('utils').staticConf.mutOpsConfigPath;
    assert.equal(JSON.parse(fs.readFileSync(configPath)).BOR, false);
    assert.equal(generator.enable('BOR'), true);
    assert.equal(JSON.parse(fs.readFileSync(configPath)).BOR, true);
    assert.equal(run().length, 3);
    assert.equal(generator.enable('UNKNOWN'), false);
    generator.disableAll();
    assert.deepEqual(run(), []);
});

test('applying and restoring a mutation preserves the complete original contract', t => {
    const p = project(t);
    const m = generate(p).run()[0];
    m.apply();
    assert.equal(fs.readFileSync(p.file, 'utf8'), p.source.replace('return true;', 'return false;'));
    assert.equal(fs.readFileSync(m.baseline(), 'utf8'), p.source);
    m.restore();
    assert.equal(fs.readFileSync(p.file, 'utf8'), p.source);
});

test('saving a mutant leaves the source untouched and JSON preserves identity and results', t => {
    const p = project(t);
    const m = generate(p).run()[0];
    m.save();
    const saved = path.join(p.load('utils').staticConf.mutantsDir, `Counter.sol-${m.id}.sol`);
    assert.equal(fs.readFileSync(saved, 'utf8'), p.source.replace('return true;', 'return false;'));
    assert.equal(fs.readFileSync(p.file, 'utf8'), p.source);
    m.status = 'killed';
    m.testingTime = 42;
    const json = JSON.parse(m.toJson());
    assert.equal(json.id, m.id);
    assert.equal(json.status, 'killed');
    assert.equal(json.testingTime, 42);
    assert.match(json.diff, /return false;/);
    assert.equal(generate(p).run()[0].id, m.id);
});
