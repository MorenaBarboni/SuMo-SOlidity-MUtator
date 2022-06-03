<p align="center">
      <img src="https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator/blob/master/src/icons/sumo.png?raw=true" alt="SuMo" style="max-width:100%;" width="300">
</p>

# SuMo
SuMo is a mutation testing tool for Solidity Smart Contracts. It features 25 Solidity-specific mutation operators, as well as 19 traditional operators.

SuMo was designed to run mutation testing on Solidity projects in a NodeJS environment. It relies on the interface of the [Truffle](https://github.com/trufflesuite/truffle) testing framework to compile the mutants and run the tests, and it automatically spawns [Ganache](https://github.com/trufflesuite/ganache) instances to guarantee a clean-room testing environment between mutants.

Note that [ReSuMo](https://github.com/MorenaBarboni/ReSuMo/tree/main/src) advances the functionalities of SuMo through:
1. a static, file-level regression testing mechanism for evolving projects
2. the usage of the Trivial Compiler Equivalence (TCE) for automatically detecting and discarding mutant equivalencies

## Installation
To install SuMo run ```npm install```.

## Configuration
Before using SuMo you must specify your desired configuration in the [config.js](https://github.com/MorenaBarboni/SuMo-SOlidity-MUtator/blob/master/src/config.js) file.

##### 1) SuMo directories
These fields determine where SuMo stores data during the mutation testing process. Most paths are already set by default:
* ```sumoDir```: path of the directory where SuMo must save the mutation testing artifacts (.sumo by default)
* ```baselineDir```: path of the directory where SuMo must save the baseline of the SUT (.sumo/baseline by default)
* ```killedDir```: path of the directory where SuMo must save the killed mutations (.sumo/killed by default)
* ```aliveDir```: path of the directory where SuMo must save the live mutations (.sumo/alive by default)
* ```mutantsDir```: path of the directory where SuMo must (optionally) save a copy of each mutated contract (.sumo/mutants by default)

##### 2) SUT directories
These fields specify the path to different artefacts of the System Under Test:
* ```projectDir```: path of the root directory of the SUT where the package.json is located
* ```contractsDir```: path of the directory where the contracts to be mutated are located
* ```buildDir```: path of the directory where the artifacts of the compilation will be placed (usually ``` .../build/contracts/``` )
 
##### 3) Mutation Process
These fields allow to set up the mutation testing process

* ```bail```: bail after the first test failure (false by default)
* ```customTestScript```: use a custom compile and test script specified in the package.json of the SUT, instead of relying on the Truffle    interface (false by default)
* ```ganache```: automatically spawn Ganache instances during the testing process (true by default)
* ```ignore```:  array of paths to contract files that must be ignored by SuMo during mutation testing
* ```optimized```: employ operator optimizations (true by default),
* ```tce```: enable the Trivial Compiler Equivalence (true by default),
* ```testingTimeOutInSec```: number of seconds after which a mutant is marked as timed-out during testing (300 by default)

Note that if ```customTestScript``` is true you must specify a ```test``` and ```compile``` script in your ```package.json``` file.
When using a custom test script the ```bail``` field of SuMo is ignored; it must be added to the custom script itself.

##### 4) Trivial Compiler Equivalence

The Trivial Compiler Equivalence compares the bytecode produced by the compiler to detect equivalences between mutants, thus it can only work if:
1. the solc compiler optimization is enabled;
2. no metadata hash is appended to the contract bytecode.

Before running SuMo make sure that the following options are present in your ```truffle-config.js``` configuration file:

```
 compilers: {
        solc: {
            optimizer: {
                enabled: true,
                ...
            },
			metadata: {
            bytecodeHash: "none"
          }
        }
    }
```


## CLI Usage

#### Selecting Mutation Operators
Before starting the mutation process you can choose which mutation operators to use:
* ```npm run sumo list``` shows the currently enabled mutation operators
* ```npm run sumo enable``` enables all the mutation operators
* ```npm run sumo enable ID``` enables the mutation operator ID
* ```npm run sumo disable``` disables all the mutation operators
* ```npm run sumo disable ID``` disables the mutation operator ID

#### Viewing the available mutations
Once everything is set up you can use:
* ```npm run sumo preflight``` To view the available mutations and save a preliminary report  to ./sumo/report.txt
* ```npm run sumo mutate``` To view the available mutations, save a preliminary report  to ./sumo/report.txt, and save a copy of each mutant to ./sumo/mutants

#### Running Mutation Testing
Use:
* ```npm run sumo test``` To launch the mutation testing process;
* ```npm run sumo restore``` To restore the SUT files to a clean version if you suddenly interrupt the mutation process

### Results
SuMo automatically creates a ```.sumo``` folder in the root directory of the project. <br/>
At the end of the mutation testing process the folder will contain:
* ```report.txt``` Test report
* ```operators.xlsx``` Mutation operators report
* ```\alive``` Mutants that survived testing
* ```\killed``` Mutants killed by tests
* * ```\equivalent``` Equivalent mutants discarded by the TCE
* ```\redundant``` Redundant mutants discarded by the TCE
* ```\mutants``` Mutated contracts

Use:
* ```npm run sumo cleanSumo``` to delete the ```.sumo``` folder;

## Mutation Operators 👾

SuMo includes currently 25 Solidity-specific operators and 19 general operators, some of which foresee an Optimized version.

* The standard, **Non-Optimized** operators include extended mutation rules capable of generating a more comprehensive collection of mutants. The Non-Opt operators guarantee higher reliability at the price of a more expensive and time-consuming mutation testing process. 
* The **Optimized** operators consist of simplified rules to limit the generation of likely subsumed mutants and speed up the testing process.


### Traditional Operators
| Operator | Description | Optimization Available |
| ------ | ------ | :----: |
| ACM| Argument Change of overloaded Method call | N |
| AOR | Assignment Operator Replacement | Y |
| BCRD | Break and Continue Replacement and Deletion | N |
| BLR | Boolean Literal Replacement | N |
| BOR | Binary Operator Insertion | Y |
| CBD | Catch Block Deletion | N |
| CSC | Conditional Statement Change | N |
| ER | Enum Replacemet | Y |
| ECS | Explicit Conversion to Smaller type | N |
| HLR | Hexadecimal Literal Replacement | N |
| ICM | Increments Mirror | N |
| ILR | Integer Literal Replacement | N |
| LCS | Loop Statement Change | N |
| OLFD | Overloaded Function Deletion | N |
| ORFD | Overridden Function Deletion | N |
| SKI | Super Keyword Insertion | N |
| SKD | Super Keyword Deletion | N |
| SLR | String Literal Replacement | N |
| UORD | Unary Operator Replacement and Deletion | N |

### Solidity Operators
|Operator | Description | Optimization Available |
| ------ | ------ | :----: |
| AVR | Address Value Replacement | N |
| CSC | Contract Constructor Deletion | N |
| DLR | Data Location Keyword Replacement | N |
| DOD | Delete Operator Deletion | N |
| ETR | Ether Transfer function Replacement | N |
| EED |  Event Emission Deletion | N |
| EHC | Exception Handling Change | N |
| FVR | Function Visibility Replacement | Y |
| GVR | Global Variable Replacement | Y |
| MCR | Mathematical and Cryptographic function Replacement | N |
| MOD | Modifier Deletion | N |
| MOI | Modifier Insertion | N |
| MOC | Modifier Order Change | N |
| MOC | Modifier Order Change | N |
| MOR | Modifier Replacement | N |
| PKD | Payable Keyword Deletion | N |
| RSD | Return Statement Deletion | N |
| RVS | Return Values Swap | Y |
| SFD | Selfdestruct Deletion | N |
| SFI | Selfdestruct Insertion | N |
| SFR | SafeMath Function Replacement | Y |
| SCEC | Switch Call Expression Casting | N |
| TOR | Transaction Origin Replacement | N |
| VUR | Variable Unit Replacement | Y |
| VVR | Variable Visibility Replacement | Y |


### Publications

To cite SuMo, please use the following:

```
@inproceedings{9463055,
  author={Barboni, Morena and Morichetta, Andrea and Polini, Andrea},
  booktitle={2021 IEEE/ACM International Conference on Automation of Software Test (AST)}, 
  title={SuMo: A Mutation Testing Strategy for Solidity Smart Contracts}, 
  year={2021},
  pages={50-59}
  } 
```
