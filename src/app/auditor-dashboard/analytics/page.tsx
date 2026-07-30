"use client";
import { useState, useEffect } from "react";
import { Loader2, TrendingUp, AlertTriangle, Users, BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [approverData, setApproverData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/audit/analytics/risk-trend').then(r=>r.json()),
      fetch('/api/audit/analytics/vendor-leaderboard').then(r=>r.json()),
      fetch('/api/audit/analytics/approver-behavior').then(r=>r.json())
    ]).then(([trend, leaderboard, approver]) => {
      setTrendData(trend.data || []);
      setLeaderboardData(leaderboard.data || []);
      setApproverData(approver.data || []);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return <div className="flex justify-center items-center h-full pt-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <div>
        <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold uppercase tracking-wider text-xs">
          <BarChart3 size={16} /> Auditor Dashboard
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Risk Analytics</h1>
        <p className="text-slate-500 mt-1">Review systemic trends, high-risk vendors, and approver velocity.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
            <TrendingUp className="text-blue-500" size={20} /> Risk Trend (Last 30 Days)
          </h2>
          {trendData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No wire requests found for the selected period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <th className="p-3 border-b border-slate-200">Date Bucket</th>
                    <th className="p-3 border-b border-slate-200">Wire Volume</th>
                    <th className="p-3 border-b border-slate-200">Avg Risk</th>
                    <th className="p-3 border-b border-slate-200">Max Risk</th>
                    <th className="p-3 border-b border-slate-200">Top Drivers</th>
                  </tr>
                </thead>
                <tbody>
                  {trendData.map((d, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-900 whitespace-nowrap">{new Date(d.bucket).toLocaleDateString()}</td>
                      <td className="p-3 text-slate-700">{d.wire_count}</td>
                      <td className="p-3 text-slate-700">{d.avg_risk_score}</td>
                      <td className="p-3 text-red-600 font-bold">{d.max_risk_score}</td>
                      <td className="p-3 text-slate-600 text-xs">
                        {Object.entries(d.reasons_breakdown || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((r, i) => (
                          <span key={i} className="inline-block bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] mr-1 mb-1">{r[0]}: {r[1] as number}</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
              <AlertTriangle className="text-red-500" size={20} /> Vendor Risk Leaderboard
            </h2>
            {leaderboardData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No vendors found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                      <th className="p-3 border-b border-slate-200">Vendor</th>
                      <th className="p-3 border-b border-slate-200">Wires</th>
                      <th className="p-3 border-b border-slate-200">Avg Risk</th>
                      <th className="p-3 border-b border-slate-200">Bank Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboardData.slice(0, 10).map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">{v.vendor_name}</td>
                        <td className="p-3 text-slate-700">{v.total_wires}</td>
                        <td className="p-3 text-slate-700">{v.avg_risk_score}</td>
                        <td className="p-3 text-red-600 font-bold">{v.flag_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
              <Users className="text-purple-500" size={20} /> Approver Behavior Patterns
            </h2>
            {approverData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No approval history found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                      <th className="p-3 border-b border-slate-200">Approver</th>
                      <th className="p-3 border-b border-slate-200">Avg Time (Routine)</th>
                      <th className="p-3 border-b border-slate-200">Avg Time (FROZEN)</th>
                      <th className="p-3 border-b border-slate-200">Approve Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approverData.map((a, i) => {
                      const routineTime = a.avg_time_routine_ms ? `${(a.avg_time_routine_ms / 60000).toFixed(1)} min` : '-';
                      const frozenTime = a.avg_time_frozen_ms ? `${(a.avg_time_frozen_ms / 60000).toFixed(1)} min` : '-';
                      const ratio = a.approve_ratio !== null ? `${(a.approve_ratio * 100).toFixed(1)}%` : '< 10 acts';
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{a.full_name} <span className="text-[10px] text-slate-500 font-normal uppercase ml-1 block">{a.role}</span></td>
                          <td className="p-3 text-slate-700">{routineTime}</td>
                          <td className="p-3 text-amber-700 font-bold">{frozenTime}</td>
                          <td className="p-3 text-slate-700">{ratio}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}