import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // 异步任务存储，解决前端因60s超时而被断开的问题
  const tasks: Record<string, { status: 'generating' | 'done' | 'error'; result?: any; error?: any; statusCode?: number; }> = {};

  // 跨域代理路由 (兼容旧版使用)
  app.post("/api/proxy", async (req, res) => {
    const { url, method, data, headers } = req.body;
    if (!url) {
      return res.status(400).json({ message: "Missing target URL" });
    }
    
    console.log(`[Proxy Request] ${method || 'POST'} -> ${url}`);
    
    try {
      const response = await axios({
        url,
        method: method || 'POST',
        data: data || {},
        headers: {
          ...headers,
          host: undefined,
          referer: undefined,
          origin: undefined,
        },
        timeout: 600000,
        responseType: 'json'
      });
      console.log(`[Proxy Success] <- ${url} [${response.status}]`);
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      let errorData = error.response?.data || { message: error.message };
      console.error(`[Proxy Error] <- ${url} [${status}]:`, errorData.message || error.message);
      res.status(status).json(errorData);
    }
  });

  // 异步代理路由
  app.post("/api/proxy/start", async (req, res) => {
    const { url, method, data, headers } = req.body;
    if (!url) return res.status(400).json({ message: "Missing target URL" });
    
    const taskId = Date.now().toString() + Math.random().toString(36).substring(2);
    tasks[taskId] = { status: 'generating' };
    
    console.log(`[Proxy Async Start] ${method || 'POST'} -> ${url} (Task: ${taskId})`);
    
    res.json({ taskId });

    // 后台继续执行请求，前端将轮询获取状态
    (async () => {
      try {
        const response = await axios({
          url,
          method: method || 'POST',
          data: data || {},
          headers: {
            ...headers,
            host: undefined,
            referer: undefined,
            origin: undefined,
          },
          timeout: 1800000, // 增加到30分钟后台超时，保证长时间生图不受影响
          responseType: 'json'
        });
        console.log(`[Proxy Async Success] <- ${url} (Task: ${taskId}) [${response.status}]`);
        tasks[taskId] = { status: 'done', result: response.data };
      } catch (error: any) {
        const status = error.response?.status || 500;
        let errorData = error.response?.data;
        
        if (typeof errorData === 'string' && errorData.toLowerCase().includes('<html')) {
          errorData = { 
            message: `接口服务器返回了 HTML 错误页面 (状态码 ${status})。这通常是因为生图耗时过长，导致 API 被其本身的网关拦截并超时 (Gateway Timeout)。建议在面板中尝试换用 1K 分辨率或较快的模型。`,
            isHtmlWrapper: true 
          };
        } else if (!errorData) {
          errorData = { message: error.message };
        }
        
        console.error(`[Proxy Async Error] <- ${url} (Task: ${taskId}) [${status}]:`, errorData.message || error.message);
        tasks[taskId] = { status: 'error', error: errorData, statusCode: status };
      }
    })();
  });

  // 查询异步代理状态
  app.get("/api/proxy/status/:taskId", (req, res) => {
    const task = tasks[req.params.taskId];
    if (!task) {
      return res.status(404).json({ error: "任务已过期或不存在，请重试。" });
    }
    
    if (task.status === 'done') {
      res.json(task.result);
      // 清空结果节约内存
      delete tasks[req.params.taskId];
    } else if (task.status === 'error') {
      res.status(task.statusCode || 500).json(task.error);
      delete tasks[req.params.taskId];
    } else {
      res.status(202).json({ status: 'generating' }); // 202 Accepted
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
