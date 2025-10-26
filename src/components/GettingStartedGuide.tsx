import React, { useState, useRef } from 'react';
import { 
  Play, 
  Mail, 
  Brain, 
  FileText, 
  CheckCircle, 
  ArrowRight,
  X,
  Chrome,
  Zap,
  Target,
  Database,
  Edit3,
  Send,
  Shield,
  Package,
  Settings,
  Eye,
  Activity,
  Users,
  Award
} from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface GettingStartedGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTest?: () => void;
}

export default function GettingStartedGuide({ isOpen, onClose, onStartTest }: GettingStartedGuideProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Close modal when clicking outside
  useOutsideClick(modalRef, onClose);

  const steps = [
    {
      title: "Welcome to Professional MEP Quotations",
      icon: Award,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700 leading-relaxed text-lg">
            Transform your MEP business with AI-powered quotation generation. This professional system handles everything from equipment database management to client delivery.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-blue-900 font-bold text-lg mb-3">🚀 Complete Professional Workflow:</p>
                <ul className="text-blue-800 space-y-2">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-blue-600" /> Build custom equipment database with your MEP inventory</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-blue-600" /> Gmail integration with intelligent email selection</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-blue-600" /> AI-powered quotation generation in minutes</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-blue-600" /> Professional editing with equipment customization</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-blue-600" /> Executive approval and automated client delivery</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 1: Equipment Database Setup",
      icon: Database,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700 leading-relaxed">
            Start by building your personalized MEP equipment inventory. Add your actual equipment and pricing for accurate quotations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Activity className="w-6 h-6 text-blue-600" />
                <span className="font-bold text-blue-900">HVAC Systems</span>
              </div>
              <p className="text-blue-800 text-sm">VRF units, chillers, heat pumps, precision cooling equipment</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Zap className="w-6 h-6 text-green-600" />
                <span className="font-bold text-green-900">Ventilation</span>
              </div>
              <p className="text-green-800 text-sm">AHUs, exhaust fans, dehumidifiers, BMS controllers</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Package className="w-6 h-6 text-purple-600" />
                <span className="font-bold text-purple-900">Materials</span>
              </div>
              <p className="text-purple-800 text-sm">Piping, cables, installation services, commissioning</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Settings className="w-6 h-6 text-orange-600 mt-1" />
              <div>
                <p className="text-orange-900 font-bold">Build Your Custom Database</p>
                <p className="text-orange-800 text-sm mt-1">
                  Add your MEP equipment inventory (Daikin, Mitsubishi, Carrier, etc.) with your actual pricing. 
                  Each user builds their own personalized equipment database for accurate quotations.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 2: Gmail Integration & Email Selection",
      icon: Chrome,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700 leading-relaxed">
            Connect your Gmail account and intelligently select which RFQ emails to process.
          </p>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-green-900 font-bold text-lg mb-2">Secure Gmail Connection</p>
                  <p className="text-green-800 mb-3">
                    One-click OAuth authentication provides secure access to your emails. We only process emails containing MEP/HVAC keywords.
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-green-900 font-medium text-sm">Keywords we detect:</p>
                    <p className="text-green-700 text-sm">HVAC, VRF, Chiller, Air Conditioning, Ventilation, MEP, RFQ, Quotation Request</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-blue-900 font-bold text-lg mb-2">Smart Email Selection</p>
                  <p className="text-blue-800">
                    Browse your emails, preview content, and choose exactly which RFQs to process. 
                    Our AI pre-identifies the most promising opportunities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 3: AI Analysis & Quotation Preview",
      icon: Brain,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700 leading-relaxed">
            Watch our advanced AI analyze RFQ emails and generate professional quotations automatically.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold">1</div>
              <div className="flex-1">
                <p className="font-bold text-purple-900">Intelligent Project Analysis</p>
                <p className="text-purple-700 text-sm">Extract client details, project scope, building type, capacity requirements, and technical specifications</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold">2</div>
              <div className="flex-1">
                <p className="font-bold text-blue-900">3-Stage Equipment Matching</p>
                <p className="text-blue-700 text-sm">Specialized AI nodes for HVAC systems, ventilation equipment, and materials & services</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold">3</div>
              <div className="flex-1">
                <p className="font-bold text-green-900">Professional Quotation Generation</p>
                <p className="text-green-700 text-sm">Complete with pricing, margins, technical specifications, and system complexity analysis</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
            <div className="flex items-start space-x-3">
              <FileText className="w-6 h-6 text-indigo-600 mt-1" />
              <div>
                <p className="text-indigo-900 font-bold mb-2">Instant Professional Preview</p>
                <p className="text-indigo-800 text-sm">
                  Get a complete quotation preview with equipment breakdown, technical specifications, 
                  pricing analysis, and system complexity assessment - all generated in less than 5 minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 4: Professional Editing & Customization",
      icon: Edit3,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700 leading-relaxed">
            Fine-tune every aspect of your quotation with our professional editing interface.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <Database className="w-6 h-6 text-blue-600" />
                  <span className="font-bold text-blue-900">Equipment Customization</span>
                </div>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Browse equipment database by category</li>
                  <li>• Adjust quantities and pricing</li>
                  <li>• Add/remove equipment items</li>
                  <li>• Modify technical specifications</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <Users className="w-6 h-6 text-green-600" />
                  <span className="font-bold text-green-900">Client Information</span>
                </div>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• Update contact details</li>
                  <li>• Refine project specifications</li>
                  <li>• Add location and building type</li>
                  <li>• Include special requirements</li>
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <Zap className="w-6 h-6 text-purple-600" />
                  <span className="font-bold text-purple-900">Pricing Control</span>
                </div>
                <ul className="text-purple-800 text-sm space-y-1">
                  <li>• Adjust profit margins (real-time)</li>
                  <li>• Modify individual item pricing</li>
                  <li>• View pricing breakdown</li>
                  <li>• Calculate final project value</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <Activity className="w-6 h-6 text-orange-600" />
                  <span className="font-bold text-orange-900">Technical Review</span>
                </div>
                <ul className="text-orange-800 text-sm space-y-1">
                  <li>• System capacity verification</li>
                  <li>• Equipment compatibility check</li>
                  <li>• Complexity assessment</li>
                  <li>• Professional validation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 5: Executive Approval & Client Delivery",
      icon: Shield,
      content: (
        <div className="space-y-6">
          <p className="text-gray-700 leading-relaxed">
            Complete the professional process with executive-level approval and automated client delivery.
          </p>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-red-900 font-bold text-lg mb-2">Executive Approval Process</p>
                  <p className="text-red-800 mb-3">
                    Professional pre-approval checklist ensures quality control:
                  </p>
                  <ul className="text-red-800 text-sm space-y-1">
                    <li>✓ Technical specifications verified</li>
                    <li>✓ Pricing and margins confirmed</li>
                    <li>✓ Client details validated</li>
                    <li>✓ System integration assessed</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-green-900 font-bold text-lg mb-2">Automated Professional Delivery</p>
                  <p className="text-green-800">
                    Once approved, quotations are automatically formatted and delivered to clients with 
                    professional branding, complete technical specifications, and legal terms.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <Award className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <p className="text-blue-900 font-bold text-lg mb-2">Ready to Transform Your MEP Business?</p>
            <p className="text-blue-800 mb-4">
              Start processing your first RFQ and experience the power of AI-driven professional quotations.
            </p>
            <button
              onClick={() => {
                onClose();
                if (onStartTest) onStartTest();
              }}
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg text-lg"
            >
              <Play className="w-6 h-6 mr-3" />
              Start Your First Quotation
            </button>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-8 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Professional MEP Guide</h2>
                <p className="text-blue-200 mt-1">Step {currentStep + 1} of {steps.length} • Complete Workflow Overview</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-3 hover:bg-white/10 rounded-2xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-gray-700">Workflow Progress</span>
              <span className="text-lg font-bold text-blue-600">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                <IconComponent className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900">{currentStepData.title}</h3>
            </div>
            <div className="pl-20">
              {currentStepData.content}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-200">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Previous Step
            </button>

            <div className="flex space-x-3">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index === currentStep 
                      ? 'bg-blue-600 scale-125 shadow-lg' 
                      : index < currentStep 
                      ? 'bg-green-500 shadow-md' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center shadow-lg"
              >
                Next Step
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  if (onStartTest) onStartTest();
                }}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-bold flex items-center shadow-xl text-lg"
              >
                <Play className="w-6 h-6 mr-3" />
                Launch Professional System
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}