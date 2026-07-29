"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Calendar, Filter, ArrowUpDown, X, XCircle } from "lucide-react";

export interface SortOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  searchPlaceholder: string;
  searchKeys: string[];
  statuses?: { label: string; value: string }[];
  sortOptions: SortOption[];
  showDateFilter?: boolean;
  showAmountFilter?: boolean;
  showCfoQuickFilters?: boolean;
}

interface DataFiltersProps {
  data: any[];
  config: FilterConfig;
  onFilterChange: (filteredData: any[]) => void;
}

export default function DataFilters({ data, config, onFilterChange }: DataFiltersProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [sort, setSort] = useState("newest");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [cfoQuickFilter, setCfoQuickFilter] = useState("");

  const hasActiveFilters = search || status || datePreset || sort !== "newest" || minAmount || maxAmount || cfoQuickFilter;

  const clearAll = () => {
    setSearch("");
    setStatus("");
    setDatePreset("");
    setSort("newest");
    setMinAmount("");
    setMaxAmount("");
    setCfoQuickFilter("");
  };

  const getDateRange = (preset: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case "today": return { start: today, end: new Date(today.getTime() + 86400000) };
      case "yesterday": return { start: new Date(today.getTime() - 86400000), end: today };
      case "7days": return { start: new Date(today.getTime() - 7 * 86400000), end: now };
      case "30days": return { start: new Date(today.getTime() - 30 * 86400000), end: now };
      case "this_month": return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
      case "last_month": return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) };
      default: return null;
    }
  };

  useEffect(() => {
    let result = [...data];

    // 1. Global Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(item => {
        return config.searchKeys.some(key => {
          const val = item[key];
          return val && String(val).toLowerCase().includes(lowerSearch);
        });
      });
    }

    // 2. Status Filter
    if (status) {
      result = result.filter(item => item.status === status);
    }

    // 3. Date Filter
    if (datePreset) {
      const range = getDateRange(datePreset);
      if (range) {
        result = result.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= range.start && itemDate <= range.end;
        });
      }
    }

    // 4. Amount Filter
    if (config.showAmountFilter) {
      if (minAmount) result = result.filter(item => Number(item.amount) >= Number(minAmount));
      if (maxAmount) result = result.filter(item => Number(item.amount) <= Number(maxAmount));
    }

    // 5. CFO Quick Filters
    if (config.showCfoQuickFilters && cfoQuickFilter) {
      switch (cfoQuickFilter) {
        case 'frozen': result = result.filter(item => item.status === 'frozen'); break;
        case 'pending_exec': result = result.filter(item => item.status === 'pending'); break;
        case 'high_value': result = result.filter(item => Number(item.amount) >= 100000); break;
        case 'vendor_changes': result = result.filter(item => item.risk_score >= 80); break;
      }
    }

    // 6. Sorting
    result.sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest_amount': return Number(b.amount || 0) - Number(a.amount || 0);
        case 'lowest_amount': return Number(a.amount || 0) - Number(b.amount || 0);
        case 'vendor_a_z': return String(a.vendor_name_snapshot || a.name || '').localeCompare(String(b.vendor_name_snapshot || b.name || ''));
        default: return 0;
      }
    });

    onFilterChange(result);
  }, [data, search, status, datePreset, sort, minAmount, maxAmount, cfoQuickFilter]);

  const Chip = ({ label, onRemove }: { label: string, onRemove: () => void }) => (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      {label}
      <button onClick={onRemove} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"><X size={12} /></button>
    </span>
  );

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-4">
      {/* Top Row: Search & Core Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={config.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3">
          {config.statuses && (
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option value="">All Statuses</option>
                {config.statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}

          {config.showDateFilter && (
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white">
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
              </select>
            </div>
          )}

          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white">
              {config.sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Second Row: Role-Specific Extended Filters */}
      {(config.showAmountFilter || config.showCfoQuickFilters) && (
        <div className="flex flex-col md:flex-row gap-3 pt-3 border-t border-slate-100">
          {config.showAmountFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Amount:</span>
              <input type="number" placeholder="Min $" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:border-blue-500" />
              <span className="text-slate-400">-</span>
              <input type="number" placeholder="Max $" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm outline-none focus:border-blue-500" />
            </div>
          )}

          {config.showCfoQuickFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase ml-2">Quick Filters:</span>
              <button onClick={() => setCfoQuickFilter(cfoQuickFilter === 'frozen' ? '' : 'frozen')} className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${cfoQuickFilter === 'frozen' ? 'bg-red-100 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Frozen Payments</button>
              <button onClick={() => setCfoQuickFilter(cfoQuickFilter === 'high_value' ? '' : 'high_value')} className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${cfoQuickFilter === 'high_value' ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>High Value (&gt;$100k)</button>
              <button onClick={() => setCfoQuickFilter(cfoQuickFilter === 'pending_exec' ? '' : 'pending_exec')} className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${cfoQuickFilter === 'pending_exec' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Pending Exec</button>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 min-h-[32px]">
          <span className="text-xs text-slate-400 uppercase font-semibold mr-1">Active:</span>
          {search && <Chip label={`Search: ${search}`} onRemove={() => setSearch("")} />}
          {status && <Chip label={`Status: ${config.statuses?.find(s => s.value === status)?.label || status}`} onRemove={() => setStatus("")} />}
          {datePreset && <Chip label={`Date: ${datePreset.replace('_', ' ')}`} onRemove={() => setDatePreset("")} />}
          {sort !== "newest" && <Chip label={`Sorted: ${config.sortOptions.find(s => s.value === sort)?.label || sort}`} onRemove={() => setSort("newest")} />}
          {minAmount && <Chip label={`Min: $${minAmount}`} onRemove={() => setMinAmount("")} />}
          {maxAmount && <Chip label={`Max: $${maxAmount}`} onRemove={() => setMaxAmount("")} />}
          {cfoQuickFilter && <Chip label={`Filter: ${cfoQuickFilter.replace('_', ' ')}`} onRemove={() => setCfoQuickFilter("")} />}
          
          <button onClick={clearAll} className="ml-2 text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors">
            <XCircle size={14} /> Clear All
          </button>
        </div>
      )}
    </div>
  );
}
