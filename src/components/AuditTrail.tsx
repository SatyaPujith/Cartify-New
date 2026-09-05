import { useState, useEffect } from 'react';
import { Shield, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase, localDb, isLocalMode } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';

interface AuditRecord {
  id: string;
  action: string;
  description: string;
  amount: number | null;
  status: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  ADD_TO_CART: 'Add to Cart',
  REMOVE_FROM_CART: 'Remove from Cart',
  AGENT_PARSE: 'AI Intent Parsed',
  AGENT_SEARCH: 'AI Product Search',
  AGENT_ADD_ITEMS: 'AI Added Items',
  SERPAPI_SEARCH: 'Product Search',
  PAYMENT_INITIATED: 'Payment Initiated',
  PAYMENT_SUCCESS: 'Payment Success',
  PAYMENT_FAILED: 'Payment Failed',
  PAYMENT_CANCELLED: 'Payment Cancelled',
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  success: { color: 'text-green-600', icon: CheckCircle2 },
  failed: { color: 'text-red-600', icon: XCircle },
  pending: { color: 'text-yellow-600', icon: Clock },
  cancelled: { color: 'text-gray-500', icon: AlertCircle },
};

export default function AuditTrail() {
  const { auditLog } = useCart();
  const [dbRecords, setDbRecords] = useState<AuditRecord[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expanded) {
      loadDbRecords();
    }
  }, [expanded]);

  const loadDbRecords = async () => {
    setLoading(true);
    try {
      if (isLocalMode()) {
        // Use local database in local mode
        const records = localDb.getAuditLogs(50);
        setDbRecords(records.map(r => ({
          id: r.id,
          action: r.action,
          description: r.description,
          amount: r.amount || null,
          status: r.status,
          details: r.details || null,
          created_at: r.created_at,
        })));
      } else {
        // Use Supabase in production mode
        const { data, error } = await supabase
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setDbRecords(data || []);
      }
    } catch {
      // Silent fail — use local audit log as fallback
    } finally {
      setLoading(false);
    }
  };

  const allEntries = [
    ...dbRecords.map((r) => ({
      id: r.id,
      action: r.action,
      description: r.description,
      amount: r.amount,
      status: r.status,
      timestamp: r.created_at,
      details: r.details,
    })),
    ...auditLog.map((e) => ({
      id: e.id,
      action: e.action,
      description: e.description,
      amount: e.amount,
      status: e.status,
      timestamp: e.timestamp,
      details: null,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cartify-navy" />
          <h3 className="font-bold text-sm text-gray-900">Audit Trail</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {allEntries.length} actions
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">Loading audit records...</div>
          )}
          {!loading && allEntries.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No actions recorded yet. Start shopping to see the audit trail.
            </div>
          )}
          {!loading && allEntries.length > 0 && (
            <div className="divide-y divide-gray-100">
              {allEntries.map((entry) => {
                const StatusIcon = statusConfig[entry.status]?.icon || AlertCircle;
                const statusColor = statusConfig[entry.status]?.color || 'text-gray-500';
                const label = actionLabels[entry.action] || entry.action;

                return (
                  <div key={entry.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2">
                      <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${statusColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-700">{label}</span>
                          <span className="text-xs text-gray-400 shrink-0">
                            {new Date(entry.timestamp).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{entry.description}</p>
                        {entry.amount != null && entry.amount > 0 && (
                          <p className="text-xs font-bold text-gray-900 mt-0.5">
                            ₹{(entry.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
