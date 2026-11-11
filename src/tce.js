'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Framework-independent Trivial Compiler Equivalence for Solidity projects.
 *
 * The module reads compiler artifacts produced by the project's normal compiler command. 
 * It supports the common artifact shapes emitted by Hardhat, Foundry, Truffle and Brownie.
 *
 */

class TCE {
  /**
   * Creates a comparator for artifacts under the resolved build directory.
   * 
   * @param {string} buildDir - Compilation artifact directory.
   */
  constructor(buildDir) {
    if (!buildDir || typeof buildDir !== 'string') {
      throw new Error('TCE requires a buildDir.');
    }

    this.buildDir = path.resolve(buildDir);
    this.baseline = null;
  }

  /**
   * Captures runtime and creation bytecode from the current build as the baseline.
   * 
   * @returns {{runtime: {entries: Object<string, string>, hash: string}, creation: ({entries: Object<string, string>, hash: string}|null)}}
   *   Captured snapshots with SHA-256 hashes. Creation is null if unavailable.
   */
  captureBaseline() {
    this.baseline = {
      runtime: this.snapshot('runtime'),
      creation: this.snapshot('creation', true)
    };
    return this.baseline;
  }

  /**
   * Checks whether a baseline exists for the requested bytecode kind.
   * 
   * @param {'runtime'|'creation'} [kind='runtime'] - Bytecode kind to check.   
   * @returns {boolean} Whether a baseline exists. Unsupported kinds return false.
   */
  hasBaseline(kind = 'runtime') {
    if (kind !== 'runtime' && kind !== 'creation') return false;
    return Boolean(this.baseline && this.baseline[kind]);
  }

  /**
   * Compares current bytecode with the baseline for the selected kind.
   * @param {'runtime'|'creation'} [kind='runtime'] - Bytecode kind to compare.  
   * @returns {{equivalent: boolean, kind: ('runtime'|'creation'), added: string[], removed: string[], changed: string[], baselineHash: string, mutantHash: string}}
   *   Equivalence status, sorted contract identities by difference, and both snapshot hashes. Equivalence requires all three difference lists to be empty.
   */
  compareWithBaseline(kind = 'runtime') {
    if (!this.baseline) {
      throw new Error('TCE baseline has not been captured.');
    }
    if (kind !== 'runtime' && kind !== 'creation') {
      throw new Error(`Unsupported TCE bytecode kind: ${kind}`);
    }

    const baseline = this.baseline[kind];
    if (!baseline) {
      throw new Error(`TCE ${kind} baseline has not been captured.`);
    }

    const current = this.snapshot(kind);
    const comparison = compareEntries(baseline.entries, current.entries);

    return {
      equivalent: comparison.added.length === 0 &&
        comparison.removed.length === 0 &&
        comparison.changed.length === 0,
      kind,
      ...comparison,
      baselineHash: baseline.hash,
      mutantHash: current.hash
    };
  }

  /**
   * Scans the build directory and hashes the normalised bytecode by contract identity. 
   * 
   * @param {'runtime'|'creation'} [kind='runtime'] - Bytecode kind to collect.
   * @param {boolean} [allowEmpty=false] - Whether to return null for an empty snapshot.  
   * @returns {({entries: Object<string, string>, hash: string}|null)} Contract identities
   * mapped to bytecode and their SHA-256 hash, or null if no usable entries exist and allowEmpty is true.
   */
  snapshot(kind = 'runtime', allowEmpty = false) {
    if (kind !== 'runtime' && kind !== 'creation') {
      throw new Error(`Unsupported TCE bytecode kind: ${kind}`);
    }
    if (!fs.existsSync(this.buildDir)) {
      throw new Error(`TCE build directory does not exist: ${this.buildDir}`);
    }

    const entries = {};
    const jsonFiles = findArtifactJsonFiles(this.buildDir);

    for (const artifactPath of jsonFiles) {
      let json;
      try {
        json = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      } catch (_) {
        // A non-JSON or partially-written file is not a compiler artifact.
        continue;
      }

      const extracted = extractArtifactEntries(json, artifactPath, this.buildDir, kind);

      for (const [key, value] of Object.entries(extracted)) {
        if (entries[key] !== undefined && entries[key] !== value) {
          throw new Error(
            `TCE found conflicting bytecode for artifact identity '${key}'. ` +
            'Use a build directory containing artifacts from only one compilation framework.'
          );
        }
        entries[key] = value;
      }
    }

    if (Object.keys(entries).length === 0) {
      if (allowEmpty) return null;
      throw new Error(
        `TCE found no usable Solidity ${kind} bytecode artifacts under ${this.buildDir}.`
      );
    }

    const canonical = stableStringify(entries);
    return {
      entries,
      hash: crypto.createHash('sha256').update(canonical).digest('hex')
    };
  }
}

/**********************************************************
 * Artifact discovery and extraction
 **********************************************************/

/**
 * Recursively finds JSON files, skipping debug files and ignored subdirectories.
 * 
 * @param {string} rootDir - Path to scan. 
 * @returns {string[]} Matching paths in sorted order.
 */
function findArtifactJsonFiles(rootDir) {
  const result = [];
  const ignoredDirectories = new Set([
    'build-info', '.hh-sol-artifact-1', 'cache', '.cache', 'node_modules'
  ]);

  function visit(current) {
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      if (current !== rootDir && ignoredDirectories.has(path.basename(current))) return;
      for (const child of fs.readdirSync(current)) visit(path.join(current, child));
      return;
    }

    if (current.endsWith('.json') && !current.endsWith('.dbg.json')) {
      result.push(current);
    }
  }

  visit(rootDir);
  return result.sort();
}


/**
 * Extracts normalised bytecode from a single contract artifact or Solidity standard JSON output.
 * 
 * @param {*} json - Parsed JSON value.
 * @param {string} artifactPath - Path to the artifact file.
 * @param {string} buildDir - Build directory used to derive fallback identities.
 * @param {'runtime'|'creation'} [kind='runtime'] - Bytecode kind to extract.
 * @returns {Object<string, string>} - Normalised bytecode keyed by contract identity.
 */
function extractArtifactEntries(json, artifactPath, buildDir, kind = 'runtime') {
  const result = {};

  // Standard top-level artifact: Hardhat, Foundry, Truffle, Brownie.
  if (looksLikeContractArtifact(json)) {
    const identity = artifactIdentity(json, artifactPath, buildDir);
    const value = selectedBytecode(json, kind);
    if (value !== null) result[identity] = value;
    return result;
  }

  // Standard-json compiler output, supported for custom integrations.
  if (json && json.contracts && typeof json.contracts === 'object') {
    for (const [sourceName, contracts] of Object.entries(json.contracts)) {
      if (!contracts || typeof contracts !== 'object') continue;
      for (const [contractName, contractOutput] of Object.entries(contracts)) {
        if (!looksLikeContractArtifact(contractOutput)) continue;
        const identity = `${normalisePath(sourceName)}:${contractName}`;
        const value = selectedBytecode(contractOutput, kind);
        if (value !== null) result[identity] = value;
      }
    }
  }

  return result;
}

/**
 * Checks whether an object exposes a supported runtime or creation bytecode field.
 * 
 * @param {*} value - Value to inspect.
 * @returns {boolean} Whether a recognised field contains a string.
 */
function looksLikeContractArtifact(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return bytecodeCandidate(value, 'runtime') !== null ||
    bytecodeCandidate(value, 'creation') !== null;
}

/**
 * Builds a contract identity from the source path and contract name, falling
 * back to the relative artifact path and file basename as needed.
 * 
 * @param {object} artifact - Parsed contract artifact.
 * @param {string} artifactPath - Path to the artifact file.
 * @param {string} buildDir - Build directory for the relative path fallback.
 * @returns {string} Identity in path:contractName form.
 */
function artifactIdentity(artifact, artifactPath, buildDir) {
  const contractName = artifact.contractName ||
    artifact.contract_name ||
    path.basename(artifactPath, '.json');

  const sourceName = artifact.sourceName ||
    artifact.sourcePath ||
    artifact.source ||
    artifact.ast?.absolutePath;

  if (typeof sourceName === 'string' && sourceName.trim() !== '') {
    return `${normalisePath(sourceName)}:${contractName}`;
  }

  return `${normalisePath(path.relative(buildDir, artifactPath))}:${contractName}`;
}


/**
 * Reads and normalises the requested bytecode.
 * 
 * @param {object} artifact - Parsed contract artifact.
 * @param {'runtime'|'creation'} kind - Bytecode kind to read.
 * @returns {string|null} Normalised bytecode, or null if the field is absent.
 */
function selectedBytecode(artifact, kind) {
  const bytecode = bytecodeCandidate(artifact, kind);
  return bytecode === null ? null : normaliseBytecode(bytecode);
}

/**
 * Reads the first supported bytecode field containing a string, directly or
 * through its object property.
 * 
 * @param {object} artifact - Parsed contract artifact.
 * @param {'runtime'|'creation'} kind - Bytecode kind to look up.
 * @returns {string|null} Raw bytecode, or null if no candidate is present.
 */
function bytecodeCandidate(artifact, kind) {
  const candidates = kind === 'runtime'
    ? [
      artifact.deployedBytecode,
      artifact.runtimeBytecode,
      artifact.evm?.deployedBytecode,
      artifact.evm?.deployedBytecode?.object
    ]
    : [
      artifact.bytecode,
      artifact.creationBytecode,
      artifact.evm?.bytecode,
      artifact.evm?.bytecode?.object
    ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') return candidate;
    if (candidate && typeof candidate.object === 'string') return candidate.object;
  }
  return null;
}


/**********************************************************
 * Normalisation and comparison
 **********************************************************/

/**
 * Trims and lowercases bytecode, removes its 0x prefix, and replaces unresolved
 * library placeholders with <link>. Checks hex-only results for Solidity metadata.
 * 
 * @param {string} bytecode - Raw runtime or creation bytecode.
 * @returns {string} Normalised bytecode, or an empty string for non-string input.
 */
function normaliseBytecode(bytecode) {
  if (typeof bytecode !== 'string') return '';

  let normalised = bytecode.trim().toLowerCase().replace(/^0x/, '');

  // Link placeholders differ by framework/path while representing unresolved
  // addresses. Canonicalise both modern __$...$__ and legacy __Name___ forms.
  normalised = normalised
    .replace(/__\$[0-9a-f]{34}\$__/g, '<link>')
    .replace(/__[a-z0-9_.$/:\\-]{1,36}_+/g, '<link>');

  if (/^[0-9a-f]*$/.test(normalised)) {
    normalised = stripSolidityMetadata(normalised);
  }

  return normalised;
}

/**
 * Strips a suffix that matches Solidity's metadata length and CBOR map prefix.
 * 
 * @param {string} hex - Lowercase bytecode hex without a 0x prefix.
 * @returns {string} Bytecode with the matching suffix removed, or the input as-is.
 */
function stripSolidityMetadata(hex) {
  if (hex.length < 4 || hex.length % 2 !== 0) return hex;

  const metadataLengthBytes = Number.parseInt(hex.slice(-4), 16);
  if (!Number.isFinite(metadataLengthBytes)) return hex;

  const suffixLength = (metadataLengthBytes + 2) * 2;
  if (suffixLength <= 4 || suffixLength > hex.length) return hex;

  const metadata = hex.slice(hex.length - suffixLength, -4);
  // Solidity CBOR metadata is a map (major type 5), commonly a1/a2/a3... .
  // This guard avoids stripping arbitrary executable tails.
  if (!/^a[0-9a-f]/.test(metadata)) return hex;

  return hex.slice(0, hex.length - suffixLength);
}

/**
 * Finds contracts added, removed, or changed between two bytecode snapshots.
 * @param {Object<string, string>} baseline - Original bytecode by contract identity.
 * @param {Object<string, string>} current - Current bytecode by contract identity.
 * @returns {{added: string[], removed: string[], changed: string[]}} Sorted identity lists. 
 * Changed entries exist in both snapshots and differ in bytecode.
 */
function compareEntries(baseline, current) {
  const baselineKeys = new Set(Object.keys(baseline));
  const currentKeys = new Set(Object.keys(current));

  return {
    added: [...currentKeys].filter(key => !baselineKeys.has(key)).sort(),
    removed: [...baselineKeys].filter(key => !currentKeys.has(key)).sort(),
    changed: [...baselineKeys]
      .filter(key => currentKeys.has(key) && baseline[key] !== current[key])
      .sort()
  };
}

/**
 * Serialises a bytecode map to JSON after sorting its keys.
 * 
 * @param {Object<string, string>} object - Bytecode map to serialise.
 * @returns {string} Deterministic JSON string.
 */
function stableStringify(object) {
  const sorted = {};
  for (const key of Object.keys(object).sort()) sorted[key] = object[key];
  return JSON.stringify(sorted);
}

/**
 * Converts backslashes to forward slashes and removes a leading ./ if present.
 * @param {string} value - Path to normalise.
 * @returns {string} Normalised path.
 */
function normalisePath(value) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

module.exports = TCE;
module.exports._internal = {
  extractArtifactEntries,
  normaliseBytecode,
  stripSolidityMetadata,
  compareEntries
};
