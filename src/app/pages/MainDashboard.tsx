import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { StatusBadge } from '../components/StatusBadge';
import { RiskHeatmapDialog } from '../components/RiskHeatmapDialog';
import { ExportDialog } from '../components/ExportDialog';
import { AuditReportGenerator } from '../components/AuditReportGenerator';
import { CatchUpNotification } from '../components/CatchUpNotification';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Shield,
  AlertTriangle,
  FileText,
  Bell,
  Maximize2,
  Download,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { dashboardMetrics, controls, risks, alerts } from '../data/mockData';
import { useState, useCallback } from 'react';
import { Button } from '../components/ui/button';

export function MainDashboard() {
  const compliancePercentage = (dashboardMetrics.completedControls / dashboardMetrics.totalControls) * 100;
  const [heatmapDialogOpen, setHeatmapDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [aiReportDialogOpen, setAiReportDialogOpen] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(true);

  const handleOpenHeatmap = useCallback(() => {
    setHeatmapDialogOpen(true);
  }, []);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Risk & Control Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of compliance status and risk management</p>
        </div>
        <div className="flex gap-2">
          <CatchUpNotification />
          <Button 
            variant="outline" 
            onClick={() => setExportDialogOpen(true)}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export for Auditor</span>
          </Button>
          <Button 
            onClick={() => setAiReportDialogOpen(true)}
            className="gap-2 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Generate AI Report</span>
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.filter(a => a.type === 'error' || a.type === 'warning').length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900">Action Required</h3>
              {alertsVisible && (
                <div className="mt-2 space-y-1">
                  {alerts.filter(a => a.type === 'error').map(alert => (
                    <p key={alert.id} className="text-sm text-red-700">• {alert.message}</p>
                  ))}
                  {alerts.filter(a => a.type === 'warning').slice(0, 2).map(alert => (
                    <p key={alert.id} className="text-sm text-red-600">• {alert.message}</p>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlertsVisible(!alertsVisible)}
              className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 w-8 p-0 flex-shrink-0"
              title={alertsVisible ? "Collapse alerts" : "Expand alerts"}
            >
              {alertsVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Compliance Score</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {dashboardMetrics.complianceScore}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <Progress value={dashboardMetrics.complianceScore} className="mt-4 h-2" />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Controls</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {dashboardMetrics.totalControls}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {dashboardMetrics.completedControls} completed
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">High Risks</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {dashboardMetrics.highRisks}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {dashboardMetrics.totalRisks} total risks
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overdue Items</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {dashboardMetrics.overdueControls}
              </p>
              <p className="text-xs text-red-600 mt-1">Needs attention</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Control Status Overview */}
        <Card className="col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">Control Status Overview</h2>
            <Badge variant="outline" className="text-xs">
              {compliancePercentage.toFixed(0)}% Complete
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Completed</span>
                  <span className="text-sm text-gray-900 font-semibold">
                    {dashboardMetrics.completedControls}
                  </span>
                </div>
                <Progress value={(dashboardMetrics.completedControls / dashboardMetrics.totalControls) * 100} className="h-2 bg-gray-100" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Pending</span>
                  <span className="text-sm text-gray-900 font-semibold">
                    {dashboardMetrics.pendingControls}
                  </span>
                </div>
                <Progress value={(dashboardMetrics.pendingControls / dashboardMetrics.totalControls) * 100} className="h-2 bg-gray-100" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overdue</span>
                  <span className="text-sm text-gray-900 font-semibold">
                    {dashboardMetrics.overdueControls}
                  </span>
                </div>
                <Progress value={(dashboardMetrics.overdueControls / dashboardMetrics.totalControls) * 100} className="h-2 bg-gray-100" />
              </div>
            </div>
          </div>
        </Card>

        {/* Risk Heatmap */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Risk Heatmap</h2>
          
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs text-center">
              <div></div>
              <div className="font-medium text-gray-600">Low</div>
              <div className="font-medium text-gray-600">Med</div>
              <div className="font-medium text-gray-600">High</div>
            </div>
            
            {/* High Likelihood */}
            <div className="grid grid-cols-4 gap-2 items-center">
              <div className="text-xs font-medium text-gray-600">High</div>
              <div className="h-12 bg-yellow-200 rounded flex items-center justify-center text-sm font-semibold">
                {risks.filter(r => r.likelihood === 'High' && r.impact === 'Low').length}
              </div>
              <div className="h-12 bg-orange-300 rounded flex items-center justify-center text-sm font-semibold">
                {risks.filter(r => r.likelihood === 'High' && r.impact === 'Medium').length}
              </div>
              <div className="h-12 bg-red-400 rounded flex items-center justify-center text-sm font-semibold text-white">
                {risks.filter(r => r.likelihood === 'High' && r.impact === 'High').length}
              </div>
            </div>

            {/* Medium Likelihood */}
            <div className="grid grid-cols-4 gap-2 items-center">
              <div className="text-xs font-medium text-gray-600">Med</div>
              <div className="h-12 bg-green-200 rounded flex items-center justify-center text-sm font-semibold">
                {risks.filter(r => r.likelihood === 'Medium' && r.impact === 'Low').length}
              </div>
              <div className="h-12 bg-yellow-300 rounded flex items-center justify-center text-sm font-semibold">
                {risks.filter(r => r.likelihood === 'Medium' && r.impact === 'Medium').length}
              </div>
              <div className="h-12 bg-orange-400 rounded flex items-center justify-center text-sm font-semibold">
                {risks.filter(r => r.likelihood === 'Medium' && r.impact === 'High').length}
              </div>
            </div>

            {/* Low Likelihood */}
            <div className="grid grid-cols-4 gap-2 items-center">
              <div className="text-xs font-medium text-gray-600">Low</div>
              <div className="h-12 bg-green-300 rounded flex items-center justify-center text-sm font-semibold">
                {risks.filter(r => r.likelihood === 'Low' && r.impact === 'Low').length}
              </div>
              <div className="h-12 bg-green-200 rounded flex items-center justify-center text-sm font-semibold">
                {risks.filter(r => r.likelihood === 'Low' && r.impact === 'Medium').length}
              </div>
              <div className="h-12 bg-yellow-300 rounded flex items-center justify-center text-sm font-semibold">
                {risks.filter(r => r.likelihood === 'Low' && r.impact === 'High').length}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 text-center">Impact →</p>
          </div>

          <div className="mt-4">
            <button
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              onClick={handleOpenHeatmap}
            >
              <Maximize2 className="w-4 h-4" />
              Expand
            </button>
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Controls */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Controls</h2>
            <a href="/controls" className="text-sm text-blue-600 hover:text-blue-700">View all</a>
          </div>

          <div className="space-y-3">
            {controls.slice(0, 5).map(control => (
              <div key={control.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{control.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {control.owner} • Next: {control.nextDue}
                  </p>
                </div>
                <StatusBadge status={control.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Active Issues */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Active Compliance Issues</h2>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {alerts.filter(a => a.type === 'error').length}
            </Badge>
          </div>

          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  alert.type === 'error' ? 'bg-red-500' :
                  alert.type === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{alert.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Risk Heatmap Dialog */}
      <RiskHeatmapDialog
        open={heatmapDialogOpen}
        onOpenChange={setHeatmapDialogOpen}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      {/* AI Report Dialog */}
      <AuditReportGenerator
        open={aiReportDialogOpen}
        onOpenChange={setAiReportDialogOpen}
      />
    </div>
  );
}