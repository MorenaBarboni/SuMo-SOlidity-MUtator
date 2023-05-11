# SuMo
SuMo is a mutation testing tool for Solidity Smart Contracts. It features 25 Solidity-specific mutation operators, as well as 19 traditional operators.

SuMo was designed to run mutation testing on Solidity projects in a NodeJS environment. It can run test using [Truffle](https://github.com/trufflesuite/truffle), [Hardhat](https://hardhat.org/), [Brownie](https://github.com/eth-brownie/brownie)  and [Forge](https://github.com/foundry-rs/foundry). If needed, SuMo can also automatically spawn [Ganache](https://github.com/trufflesuite/ganache) instances to guarantee a clean-room testing environment between mutants.


# Table of Contents
* [Installation and configuration](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#installation-and-configuration)
* [CLI Usage](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#cli-usage)
* [Trivial Compiler Equivalence](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#trivial-compiler-equivalence)
* [Mutation Operators](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#mutation-operators-)
* [Publications](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#publications)



# Installation and Configuration

To install sumo run ```npm install @morenabarboni/sumo```

Before using SuMo you must specify your desired configuration in a [sumo-config.js](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator/blob/master/src/sumo-config.js) in the root directory of your project. The ```sumo-config.js``` is automatically generated upon installation.

Here's a simple example of ```sumo-config.js```:

```
module.exports = {
  buildDir: 'build',
  contractsDir: 'contracts',
  testDir: 'test',
  skipContracts: ['contractName.sol'],
  skipTests: ['testDir/testFileName.js'],
  testingTimeOutInSec: 300,
  network: "none",
  testingFramework: "truffle",
  minimal: false,
  tce: false
}
```

### 1) SUT directories
These (optional) fields idenitfy relevant project directories.
* ```contractsDir```: relative path to the directory where the contracts to be mutated are located (contracts by default);
* ```testDir```: relative path to the directory where the tests to be evaluated are located (test by default);
* ```buildDir```: relative path to the directory where the artifacts of the compilation will be saved (build, out or artifacts by default);
 
### 2) Mutation Process
These fields allow to configure the mutation testing process:
* ```minimal```: employ minimal mutation rules (false by default),
* ```skipContracts```: array of relative paths to contract files (or folders) that must be ignored by SuMo during mutation testing;
*  ```skipTests```:   array of relative paths to test files (or folders) that must be ignored by SuMo;
* ```tce```: enable the Trivial Compiler Equivalence (false by default);
* ```testingTimeOutInSec```: after how many seconds a mutant is marked as timed-out during testing (300 by default).

### 3) Testing Interface
These fields specify what testing framework and blockchain simulator SuMo should use to conduct mutation testing:
* ```network```: the blockchain simulator to be used. Available options are:
  * ```ganache```: use the Ganache installation of the SUT;
  * ```none```: do not use a blockchain simulator;
* ```testingFramework```: the testing framework to be used for compiling and testing the smart contracts. Available options are:
  * ```brownie```: use a global/local installation of Brownie;
  * ```forge```: use a global installation of Forge;
  * ```hardhat```: use the Hardhat installation of the SUT;
  * ```truffle```: use the Truffle installation of the SUT;
  * ```custom```: use a custom compile and test script specified in the package.json of the SUT.

### Note that ...
* When choosing ```truffle``` or ```hardhat```:
  * SuMo will rely on the local ```truffle``` or ```hardhat``` package installed in the project;
  * The smart contracts will be compiled with a minimal compile command  (e.g., ```truffle compile``` );
  * The smart contracts will be tested with a minimal test command followed by the bail option, and (optionally) by a list of test files to be executed (e.g., ```truffle test ...testFiles -b```) .

* When choosing ```brownie```:
  * SuMo will rely on a local/global ```brownie``` installation;
  * The smart contracts will be compiled with a minimal compile command  (e.g., ```brownie compile``` );
  * The smart contracts will be tested with a minimal test command followed by the exitfirst option, and (optionally) by a list of test files to be executed (e.g., ```brownie test ...testFiles --exitfirst```) .

* When choosing ```forge``` :
  * SuMo will rely on the global installation of ```foundry```;
  * The smart contracts will be compiled with a minimal compile command  (e.g., ```forge build```);
  * The smart contracts will be tested with a minimal test command, optionally followed by a list of test files to be executed (e.g., ```forge test ...testFiles```).
  
* When choosing ```custom```: 
  * SuMo will invoke the ```compile``` and ```test``` script defined in your ```package.json```. This allows you to customize both scripts and have more control over the testing process; 
  * The ```skipTests``` list will be overridden by the ```test``` script in your ```package.json```. To skip some test files, you can either: 1) append the specific test files you want to run to your ```test``` script, or 2) remove the test files to be skipped from the test folder.
  * The ```--bail```/```--exitfirst``` option should be added to the test script to speed up mutation testing. 

# CLI Usage

### Selecting Mutation Operators
Before starting the mutation process you can choose which mutation operators to use:
* ```npx/yarn sumo list``` shows the currently enabled mutation operators
* ```npx/yarn sumo enable``` enables all the mutation operators
* ```npx/yarn sumo enable ID1 ID2 ...``` enables the mutation operator(s) by ID
* ```npx/yarn sumo enable clusterName``` enables the mutation operator(s) belonging to a specific cluster (i.e., default, optimization)
* ```npx/yarn sumo disable``` disables all the mutation operators
* ```npx/yarn sumo disable ID1 ID2 ...``` disables the mutation operator(s) by ID

### Viewing the available mutations
Once everything is set up you can use:
* ```npx/yarn sumo preflight``` To view the available mutations and save a preliminary report  to ./sumo/report.txt
* ```npx/yarn sumo mutate``` To view the available mutations, save a preliminary report  to ./sumo/report.txt, and save a copy of each mutant to ./sumo/mutants
* ```npx/yarn sumo diff <hash>``` To view the difference between the mutant identified by hash and its original contract

### Running Mutation Testing
Use:
* ```npx/yarn sumo pretest``` To ensure that the test suite can be successfully evaluated before running mutation testing.
* ```npx/yarn sumo test <startHash> <endHash>``` To launch the mutation testing process; You can optionally choose an interval of mutants to be tested by sepcifying ```startHash``` and ```endHash```.
* ```npx/yarn sumo restore``` To restore the SUT files to a clean version if you suddenly interrupt the mutation process. Note that the restore command overwrites the content of the SUT with the files stored in the ```.sumo/baseline``` folder.
If you need to restore the project files, make sure to do so before performing other operations as the baseline is automatically refreshed on subsequent preflight or test runs.

### Viewing the results
SuMo automatically creates a ```.sumo\results``` folder in the root directory of the project with the following reports: <br/>
* ```report.txt``` Provides information about the whole testing process
* ```operators.xlsx``` Provides the results of the mutation testing process for each operator
* ```generated.csv``` Provides detailed information about the generated mutants
* ```results.csv``` Provides the mutation testing results for each mutant. This synchronous log is updated each time a mutant is assigned a status
*  ```summary.csv``` Provides a summary of the mutation testing results
* ```\alive``` Mutants that survived testing
* ```\killed``` Mutants killed by tests
* ```\equivalent``` Equivalent mutants discarded by the TCE
* ```\redundant``` Redundant mutants discarded by the TCE
* ```\stillborn``` Stillborn mutants
* ```\timedout``` Timedout mutants
* ```\mutants``` Mutated contracts

# Trivial Compiler Equivalence

The Trivial Compiler Equivalence compares the smart contract bytecode to detect equivalences between mutants and it can only work if:
1. the solc compiler optimization is enabled;
2. no metadata hash is appended to the contract bytecode.

### 1) TCE for Truffle and Hardhat
If your ```testingFramework``` is ```truffle``` or ```hardhat```, you must add the following to your ```truffle-config.js``` or ```hardhat.config.js``` file:

```
 compilers: {
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
            ...
        },
        metadata: {
              bytecodeHash: "none"
        }
      }
  }
```

### 2)TCE for Brownie
If your ```testingFramework``` is ```brownie```, you must add the following to your ```brownie-config.yaml``` file:

```
compiler:
    solc:
        optimize: true
        runs: 200
```

### 3) TCE for Forge
If your ```testingFramework``` is ```forge```  you must add the following to your ```foundry.toml``` file:

```
optimizer = true
optimizer-runs = 200
```

### 4) TCE for Hybrid Test Suites
If your ```testingFramework``` is ```custom``` but you still rely on a single testing framework you can refer to the previous sections.

However, if you are using ```custom``` to evaluate hybrid test suites (e.g., ```forge``` and ```hardhat```) you must make sure that the sumo configuration is consistent.

For example, consider the following package.json scripts:

```
 scripts: {
    compile: "hardhat compile",
    test "hardhat test --bail && forge test"
 }
```
If you make SuMo use hardhat to compile the contracts, make sure that the ```buildDir``` points to the hardhat compiled artifacts and not to the forge ones, and vice versa.

# Mutation Operators 👾

SuMo includes currently 25 Solidity-specific operators and 19 Traditional operators.

## Minimal Mutation Rules
Some mutation operators foresee a **minimal** version:
* The **extended** operators are composed of mutation rules capable of generating a more comprehensive collection of mutants. These operators guarantee higher reliability at the price of a more expensive and time-consuming mutation testing process.
* The **minimal** operators consist of simplified rules that aim to limit the generation of likely subsumed mutants and speed up the testing process.

By default, SuMo employs the **extended** operators. However, you can enable the minimal rules from the ```sumo-config.js``` file.

## Mutation Operator Clusters
The mutation operators are currently split in two clusters:
* The **standard** cluster includes operators that aim to improve the fault-detection capabilities of the test suite. 
* The **optimization** cluster includes operators that can help to find code optimization opportunities (e.g., the data location of a variable).

By default, SuMo employs the **standard** cluster. However, you can enable/disable single mutation operators or entire clusters with the SuMo CLI.


## Traditional Mutation Operators

| Operator | Name | Mutation Example | Cluster | Minimal version available |
| ------ | ------ |  ------ |  ------ | :----: |
| ACM| Argument Change of overloaded Method call | ```overloadedFunc(a,b);``` &rarr; ```overloadedFunc(a,b,c);``` | standard | N |
| AOR | Assignment Operator Replacement | ```+= ``` &rarr;  ```=``` | standard | Y |
| BCRD | Break and Continue Replacement <br /> and Deletion | ```break``` &rarr; <br /> ```continue``` &rarr; ```break``` | standard | N |
| BLR | Boolean Literal Replacement | ```true``` &rarr; ```false``` | standard | N |
| BOR | Binary Operator Replacement | ```+``` &rarr; ```-``` <br /> ```<``` &rarr; ```>=``` | standard | Y |
| CBD | Catch Block Deletion | ```catch{}``` &rarr; ```/*catch{}*/``` | standard | N |
| CSC | Conditional Statement Change | ```if(condition)``` &rarr; ```if(false)``` <br /> ```else{}``` &rarr; ```/*else{}*/```  | standard | N |
| ER | Enum Replacemet |  ```enum.member1``` &rarr; ```enum.member2``` | standard | Y |
| ECS | Explicit Conversion to Smaller type | ```uint256``` &rarr; ```uint8``` | standard | N |
| HLR | Hexadecimal Literal Replacement | ```hex\"01\"``` &rarr; ```hex\"random\"```| standard | N |
| ICM | Increments Mirror | ```-=``` &rarr; ```=-``` | standard | N |
| ILR | Integer Literal Replacement | ```1``` &rarr; ```0``` | standard | N |
| LCS | Loop Statement Change | ```while(condition)``` &rarr; ```while(false)``` | standard | N |
| OLFD | Overloaded Function Deletion | ```function overloadedF(){}``` &rarr; ```/*function overloadedF(){}*/``` | standard | N |
| ORFD | Overridden Function Deletion | ```function f() override {}``` &rarr; ```/*function f() override {}*/``` | standard | N |
| SKI | Super Keyword Insertion | ```x = getData()``` &rarr; ```x = super.getData()``` | standard | N |
| SKD | Super Keyword Deletion | ```x = super.getData()``` &rarr; ```x = getData()``` | standard | N |
| SLR | String Literal Replacement | ```"string"``` &rarr; ```""```  | standard | N |
| UORD | Unary Operator Replacement and Deletion | ```++``` &rarr; ```--```  <br /> ```!``` &rarr; ``` ``` | standard | N |


## Solidity Mutation Operators
| Operator | Name | Mutation Example | Cluster | Minimal version available |
| ------ | ------ |  ------ |  ------ | :----: |
| AVR | Address Value Replacement | ```0x67ED2e5dD3d0...``` &rarr; ``` address.this()```| standard | N |
| CCD | Contract Constructor Deletion | ```constructor(){}``` &rarr; ```/*constructor(){}*/``` | standard | N |
| DLR | Data Location Keyword Replacement | ```memory``` &rarr; ```storage``` | optimization | N |
| DOD | Delete Operator Deletion | ```delete``` &rarr; | standard | N |
| ETR | Ether Transfer function Replacement | ```delegatecall()``` &rarr; ```call()``` | standard | N |
| EED |  Event Emission Deletion |  ```emit Deposit(...)``` &rarr; ```/*emit Deposit(...)*/``` | standard | N |
| EHC | Exception Handling Change | ```require(...)``` &rarr; ```/*require(...)*/``` | standard | N |
| FVR | Function Visibility Replacement | ```function f() public``` &rarr; ```function f() private``` | optimization | Y |
| GVR | Global Variable Replacement | ```msg.value()``` &rarr; ```tx.gasprice()``` | standard | Y |
| MCR | Mathematical and Cryptographic <br /> function Replacement | ```addmod``` &rarr; ```mulmod``` <br /> ```keccak256``` &rarr; ```sha256``` | standard | N |
| MOD | Modifier Deletion | ```function f() onlyOwner``` &rarr; ```function f()``` | standard | Y |
| MOI | Modifier Insertion | ```function f()``` &rarr; ```function f() onlyOwner``` | standard | Y |
| MOC | Modifier Order Change |  ```function f() modA modB``` &rarr; ```function f() modB modA``` | standard | Y |
| MOR | Modifier Replacement | ```function f() onlyOwner``` &rarr; ```function f() onlyAdmin``` | standard | Y |
| OMD | Overridden Modifier Deletion | ```modifier m() override {}``` &rarr; ```/*modifier m() override {}*/``` | standard | N |
| PKD | Payable Keyword Deletion | ```function f() payable``` &rarr; ```function f()``` | standard | N |
| RSD | Return Statement Deletion | ```return amount;``` &rarr; ```//return amount;``` | standard | N |
| RVS | Return Values Swap | ```return (1, "msg", 100);``` &rarr; ```return (100, "msg", 1);``` | standard | Y |
| SFD | Selfdestruct Deletion |  ```selfdestruct();``` &rarr; ```//selfdestruct();``` | standard | N |
| SFI | Selfdestruct Insertion | ```doSomething; selfdestruct();``` &rarr; ```selfdestruct(); doSomething;```  | standard | N |
| SFR | SafeMath Function Replacement | ```SafeMath.add``` &rarr; ```SafeMath.sub``` | standard | Y |
| SCEC | Switch Call Expression Casting | ```Contract c = Contract(0x86C9...);``` &rarr; ```Contract c = Contract(0x67ED...); ``` | standard | N |
| TOR | Transaction Origin Replacement | ```msg.sender``` &rarr; ```tx.origin``` | standard | N |
| VUR | Variable Unit Replacement | ```wei``` &rarr; ```ether```  <br /> ```minutes``` &rarr; ```hours``` | standard | Y |
| VVR | Variable Visibility Replacement | ```uint private data;``` &rarr; ```uint public data;``` | optimization | Y |


# Publications

To cite SuMo, please use the following:

```
@article{BARBONI2022111445,
  title = {SuMo: A mutation testing approach and tool for the Ethereum blockchain},
  journal = {Journal of Systems and Software},
  volume = {193},
  pages = {111445},
  year = {2022},
  issn = {0164-1212},
  doi = {https://doi.org/10.1016/j.jss.2022.111445},
  author = {Morena Barboni and Andrea Morichetta and Andrea Polini}
}
```