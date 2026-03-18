import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import {
  FileText,
  Sparkles,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Shield,
  TrendingUp,
  Clock,
  Loader2
} from 'lucide-react';
import { controls, risks, dashboardMetrics } from '../data/mockData';

interface AuditReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditReportGenerator({ open, onOpenChange }: AuditReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate AI generation process
    const steps = [
      { progress: 20, delay: 500 },
      { progress: 40, delay: 800 },
      { progress: 60, delay: 700 },
      { progress: 80, delay: 600 },
      { progress: 100, delay: 500 }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      setGenerationProgress(step.progress);
    }

    // Generate the report content
    const report = generateReportContent();
    setGeneratedReport(report);
    setReportGenerated(true);
    setIsGenerating(false);
  };

  const generateReportContent = () => {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const completedControls = controls.filter(c => c.status === 'Completed').length;
    const pendingControls = controls.filter(c => c.status === 'Pending').length;
    const overdueControls = controls.filter(c => c.status === 'Overdue').length;
    
    const highRisks = risks.filter(r => r.riskScore >= 7).length;
    const mediumRisks = risks.filter(r => r.riskScore >= 4 && r.riskScore < 7).length;
    const lowRisks = risks.filter(r => r.riskScore < 4).length;

    return `ISAE 3402 TYPE II AUDIT REPORT
COMPLIANCE & RISK MANAGEMENT ASSESSMENT

Generated: ${currentDate}
Report Period: January 1, 2026 - March 15, 2026

════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY

This report provides a comprehensive assessment of the organization's internal controls and risk management framework in preparation for ISAE 3402 Type II certification. The evaluation demonstrates the organization's commitment to maintaining robust controls and managing risks effectively.

Overall Compliance Score: ${dashboardMetrics.complianceScore}%
Assessment Status: ${dashboardMetrics.complianceScore >= 85 ? 'Ready for Certification' : dashboardMetrics.complianceScore >= 70 ? 'Requires Minor Improvements' : 'Requires Significant Improvements'}

════════════════════════════════════════════════════════════

1. CONTROL ENVIRONMENT ASSESSMENT

Total Controls Evaluated: ${dashboardMetrics.totalControls}
├─ Completed: ${completedControls} (${Math.round((completedControls / dashboardMetrics.totalControls) * 100)}%)
├─ Pending: ${pendingControls} (${Math.round((pendingControls / dashboardMetrics.totalControls) * 100)}%)
└─ Overdue: ${overdueControls} (${Math.round((overdueControls / dashboardMetrics.totalControls) * 100)}%)

Control Categories:
${Array.from(new Set(controls.map(c => c.category))).map(category => {
  const categoryControls = controls.filter(c => c.category === category);
  const categoryCompleted = categoryControls.filter(c => c.status === 'Completed').length;
  return `• ${category}: ${categoryCompleted}/${categoryControls.length} completed (${Math.round((categoryCompleted / categoryControls.length) * 100)}%)`;
}).join('\n')}

Key Observations:
• Four-eye principle (dual control) implemented for critical controls
• Evidence documentation maintained for ${controls.filter(c => c.evidence.length > 0).length} controls
• Control ownership clearly defined with designated responsible parties
• Regular execution schedules established for all recurring controls

════════════════════════════════════════════════════════════

2. RISK MANAGEMENT FRAMEWORK

Total Risks Identified: ${dashboardMetrics.totalRisks}
├─ High Risk (Score ≥7): ${highRisks} risks
├─ Medium Risk (Score 4-6): ${mediumRisks} risks
└─ Low Risk (Score <4): ${lowRisks} risks

Risk Distribution by Category:
${Array.from(new Set(risks.map(r => r.category))).map(category => {
  const categoryRisks = risks.filter(r => r.category === category);
  return `• ${category}: ${categoryRisks.length} risks identified`;
}).join('\n')}

Critical Risks Requiring Immediate Attention:
${risks.filter(r => r.riskScore >= 7).slice(0, 5).map((risk, idx) => 
  `${idx + 1}. ${risk.title} (Risk Score: ${risk.riskScore})
   - Impact: ${risk.impact} | Likelihood: ${risk.likelihood}
   - Status: ${risk.status}
   - Mitigation: ${risk.relatedControls.length} control(s) implemented`
).join('\n\n')}

════════════════════════════════════════════════════════════

3. ISO 27001 CONTROL IMPLEMENTATION

The organization has implemented controls aligned with ISO 27001:2022 standards:

Information Security Policies:
• Documented policies for information security management
• Regular policy reviews and updates conducted
• Employee awareness and training programs established

Access Control:
• User access management procedures implemented
• Privileged access controls and monitoring in place
• Regular access reviews conducted quarterly

Operational Security:
• Change management procedures documented and followed
• System hardening and vulnerability management processes
• Incident response and escalation procedures defined

Compliance:
• Regular compliance assessments conducted
• Gap analysis performed against ISAE 3402 requirements
• Continuous monitoring and improvement processes established

════════════════════════════════════════════════════════════

4. TESTING RESULTS & EVIDENCE

Control Testing Summary:
• ${controls.filter(c => c.evidence.length > 0).length} controls have documented evidence
• Evidence retained for audit trail and compliance verification
• Sample testing performed on critical controls
• No significant deficiencies identified during testing period

Evidence Types Collected:
• System logs and access reports
• Policy documents and procedures
• Training records and acknowledgments
• Exception reports and incident documentation
• Review and approval records

════════════════════════════════════════════════════════════

5. RECOMMENDATIONS

Based on the assessment, the following recommendations are provided:

Priority 1 - Immediate Action:
• Address ${overdueControls} overdue control(s) to maintain compliance posture
• Complete remediation for ${highRisks} high-risk items
• Ensure evidence collection for all critical controls

Priority 2 - Short-term (30-60 days):
• Enhance automation for control execution and monitoring
• Implement additional segregation of duties controls
• Strengthen documentation for complex technical controls

Priority 3 - Long-term (60-90 days):
• Develop continuous compliance monitoring dashboard
• Establish metrics for control effectiveness
• Conduct regular control self-assessments

════════════════════════════════════════════════════════════

6. CERTIFICATION READINESS ASSESSMENT

ISAE 3402 Type II Readiness: ${dashboardMetrics.complianceScore >= 85 ? 'HIGH' : dashboardMetrics.complianceScore >= 70 ? 'MEDIUM' : 'LOW'}

Control Design Effectiveness: ${dashboardMetrics.complianceScore >= 80 ? 'Satisfactory' : 'Needs Improvement'}
Operating Effectiveness: ${dashboardMetrics.complianceScore >= 75 ? 'Satisfactory' : 'Needs Improvement'}
Documentation Quality: ${controls.filter(c => c.evidence.length > 0).length >= controls.length * 0.8 ? 'Satisfactory' : 'Needs Improvement'}

${customInstructions ? `\nADDITIONAL CONSIDERATIONS:\n${customInstructions}\n` : ''}
════════════════════════════════════════════════════════════

7. CONCLUSION

The organization has demonstrated a strong commitment to internal controls and risk management. The control framework is well-designed and operating effectively, with ${dashboardMetrics.complianceScore}% overall compliance.

${dashboardMetrics.complianceScore >= 85 
  ? 'The organization is well-positioned for ISAE 3402 Type II certification. With continued maintenance of current controls and timely remediation of identified gaps, successful certification is highly achievable.'
  : dashboardMetrics.complianceScore >= 70
  ? 'The organization has established a solid foundation for ISAE 3402 compliance. Addressing the identified gaps and completing pending controls will position the organization for successful certification.'
  : 'The organization should focus on completing pending controls and addressing high-risk items before proceeding with formal certification. A follow-up assessment is recommended in 60 days.'}

════════════════════════════════════════════════════════════

This report was generated using AI analysis of current control and risk data.
For official audit purposes, please engage a certified ISAE 3402 auditor.

Report Generated: ${currentDate}
Version: 1.0
Confidentiality: Internal Use Only`;
  };

  const handleDownloadReport = () => {
    const blob = new Blob([generatedReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISAE3402_Audit_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setReportGenerated(false);
    setGenerationProgress(0);
    setGeneratedReport('');
    setCustomInstructions('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle>AI-Powered Audit Report Generator</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Generate comprehensive ISAE 3402 compliance reports for auditors
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Report Stats */}
          {!isGenerating && !reportGenerated && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">Controls</span>
                  </div>
                  <p className="text-2xl font-semibold text-blue-900">{dashboardMetrics.totalControls}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {dashboardMetrics.completedControls} completed
                  </p>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-orange-600 font-medium">Risks</span>
                  </div>
                  <p className="text-2xl font-semibold text-orange-900">{dashboardMetrics.totalRisks}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    {dashboardMetrics.highRisks} high priority
                  </p>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Compliance</span>
                  </div>
                  <p className="text-2xl font-semibold text-green-900">{dashboardMetrics.complianceScore}%</p>
                  <p className="text-xs text-green-600 mt-1">overall score</p>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-purple-600 font-medium">Period</span>
                  </div>
                  <p className="text-sm font-semibold text-purple-900">Q1 2026</p>
                  <p className="text-xs text-purple-600 mt-1">Jan - Mar</p>
                </div>
              </div>

              {/* Custom Instructions */}
              <div>
                <Label htmlFor="instructions" className="text-sm font-medium text-gray-700 mb-2">
                  Additional Instructions (Optional)
                </Label>
                <Textarea
                  id="instructions"
                  placeholder="Enter any specific focus areas, concerns, or additional context for the AI to include in the report..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="mt-2 min-h-[100px]"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Example: "Focus on cloud security controls" or "Include detailed analysis of access management"
                </p>
              </div>

              {/* Report Sections Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Report Sections</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Executive Summary',
                    'Control Environment Assessment',
                    'Risk Management Framework',
                    'ISO 27001 Control Implementation',
                    'Testing Results & Evidence',
                    'Recommendations',
                    'Certification Readiness',
                    'Conclusion & Next Steps'
                  ].map((section, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      {section}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Generating State */}
          {isGenerating && (
            <div className="py-12">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Your Report</h3>
                <p className="text-sm text-gray-500">
                  Analyzing controls, risks, and compliance data...
                </p>
              </div>
              <div className="max-w-md mx-auto">
                <Progress value={generationProgress} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progress</span>
                  <span>{generationProgress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Generated Report */}
          {reportGenerated && (
            <>
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Report Generated Successfully</p>
                    <p className="text-xs text-green-600">Ready for review and download</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white text-green-700 border-green-300">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Report Preview</span>
                  <Badge variant="outline" className="text-xs">
                    {generatedReport.split('\n').length} lines
                  </Badge>
                </div>
                <div className="bg-white p-4 max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                    {generatedReport}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center border-t pt-4">
            <div>
              {reportGenerated && (
                <Button variant="outline" onClick={handleReset}>
                  Generate New Report
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {!reportGenerated && !isGenerating && (
                <Button onClick={handleGenerateReport} className="bg-gradient-to-r from-purple-500 to-blue-600">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              )}
              {reportGenerated && (
                <Button onClick={handleDownloadReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> This AI-generated report is for preliminary assessment purposes. 
              For official ISAE 3402 certification, please engage a qualified third-party auditor.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}