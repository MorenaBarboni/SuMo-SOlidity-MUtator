# SuMo
SuMo is a mutation testing tool for Solidity Smart Contracts. It features 25 Solidity-specific mutation operators, as well as 19 traditional operators.

SuMo was designed to run mutation testing on Solidity projects in a NodeJS environment. It can run test using [Truffle](https://github.com/trufflesuite/truffle), [Hardhat](https://hardhat.org/), [Brownie](https://github.com/eth-brownie/brownie)  and [Forge](https://github.com/foundry-rs/foundry). If needed, SuMo can also automatically spawn [Ganache](https://github.com/trufflesuite/ganache) instances to guarantee a clean-room testing environment between mutants.


# Table of Contents
* [Installation](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#installation)
* [Configuration](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#configuration-)
* [CLI Usage](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#cli-usage)
* [Trivial Compiler Equivalence](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#trivial-compiler-equivalence)
* [Mutation Operators](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#mutation-operators-)
* [Publications](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#publications)



# Installation

To install sumo run ```npm install @morenabarboni/sumo```

# Configuration ⚙️
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
These (optional) fields identify relevant project directories.

| Field | Description | Default Value |
| ------ | ------ |  :----: |
| ```contractsDir```| relative path to the directory of the contracts to be mutated | ```contracts``` |
 | ```testDir```| relative path to the directory of the tests to be evaluated | ```test```/```tests``` | 
 | ```buildDir```| relative path to the directory of the compilation artifacts | ```build```/```out```/```artifacts``` |  |  

### 2) Mutation Process
These fields allow to configure the mutation testing process:

| Field | Description | Default Value |
| ------ | ------ |  :----: |
| ```minimal```| use minimal mutation rules | ```false``` |
 | ```skipContracts```| blacklist of relative paths to contract files (or folders) | ```[]``` | 
| ```skipTests```| blacklist of relative paths to test files (or folders) | ```[]``` |
| ```tce```| use the Trivial Compiler Equivalence | ```false``` |    
| ```testingTimeOutInSec```| seconds after which a mutant is marked as timed-out during testing | ```300``` |  

### 3) Testing Interface
These fields specify what testing framework and blockchain simulator SuMo should use to conduct mutation testing:

| Field | Description | Available Options | Default Value | 
| ------ | ------ | ------ |   :----: |
| ```network```| the blockchain simulator to be used | ```ganache```, ```none```  | ```none```|
| ```testingFramework```| the testing framework to be used for compiling and testing the smart contracts | ```brownie```, ```forge```, ```hardhat```, ```truffle```, ```custom```  | ```truffle```|


#### **Truffle** and **Hardhat**
When choosing ```truffle``` or ```hardhat```:
* SuMo will rely on the local ```truffle``` or ```hardhat``` package installed in the project;
* The smart contracts will be compiled with a minimal compile command  (e.g., ```truffle compile``` );
* The smart contracts will be tested with a minimal test command followed by the bail argument, and (optionally) by a list of test files to be executed (e.g., ```truffle test ...testFiles -b```) .

#### **Brownie**
When choosing ```brownie```:
* SuMo will rely on a local/global ```brownie``` installation;
* The smart contracts will be compiled with a minimal compile command  (e.g., ```brownie compile``` );
* The smart contracts will be tested with a minimal test command followed by the exitfirst argument, and (optionally) by a list of test files to be executed (e.g., ```brownie test ...testFiles --exitfirst```) .

#### **Forge**
When choosing ```forge``` :
* SuMo will rely on the global installation of ```foundry```;
* The smart contracts will be compiled with a minimal compile command  (e.g., ```forge build```);
* The smart contracts will be tested with a minimal test command followed by the fail-fast argument, and (optionally) by a list of test files to be executed (e.g., ```forge test ...testFiles --fail-fast```).
* Make sure that your ```forge``` installation is up-to-date to enable ```--fail-fast```.

#### **Custom**
* When choosing ```custom```: 
  * SuMo will invoke the ```compile``` and ```test``` script defined in your ```package.json```. This allows you to customize both scripts and have more control over the testing process; 
  * The ```skipTests``` list will be overridden by the ```test``` script in your ```package.json```. To skip some test files, you can either: 1) append the specific test files you want to run to your ```test``` script, or 2) remove the test files to be skipped from the test folder.
  * The ```--bail```/```--exitfirst```/```--fail-fast``` option should be added to the test script to speed up mutation testing. 

# CLI Usage

## Selecting the Mutation Operators

Before starting the mutation process you can choose which mutation operators to use:

| Command       | Description                        | Usage                    | Example                             |
|---------------|------------------------------------|--------------------------|-------------------------------------|
| `list`    | Shows the enabled mutation operators. | `npx/yarn sumo list` | `$ npx sumo list`  |
| `enable`    | Enables one or more mutation operators. If no operator IDs are specified, all of them are enabled. | `npx/yarn sumo enable [...ID]` | `$ npx sumo enable` <br> `$ npx sumo enable AOR BOR` |
| `disable`    | Disables one or more mutation operators. If no operator IDs are specified, all of them are disabled. | `npx/yarn sumo disable [...ID]` | `$ npx sumo disable` <br> `$ npx sumo disable FVR` |

## Viewing the available mutations

| Command       | Description                        | Usage                    | Example                             |
|---------------|------------------------------------|--------------------------|-------------------------------------|
| `lookup`    | Generates the mutations and saves them to ./sumo/generated.csv without starting mutation testing. | `npx/yarn sumo lookup` | `$ npx sumo lookup` |
| `mutate`    | Generates the mutations and saves a copy of each `.sol` mutant to  to ./sumo/mutants. | `npx/yarn sumo mutate` | `$ npx sumo mutate` |

## Running Mutation Testing


| Command       | Description                        | Usage                    | Example                             |
|---------------|------------------------------------|--------------------------|-------------------------------------|
| `pretest`    | Runs the test suite on the original smart contracts to check if all tests pass and can be successfully evaluated. Pretest is automatically run when `sumo test` is executed. | `npx/yarn sumo pretest` | `$ npx sumo pretest` |
| `test`    | Starts the mutation testing process. You can also choose a single mutant / an interval of mutants to be tested by sepcifying ```<startHash>``` and (optionally) ```<endHash>```.| `npx/yarn sumo test <startHash> <endHash>` | `$ npx sumo test` <br> `$ npx sumo test mbc5e8f56 mbg5t86o6`|
| `restore`    | Restores the SUT files to a clean version. This should be executed if you suddenly interrupt the mutation process. Note that the restore command overwrites your codebase with the files stored in the ```sumo/baseline``` folder. If you need to restore the project files, make sure to do so before performing other operations as the baseline is automatically refreshed on subsequent preflight or test runs.| `$ npx/yarn sumo restore` | `$ npx sumo restore`|

## Viewing the results
SuMo automatically creates a ```sumo\results``` folder in the root directory of the project with the following reports: <br/>
* ```operators.xlsx``` Results of the mutation testing process grouped by operator
* ```results.csv``` Results of the mutation testing process for each mutant. This synchronous log is updated each time a mutant is assigned a status
* ```sumo-log.txt``` Logs info about the mutation testing process
* ```\mutants``` Mutated ```.sol``` contracts generated with ```sumo mutate```

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
    test "hardhat test --bail && forge test --fail-fast"
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

## Traditional Mutation Operators

| Operator | Name | Mutation Example |  Minimal version available |
| ------ | ------ |  ------ | :----: |
| ACM| Argument Change of overloaded Method call | ```overloadedFunc(a,b);``` &rarr; ```overloadedFunc(a,b,c);``` |  N |
| AOR | Assignment Operator Replacement | ```+= ``` &rarr;  ```=``` |  Y |
| BCRD | Break and Continue Replacement <br /> and Deletion | ```break``` &rarr; <br /> ```continue``` &rarr; ```break``` |  N |
| BLR | Boolean Literal Replacement | ```true``` &rarr; ```false``` |  N |
| BOR | Binary Operator Replacement | ```+``` &rarr; ```-``` <br /> ```<``` &rarr; ```>=``` |  Y |
| CBD | Catch Block Deletion | ```catch{}``` &rarr; ``` ``` |  N |
| CSC | Conditional Statement Change | ```if(condition)``` &rarr; ```if(false)``` <br /> ```else{}``` &rarr; ``` ```  |  N |
| ER | Enum Replacemet |  ```enum.member1``` &rarr; ```enum.member2``` |  Y |
| ECS | Explicit Conversion to Smaller type | ```uint256``` &rarr; ```uint8``` |  N |
| HLR | Hexadecimal Literal Replacement | ```hex\"01\"``` &rarr; ```hex\"random\"```|  N |
| ICM | Increments Mirror | ```-=``` &rarr; ```=-``` |  N |
| ILR | Integer Literal Replacement | ```1``` &rarr; ```0``` |  N |
| LCS | Loop Statement Change | ```while(condition)``` &rarr; ```while(false)``` |  N |
| OLFD | Overloaded Function Deletion | ```function overloadedF(){}``` &rarr; ``` ``` |  N |
| ORFD | Overridden Function Deletion | ```function f() override {}``` &rarr; ``` ``` |  N |
| SKI | Super Keyword Insertion | ```x = getData()``` &rarr; ```x = super.getData()``` |  N |
| SKD | Super Keyword Deletion | ```x = super.getData()``` &rarr; ```x = getData()``` |  N |
| SLR | String Literal Replacement | ```"string"``` &rarr; ```""```  |  N |
| UORD | Unary Operator Replacement and Deletion | ```++``` &rarr; ```--```  <br /> ```!``` &rarr; ``` ``` |  N |


## Solidity Mutation Operators
| Operator | Name | Mutation Example | Minimal version available |
| ------ | ------ |  ------ | :----: |
| AVR | Address Value Replacement | ```0x67ED2e5dD3d0...``` &rarr; ``` address.this()```|  N |
| CCD | Contract Constructor Deletion | ```constructor(){}``` &rarr; ``` ``` |  N |
| DLR | Data Location Keyword Replacement | ```memory``` &rarr; ```storage``` | N |
| DOD | Delete Operator Deletion | ```delete``` &rarr; |  N |
| ETR | Ether Transfer function Replacement | ```delegatecall()``` &rarr; ```call()``` |  N |
| EED |  Event Emission Deletion |  ```emit Deposit(...)``` &rarr; ```/*emit Deposit(...)*/``` |  N |
| EHC | Exception Handling Change | ```require(...)``` &rarr; ```/*require(...)*/``` |  N |
| FVR | Function Visibility Replacement | ```function f() public``` &rarr; ```function f() private``` |  Y |
| GVR | Global Variable Replacement | ```msg.value()``` &rarr; ```tx.gasprice()``` |  Y |
| MCR | Mathematical and Cryptographic <br /> function Replacement | ```addmod``` &rarr; ```mulmod``` <br /> ```keccak256``` &rarr; ```sha256``` |  N |
| MOD | Modifier Deletion | ```function f() onlyOwner``` &rarr; ```function f()``` |  Y |
| MOI | Modifier Insertion | ```function f()``` &rarr; ```function f() onlyOwner``` |  Y |
| MOC | Modifier Order Change |  ```function f() modA modB``` &rarr; ```function f() modB modA``` |  Y |
| MOR | Modifier Replacement | ```function f() onlyOwner``` &rarr; ```function f() onlyAdmin``` |  Y |
| OMD | Overridden Modifier Deletion | ```modifier m() override {}``` &rarr; ``` ``` |  N |
| PKD | Payable Keyword Deletion | ```function f() payable``` &rarr; ```function f()``` |  N |
| RSD | Return Statement Deletion | ```return amount;``` &rarr; ```//return amount;``` |  N |
| RVS | Return Values Swap | ```return (1, "msg", 100);``` &rarr; ```return (100, "msg", 1);``` |  Y |
| SFD | Selfdestruct Deletion |  ```selfdestruct();``` &rarr; ```//selfdestruct();``` |  N |
| SFI | Selfdestruct Insertion | ```doSomething; selfdestruct();``` &rarr; ```selfdestruct(); doSomething;```  |  N |
| SFR | SafeMath Function Replacement | ```SafeMath.add``` &rarr; ```SafeMath.sub``` |  Y |
| SCEC | Switch Call Expression Casting | ```Contract c = Contract(0x86C9...);``` &rarr; ```Contract c = Contract(0x67ED...); ``` |  N |
| TOR | Transaction Origin Replacement | ```msg.sender``` &rarr; ```tx.origin``` |  N |
| VUR | Variable Unit Replacement | ```wei``` &rarr; ```ether```  <br /> ```minutes``` &rarr; ```hours``` |  Y |
| VVR | Variable Visibility Replacement | ```uint private data;``` &rarr; ```uint public data;``` |  Y |


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
