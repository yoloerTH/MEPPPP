import React, { useRef } from 'react';
import { X, Download, Printer, Eye } from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface HTMLQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  quotationNumber: string;
}

export default function HTMLQuotationModal({ 
  isOpen, 
  onClose, 
  htmlContent, 
  quotationNumber 
}: HTMLQuotationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useOutsideClick(modalRef, onClose);

  const handleDownloadPDF = () => {
    // Use browser's print-to-PDF functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quotation ${quotationNumber}</title>
            <style>
              @media print {
                @page {
                  margin: 1in;
                  size: A4;
                }
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                }
                .no-print {
                  display: none !important;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                }
                th, td {
                  border: 1px solid #ddd;
                  padding: 12px;
                  text-align: left;
                }
                th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .company-info {
                  margin-bottom: 30px;
                }
                .client-info {
                  margin-bottom: 30px;
                }
                .total-section {
                  margin-top: 30px;
                  text-align: right;
                }
                .page-break {
                  page-break-before: always;
                }
              }
              @media screen {
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 20px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                }
                th, td {
                  border: 1px solid #ddd;
                  padding: 12px;
                  text-align: left;
                }
                th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Wait for content to load then trigger print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quotation ${quotationNumber}</title>
            <style>
              @page {
                margin: 1in;
                size: A4;
              }
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
              }
              th {
                background-color: #f5f5f5;
                font-weight: bold;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .company-info {
                margin-bottom: 30px;
              }
              .client-info {
                margin-bottom: 30px;
              }
              .total-section {
                margin-top: 30px;
                text-align: right;
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Quotation Preview</h2>
              <p className="text-slate-200 mt-1">{quotationNumber}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrint}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto bg-white shadow-lg m-6">
            <div 
              ref={contentRef}
              className="p-8"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-4 flex-shrink-0 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <Eye className="w-4 h-4 mr-2" />
              Professional quotation generated by MEP Dashboard
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handlePrint}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Save as PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}