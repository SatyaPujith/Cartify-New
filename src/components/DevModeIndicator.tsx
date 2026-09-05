import { useState } from 'react';
import { Settings, Database, Globe, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { isLocalMode, localDb } from '@/lib/supabase';
import { API_CONFIG } from '@/config/api';

export default function DevModeIndicator() {
  const [isOpen, setIsOpen] = useState(false);
  const inLocalMode = isLocalMode();
  
  // Don't show in production when not in local mode
  if (!inLocalMode && import.meta.env.PROD) {
    return null;
  }

  const stats = inLocalMode ? localDb.getStats() : null;

  const supabaseConfigured = import.meta.env.VITE_SUPABASE_URL &&
                             import.meta.env.VITE_SUPABASE_ANON_KEY &&
                             import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_url_here';

  return (
    <>
      {/* Floating indicator */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-4 right-4 z-40 px-3 py-2 rounded-full text-xs font-bold transition-all hover:scale-105 shadow-lg ${
          inLocalMode 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        <div className="flex items-center gap-1">
          {inLocalMode ? <Database className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
          {inLocalMode ? 'LOCAL' : 'CLOUD'}
        </div>
      </button>

      {/* Status modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-bold text-gray-900">Development Status</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Mode Status */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${inLocalMode ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {inLocalMode ? 
                    <Database className="w-4 h-4 text-green-600" /> : 
                    <Globe className="w-4 h-4 text-blue-600" />
                  }
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {inLocalMode ? 'Local Development Mode' : 'Cloud Mode'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {inLocalMode 
                      ? 'Using local Express server and in-memory database'
                      : 'Connected to cloud backend services'
                    }
                  </p>
                </div>
              </div>

              {/* Important Notice for Local Mode */}
              {inLocalMode && (
                <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">Local Mode Active</p>
                    <p>No Supabase setup required. All data is stored in memory and will reset when you restart the server.</p>
                  </div>
                </div>
              )}

              {/* API Configuration */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-bold text-sm text-gray-900 mb-2">API Configuration</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base URL:</span>
                    <span className="font-mono text-gray-900 text-right break-all">
                      {API_CONFIG.baseUrl}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SerpAPI:</span>
                    <div className="flex items-center gap-1">
                      {import.meta.env.VITE_SERPAPI_KEY && import.meta.env.VITE_SERPAPI_KEY !== 'your_serpapi_key_here' ? 
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> :
                        <AlertCircle className="w-3 h-3 text-yellow-600" />
                      }
                      <span className="text-gray-900">
                        {import.meta.env.VITE_SERPAPI_KEY && import.meta.env.VITE_SERPAPI_KEY !== 'your_serpapi_key_here' ? 'Active' : 'Placeholder'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Razorpay:</span>
                    <div className="flex items-center gap-1">
                      {import.meta.env.VITE_RAZORPAY_KEY_ID && import.meta.env.VITE_RAZORPAY_KEY_ID !== 'your_razorpay_key_id_here' ? 
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> :
                        <AlertCircle className="w-3 h-3 text-yellow-600" />
                      }
                      <span className="text-gray-900">
                        {import.meta.env.VITE_RAZORPAY_KEY_ID && import.meta.env.VITE_RAZORPAY_KEY_ID !== 'your_razorpay_key_id_here' ? 'Test Mode' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Supabase:</span>
                    <div className="flex items-center gap-1">
                      {supabaseConfigured ? 
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> :
                        <AlertCircle className="w-3 h-3 text-yellow-600" />
                      }
                      <span className="text-gray-900">
                        {supabaseConfigured ? 'Configured' : 'Using Mock'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Local Database Stats (if in local mode) */}
              {inLocalMode && stats && (
                <div className="bg-green-50 rounded-lg p-3">
                  <h4 className="font-bold text-sm text-green-900 mb-2">Local Database</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-lg text-green-900">{stats.orders}</div>
                      <div className="text-green-700">Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-green-900">{stats.auditLogs}</div>
                      <div className="text-green-700">Audit Logs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-green-900">{stats.paidOrders}</div>
                      <div className="text-green-700">Paid</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-green-900">
                        ₹{Math.round(stats.totalRevenue / 100)}
                      </div>
                      <div className="text-green-700">Revenue</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      localDb.clear();
                      setIsOpen(false);
                      window.location.reload();
                    }}
                    className="w-full mt-3 text-xs bg-green-100 hover:bg-green-200 text-green-800 py-2 rounded transition-colors"
                  >
                    Clear Local Database
                  </button>
                </div>
              )}

              <div className="text-xs text-gray-500 text-center">
                {inLocalMode 
                  ? 'Perfect for development - no external dependencies required'
                  : 'Production mode - using external services'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}