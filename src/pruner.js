// External modules
const chalk = require('chalk')
const fs = require('fs')
const path = require("path");

// Internal modules
const utils = require('./utils');

/**
 * Logs the pruning strategy that will be applied at run-time.
 * This function does not perform pruning — it only logs what *will* happen.
 * 
 * @param {Array<Object>} mutations - List of all generated mutations.
 * @param {Object} options - Strategy options.
 * @param {boolean} options.pruneUncovered - Whether to remove uncovered mutants.
 * @param {boolean} options.randomSampling - Whether to apply random pruning.
 * @param {number} [options.maxRandom] - Maximum number of mutants to keep if random sampling is enabled.
 * @returns {Array<Object>} Original unmodified list of mutations.
 */
function lookupPruneMutations(mutations, options = { pruneUncovered: utils.getPruneUncovered(), randomSampling: utils.getRandomSampling(), maxRandom: utils.getRandomMutants() }) {

    if (!options.pruneUncovered && !options.randomSampling) {
        return mutations;
    }

    if (mutations.length === 0) {
        console.log(chalk.red("No mutations available to prune."));
        return [];
    }

    console.log(chalk.yellow("Mutations will be pruned at run-time ✂️"));
    console.log(`- Total generated mutants: ${mutations.length}`);

    let result = [...mutations];

    if (options.pruneUncovered) {
        console.log(`- Strategy: Prune uncovered mutants (using coverage matrix)`);
        result = pruneUncoveredMutants(result);
    }

    if (options.randomSampling) {
        console.log(`- Strategy: Random sampling (keeping up to ${options.maxRandom} mutants)`);
        result = randomSampleMutants(result, options.maxRandom);
    }
    console.log(`- Total after pruning: ${result.length}\n`);
    return mutations;
}

/**
 * Orchestrates pruning mutations based on configurable strategies.
 * 
 * @param {Object[]} mutations - All generated mutations.
 * @param {Object} options - Strategy options.
 * @param {boolean} options.pruneUncovered - Remove uncovered mutants first.
 * @param {boolean} options.randomSampling - Apply random sampling after filtering.
 * @param {number} [options.maxRandom] - Max number of mutants to keep if random sampling is enabled.
 * @returns {Object[]} Pruned list of mutants.
 */
function pruneMutations(mutations, options = { pruneUncovered: utils.getPruneUncovered(), randomSampling: utils.getRandomSampling(), maxRandom: utils.getRandomMutants() }) {

    if (!options.pruneUncovered && !options.randomSampling) {
        return mutations;
    }

    if (mutations.length === 0) {
        console.log(chalk.red("No mutations available to prune."));
        return [];
    }

    console.log(chalk.yellow("Pruning Mutations ✂️"));

    let result = [...mutations];

    if (options.pruneUncovered) {
        result = pruneUncoveredMutants(result);
    }

    if (options.randomSampling) {
        result = randomSampleMutants(result, options.maxRandom);
    }

    console.log(`- Total after pruning: ${result.length}\n`);
    return result;
}


/**
 * Update mutants status to `uncovered` a filter them out.
 * 
 * @param {Object[]} mutations - List of mutant objects
 * @returns {Object[]} Covered mutations
 */
function pruneUncoveredMutants(mutations) {
    const filtered = mutations.filter(isMutantCovered);

    for (const mutant of mutations) {
        if (!isMutantCovered(mutant)) {
            mutant.status = "uncovered";
        }
    }
    /*fs.writeFileSync(utils.staticConf.mutationsJsonPath, JSON.stringify(mutations, null, '\t'), function (err) {
        if (err) return console.log(err);
    });*/
    return filtered;
}


/**
 * Randomly samples up to `maxCount` mutants.
 * 
 * @param {Object[]} mutations - List of mutants to sample from
 * @param {number} maxCount - Maximum number of mutants to keep
 * @returns {Object[]} Randomly sampled mutants
 */
function randomSampleMutants(mutations, maxCount) {
    if (maxCount >= mutations.length) return mutations;

    const sampled = mutations
        .map(m => ({ mutation: m, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .slice(0, maxCount)
        .map(m => m.mutation);

    console.log(`- Randomly selected ${sampled.length} mutants.`);
    return sampled;
}


/**
 * Checks if a given mutant is covered by at least one test case based on the Hardhat coverage matrix.
 * If the matrix file does not exist or fails to load, returns true by default.
 * The matrix is expected to be found in rootDir/testMatrix.json
 *
 * @param {Object} mutant - The mutant object containing mutation details.
 * @returns {boolean} True if the mutant is covered or if the matrix file is missing/unreadable; otherwise, false.
 */
function isMutantCovered(mutant) {
    const matrixPath = utils.staticConf.coverageMatrixPath;

    let coverageMatrix;
    try {
        const matrixData = fs.readFileSync(matrixPath, 'utf8');
        coverageMatrix = JSON.parse(matrixData);
    } catch (err) {
        // Fail-safe: if the matrix doesn't exist or can't be parsed, assume coverage
        return true;
    }

    // Normalize the path to match matrix keys
    const fileName = path.basename(mutant.file); // e.g., CampusCoin.sol
    const contractKey = `contracts\\${fileName}`;

    const contractCoverage = coverageMatrix[contractKey];
    if (!contractCoverage) return false;

    for (let line = mutant.startLine; line <= mutant.endLine; line++) {
        if (
            contractCoverage.hasOwnProperty(line.toString()) &&
            contractCoverage[line.toString()].length > 0
        ) {
            return true;
        }
    }

    return false;
}

module.exports = {
    isMutantCovered: isMutantCovered,
    lookupPruneMutations: lookupPruneMutations,
    pruneMutations: pruneMutations
};