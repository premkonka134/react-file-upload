import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, File, Calendar, User, FileText, Hash, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { Document } from '../types';
import { fileService } from '../services/fileService';
export const FileDetailsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const document = location.state?.document as Document;
  console.log('Document Details:', document);
  const [loading, setLoading] = useState(true);
  type FileData = {
    status: string;
    id: string;
    fileName: string;
    documentType: string;
    created: string;
    finished: string;
    clientId: string;
    languageCodes: string[];
    pageCount: number;
    schemaId: string;
    schemaVersion: string;
    schemaName: string;
    width: number;
    height: number;
    country: string;
    bocrVersion: string;
    doxVersion: string;
    fileType: string;
    enrichment: {
      sender: any[];
      employee: any[];
    };
    dataForRetrainingStatus: string;
    extraction?: {
      headerFields?: ExtractionHeaderField[];
      lineItems?: ExtractionLineItem[][];
    };
  };

  type ExtractionHeaderField = {
    name: string;
    category: string;
    value: string | number;
    rawValue: string;
    type: "string" | "number" | "date";
    page: number;
    confidence: number;
    coordinates: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    model: string;
    label: string;
    description: string;
    group?: number;
  };

  type ExtractionLineItem = {
    name: string;
    category: string;
    value: string | number;
    rawValue: string;
    type: "string" | "number" | "date";
    page: number;
    confidence: number;
    coordinates: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    model: string;
    label: string;
    description: string;
  };
  const [fileDetails, setFileDetails] = useState<FileData | null>(null);
  const [expandedLineItems, setExpandedLineItems] = useState<Set<number>>(new Set());
  const fetchFileData = async (document: Document) => {
    try {
      const fileData = await fileService.getFileData(document.id);
      console.log('Fetched File Data:', fileData);
      // You can set the file data to state if needed 
      setFileDetails(fileData.data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchFileData(document);
  }, [document]);
  // Mock PDF details data
  const pdfDetails = {
    title: document?.name || 'Sample Document.pdf',
    author: 'John Doe',
    subject: 'Financial Report Q4 2024',
    keywords: 'finance, quarterly, report, revenue, analysis',
    creator: 'Microsoft Word',
    producer: 'Adobe PDF Library 15.0',
    creationDate: '2024-01-15T10:30:00Z',
    modificationDate: '2024-01-16T14:22:00Z',
    pages: 24,
    fileSize: document?.size || 2048576,
    version: '1.7',
    encrypted: false,
    permissions: {
      printing: true,
      copying: true,
      documentAssembly: true,
      contentAccessibility: true,
      commenting: true,
      formFilling: true,
      signing: true,
      templatePage: false
    },
    metadata: {
      language: 'en-US',
      tagged: true,
      linearized: false,
      webOptimized: true
    },
    fonts: [
      { name: 'Arial', type: 'TrueType', embedded: true },
      { name: 'Times New Roman', type: 'TrueType', embedded: true },
      { name: 'Calibri', type: 'TrueType', embedded: false }
    ],
    images: [
      { name: 'Chart1.png', width: 800, height: 600, colorSpace: 'RGB', bitsPerComponent: 8 },
      { name: 'Logo.jpg', width: 200, height: 100, colorSpace: 'RGB', bitsPerComponent: 8 },
      { name: 'Graph2.png', width: 600, height: 400, colorSpace: 'RGB', bitsPerComponent: 8 }
    ]
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleLineItemExpanded = (index: number) => {
    const newExpanded = new Set(expandedLineItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLineItems(newExpanded);
  };

  const groupLineItemsByIndex = () => {
    const grouped: { [key: number]: ExtractionLineItem[] } = {};
    fileDetails?.extraction?.lineItems?.forEach((lineItems, idx) => {
      grouped[idx] = lineItems;
    });
    return grouped;
  };

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Not Found</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <div className="flex items-center space-x-3">
                <File size={24} className="text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900 truncate">
                  {document.name}
                </h1>
              </div>
            </div>
            <button
              onClick={() => window.open(document.downloadUrl, '_blank')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye size={16} />
              <span>View Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Title</label>
                    <p className="mt-1 text-sm text-gray-900">{pdfDetails.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Author</label>
                    <p className="mt-1 text-sm text-gray-900">{pdfDetails.author}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Subject</label>
                    <p className="mt-1 text-sm text-gray-900">{pdfDetails.subject}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Keywords</label>
                    <p className="mt-1 text-sm text-gray-900">{pdfDetails.keywords}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Creator</label>
                    <p className="mt-1 text-sm text-gray-900">{pdfDetails.creator}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Producer</label>
                    <p className="mt-1 text-sm text-gray-900">{pdfDetails.producer}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">PDF Version</label>
                    <p className="mt-1 text-sm text-gray-900">{pdfDetails.version}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Pages</label>
                    <p className="mt-1 text-sm text-gray-900">{pdfDetails.pages}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Technical Details</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-3 font-medium text-gray-500">File Size</td>
                      <td className="py-3 text-gray-900">{formatFileSize(pdfDetails.fileSize)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-500">Creation Date</td>
                      <td className="py-3 text-gray-900">{formatDate(pdfDetails.creationDate)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-500">Modification Date</td>
                      <td className="py-3 text-gray-900">{formatDate(pdfDetails.modificationDate)}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-500">Encrypted</td>
                      <td className="py-3 text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pdfDetails.encrypted ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                          {pdfDetails.encrypted ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-500">Language</td>
                      <td className="py-3 text-gray-900">{pdfDetails.metadata.language}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-500">Tagged PDF</td>
                      <td className="py-3 text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pdfDetails.metadata.tagged ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {pdfDetails.metadata.tagged ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-gray-500">Web Optimized</td>
                      <td className="py-3 text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pdfDetails.metadata.webOptimized ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {pdfDetails.metadata.webOptimized ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fonts */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Fonts Used</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 font-medium text-gray-500">Font Name</th>
                      <th className="text-left py-3 font-medium text-gray-500">Type</th>
                      <th className="text-left py-3 font-medium text-gray-500">Embedded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pdfDetails.fonts.map((font, index) => (
                      <tr key={index}>
                        <td className="py-3 text-gray-900">{font.name}</td>
                        <td className="py-3 text-gray-900">{font.type}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${font.embedded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {font.embedded ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Header fields</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 font-medium text-gray-500">Label</th>
                      <th className="text-left py-3 font-medium text-gray-500">Type</th>
                      <th className="text-left py-3 font-medium text-gray-500">Name</th>
                      <th className="text-left py-3 font-medium text-gray-500">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fileDetails?.extraction?.headerFields?.map((field, index) => (
                      <tr key={index}>
                        <td className="py-3 text-gray-900">{field.label}</td>
                        <td className="py-3 text-gray-900">{field.type}</td>
                        <td className="py-3 text-gray-900">{field.name}</td>
                        <td className="py-3 text-gray-900">{field.value}</td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Line Items ({fileDetails?.extraction?.lineItems?.length || 0})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-12"></th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Label</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileDetails?.extraction?.lineItems?.map((lineItems, lineIndex) => {
                      const isExpanded = expandedLineItems.has(lineIndex);
                      const itemName =  `Line Item ${lineIndex + 1}`;

                      return (
                        <React.Fragment key={lineIndex}>
                          <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <button
                                onClick={() => toggleLineItemExpanded(lineIndex)}
                                className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={18} className="text-gray-600" />
                                ) : (
                                  <ChevronRight size={18} className="text-gray-600" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-gray-900 font-medium">{itemName}</td>
                            <td className="py-3 px-4 text-gray-600"></td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <td colSpan={3} className="p-0">
                                <div className="border-l-4 border-green-500 bg-gray-50">
                                  <table className="w-full text-sm">
                                    <tbody>
                                      {lineItems.map((field, fieldIndex) => (
                                        <tr
                                          key={fieldIndex}
                                          className="border-b border-gray-200 hover:bg-white transition-colors"
                                        >
                                          <td className="py-2 px-6 text-gray-600 font-medium w-32">
                                            {field.label}
                                          </td>
                                          <td className="py-2 px-6 text-gray-900">
                                            {field.value}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* File Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FileText size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-600">{pdfDetails.pages} pages</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Hash size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-600">{formatFileSize(pdfDetails.fileSize)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-600">Modified {formatDate(pdfDetails.modificationDate)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-600">By {pdfDetails.author}</span>
                </div>
              </div>
            </div>

            {/* Permissions */}
            {/* <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h2>
              <div className="space-y-2">
                {Object.entries(pdfDetails.permissions).map(([permission, allowed]) => (
                  <div key={permission} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">
                      {permission.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${allowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {allowed ? 'Allowed' : 'Denied'}
                    </span>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

