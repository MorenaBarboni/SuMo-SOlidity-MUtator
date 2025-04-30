# SuMo
SuMo is a mutation testing tool for Solidity Smart Contracts. 

SuMo was designed to run mutation testing on Solidity projects in a NodeJS environment. It can run test using [Hardhat](https://hardhat.org/), [Brownie](https://github.com/eth-brownie/brownie)  and [Forge](https://github.com/foundry-rs/foundry), hybrid test suites, and custom test scripts.


# Table of Contents
* [Installation](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#installation)
* [Configuration](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#configuration-)
* [CLI Usage](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#cli-usage)
* [Mutation Operators](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#mutation-operators-)
* [Publications](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator#publications)

# Installation

To install sumo run ```npm install @morenabarboni/sumo```

# Configuration ⚙️
Before using SuMo you must specify your desired configuration in a [sumo-config.js](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator/blob/master/src/sumo-config.js) in the root directory of your project. The ```sumo-config.js``` is automatically generated when SuMo is installed.

Here's a simple example of ```sumo-config.js```:

```
module.exports = {  
      buildDir: "auto",                               //build directory of the SUT (auto detect)
      contractsDir: "auto",                           //contract directory of the SUT (auto detect)
      testDir: "auto",                                //test directory of the SUT (auto detect)
      skipContracts: ["interfaces", "mock", "test"],  // Relative paths from contractsDir
      skipTests: [],                                  // Relative paths from testsDir
      mutation: {
         minimalOperators: false,     // Use minimal mutation operators
         randomSampling: false,       // Enable random sampling
         maxRandomMutants: 100       // Max number of randomly sampled mutants
      },
      testingFramework: "auto",                      //testing framework (auto detect)
      testingTimeOutInSec: 500                       //testing time-out for a mutant
}
```

### 1) SUT directories
 SuMo will try to automatically find your project directories based on standard naming conventions (e.g., /contracts and /test). These can be overriden in the ```sumo-config.js``` file. Contracts and test files/folders to be ignored by SuMo can be specified as well.

| Field | Description | Default Value |
| ------ | ------ |  :----: |
| ```contractsDir```| relative path to the directory of the contracts to be mutated | ```auto``` |
 | ```testDir```| relative path to the directory of the tests to be evaluated | ```auto``` | 
 | ```buildDir```| relative path to the directory of the compilation artifacts | ```auto``` |  
 | ```skipContracts```| blacklist of relative paths to contract files (or folders) | ```["interfaces", "mock", "test"]``` | 
| ```skipTests```| blacklist of relative paths to test files (or folders) | ```[]``` |

### 2) Testing Frameworks Configuration 🔗

These fields allow to customize the testing frameworks used by SuMo.

By default, ```testingFramework``` is set to ```auto```: SuMo will automatically select the testing framework(s) to be used based on the configuration files (e.g., ```foundry.toml```) present in your workspace. If multiple configuration files are found, SuMo will try to run a hybrid testing process.

| Field | Description | Available Options | Default Value | 
| ------ | ------ | ------ |   :----: |
| ```testingFramework```| the testing framework to be used for compiling and testing the smart contracts | ```auto```, ```brownie```, ```forge```, ```hardhat```, ```custom```  | ```auto``` |

#### **Custom**

If you set ```testingFramework``` to ```custom```, SuMo will invoke the ```compile``` and ```test``` script defined in your ```package.json```. This allows you to customize both scripts and have more control over the testing process. For example, you can define the scripts as follows:
```
//package.json
 scripts: {
    compile: "hardhat compile",
    test "hardhat test --bail && forge test --fail-fast"
 }

//sumo-config.js
 project: {
    buildDir: "artifacts",
 }
```
Additionally, you must also explicitly define a ```buildDir``` (matching your compile command) in your sumo-config.js.

```
⚠️ Limitations of Custom Test Scripts:
     * buildDir: must be explicitly specified it in the sumo-config.js
     * skipTests: will be ignored. You have to specify them in your custom script.
```

### 3) Mutation Testing Process Configuration
These fields allow you to further customize the mutation testing process:

| Field | Description | Default Value |
| ------ | ------ |  :----: |
| ```minimalOperators```| use minimal mutation rules | ```false``` |
| ```randomSampling```| use Random Mutant Sampling | ```false``` |    
| ```randomMutants```| the maximum number of mutants to be tested (only if ```randomSampling``` is enabled) | ```100``` |    
| ```testingTimeOutInSec```| seconds after which a mutant is marked as timed-out during testing | ```500``` |  

### 4) Using Coverage (for Hardhat users)
If you are using ```hardhat``` with ```solidity-coverage```:
* You can run ```hardhat coverage --matrix``` (See [solidity-coverage](https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md)).
* This will generate a ```testMatrix.json``` file with coverage data for your project.
* SuMo will use this file to mark uncovered mutants as live and speed up mutation testing.

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
| `lookup`    | Generates the mutations and creates reports without starting mutation testing. | `npx/yarn sumo lookup` | `$ npx sumo lookup` |
| `mutate`    | Generates the mutations and saves a copy of each `.sol` mutant to  to ./sumo/mutants. | `npx/yarn sumo mutate` | `$ npx sumo mutate` |

## Running Mutation Testing


| Command       | Description                        | Usage                    | Example                             |
|---------------|------------------------------------|--------------------------|-------------------------------------|
| `pretest`    | Runs the test suite on the original smart contracts to check if all tests pass and can be successfully evaluated. Pretest is automatically run when `sumo test` is executed. | `npx/yarn sumo pretest` | `$ npx sumo pretest` |
| `test`    | Starts the mutation testing process. You can also choose a single mutant / an interval of mutants to be tested by sepcifying ```<startHash>``` and (optionally) ```<endHash>```.| `npx/yarn sumo test <startHash> <endHash>` | `$ npx sumo test` <br> `$ npx sumo test mbc5e8f56 mbg5t86o6`|
| `restore`    | Restores the SUT files to a clean version. This should be executed if you suddenly interrupt the mutation process. Note that the restore command overwrites your codebase with the files stored in the ```sumo/baseline``` folder. If you need to restore the project files, make sure to do so before performing other operations as the baseline is automatically refreshed on subsequent preflight or test runs.| `$ npx/yarn sumo restore` | `$ npx sumo restore`|

## Viewing the results
SuMo automatically creates a ```sumo\results``` folder in the root directory of the project with the following reports: <br/>
* ```mutations.json```: List of mutations in json format, synchronoysly updated during testing. 
* ```index.html```: A simple web display of the results (you can view this using VSCode extensions like ```Live Server```). From here, you can also download a csv with the results.
* ```\mutants```: Folder with mutated ```.sol``` source files (only if generated with ```sumo mutate```)

# Mutation Operators 👾

SuMo includes the following Traditional and Solidity-specific operators. Note that not all mutation operators are enabled by default.

## Traditional Mutation Operators

| Operator | Name | Mutation Example | Enabled by Default | Minimal Available |
| ------ | ------ |  ------ |  ------ | :----: |
| ACM| Argument Change of overloaded Method call | ```overloadedFunc(a,b);``` &rarr; ```overloadedFunc(a,b,c);``` |   Y |  N |
| AOR | Assignment Operator Replacement | ```+= ``` &rarr;  ```=``` |   Y |  N |
| BCRD | Break and Continue Replacement <br /> and Deletion | ```break``` &rarr; <br /> ```continue``` &rarr; ```break``` |   Y |  N |
| BLR | Boolean Literal Replacement | ```true``` &rarr; ```false``` |   Y |  N |
| BOR | Binary Operator Replacement | ```+``` &rarr; ```-``` <br /> ```<``` &rarr; ```>=``` |   Y | Y |
| CBD | Catch Block Deletion | ```catch{}``` &rarr; ``` ``` |   Y |  N |
| CSC | Conditional Statement Change | ```if(condition)``` &rarr; ```if(false)``` <br /> ```else{}``` &rarr; ``` ```  |   Y |  N |
| ER | Enum Replacemet |  ```enum.member1``` &rarr; ```enum.member2``` |   Y | Y |
| ECS | Explicit Conversion to Smaller type | ```uint256``` &rarr; ```uint8``` |   Y |  N |
| FCD | Function Call Deletion | ```foo()``` &rarr; ``` ```|  Y | N |
| HLR | Hexadecimal Literal Replacement | ```hex\"01\"``` &rarr; ```hex\"random\"```|   Y |  N |
| ILR | Integer Literal Replacement | ```1``` &rarr; ```0``` |   Y |  N |
| LCS | Loop Statement Change | ```while(condition)``` &rarr; ```while(false)``` |   Y |  N |
| OLFD | Overloaded Function Deletion | ```function overloadedF(){}``` &rarr; ``` ``` |   Y |  N |
| ORFD | Overridden Function Deletion | ```function f() override {}``` &rarr; ``` ``` |   Y |  N |
| SKR | Super Keyword Replacement | ```x = getData()``` &rarr; ```x = super.getData()``` |   Y |  N |
| SLR | String Literal Replacement | ```"string"``` &rarr; ```""```  |   Y |  N |
| UORD | Unary Operator Replacement and Deletion | ```++``` &rarr; ```--```  <br /> ```!``` &rarr; ``` ``` |  Y | Y |


## Solidity Mutation Operators
| Operator | Name | Mutation Example |Enabled by Default | Minimal version available |
| ------ | ------ |  ------ | ------ | :----: |
| AVR | Address Value Replacement | ```0x67ED2e5dD3d0...``` &rarr; ``` address.this()```|   Y |  Y |
| CCD | Contract Constructor Deletion | ```constructor(){}``` &rarr; ``` ``` |   Y |  N |
| DLR | Data Location Keyword Replacement | ```memory``` &rarr; ```storage``` | N | N |
| DOD | Delete Operator Deletion | ```delete``` &rarr; |   Y |  N |
| ETR | Ether Transfer function Replacement | ```delegatecall()``` &rarr; ```call()``` |   Y | Y |
| EED |  Event Emission Deletion |  ```emit Deposit(...)``` &rarr; ```/*emit Deposit(...)*/``` |   Y |  N |
| EHD | Exception Handling Deletion | ```require(...)``` &rarr; ```/*require(...)*/``` |  Y |  N |
| FVR | Function Visibility Replacement | ```function f() public``` &rarr; ```function f() private``` |  N | Y |
| GVR | Global Variable Replacement | ```msg.value()``` &rarr; ```tx.gasprice()``` |   Y | Y |
| MCR | Mathematical and Cryptographic <br /> function Replacement | ```addmod``` &rarr; ```mulmod``` <br /> ```keccak256``` &rarr; ```sha256``` |   Y | Y |
| MOD | Modifier Deletion | ```function f() onlyOwner``` &rarr; ```function f()``` |   Y | Y |
| MOI | Modifier Insertion | ```function f()``` &rarr; ```function f() onlyOwner``` |  N | Y |
| OMD | Overridden Modifier Deletion | ```modifier m() override {}``` &rarr; ``` ``` |   Y |  N |
| PKD | Payable Keyword Deletion | ```function f() payable``` &rarr; ```function f()``` |   Y |  N |
| RSD | Return Statement Deletion | ```return amount;``` &rarr; ```//return amount;``` |   Y |  N |
| RVS | Return Values Swap | ```return (1, "msg", 100);``` &rarr; ```return (100, "msg", 1);``` |   Y | Y |
| SCD | Selfdestruct Call Deletion |  ```selfdestruct();``` &rarr; ```//selfdestruct();``` |   Y |  N |
| SFR | SafeMath Function Replacement | ```SafeMath.add``` &rarr; ```SafeMath.sub``` |   Y | Y |
| SCEC | Switch Call Expression Casting | ```Contract c = Contract(0x86C9...);``` &rarr; ```Contract c = Contract(0x67ED...); ``` |   Y |  N |
| TOR | Transaction Origin Replacement | ```msg.sender``` &rarr; ```tx.origin``` |   Y |  N |
| VUR | Variable Unit Replacement | ```wei``` &rarr; ```ether```  <br /> ```minutes``` &rarr; ```hours``` |   Y | Y |
| VVR | Variable Visibility Replacement | ```uint private data;``` &rarr; ```uint public data;``` |  N | Y |


## Minimal Mutation Rules
Some mutation operators foresee a **minimal** version:
* The **extended** operators generate a more comprehensive set of mutants. These guarantee a more in-depth test adequacy assessment, but they can generate more than one replacement per target (e.g., 
```+``` is mutated in both ```-``` and ```*```), which can lead to longer execution times.
* The **minimal** operators define simplified rules that only inject one replacement per target (e.g., ```+``` is mutated in ```-```), limiting the generation of subsumed mutants and speeding up the testing process.

By default, SuMo employs the **extended** operators. However, you can enable the minimal rules in the ```sumo-config.js``` file.

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
