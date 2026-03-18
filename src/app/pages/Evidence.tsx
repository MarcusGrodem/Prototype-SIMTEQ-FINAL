import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Search,
  Upload,
  Download,
  FileText,
  Link as LinkIcon,
  MoreVertical,
  FileCheck
} from 'lucide-react';
import { documents } from '../data/mockData';
import { useState } from 'react';

export function Evidence() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Evidence & Documentation</h1>
          <p className="text-sm text-gray-500 mt-1">Manage compliance documentation and evidence</p>
        </div>
        <Button size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Documents</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{documents.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Linked to Controls</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {documents.filter(d => d.linkedTo.some(l => l.type === 'control')).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Linked to Risks</p>
          <p className="text-2xl font-semibold text-orange-600 mt-1">
            {documents.filter(d => d.linkedTo.some(l => l.type === 'risk')).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Storage</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">13.7 MB</p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Upload Area */}
      <Card className="p-8 border-2 border-dashed border-gray-300 bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="mt-4 font-medium text-gray-900">Upload evidence documents</h3>
          <p className="text-sm text-gray-500 mt-1">
            Drag and drop files here, or click to browse
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            Select Files
          </Button>
        </div>
      </Card>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredDocuments.map((doc) => (
          <Card key={doc.id} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">
                        Uploaded by {doc.uploadedBy}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{doc.uploadDate}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{doc.size}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      v{doc.version}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Linked Items */}
                {doc.linkedTo.length > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
                    <div className="flex flex-wrap gap-2">
                      {doc.linkedTo.map((link, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className={`text-xs ${
                            link.type === 'control' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}
                        >
                          {link.type === 'control' ? 'Control' : 'Risk'}: {link.id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    <LinkIcon className="w-3.5 h-3.5 mr-2" />
                    Link to Control/Risk
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileCheck className="w-3.5 h-3.5 mr-2" />
                    View History
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No documents found matching your search.</p>
        </div>
      )}

      {/* Document Types Legend */}
      <Card className="p-5 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Document Management Tips</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Link documents to relevant controls and risks for complete audit trails</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Version control is automatically maintained for all uploaded documents</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>All evidence is encrypted and stored securely for ISAE 3402 compliance</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
