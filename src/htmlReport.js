// External modules
const fs = require("fs");
const path = require("path");
const utils = require('./utils');

/**
 * Generates the mutation testing report in the SUT results folder.
 */
function generateReport() {
  const mutationsJsonPath = utils.staticConf.mutationsJsonPath;
  const resultsDir = utils.staticConf.resultsDir;

  if (!fs.existsSync(mutationsJsonPath)) {
    console.error("Error: mutations.json not found!");
    return;
  }
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Copy static files for html report
  const staticFiles = {
    "index.html": generateMainPage(),
    "js/script.js": getScriptFile(),
    "css/styles.css": getStylesFile(),
    "contract.html": generateContractTemplate()
  };

  for (const [relativePath, content] of Object.entries(staticFiles)) {
    const fullPath = path.join(resultsDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  // SuMo logo
  const sourcePngPath = path.join(utils.staticConf.sumoInstallPath, 'src', 'resources', 'sumo-logo.png');
  const destinationPngPath = path.join(resultsDir, 'resources', 'sumo-logo.png');
  fs.mkdirSync(path.dirname(destinationPngPath), { recursive: true });
  fs.copyFileSync(sourcePngPath, destinationPngPath);

  console.log("HTML report generated successfully in:", resultsDir);
}

/**
 * Returns the HTML template for the main summary (index.html).
 * @returns {string} - Index HTML file.
 */
function generateMainPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SuMo Report</title>
  <link rel="stylesheet" href="css/styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap" rel="stylesheet">
 <link rel="icon" href="resources/sumo-logo.png" type="image/x-icon">
</head>
<body>
  <div class="container">
    <header>
      <h1>SuMo Report</h1>
      <p>Mutation testing results for your Smart Contracts.</p>
    </header>

    <section id="overview">
      <div class="score-card">
        <h2>Mutation Score: <span id="scoreValue">0</span>%</h2>
        <p id="summaryInfo"></p>
      </div>
    </section>

    <section id="details">
      <div class="section-header">
        <h2>Contracts Summary</h2>
        <button class="icon-button" onclick="downloadAllCSV()" title="Download All Contracts CSV">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="download-icon">
             <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
             <polyline points="7 10 12 15 17 10"></polyline>
             <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
      <table id="summaryTable">
        <thead>
          <tr>
            <th>Contract</th>
            <th>Total Mutants</th>
            <th>Killed</th>
            <th>Live</th>
            <th>Stillborn</th>
            <th>Timed Out</th>
            <th>Untested</th>
            <th>Mutation Score</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

    <footer>
      <p>Report generated on: <span id="generatedDate"></span></p>
    </footer>
  </div>
  <script src="js/script.js"></script>
</body>
</html>`;
}

/**
 * Returns the HTML template for a specific contract as a string.
 * @returns {string} - Contract page HTML file.
 */
function generateContractTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract Details</title>
  <link rel="stylesheet" href="css/styles.css">
 <link rel="icon" href="resources/sumo-logo.png" type="image/x-icon">
</head>
<body>
  <div class="container">
    <nav>
      <a href="index.html">← Back to Summary</a>
    </nav>

    <header>
      <h1 id="contractTitle">Contract Name</h1>
    </header>

    <section id="filters" class="filters-container">
      <div class="filters-left">
        <input type="text" id="operatorFilter" onkeyup="filterMutants()" placeholder="Operator ID">
        <input type="text" id="functionFilter" onkeyup="filterMutants()" placeholder="Function name">
        <select id="statusFilter" onchange="filterMutants()">
          <option value="">All Statuses</option>
          <option value="killed">Killed</option>
          <option value="live">Live</option>
          <option value="stillborn">Stillborn</option>
          <option value="timedout">Timed Out</option>
          <option value="untested">Untested</option>
        </select>
      </div>
      <div class="filters-right">
        <button class="icon-button" onclick="downloadContractCSV()" title="Download Contract CSV">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="download-icon">
             <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
             <polyline points="7 10 12 15 17 10"></polyline>
             <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    </section>

    <section id="mutationDetails">
      <table id="mutationTable">
        <thead>
          <tr>
            <th>ID</th>
            <th>Operator</th>
            <th>Function</th>
            <th>LOC</th>
            <th>Mutant Diff</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

    <footer>
      <a href="index.html">← Back to Summary</a>
    </footer>
  </div>
  <script src="js/script.js"></script>
</body>
</html>`;
}

/**
 * Returns the main script as a string including all helper and loader functions.
 * @returns {string} - Combined string of function definitions and initialization logic.
 */
function getScriptFile() {

  /**
   * Determines a color code based on a mutation score.
   * @param {string} score - Mutation Score as a percentage string or "N/A".
   * @returns {string} - Hex color code representing score level.
   */
  function getScoreColor(score) {
    if (score === "N/A") return "";
    const numericScore = parseFloat(score);
    if (numericScore <= 50) return "#dc3545";
    else if (numericScore <= 69) return "#fd7e14";
    else if (numericScore <= 79) return "#ffc107";
    else return "#28a745";
  }

  /**
 * Loads and displays the mutation summary for all contracts.
 * Updates the summary table and overall mutation statistics.
 * @async
 * @returns {Promise<void>}
 */
  async function loadSummary() {
    try {
      const response = await fetch("mutations.json");
      const data = await response.json();
      const tableBody = document.querySelector("#summaryTable tbody");
      tableBody.innerHTML = "";

      let overallKilled = 0;
      let overallLive = 0;
      let totalMutantsCount = 0;
      let contractsCount = 0;

      Object.keys(data).forEach(contract => {
        contractsCount++;
        const mutants = data[contract];
        totalMutantsCount += mutants.length;
        const killed = mutants.filter(m => m.status === "killed").length;
        const live = mutants.filter(m => m.status === "live").length;
        const stillborn = mutants.filter(m => m.status === "stillborn").length;
        const timedout = mutants.filter(m => m.status === "timedout").length;
        const untested = mutants.filter(m => !m.status).length;

        overallKilled += killed;
        overallLive += live;

        const scoreBase = live + killed;
        const mutationScore = scoreBase > 0 ? ((killed / scoreBase) * 100).toFixed(1) : "N/A";
        const scoreColor = getScoreColor(mutationScore);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><a href="contract.html?contract=${contract}">${contract}</a></td>
            <td>${mutants.length}</td>
            <td>${killed}</td>
            <td>${live}</td>
            <td>${stillborn}</td>
            <td>${timedout}</td>
            <td>${untested}</td>
            <td><span style="color: ${scoreColor}">${mutationScore}%</span></td>
          `;
        tableBody.appendChild(row);
      });

      // Update overall mutation score.
      const overallScoreBase = overallLive + overallKilled;
      const overallScore = overallScoreBase > 0 ? ((overallKilled / overallScoreBase) * 100).toFixed(1) : "N/A";
      const scoreElem = document.getElementById("scoreValue");
      scoreElem.innerText = overallScore;

      // Set color for overall score.
      scoreElem.style.color = getScoreColor(overallScore);

      // Display additional summary information.
      document.getElementById("summaryInfo").innerText = `Total Contracts: ${contractsCount} | Total Mutants: ${totalMutantsCount}`;

      // Update generated date in footer.
      document.getElementById("generatedDate").innerText = new Date().toLocaleString();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }
  /**
   * Loads and displays mutation data for a specific contract.
   * Retrieves the contract name from the URL query parameter.
   * @async
   * @returns {Promise<void>}
   */
  async function loadContractData() {
    const urlParams = new URLSearchParams(window.location.search);
    const contract = urlParams.get("contract");
    document.getElementById("contractTitle").innerText = contract;

    try {
      const response = await fetch("mutations.json");
      const data = await response.json();
      const mutants = data[contract] || [];
      const tableBody = document.querySelector("#mutationTable tbody");
      tableBody.innerHTML = "";

      mutants.forEach((m, index) => {
        const row = document.createElement("tr");
        row.classList.add(`status-${m.status || "untested"}`);
        row.innerHTML = `
                  <td>${m.id}</td>
                  <td>${m.operator}</td>
                  <td><pre><code class="diff">${m.functionName}</code></pre></td>
                  <td>${m.startLine}-${m.endLine}</td>
                  <td><pre><code class="diff">${highlightDiff(m.diff)}</code></pre></td>
                  <td>${m.status || "untested"}</td>
                `;
        tableBody.appendChild(row);
      });

    } catch (error) {
      console.error("Error loading data:", error);
    }
  }
  /**
    * Filters mutation rows in the table based on user input in filters.
    * Applies filters to operator, function name, and mutation status.
    * @returns {void}
    */
  function filterMutants() {
    const operatorTextInput = document.getElementById("operatorFilter").value.toLowerCase();
    const functionTextInput = document.getElementById("functionFilter").value.toLowerCase();
    const statusFilter = document.getElementById("statusFilter").value.toLowerCase();
    const rows = document.querySelectorAll("#mutationTable tbody tr");

    rows.forEach(row => {
      // Using the Function column (index 1) and Status column (index 5)
      const operator = row.cells[1].textContent.toLowerCase();
      const funcName = row.cells[2].textContent.toLowerCase();
      const status = row.cells[5].textContent.toLowerCase();
      const matchesOperator = operator.includes(operatorTextInput);
      const matchesText = funcName.includes(functionTextInput);
      const matchesStatus = !statusFilter || status === statusFilter;

      row.style.display = (matchesText && matchesStatus && matchesOperator) ? "" : "none";
    });
  }


  /**
   * Generates and downloads a CSV summary of all contracts with mutation statistics.
   * @returns {void}
   */
  function downloadAllCSV() {
    fetch("mutations.json")
      .then(response => response.json())
      .then(data => {
        let csvContent = "Contract,Total Mutants,Killed,Live,Stillborn,Timed Out,Untested,Mutation Score\n";
        Object.keys(data).forEach(contract => {
          const mutants = data[contract];
          const total = mutants.length;
          const killed = mutants.filter(m => m.status === "killed").length;
          const live = mutants.filter(m => m.status === "live").length;
          const stillborn = mutants.filter(m => m.status === "stillborn").length;
          const timedout = mutants.filter(m => m.status === "timedout").length;
          const untested = mutants.filter(m => !m.status).length;
          const scoreBase = live + killed;
          const mutationScore = scoreBase > 0 ? ((killed / scoreBase) * 100).toFixed(1) : "N/A";
          csvContent += `"${contract}",${total},${killed},${live},${stillborn},${timedout},${untested},${mutationScore}\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "contracts_summary.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(error => console.error("Error generating CSV:", error));
  }

  /**
  * Generates and downloads a CSV with detailed mutation data for a specific contract.
  * Uses contract name from URL query string.
  * @returns {void}
  */
  function downloadContractCSV() {
    const urlParams = new URLSearchParams(window.location.search);
    const contract = urlParams.get("contract");
    if (!contract) {
      console.error("No contract specified");
      return;
    }
    fetch("mutations.json")
      .then(response => response.json())
      .then(data => {
        const mutants = data[contract] || [];

        // Helper function to escape CSV fields properly,
        // remove line breaks, and collapse multiple spaces into one.
        const escapeCSV = (field) => {
          if (field === null || field === undefined) {
            return '""';
          }
          let fieldStr = String(field);
          // Remove any newline characters (CR, LF, or CRLF)
          fieldStr = fieldStr.replace(/(\r\n|\n|\r)/g, " ");
          // Replace any sequence of whitespace with a single space
          fieldStr = fieldStr.replace(/\s+/g, " ");
          // Trim any leading or trailing whitespace
          fieldStr = fieldStr.trim();
          // Escape any double quotes by doubling them
          fieldStr = fieldStr.replace(/"/g, '""');
          return `"${fieldStr}"`;
        };

        // CSV header including all fields: id, file, functionName, start, end, startLine, endLine, original, replace, operator, status, testingTime
        let csvContent = "id,file,functionName,start,end,startLine,endLine,original,replace,operator,status,testingTime\n";

        mutants.forEach(m => {
          const row = [
            escapeCSV(m.id),
            escapeCSV(m.file),
            escapeCSV(m.functionName),
            escapeCSV(m.start),
            escapeCSV(m.end),
            escapeCSV(m.startLine),
            escapeCSV(m.endLine),
            escapeCSV(m.original),
            escapeCSV(m.replace),
            escapeCSV(m.operator),
            escapeCSV(m.status || "untested"),
            escapeCSV(m.testingTime)
          ];
          csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", contract + "_details.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(error => console.error("Error generating CSV for contract:", error));
  }

  /**
 * Highlights mutation diffs with HTML tags for added and removed lines.
 * @param {string} diffText - Mutation diff string with line prefixes.
 * @returns {string} - HTML-formatted string with diff highlights.
 */
  function highlightDiff(diffText) {
    return diffText
      .split('\n')
      .map(line => {
        // Collapse multiple whitespace characters into one
        const cleaned = line.replace(/\s+/g, ' ');

        if (cleaned.includes('+++|')) {
          return `<span class="diff-added">${escapeHtml(cleaned)}</span>`;
        } else if (cleaned.includes('---|')) {
          return `<span class="diff-removed">${escapeHtml(cleaned)}</span>`;
        } else {
          return `<span>${escapeHtml(cleaned)}</span>`;
        }
      })
      .join('\n');
  }
  /**
   * Escapes HTML characters to safely display in the browser.
   * @param {string} text - Text content to escape.
   * @returns {string} - HTML-escaped string.
   */
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Combine the stringified functions and initialization code.
  const scriptParts = [
    getScoreColor.toString(),
    loadSummary.toString(),
    loadContractData.toString(),
    filterMutants.toString(),
    downloadAllCSV.toString(),
    downloadContractCSV.toString(),
    highlightDiff.toString(),
    escapeHtml.toString(),
    "if (document.getElementById('summaryTable')) loadSummary();",
    "if (document.getElementById('contractTitle')) loadContractData();"
  ];

  return scriptParts.join("\n\n");
}

/**
 * Returns the .css file as a string.
 * @returns {string} - CSS file.
 */
function getStylesFile() {
  return `/* Base styles */
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #e9ecef;
  margin: 0;
  padding: 0;
}

/* Container styling */
.container {
  max-width: 1400px;
  margin: 40px auto;
  background: #fff;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

/* Header styling */
header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #dee2e6;
}

header h1 {
  font-size: 2.5em;
  color: #343a40;
  margin: 0;
}

header p {
  color: #6c757d;
  font-size: 1.2em;
  margin: 10px 0 20px;
}

/* Section header for tables */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

/* Icon button styling */
.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
}
.icon-button svg {
  width: 24px;
  height: 24px;
  transition: transform 0.2s;
}
.icon-button:hover svg {
  transform: scale(1.1);
}

/* Navigation styling */
nav {
  margin-bottom: 20px;
}

nav a {
  text-decoration: none;
  color: #007bff;
  font-weight: 500;
}

nav a:hover {
  text-decoration: underline;
}

/* Score card styling */
.score-card {
  background: #f1f3f5;
  border: 1px solid #ced4da;
  padding: 20px;
  margin: 0 auto 30px;
  border-radius: 8px;
  max-width: 500px;
  text-align: center;
}

/* Section headings */
section h2 {
  font-size: 1.8em;
  color: #495057;
  margin-bottom: 15px;
}

/* Table styling */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

th, td {
  padding: 15px;
  text-align: left;
}

th {
  background: #6c757d;
  color: #fff;
  font-weight: 500;
}

tbody tr {
  border-bottom: 1px solid #dee2e6;
}

tbody tr:nth-child(even) {
  background: #f8f9fa;
}

tbody tr:hover {
  background: #e9ecef;
}

/* Status styling */
/*.status-killed {
  color: #28a745;
}*/

.status-live {
  color: #860915;
}


.status-untested {
  color: #6c757d;
}

/* Filters container styling for contract page */
.filters-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.filters-left {
  display: flex;
  gap: 10px;
}
.filters-right {
  /* Right aligned */
}

/* Input filters styling */
#filters input, #filters select {
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
}

/* Footer styling */
footer {
  text-align: center;
  margin-top: 30px;
  font-size: 0.9em;
  color: #6c757d;
}
  
code.diff {
  font-family: 'Source Code Pro', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  display: block;
}

.diff-added {
  color: #b31d28;
  display: block;
}

.diff-removed {
  color: #000000;
  display: block;
}

td pre {
  margin: 0;
}
`;


}

module.exports = {
  generateReport: generateReport
};
