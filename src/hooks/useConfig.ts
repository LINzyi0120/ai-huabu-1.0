import { useState, useEffect } from 'react';
import axios from 'axios';
import { GlobalConfig, ModelConfig, PromptItem, KeyGroup } from '../types';

const INITIAL_KEY_GROUPS: KeyGroup[] = [
  { id: 'default', name: 'default', key: '' }
];

const INITIAL_GLOBAL_CONFIG: GlobalConfig = {
  baseUrl: 'https://linyi01ai.com',
  defaultKeyGroupId: 'default',
  keyGroups: INITIAL_KEY_GROUPS,
  group: 'default'
};

const DEFAULT_MODELS: ModelConfig[] = [
  { 
    id: 'gpt-image-2', 
    name: 'gpt-image-2', 
    modelId: 'gpt-image-2', 
    category: 'Image',
    keyGroupId: 'default',
    baseUrl: 'https://linyi01ai.com'
  },
  { 
    id: 'nano-banana-pro', 
    name: 'Nano Banana Pro (写实旗舰)', 
    modelId: 'nano-banana-pro', 
    category: 'Image',
    keyGroupId: 'default',
    baseUrl: 'https://linyi01ai.com'
  },
  { 
    id: 'nano-banana-pro-4k', 
    name: 'nano-banana-pro-4k', 
    modelId: 'nano-banana-pro-4k', 
    category: 'Image',
    keyGroupId: 'default',
    baseUrl: 'https://linyi01ai.com'
  }
];

const CONFIG_VERSION = '2026-05-04-v5';

export function useConfig() {
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(() => {
    const saved = localStorage.getItem('global_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration schema
      if (!parsed.keyGroups) {
        return {
          baseUrl: parsed.baseUrl || 'https://linyi01ai.com',
          defaultKeyGroupId: 'default',
          keyGroups: [{ id: 'default', name: 'default', key: parsed.apiKey || '' }]
        };
      }
      return parsed;
    }
    return INITIAL_GLOBAL_CONFIG;
  });

  const [models, setModels] = useState<ModelConfig[]>(() => {
    const lastVersion = localStorage.getItem('config_version');
    const saved = localStorage.getItem('model_configs');
    
    if (lastVersion !== CONFIG_VERSION) {
       localStorage.setItem('config_version', CONFIG_VERSION);
       return DEFAULT_MODELS;
    }

    return saved ? JSON.parse(saved) : DEFAULT_MODELS;
  });

  const [activeModelId, setActiveModelId] = useState<string>(() => {
    const saved = localStorage.getItem('active_model_id');
    return saved || DEFAULT_MODELS[0].id;
  });

  useEffect(() => {
    localStorage.setItem('global_config', JSON.stringify(globalConfig));
    window.dispatchEvent(new Event('config_updated'));
  }, [globalConfig]);

  useEffect(() => {
    localStorage.setItem('model_configs', JSON.stringify(models));
    window.dispatchEvent(new Event('config_updated'));
  }, [models]);

  useEffect(() => {
    localStorage.setItem('active_model_id', activeModelId);
    window.dispatchEvent(new Event('config_updated'));
  }, [activeModelId]);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedGlobal = localStorage.getItem('global_config');
      if (savedGlobal && savedGlobal !== JSON.stringify(globalConfig)) setGlobalConfig(JSON.parse(savedGlobal));
      
      const savedModels = localStorage.getItem('model_configs');
      if (savedModels && savedModels !== JSON.stringify(models)) setModels(JSON.parse(savedModels));

      const savedActive = localStorage.getItem('active_model_id');
      if (savedActive && savedActive !== activeModelId) setActiveModelId(savedActive);
    };

    window.addEventListener('config_updated', handleStorageChange);
    return () => window.removeEventListener('config_updated', handleStorageChange);
  }, [globalConfig, models, activeModelId]);

  const activeModel = models.find(m => m.id === activeModelId) || models[0];

  const getEffectiveConfig = (modelId: string) => {
    const model = models.find(m => m.id === modelId) || activeModel;
    const keyGroupId = model?.keyGroupId || globalConfig.defaultKeyGroupId;
    const keyGroup = globalConfig.keyGroups.find(g => g.id === keyGroupId) || globalConfig.keyGroups[0];
    
    return {
      baseUrl: model?.baseUrl || globalConfig.baseUrl,
      apiKey: keyGroup?.key || '',
      modelId: model?.modelId || modelId,
      group: model?.group || keyGroup?.group || globalConfig.group || 'default'
    };
  };

  const refreshModels = async () => {
    const defaultGroup = globalConfig.keyGroups.find(g => g.id === globalConfig.defaultKeyGroupId);
    if (!defaultGroup?.key) return;
    try {
      const baseUrl = globalConfig.baseUrl.trim().replace(/\/+$/, '');
      const targetUrl = `${baseUrl}/v1/models`;
      
      // 使用后端代理获取模型列表，解决跨域问题
      const response = await axios.post('/api/proxy', {
        url: targetUrl,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${defaultGroup.key}`,
          ...(globalConfig.group ? { 'X-Group': globalConfig.group } : {})
        }
      });

      if (response.data && response.data.data) {
        const apiModels = response.data.data.map((m: any) => {
          const idLower = m.id.toLowerCase();
          const isChat = idLower.includes('gpt') || 
                        idLower.includes('claude') || 
                        idLower.includes('chat') ||
                        idLower.includes('llama') ||
                        idLower.includes('deepseek');
          
          return {
            id: m.id,
            name: m.id,
            modelId: m.id,
            category: isChat ? 'Chat' : 'Image',
            keyGroupId: 'default',
            baseUrl: globalConfig.baseUrl
          };
        });
        
        // 过滤掉重复的，并优先保留 API 返回的模型
        const existingIds = new Set(apiModels.map((m: any) => m.id));
        const filteredDefaults = DEFAULT_MODELS.filter(m => !existingIds.has(m.id));
        const merged = [...apiModels, ...filteredDefaults];
        
        setModels(merged);
        if (merged.length > 0 && (!activeModelId || !merged.find(m => m.id === activeModelId))) {
          setActiveModelId(merged[0].id);
        }
        return true;
      }
    } catch (e) {
      console.error("Failed to refresh models:", e);
    }
    return false;
  };

  return {
    globalConfig,
    setGlobalConfig,
    models,
    setModels,
    activeModelId,
    setActiveModelId,
    activeModel,
    getEffectiveConfig,
    refreshModels
  };
}
