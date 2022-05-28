# SuMo
SuMo is a mutation testing tool for Solidity Smart Contracts. It features 25 Solidity-specific mutation operators, as well as 19 traditional operators.

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
 
##### 3) Mutation Process
These fields allow to set up the mutation testing process

* ```ignore```:  array of paths to contract files that must be ignored by SuMo during mutation testing
* ```ganache```: automatically spawn Ganache instances during the testing process (true by default)
* ```customTestScript```: use a custom compile and test script specified in the package.json of the SUT, instead of relying on the Truffle    interface (false by default)
* ```testingTimeOutInSec```: number of seconds after which a mutant is marked as timed-out during testing (300 by default)
* ```saveMutants```: save a copy of each mutant contract to file (false by default)

Note that by setting ```customTestScript``` to true you must specify a ```test``` and ```compile``` script in your ```package.json``` file.


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

#### Running Mutation Testing
Use:
* ```npm run sumo test``` To launch the mutation testing process;
* ```npm run sumo restore``` To restore the SUT files to a clean version if you suddenly interrupt the mutation process

### Results
SuMo automatically creates a ```.sumo``` folder in the root directory of the project. <br/>
At the end of the mutation testing process the folder will contain:
* ```report.txt``` Test report
* ```\alive``` Mutants that survived testing
* ```\killed``` Mutants killed by tests
* ```\mutants``` Mutated contracts

Use:
* ```npm run sumo cleanSumo``` to delete the ```.sumo``` folder;

## Mutation Operators 👾

### Traditional Operators
| Operator | Description |
| ------ | ------ |
| ACM| Argument Change of overloaded Method call |
| AOR | Assignment Operator Replacement |
| BCRD | Break and Continue Replacement and Deletion |
| BLR | Boolean Literal Replacement |
| BOR | Binary Operator Insertion |
| CBD | Catch Block Deletion |
| CSC | Conditional Statement Change |
| ER | Enum Replacemet |
| ECS | Explicit Conversion to Smaller type |
| HLR | Hexadecimal Literal Replacement |
| ICM | Increments Mirror |
| ILR | Integer Literal Replacement |
| LCS | Loop Statement Change |
| OLFD | Overloaded Function Deletion |
| ORFD | Overridden Function Deletion |
| SKI | Super Keyword Insertion |
| SKD | Super Keyword Deletion |
| SLR | String Literal Replacement |
| UORD | Unary Operator Replacement and Deletion |

### Solidity Operators
|Operator | Description |
| ------ | ------ |
| AVR | Address Value Replacement |
| CSC | Contract Constructor Deletion |
| DLR | Data Location Keyword Replacement |
| DOD | Delete Operator Deletion |
| ETR | Ether Transfer function Replacement |
| EED |  Event Emission Deletion |
| EHC | Exception Handling Change |
| FVR | Function Visibility Replacement |
| GVR | Global Variable Replacement |
| MCR | Mathematical and Cryptographic function Replacement |
| MOD | Modifier Deletion |
| MOI | Modifier Insertion |
| MOC | Modifier Order Change |
| MOC | Modifier Order Change |
| MOR | Modifier Replacement |
| PKD | Payable Keyword Deletion |
| RSD | Return Statement Deletion |
| RVS | Return Values Swap |
| SFD | Selfdestruct Deletion |
| SFI | Selfdestruct Insertion |
| SFR | SafeMath Function Replacement |
| SCEC | Switch Call Expression Casting |
| TOR | Transaction Origin Replacement |
| VUR | Variable Unit Replacement |
| VVR | Variable Visibility Replacement |


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
