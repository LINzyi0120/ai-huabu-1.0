/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera, Settings, LayoutDashboard, Database, Sparkles, X, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GenerationView from './components/GenerationView';
import ConfigView from './components/ConfigView';
import { useConfig } from './hooks/useConfig';
import axios from 'axios';

export default function App() {
  const [currentView, setCurrentView] = useState<'generate' | 'config'>('generate');
  const [showConfig, setShowConfig] = useState(false);
  const [balance, setBalance] = useState<string>("加载中...");
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const { globalConfig } = useConfig();
  const [showHistory, setShowHistory] = useState(false);

  const [showLogs, setShowLogs] = useState(false);

  const fetchBalance = async (retryCount = 0) => {
    const defaultGroup = globalConfig.keyGroups.find(g => g.id === globalConfig.defaultKeyGroupId);
    if (!defaultGroup?.key) {
      setBalance("未配置 Key");
      return;
    }

    if (retryCount === 0) setIsFetchingBalance(true);
    try {
      const sanitizedUrl = globalConfig.baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/, "");
      const headers = {
        "Authorization": `Bearer ${defaultGroup.key}`,
        ...(globalConfig.group ? { "X-Group": globalConfig.group } : {})
      };

      let mergedData: any = {};
      
      try {
        const subRes = await axios.get(`${sanitizedUrl}/v1/dashboard/billing/subscription`, { headers });
        if (subRes.data) mergedData = { ...mergedData, ...subRes.data };
      } catch (e) {}

      try {
        const balRes = await axios.get(`${sanitizedUrl}/v1/user/balance`, { headers });
        if (balRes.data) mergedData = { ...mergedData, ...balRes.data, user_balance: balRes.data };
      } catch (e) {}

      try {
        const usageRes = await axios.get(`${sanitizedUrl}/v1/dashboard/billing/usage`, { headers });
        if (usageRes.data) mergedData = { ...mergedData, usage: usageRes.data };
      } catch (e) {}

      if (Object.keys(mergedData).length === 0) {
        setBalance("-");
        return;
      }

      const data = mergedData;
      let available = 0;

      // New parsing logic prioritizing the user's requested formula
      if (data.hard_limit_usd !== undefined) {
        const total = parseFloat(data.hard_limit_usd);
        const usage = data.usage?.total_usage !== undefined ? parseFloat(data.usage.total_usage) / 100 : (data.total_usage !== undefined ? parseFloat(data.total_usage) / 100 : 0);
        available = total - usage;
      } else if (data.data?.balance !== undefined) {
        available = parseFloat(data.data.balance);
      } else if (data.data?.available !== undefined) {
        available = parseFloat(data.data.available);
      } else if (data.remain_quota !== undefined) {
        // OneAPI/NewAPI standard: internal credits
        const rq = parseFloat(data.remain_quota);
        // Standard OneAPI conversion: 500000 = $1. Some proxies use 100000 or others. 
        // We'll try to guess if it's a huge number.
        available = rq > 50000 ? rq / 500000 : rq;
      } else if (data.quota !== undefined) {
        const q = parseFloat(data.quota);
        available = q > 50000 ? q / 500000 : q;
      } else if (data.user_balance !== undefined) {
        const bal = typeof data.user_balance === 'object' ? parseFloat(data.user_balance.balance || 0) : parseFloat(data.user_balance);
        available = bal > 50000 ? bal / 500000 : bal;
      } else if (data.balance !== undefined) {
        available = parseFloat(data.balance);
      } else if (data.total_available !== undefined) {
        available = parseFloat(data.total_available);
      }
      
      const prevBalanceText = balance;
      const displayBalance = Math.max(0, available);
      // Determine currency symbol - default to ¥ for common proxies, $ for OAI
      const symbol = globalConfig.baseUrl.includes('openai.com') ? '$' : '¥';
      const newBalanceText = `${symbol} ${displayBalance.toFixed(3)}`;
      
      setBalance(newBalanceText); 

      // If we are retrying after a generation, and the balance hasn't changed, keep retrying
      if (retryCount > 0 && retryCount < 5 && prevBalanceText === newBalanceText) {
        setTimeout(() => fetchBalance(retryCount + 1), 3000);
      }
    } catch (error) {
      console.error("Balance fetch error:", error);
      if (retryCount === 0) setBalance("获取失败");
    } finally {
      setIsFetchingBalance(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [globalConfig.keyGroups, globalConfig.defaultKeyGroupId, globalConfig.baseUrl]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 selection:bg-blue-500/30 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
            G
          </div>
          <span className="font-semibold tracking-tight">AI 图像多模型工作台</span>
        </div>

        <nav className="flex items-center gap-6">
          <div className="flex items-center gap-4 px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full shadow-inner">
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => fetchBalance(0)}
            >
              <Database size={14} className={`text-blue-400 ${isFetchingBalance ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-bold text-zinc-500">账户余额</span>
              <span className="text-xs font-mono text-blue-400 font-bold flex items-center gap-1">
                {isFetchingBalance ? "刷新中..." : balance}
                <RefreshCw size={10} className={`text-zinc-600 group-hover:text-blue-400 transition-colors ${isFetchingBalance ? 'animate-spin' : ''}`} />
              </span>
            </div>
          </div>

          <div className="flex bg-zinc-900 rounded-full p-1 border border-zinc-800 gap-1">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`px-4 py-1 text-xs font-medium rounded-full transition-all ${showHistory ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              历史记录
            </button>
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className={`px-4 py-1 text-xs font-medium rounded-full transition-all ${showLogs ? 'bg-zinc-700 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
            >
              运行日志
            </button>
            <button 
              onClick={() => setShowConfig(true)}
              className="px-4 py-1 text-xs font-medium rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
            >
              接口设置
            </button>
          </div>
          
          <div className="flex items-center gap-3 border-l border-zinc-800 pl-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-zinc-100">开发者模式</span>
              <span className="text-[10px] text-green-500 font-bold uppercase">API Active</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
               <img src="https://api.dicebear.com/7.x/shapes/svg?seed=user" alt="user" />
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative h-[calc(100vh-56px)] flex">
        <div className="flex-1 relative overflow-hidden">
          <GenerationView 
            showGlobalHistory={showHistory} 
            showGlobalLogs={showLogs} 
            onCloseLogs={() => setShowLogs(false)}
            onTaskComplete={() => fetchBalance(1)} 
          />
        </div>
        
        {/* Config Modal Overlay */}
        <AnimatePresence>
          {showConfig && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-8"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-5xl h-full max-h-[85vh] bg-[#141414] border border-zinc-800 rounded-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-4 bg-[#141414]">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">模型接口配置</span>
                  </div>
                  <button 
                    onClick={() => setShowConfig(false)}
                    className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <ConfigView />
                </div>
                <div className="p-4 border-t border-zinc-800 bg-[#1e1e1e] flex justify-end">
                  <button 
                    onClick={() => setShowConfig(false)}
                    className="px-6 py-2 bg-[#2a2a2a] hover:bg-[#333] border border-zinc-700/50 rounded-lg text-sm text-zinc-300 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-4 right-6 px-4 py-2 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-full flex items-center gap-2 z-[60] text-[10px] font-bold uppercase tracking-widest text-zinc-500 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
        <span>系统就绪</span>
      </footer>
    </div>
  );
}

