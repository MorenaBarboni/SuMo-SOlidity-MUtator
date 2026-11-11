const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class MKRoperator {
    constructor() {
        this.ID = "MKR";
        this.name = "mapping-key-replacement";
    }

    /**
     * Generates MKR mutations for mapping key accesses.
     *
     * @param {string} file - The path of the Solidity source file
     * @param {string} source - The Solidity source code
     * @param {Function} visit - The solidity-parser visitor function
     * @returns {Mutation[]} The generated mutations
     */
    getMutations(file, source, visit) {
        const mutations = [];
        const contractScopes = [];
        const functionScopes = [];
        const blockScopes = [];
        const variableDeclarations = [];
        const userDefinedTypes = [];
        const stateVariableNodes = new WeakSet();
        const indexAccessNodes = [];

        /**
         * Checks whether two scope records refer to the same AST node.
         *
         * @param {object|null} firstScope - First scope record
         * @param {object|null} secondScope - Second scope record
         * @returns {boolean} True when both records refer to the same scope
         */
        function sameScope(firstScope, secondScope) {
            if (!firstScope || !secondScope) {
                return firstScope === secondScope;
            }

            return firstScope.node === secondScope.node;
        }

        /**
         * Finds a user-defined type declaration visible from the current contract.
         *
         * @param {object} typeNode - UserDefinedTypeName node
         * @param {string} expectedKind - Expected declaration kind
         * @param {object} context - Contract scope of the mapping access
         * @param {Array<object>} userDefinedTypes - Collected user-defined declarations
         * @returns {object|null} Matching declaration and its scope
         */
        function findUserDefinedType(typeNode, expectedKind, context, userDefinedTypes) {
            const fullName = typeNode.namePath || typeNode.name;
            if (!fullName) {
                return null;
            }

            const nameParts = fullName.split(".");
            const simpleName = nameParts[nameParts.length - 1];
            const candidates = [];

            for (const definition of userDefinedTypes) {
                if (definition.kind === expectedKind && definition.node.name === simpleName) {
                    candidates.push(definition);
                }
            }

            if (nameParts.length > 1) {
                const qualifier = nameParts[nameParts.length - 2];

                for (const candidate of candidates) {
                    if (candidate.contractScope && candidate.contractScope.node.name === qualifier) {
                        return candidate;
                    }
                }
            }

            for (const candidate of candidates) {
                if (sameScope(candidate.contractScope, context.contractScope)) {
                    return candidate;
                }
            }

            if (candidates.length === 1 && !candidates[0].contractScope) {
                return candidates[0];
            }

            return null;
        }

        /**
         * Finds the declaration of an identifier visible at a source position.
         * Local declarations take precedence over state variables with the same name.
         *
         * @param {string} name - Identifier name
         * @param {number} position - Source offset of the access
         * @param {object} context - Contract, function, and block scopes of the access
         * @param {Array<object>} declarations - Collected variable declarations
         * @returns {object|null} Matching variable declaration
         */
        function findVariableDeclaration(name, position, context, declarations) {
            const matchingDeclarations = [];

            for (const declaration of declarations) {
                if (declaration.name === name && sameScope(declaration.contractScope, context.contractScope)) {
                    matchingDeclarations.push(declaration);
                }
            }

            let visibleLocalDeclaration = null;

            for (const declaration of matchingDeclarations) {
                if (!declaration.functionScope || !sameScope(declaration.functionScope, context.functionScope)) {
                    continue;
                }

                if (declaration.start > position) {
                    continue;
                }

                if (declaration.blockScope) {
                    const isInsideBlock = declaration.blockScope.start <= position && position <= declaration.blockScope.end;
                    if (!isInsideBlock) {
                        continue;
                    }
                }

                if (!visibleLocalDeclaration) {
                    visibleLocalDeclaration = declaration;
                    continue;
                }

                const currentScopeSize = declaration.blockScope
                    ? declaration.blockScope.end - declaration.blockScope.start
                    : Number.MAX_SAFE_INTEGER;
                const selectedScopeSize = visibleLocalDeclaration.blockScope
                    ? visibleLocalDeclaration.blockScope.end - visibleLocalDeclaration.blockScope.start
                    : Number.MAX_SAFE_INTEGER;

                if (currentScopeSize < selectedScopeSize) {
                    visibleLocalDeclaration = declaration;
                } else if (currentScopeSize === selectedScopeSize && declaration.start > visibleLocalDeclaration.start) {
                    visibleLocalDeclaration = declaration;
                }
            }

            if (visibleLocalDeclaration) {
                return visibleLocalDeclaration;
            }

            for (const declaration of matchingDeclarations) {
                if (declaration.isStateVariable) {
                    return declaration;
                }
            }

            // An inherited state variable may be declared outside the current contract.
            const inheritedCandidates = [];

            for (const declaration of declarations) {
                if (declaration.name === name && declaration.isStateVariable) {
                    inheritedCandidates.push(declaration);
                }
            }

            if (inheritedCandidates.length === 1) {
                return inheritedCandidates[0];
            }

            return null;
        }

        /**
         * Finds a state variable declared by a particular contract.
         *
         * @param {string} name - State variable name
         * @param {object|null} contractScope - Contract scope to search
         * @param {Array<object>} declarations - Collected variable declarations
         * @returns {object|null} Matching state variable declaration
         */
        function findStateVariable(name, contractScope, declarations) {
            const matchingDeclarations = [];

            for (const declaration of declarations) {
                if (declaration.name === name && declaration.isStateVariable) {
                    matchingDeclarations.push(declaration);
                }
            }

            for (const declaration of matchingDeclarations) {
                if (sameScope(declaration.contractScope, contractScope)) {
                    return declaration;
                }
            }

            if (matchingDeclarations.length === 1) {
                return matchingDeclarations[0];
            }

            return null;
        }

        /**
         * Resolves the type of an expression used to reach a mapping.
         * Supports declared variables, nested mappings, arrays, and struct fields.
         *
         * @param {object} expression - Expression AST node
         * @param {number} position - Source offset of the expression
         * @param {object} context - Lexical context of the expression
         * @param {object} data - Collected declarations and user-defined types
         * @param {number} depth - Current recursion depth
         * @returns {object|null} Resolved Solidity type-name node
         */
        function resolveExpressionType(expression, position, context, data, depth = 0) {
            if (!expression || depth > 20) {
                return null;
            }

            if (expression.type === "Identifier") {
                const declaration = findVariableDeclaration(expression.name, position, context, data.variableDeclarations);

                return declaration ? declaration.typeName : null;
            }

            if (expression.type === "IndexAccess") {
                const baseType = resolveExpressionType(expression.base, position, context, data, depth + 1);

                if (baseType && baseType.type === "Mapping") {
                    return baseType.valueType;
                }

                if (baseType && baseType.type === "ArrayTypeName") {
                    return baseType.baseTypeName;
                }

                return null;
            }

            if (expression.type === "MemberAccess") {
                const memberName = expression.memberName;
                const baseExpression = expression.expression;

                if (baseExpression && baseExpression.type === "Identifier" && baseExpression.name === "this") {
                    const stateVariable = findStateVariable(memberName, context.contractScope, data.variableDeclarations);
                    return stateVariable ? stateVariable.typeName : null;
                }

                const baseType = resolveExpressionType(baseExpression, position, context, data, depth + 1);
                if (!baseType || baseType.type !== "UserDefinedTypeName") {
                    return null;
                }

                const structDefinition = findUserDefinedType(baseType, "struct", context, data.userDefinedTypes);
                if (structDefinition) {
                    const members = structDefinition.node.members || [];

                    for (const member of members) {
                        if (member.name === memberName) {
                            return member.typeName;
                        }
                    }

                    return null;
                }

                const contractDefinition = findUserDefinedType(baseType, "contract", context, data.userDefinedTypes);
                if (contractDefinition) {
                    const stateVariable = findStateVariable(memberName, contractDefinition.scope, data.variableDeclarations);

                    return stateVariable ? stateVariable.typeName : null;
                }
            }

            return null;
        }

        /**
         * Builds the default expression for a supported mapping key type.
         * Unknown user-defined types are skipped to avoid potentially invalid mutants.
         *
         * @param {object} typeNode - Mapping key type-name node
         * @param {object} context - Contract scope where the type is used
         * @param {Array<object>} userDefinedTypes - Collected user-defined declarations
         * @param {number} depth - Current recursion depth for value types
         * @returns {string|null} Default-value expression for the key type
         */
        function getDefaultKeyValue(typeNode, context, userDefinedTypes, depth = 0) {
            if (!typeNode || depth > 10) {
                return null;
            }

            if (typeNode.type === "ElementaryTypeName") {
                const typeName = typeNode.name;

                if (typeName === "address" || typeName === "address payable") {
                    if (typeNode.stateMutability === "payable" || typeName === "address payable") {
                        return "payable(address(0))";
                    }

                    return "address(0)";
                }

                if (typeName === "bool") {
                    return "false";
                }

                if (typeName === "string") {
                    return '""';
                }

                if (typeName === "bytes") {
                    return 'bytes("")';
                }

                if (/^u?int([0-9]+)?$/.test(typeName)) {
                    return "0";
                }

                if (/^bytes([1-9]|[12][0-9]|3[0-2])$/.test(typeName)) {
                    return `${typeName}(0)`;
                }

                if (typeName === "byte") {
                    return "bytes1(0)";
                }

                return null;
            }

            if (typeNode.type !== "UserDefinedTypeName") {
                return null;
            }

            const typeName = typeNode.namePath || typeNode.name;
            const enumDefinition = findUserDefinedType(typeNode, "enum", context, userDefinedTypes);

            if (enumDefinition) {
                if (enumDefinition.node.members && enumDefinition.node.members.length > 0) {
                    return `${typeName}(0)`;
                }

                return null;
            }

            const contractDefinition = findUserDefinedType(typeNode, "contract", context, userDefinedTypes);
            if (contractDefinition && contractDefinition.node.kind !== "library") {
                const contractMembers = contractDefinition.node.subNodes || [];
                let acceptsEther = false;

                for (const member of contractMembers) {
                    if (member.type === "FunctionDefinition" && (member.isFallback || member.isReceiveEther) && member.stateMutability === "payable") {
                        acceptsEther = true;
                        break;
                    }
                }

                if (acceptsEther) {
                    return `${typeName}(payable(address(0)))`;
                }

                return `${typeName}(address(0))`;
            }

            const valueTypeDefinition = findUserDefinedType(typeNode, "valueType", context, userDefinedTypes);
            if (valueTypeDefinition) {
                const underlyingType = valueTypeDefinition.node.definition;
                const underlyingDefault = getDefaultKeyValue(underlyingType, context, userDefinedTypes, depth + 1);

                if (underlyingDefault) {
                    return `${typeName}.wrap(${underlyingDefault})`;
                }
            }

            return null;
        }

        /**
         * Adds a ranged AST node to a scope collection.
         *
         * @param {object} node - AST scope node
         * @param {Array<object>} scopes - Collection receiving the scope
         * @returns {object|null} The stored scope record
         */
        function addScope(node, scopes) {
            if (!node.range || node.range.length !== 2) {
                return null;
            }

            const scope = {
                node,
                start: node.range[0],
                end: node.range[1]
            };

            scopes.push(scope);
            return scope;
        }

        // Collect declarations first so mapping accesses can be resolved regardless of visit order.
        visit({
            ContractDefinition: (node) => {
                const contractScope = addScope(node, contractScopes);
                userDefinedTypes.push({
                    node,
                    kind: "contract",
                    contractScope: null,
                    scope: contractScope
                });
            },
            FunctionDefinition: (node) => {
                addScope(node, functionScopes);
            },
            ModifierDefinition: (node) => {
                addScope(node, functionScopes);
            },
            Block: (node) => {
                addScope(node, blockScopes);
            },
            ForStatement: (node) => {
                addScope(node, blockScopes);
            },
            CatchClause: (node) => {
                addScope(node, blockScopes);
            },
            StateVariableDeclaration: (node) => {
                for (const variable of node.variables || []) {
                    stateVariableNodes.add(variable);
                }
            },
            StructDefinition: (node) => {
                const position = node.range ? node.range[0] : -1;
                userDefinedTypes.push({
                    node,
                    kind: "struct",
                    contractScope: contextChecker.findSmallestContainingRange(contractScopes, position)
                });
            },
            EnumDefinition: (node) => {
                const position = node.range ? node.range[0] : -1;
                userDefinedTypes.push({
                    node,
                    kind: "enum",
                    contractScope: contextChecker.findSmallestContainingRange(contractScopes, position)
                });
            },
            TypeDefinition: (node) => {
                const position = node.range ? node.range[0] : -1;
                userDefinedTypes.push({
                    node,
                    kind: "valueType",
                    contractScope: contextChecker.findSmallestContainingRange(contractScopes, position)
                });
            },
            VariableDeclaration: (node) => {
                if (!node.name || !node.typeName || !node.range) {
                    return;
                }

                const declarationPosition = node.range[0];
                variableDeclarations.push({
                    name: node.name,
                    typeName: node.typeName,
                    start: declarationPosition,
                    isStateVariable: node.isStateVar === true || stateVariableNodes.has(node),
                    contractScope: contextChecker.findSmallestContainingRange(contractScopes, declarationPosition),
                    functionScope: contextChecker.findSmallestContainingRange(functionScopes, declarationPosition),
                    blockScope: contextChecker.findSmallestContainingRange(blockScopes, declarationPosition)
                });
            },
            IndexAccess: (node) => {
                indexAccessNodes.push(node);
            }
        });

        const data = { variableDeclarations, userDefinedTypes };

        const ID = this.ID;

        /**
         * Creates a Mutation for a ranged AST node and adds it to the result.
         *
         * @param {object} node - AST node whose source text is replaced
         * @param {string} replacement - Replacement source text
         */
        function addMutation(node, replacement) {
            if (!contextChecker.hasSourceLocation(node)) {
                return;
            }

            const start = node.range[0];
            const end = node.range[1] + 1;

            if (start < 0 || end > source.length || start >= end) {
                return;
            }

            const startLine = node.loc.start.line;
            const endLine = node.loc.end.line;
            const original = source.slice(start, end);

            if (original.trim() === replacement.trim()) {
                return;
            }

            const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, ID));
        }

        // Replace each mapping key with the default value of its declared type.
        for (const indexAccessNode of indexAccessNodes) {
            if (!indexAccessNode.range || !indexAccessNode.index || !indexAccessNode.index.range) {
                continue;
            }

            const position = indexAccessNode.range[0];
            const context = {
                contractScope: contextChecker.findSmallestContainingRange(contractScopes, position),
                functionScope: contextChecker.findSmallestContainingRange(functionScopes, position),
                blockScope: contextChecker.findSmallestContainingRange(blockScopes, position)
            };
            const mappingType = resolveExpressionType(indexAccessNode.base, position, context, data);

            // An IndexAccess can also represent an array access; only mappings are mutated.
            if (!mappingType || mappingType.type !== "Mapping") {
                continue;
            }

            const defaultValue = getDefaultKeyValue(mappingType.keyType, context, userDefinedTypes);
            if (defaultValue) {
                addMutation(indexAccessNode.index, defaultValue);
            }
        }

        /**
         * Adds a mutation unless another mutation with the same ID already exists.
         *
         * @param {Mutation} mutation - Mutation to add
         */
        function pushMutation(mutation) {
            if (!mutations.find((existingMutation) => existingMutation.id === mutation.id)) {
                mutations.push(mutation);
            }
        }

        return mutations;
    }
}

module.exports = MKRoperator;
