import fs from 'fs';

const p = 'src/app/auditor-dashboard/analytics/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Risk Trend Table Replacement
const riskTrendOld = `<div className="overflow-x-auto">
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
            </div>`;

const riskTrendNew = `<div className="hidden md:block overflow-x-auto">
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
            
            <div className="md:hidden grid grid-cols-1 gap-4">
              {trendData.map((d, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900">{new Date(d.bucket).toLocaleDateString()}</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Vol: {d.wire_count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Avg Risk</span>
                      <span className="text-sm font-semibold text-slate-700">{d.avg_risk_score}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Max Risk</span>
                      <span className="text-sm font-bold text-red-600">{d.max_risk_score}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Top Drivers</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(d.reasons_breakdown || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((r, i) => (
                        <span key={i} className="inline-block bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-600">{r[0]}: {r[1] as number}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>`;

c = c.replace(riskTrendOld, riskTrendNew);

// 2. Vendor Risk Leaderboard Replacement
const vendorLeaderboardOld = `<div className="overflow-x-auto">
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
              </div>`;

const vendorLeaderboardNew = `<div className="hidden md:block overflow-x-auto">
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
              
              <div className="md:hidden grid grid-cols-1 gap-4">
                {leaderboardData.slice(0, 10).map((v, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
                    <div className="border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-900 block truncate">{v.vendor_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Wires</span>
                        <span className="text-sm font-semibold text-slate-700">{v.total_wires}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Avg Risk</span>
                        <span className="text-sm font-semibold text-slate-700">{v.avg_risk_score}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Bank Flags</span>
                        <span className="text-sm font-bold text-red-600">{v.flag_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>`;

c = c.replace(vendorLeaderboardOld, vendorLeaderboardNew);

// 3. Approver Behavior Patterns Replacement
const approverOld = `<div className="overflow-x-auto">
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
                      const routineTime = a.avg_time_routine_ms ? \`\${(a.avg_time_routine_ms / 60000).toFixed(1)} min\` : '-';
                      const frozenTime = a.avg_time_frozen_ms ? \`\${(a.avg_time_frozen_ms / 60000).toFixed(1)} min\` : '-';
                      const ratio = a.approve_ratio !== null ? \`\${(a.approve_ratio * 100).toFixed(1)}%\` : '< 10 acts';
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
              </div>`;

const approverNew = `<div className="hidden md:block overflow-x-auto">
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
                      const routineTime = a.avg_time_routine_ms ? \`\${(a.avg_time_routine_ms / 60000).toFixed(1)} min\` : '-';
                      const frozenTime = a.avg_time_frozen_ms ? \`\${(a.avg_time_frozen_ms / 60000).toFixed(1)} min\` : '-';
                      const ratio = a.approve_ratio !== null ? \`\${(a.approve_ratio * 100).toFixed(1)}%\` : '< 10 acts';
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
              
              <div className="md:hidden grid grid-cols-1 gap-4">
                {approverData.map((a, i) => {
                  const routineTime = a.avg_time_routine_ms ? \`\${(a.avg_time_routine_ms / 60000).toFixed(1)} min\` : '-';
                  const frozenTime = a.avg_time_frozen_ms ? \`\${(a.avg_time_frozen_ms / 60000).toFixed(1)} min\` : '-';
                  const ratio = a.approve_ratio !== null ? \`\${(a.approve_ratio * 100).toFixed(1)}%\` : '< 10 acts';
                  return (
                    <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
                      <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
                        <span className="font-bold text-slate-900 block truncate">{a.full_name}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 bg-white border border-slate-200 rounded">{a.role}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Routine</span>
                          <span className="text-sm font-semibold text-slate-700">{routineTime}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Frozen</span>
                          <span className="text-sm font-bold text-amber-700">{frozenTime}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Ratio</span>
                          <span className="text-sm font-semibold text-slate-700">{ratio}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>`;

c = c.replace(approverOld, approverNew);

fs.writeFileSync(p, c);
