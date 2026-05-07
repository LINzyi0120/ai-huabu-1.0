import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Play, Link as LinkIcon, Trash2, CheckCircle2, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { useConfig } from '../hooks/useConfig';
import axios from 'axios';

export default function ConfigView() {
  const { globalConfig, setGlobalConfig, models, setModels } = useConfig();
  const [activeTab, setActiveTab] = useState<'Chat' | 'Image' | 'Video' | 'Music' | 'Tool'>('Image');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});

  const [newGroupName, setNewGroupName] = useState('');

  const currentKeyGroup = globalConfig.keyGroups.find(g => g.id === globalConfig.defaultKeyGroupId) || globalConfig.keyGroups[0];
  const [globalKeyInput, setGlobalKeyInput] = useState(currentKeyGroup?.key || '');

  const filteredModels = models.filter(m => m.category === activeTab);

  const handleGlobalKeyChange = (val: string) => {
    setGlobalKeyInput(val);
    const newGroups = globalConfig.keyGroups.map(g => 
      g.id === globalConfig.defaultKeyGroupId ? { ...g, key: val, group: globalConfig.group } : g
    );
    setGlobalConfig({ ...globalConfig, keyGroups: newGroups });
  };

  const saveGlobalKey = () => {
    const newGroups = globalConfig.keyGroups.map(g => 
      g.id === globalConfig.defaultKeyGroupId ? { ...g, key: globalKeyInput, group: globalConfig.group } : g
    );
    setGlobalConfig({ ...globalConfig, keyGroups: newGroups });
    alert('全局 Key 已保存');
  };

  const addKeyGroup = () => {
    if (!newGroupName.trim()) return;
    const newId = 'custom-' + Date.now();
    setGlobalConfig({
      ...globalConfig,
      keyGroups: [...globalConfig.keyGroups, { id: newId, name: newGroupName, key: '', group: 'default' }],
      defaultKeyGroupId: newId
    });
    setGlobalKeyInput('');
    setNewGroupName('');
  };

  const updateModel = (id: string, updates: any) => {
    setModels(models.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const testConnection = async (id: string) => {
    setTestingId(id);
    try {
      const model = models.find(m => m.id === id);
      const keyGroupId = model?.keyGroupId || globalConfig.defaultKeyGroupId;
      const keyGroup = globalConfig.keyGroups.find(g => g.id === keyGroupId);
      
      const config = {
        baseUrl: model?.baseUrl || globalConfig.baseUrl,
        apiKey: keyGroup?.key || currentKeyGroup?.key,
        group: model?.group || keyGroup?.group || globalConfig.group || 'default'
      };

      const res = await axios.get(`${config.baseUrl.replace(/\/+$/, '')}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          ...(config.group ? { 'X-Group': config.group } : {})
        }
      });
      if (res.data && (res.data.data || Array.isArray(res.data))) {
        setTestResults(prev => ({ ...prev, [id]: 'success' }));
        alert(`连接成功！检测到可用模型。`);
      } else {
        setTestResults(prev => ({ ...prev, [id]: 'error' }));
        alert(`测试连接失败: 无法正确解析模型列表。`);
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [id]: 'error' }));
      alert(`网络或请求错误: ${e.response?.data?.error?.message || e.response?.data?.error || e.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const tabs: {id: typeof activeTab; label: string; count: number}[] = [
    { id: 'Chat', label: 'Chat', count: models.filter(m => m.category === 'Chat').length },
    { id: 'Image', label: 'Image', count: models.filter(m => m.category === 'Image').length },
    { id: 'Video', label: 'Video', count: models.filter(m => m.category === 'Video').length },
    { id: 'Music', label: 'Music', count: models.filter(m => m.category === 'Music').length },
    { id: 'Tool', label: '工具', count: models.filter(m => m.category === 'Tool').length }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#141414] text-zinc-300 font-sans">
      <div className="px-6 border-b border-zinc-800 flex items-center justify-between pt-2">
        <div className="flex items-center">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-4 mr-2 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-blue-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="text-[15px]">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${activeTab === tab.id ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const newId = 'custom-' + Date.now();
            setModels([...models, {
              id: newId,
              name: '新模型名称',
              modelId: 'custom-model-id',
              category: activeTab,
              keyGroupId: globalConfig.defaultKeyGroupId,
              baseUrl: '',
              isCustom: true
            }]);
          }}
          className="px-3 py-1.5 flex items-center gap-1.5 bg-[#1e1e1e] hover:bg-zinc-800 text-sm text-zinc-300 rounded-md transition-colors border border-zinc-800"
        >
          <Plus size={14} /> 添加
        </button>
      </div>

      <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[11px] text-zinc-500 mb-2 block uppercase tracking-wider">GLOBAL BASE URL (全局 API 地址)</label>
              <input
                type="text"
                value={globalConfig.baseUrl}
                onChange={e => setGlobalConfig({ ...globalConfig, baseUrl: e.target.value })}
                className="w-full bg-[#1e1e1e] border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                placeholder="https://api.example.com"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 mb-2 block uppercase tracking-wider">CHANNEL GROUP (渠道分组 - 如 default/vip)</label>
              <input
                type="text"
                value={globalConfig.group || ''}
                onChange={e => setGlobalConfig({ ...globalConfig, group: e.target.value })}
                className="w-full bg-[#1e1e1e] border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                placeholder="default"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 mb-2 block uppercase tracking-wider">GLOBAL API KEY (可选，全局默认 KEY)</label>
            <div className="relative mb-3 flex items-center">
              <input
                type={showKey['global'] ? 'text' : 'password'}
                value={globalKeyInput}
                onChange={e => handleGlobalKeyChange(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#1e1e1e] border border-zinc-800 rounded-lg pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors font-mono tracking-widest"
              />
              <button 
                onClick={() => setShowKey(p => ({ ...p, 'global': !p['global'] }))}
                className="absolute right-3 p-1 text-zinc-500 hover:text-zinc-300"
              >
                {showKey['global'] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={globalConfig.defaultKeyGroupId}
                onChange={e => {
                  const groupId = e.target.value;
                  const group = globalConfig.keyGroups.find(g => g.id === groupId);
                  setGlobalKeyInput(group?.key || '');
                  setGlobalConfig({ 
                    ...globalConfig, 
                    defaultKeyGroupId: groupId,
                    group: group?.group || 'default'
                  });
                }}
                className="flex-1 bg-[#1e1e1e] border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
              >
                {globalConfig.keyGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <input 
                type="text"
                placeholder="自定义分组..."
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="flex-1 bg-[#1e1e1e] border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
              />
              <button 
                onClick={addKeyGroup}
                className="px-4 py-2 bg-[#1e1e1e] border border-zinc-800 rounded-lg text-sm hover:bg-zinc-800 transition-colors"
              >
                添加
              </button>
              <button 
                onClick={saveGlobalKey}
                className="px-4 py-2 bg-[#1e1e1e] border border-zinc-800 rounded-lg text-sm hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                保存KEY
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredModels.map((model) => (
            <div 
              key={model.id} 
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', model.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const sourceId = e.dataTransfer.getData('text/plain');
                if (sourceId === model.id) return;
                
                const newModels = [...models];
                const sourceIndex = newModels.findIndex(m => m.id === sourceId);
                const targetIndex = newModels.findIndex(m => m.id === model.id);
                if (sourceIndex > -1 && targetIndex > -1) {
                  const [draggedItem] = newModels.splice(sourceIndex, 1);
                  newModels.splice(targetIndex, 0, draggedItem);
                  setModels(newModels);
                }
              }}
              className="bg-[#1e1e1e] border border-zinc-800/60 rounded-xl overflow-hidden shadow-sm cursor-move"
            >
              <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-800/40">
                <div className="flex items-center gap-3 w-1/2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${testResults[model.id] === 'success' ? 'bg-green-500' : testResults[model.id] === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <input
                    type="text"
                    className="bg-transparent border-b border-zinc-800 focus:border-zinc-500 outline-none font-medium text-zinc-200 px-1 py-0.5 w-full transition-colors"
                    value={model.name}
                    onChange={e => updateModel(model.id, { name: e.target.value })}
                    placeholder="模型名称 (如 gpt-4o)"
                  />
                </div>
                <div className="px-2 py-0.5 bg-[#2a2a2a] rounded text-[11px] text-blue-400 font-medium tracking-wide">
                  {model.category}
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="flex items-center">
                  <label className="w-24 text-[12px] text-zinc-500 uppercase">MODEL ID</label>
                  <input
                    type="text"
                    value={model.modelId}
                    onChange={e => updateModel(model.id, { modelId: e.target.value })}
                    className="flex-1 bg-transparent border border-zinc-800/80 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 focus:bg-[#252525] transition-colors"
                  />
                </div>
                
                <div className="flex items-center">
                  <label className="w-24 text-[12px] text-zinc-500 uppercase">API KEY</label>
                  <div className="flex-1 flex gap-2">
                    <select
                      value={model.keyGroupId || 'default'}
                      onChange={e => updateModel(model.id, { keyGroupId: e.target.value })}
                      className="w-32 bg-transparent border border-zinc-800/80 rounded-md px-2 py-2 text-sm focus:outline-none focus:border-zinc-600 focus:bg-[#252525]"
                    >
                      {globalConfig.keyGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <div className="flex-1 relative flex items-center border border-zinc-800/80 rounded-md bg-transparent focus-within:border-zinc-600 focus-within:bg-[#252525]">
                      <input
                        type={showKey[model.id] ? "text" : "password"}
                        readOnly
                        value={globalConfig.keyGroups.find(g => g.id === (model.keyGroupId || 'default'))?.key || 'sk-...'}
                        className="w-full bg-transparent px-3 py-2 text-sm outline-none font-mono text-zinc-500"
                        placeholder="Inherits from group"
                      />
                      <button 
                        onClick={() => setShowKey(p => ({ ...p, [model.id]: !p[model.id] }))}
                        className="p-2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showKey[model.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="w-24 text-[12px] text-zinc-500 uppercase">CHANNEL GROUP</label>
                  <input
                    type="text"
                    value={model.group || ''}
                    onChange={e => updateModel(model.id, { group: e.target.value })}
                    className="flex-1 bg-transparent border border-zinc-800/80 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 focus:bg-[#252525]"
                    placeholder="Inherits from global"
                  />
                </div>

                <div className="flex items-center">
                  <label className="w-24 text-[12px] text-zinc-500 uppercase">BASE URL</label>
                  <input
                    type="text"
                    value={model.baseUrl || globalConfig.baseUrl}
                    onChange={e => updateModel(model.id, { baseUrl: e.target.value })}
                    className="flex-1 bg-transparent border border-zinc-800/80 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 focus:bg-[#252525]"
                    placeholder="Inherits from global"
                  />
                </div>
              </div>

              <div className="px-5 py-3 border-t border-zinc-800/40 flex justify-between items-center">
                <div>
                  <button 
                    onClick={() => setModels(models.filter(m => m.id !== model.id))}
                    className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={12} /> 删除模型
                  </button>
                </div>
                <button 
                  onClick={() => testConnection(model.id)}
                  disabled={testingId === model.id}
                  className={`text-xs flex items-center gap-1.5 transition-colors ${
                    testResults[model.id] === 'success' ? 'text-green-500' :
                    testResults[model.id] === 'error' ? 'text-red-500' :
                    'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {testingId === model.id ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      测试中...
                    </>
                  ) : testResults[model.id] === 'success' ? (
                    <>
                      <CheckCircle2 size={12} />
                      连接成功
                    </>
                  ) : testResults[model.id] === 'error' ? (
                    <>
                      <AlertCircle size={12} />
                      连接失败
                    </>
                  ) : (
                    <>
                      <LinkIcon size={12} />
                      测试连接
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
          {filteredModels.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-sm">
              此分类下暂无模型配置
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
