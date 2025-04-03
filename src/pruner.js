// External modules
const chalk = require('chalk')
// Internal modules
const utils = require('./utils');

/**
 * Log that mutations will be pruned according to some some strategy (only random sampling supported for now). 
 * @param {Array<Object>} mutations - List of all generated mutations.
 * @returns {Array<Object>} Original mutations.
 *  
 */
function lookupPruneMutations(mutations) {
    const nOfRandomMutants = utils.getRandomMutants();

    if (mutations.length === 0) {
        console.log(chalk.red("No mutations available to prune."));
        return [];
    }
    // Ensure n does not exceed available mutations
    const maxMutants = Math.min(nOfRandomMutants, mutations.length);

    console.log(chalk.yellow("Mutations will be pruned at run-time ✂️"));
    console.log(`- Total mutants: ${mutations.length}`);
    console.log(`- Pruned mutants: ${maxMutants}\n`);

    return mutations;
}

/**
 * Reduce the mutations number based on some strategy (only random sampling supported for now). 
 * @param {Array<Object>} mutations - List of all generated mutations.
 * @returns {Array<Object>} Pruned mutations.
 */
function pruneMutations(mutations) {
    const nOfRandomMutants = utils.getRandomMutants();

    if (mutations.length === 0) {
        console.log(chalk.red("No mutations available to prune."));
        return [];
    }

    console.log(chalk.yellow("Pruning Mutations ✂️"));
    // Ensure n does not exceed available mutations
    const maxMutants = Math.min(nOfRandomMutants, mutations.length);

    // Shuffle and sample n mutations
    const prunedMutations = mutations
        .map(m => ({ mutation: m, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .slice(0, maxMutants)
        .map(m => m.mutation);

    console.log(`- Total mutants: ${mutations.length}`);
    console.log(`- Pruned mutants: ${prunedMutations.length}\n`);
    return prunedMutations;
}


module.exports = {
    lookupPruneMutations: lookupPruneMutations,
    pruneMutations: pruneMutations
};