import { controls, risks, dashboardMetrics, alerts } from '../data/mockData';

export type ExportFormat = 'csv' | 'json' | 'pdf';
export type ExportType = 'controls' | 'risks' | 'full' | 'compliance';

export function exportData(type: ExportType, format: ExportFormat) {
  switch (format) {
    case 'csv':
      exportAsCSV(type);
      break;
    case 'json':
      exportAsJSON(type);
      break;
    case 'pdf':
      exportAsPDF(type);
      break;
  }
}

function exportAsCSV(type: ExportType) {
  let csvContent = '';
  let filename = '';

  switch (type) {
    case 'controls':
      csvContent = generateControlsCSV();
      filename = `Controls_Export_${getCurrentDate()}.csv`;
      break;
    case 'risks':
      csvContent = generateRisksCSV();
      filename = `Risks_Export_${getCurrentDate()}.csv`;
      break;
    case 'full':
      csvContent = generateFullExportCSV();
      filename = `Full_Audit_Export_${getCurrentDate()}.csv`;
      break;
    case 'compliance':
      csvContent = generateComplianceCSV();
      filename = `Compliance_Summary_${getCurrentDate()}.csv`;
      break;
  }

  downloadFile(csvContent, filename, 'text/csv');
}

function exportAsJSON(type: ExportType) {
  let jsonData: any = {};
  let filename = '';

  const exportMetadata = {
    exportDate: new Date().toISOString(),
    exportType: type,
    generatedBy: 'Risk & Control Dashboard',
    version: '1.0'
  };

  switch (type) {
    case 'controls':
      jsonData = {
        ...exportMetadata,
        controls: controls.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
          status: c.status,
          frequency: c.frequency,
          owner: c.owner,
          lastExecution: c.lastExecution,
          nextDue: c.nextDue,
          evidenceCount: c.evidence.length,
          evidence: c.evidence
        }))
      };
      filename = `Controls_Export_${getCurrentDate()}.json`;
      break;

    case 'risks':
      jsonData = {
        ...exportMetadata,
        risks: risks.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          category: r.category,
          likelihood: r.likelihood,
          impact: r.impact,
          riskScore: r.riskScore,
          status: r.status,
          owner: r.owner,
          lastReview: r.lastReview,
          relatedControls: r.relatedControls
        }))
      };
      filename = `Risks_Export_${getCurrentDate()}.json`;
      break;

    case 'full':
      jsonData = {
        ...exportMetadata,
        dashboardMetrics,
        controls,
        risks,
        alerts,
        summary: {
          totalControls: controls.length,
          completedControls: controls.filter(c => c.status === 'Completed').length,
          pendingControls: controls.filter(c => c.status === 'Pending').length,
          overdueControls: controls.filter(c => c.status === 'Overdue').length,
          totalRisks: risks.length,
          highRisks: risks.filter(r => r.riskScore >= 7).length,
          mediumRisks: risks.filter(r => r.riskScore >= 4 && r.riskScore < 7).length,
          lowRisks: risks.filter(r => r.riskScore < 4).length,
          complianceScore: dashboardMetrics.complianceScore
        }
      };
      filename = `Full_Audit_Export_${getCurrentDate()}.json`;
      break;

    case 'compliance':
      jsonData = {
        ...exportMetadata,
        complianceScore: dashboardMetrics.complianceScore,
        metrics: dashboardMetrics,
        controlSummary: {
          total: controls.length,
          byStatus: {
            completed: controls.filter(c => c.status === 'Completed').length,
            pending: controls.filter(c => c.status === 'Pending').length,
            overdue: controls.filter(c => c.status === 'Overdue').length
          },
          byCategory: getControlsByCategory()
        },
        riskSummary: {
          total: risks.length,
          byLevel: {
            high: risks.filter(r => r.riskScore >= 7).length,
            medium: risks.filter(r => r.riskScore >= 4 && r.riskScore < 7).length,
            low: risks.filter(r => r.riskScore < 4).length
          },
          byCategory: getRisksByCategory()
        }
      };
      filename = `Compliance_Summary_${getCurrentDate()}.json`;
      break;
  }

  const jsonString = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonString, filename, 'application/json');
}

function exportAsPDF(type: ExportType) {
  // For PDF export, we'll create a formatted text document that can be printed as PDF
  let content = '';
  let filename = '';

  const header = `RISK & CONTROL DASHBOARD - AUDIT EXPORT
Generated: ${new Date().toLocaleString('en-US')}
Export Type: ${type.toUpperCase()}

═══════════════════════════════════════════════════════════════

`;

  switch (type) {
    case 'controls':
      content = header + generateControlsPDFContent();
      filename = `Controls_Export_${getCurrentDate()}.txt`;
      break;
    case 'risks':
      content = header + generateRisksPDFContent();
      filename = `Risks_Export_${getCurrentDate()}.txt`;
      break;
    case 'full':
      content = header + generateFullExportPDFContent();
      filename = `Full_Audit_Export_${getCurrentDate()}.txt`;
      break;
    case 'compliance':
      content = header + generateCompliancePDFContent();
      filename = `Compliance_Summary_${getCurrentDate()}.txt`;
      break;
  }

  downloadFile(content, filename, 'text/plain');
}

// CSV Generation Functions
function generateControlsCSV(): string {
  const headers = ['Control ID', 'Title', 'Category', 'Status', 'Frequency', 'Owner', 'Last Execution', 'Next Due', 'Evidence Count'];
  const rows = controls.map(c => [
    c.id,
    `"${c.title}"`,
    c.category,
    c.status,
    c.frequency,
    c.owner,
    c.lastExecution,
    c.nextDue,
    c.evidence.length.toString()
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateRisksCSV(): string {
  const headers = ['Risk ID', 'Title', 'Category', 'Likelihood', 'Impact', 'Risk Score', 'Status', 'Owner', 'Last Review', 'Related Controls'];
  const rows = risks.map(r => [
    r.id,
    `"${r.title}"`,
    r.category,
    r.likelihood,
    r.impact,
    r.riskScore.toString(),
    r.status,
    r.owner,
    r.lastReview,
    r.relatedControls.join('; ')
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateFullExportCSV(): string {
  return `DASHBOARD METRICS\n${generateComplianceCSV()}\n\nCONTROLS\n${generateControlsCSV()}\n\nRISKS\n${generateRisksCSV()}`;
}

function generateComplianceCSV(): string {
  const metrics = [
    ['Metric', 'Value'],
    ['Compliance Score', `${dashboardMetrics.complianceScore}%`],
    ['Total Controls', dashboardMetrics.totalControls.toString()],
    ['Completed Controls', dashboardMetrics.completedControls.toString()],
    ['Pending Controls', dashboardMetrics.pendingControls.toString()],
    ['Overdue Controls', dashboardMetrics.overdueControls.toString()],
    ['Total Risks', dashboardMetrics.totalRisks.toString()],
    ['High Risks', dashboardMetrics.highRisks.toString()],
    ['Open Findings', dashboardMetrics.openFindings.toString()]
  ];

  return metrics.map(m => m.join(',')).join('\n');
}

// PDF Content Generation Functions
function generateControlsPDFContent(): string {
  let content = 'CONTROLS INVENTORY\n\n';
  
  const grouped = groupBy(controls, 'category');
  
  Object.entries(grouped).forEach(([category, categoryControls]) => {
    content += `\n${category}\n${'─'.repeat(60)}\n\n`;
    
    categoryControls.forEach((control: any) => {
      content += `Control ID: ${control.id}\n`;
      content += `Title: ${control.title}\n`;
      content += `Status: ${control.status}\n`;
      content += `Frequency: ${control.frequency}\n`;
      content += `Owner: ${control.owner}\n`;
      content += `Last Execution: ${control.lastExecution}\n`;
      content += `Next Due: ${control.nextDue}\n`;
      content += `Evidence: ${control.evidence.length} document(s)\n`;
      content += `\n`;
    });
  });

  return content;
}

function generateRisksPDFContent(): string {
  let content = 'RISK REGISTER\n\n';
  
  const grouped = groupBy(risks, 'category');
  
  Object.entries(grouped).forEach(([category, categoryRisks]) => {
    content += `\n${category}\n${'─'.repeat(60)}\n\n`;
    
    categoryRisks.forEach((risk: any) => {
      content += `Risk ID: ${risk.id}\n`;
      content += `Title: ${risk.title}\n`;
      content += `Description: ${risk.description}\n`;
      content += `Risk Score: ${risk.riskScore} (${risk.likelihood} likelihood, ${risk.impact} impact)\n`;
      content += `Status: ${risk.status}\n`;
      content += `Owner: ${risk.owner}\n`;
      content += `Last Review: ${risk.lastReview}\n`;
      content += `Related Controls: ${risk.relatedControls.join(', ')}\n`;
      content += `\n`;
    });
  });

  return content;
}

function generateFullExportPDFContent(): string {
  return `EXECUTIVE SUMMARY
  
Compliance Score: ${dashboardMetrics.complianceScore}%
Total Controls: ${dashboardMetrics.totalControls}
Completed: ${dashboardMetrics.completedControls}
Pending: ${dashboardMetrics.pendingControls}
Overdue: ${dashboardMetrics.overdueControls}

Total Risks: ${dashboardMetrics.totalRisks}
High Risks: ${dashboardMetrics.highRisks}

═══════════════════════════════════════════════════════════════

${generateControlsPDFContent()}

═══════════════════════════════════════════════════════════════

${generateRisksPDFContent()}`;
}

function generateCompliancePDFContent(): string {
  return `COMPLIANCE SUMMARY REPORT

Overall Compliance Score: ${dashboardMetrics.complianceScore}%

CONTROL STATUS
──────────────────────────────────────────────────────────────
Total Controls: ${dashboardMetrics.totalControls}
  ✓ Completed: ${dashboardMetrics.completedControls} (${Math.round((dashboardMetrics.completedControls / dashboardMetrics.totalControls) * 100)}%)
  ⧗ Pending: ${dashboardMetrics.pendingControls} (${Math.round((dashboardMetrics.pendingControls / dashboardMetrics.totalControls) * 100)}%)
  ✗ Overdue: ${dashboardMetrics.overdueControls} (${Math.round((dashboardMetrics.overdueControls / dashboardMetrics.totalControls) * 100)}%)

RISK STATUS
──────────────────────────────────────────────────────────────
Total Risks: ${dashboardMetrics.totalRisks}
  ⚠ High Risks: ${dashboardMetrics.highRisks}
  
FINDINGS
──────────────────────────────────────────────────────────────
Open Findings: ${dashboardMetrics.openFindings}

CONTROL BREAKDOWN BY CATEGORY
──────────────────────────────────────────────────────────────
${Object.entries(getControlsByCategory()).map(([category, count]) => 
  `${category}: ${count} control(s)`
).join('\n')}

RISK BREAKDOWN BY CATEGORY
──────────────────────────────────────────────────────────────
${Object.entries(getRisksByCategory()).map(([category, count]) => 
  `${category}: ${count} risk(s)`
).join('\n')}`;
}

// Helper Functions
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function groupBy(array: any[], key: string): Record<string, any[]> {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

function getControlsByCategory(): Record<string, number> {
  const grouped = groupBy(controls, 'category');
  return Object.fromEntries(
    Object.entries(grouped).map(([category, items]) => [category, items.length])
  );
}

function getRisksByCategory(): Record<string, number> {
  const grouped = groupBy(risks, 'category');
  return Object.fromEntries(
    Object.entries(grouped).map(([category, items]) => [category, items.length])
  );
}
