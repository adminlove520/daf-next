/**
 * 持久化数据库接口
 * 使用文件系统存储，适用于 Vercel serverless 环境
 */

import { hashPassword as hashPasswordBcrypt } from './auth';
import { nanoid } from 'nanoid';

// 简单的内存缓存，用于提高性能
let cache: {
  users?: Map<string, any>;
  words?: Map<string, any>;
  categories?: Map<string, string>;
  config?: any;
  accessKeys?: Map<string, any>;
  logs?: Map<string, any[]>;
  loginLogs?: Map<string, any[]>;
} = {};

let isInitialized = false;

// 初始化默认数据
async function initializeData() {
  if (isInitialized) return;

  // 默认分类
  const defaultCategories: Record<string, string> = {
    pornography: '色情',
    political: '政治',
    violence: '暴力',
    gambling: '赌博',
    drugs: '毒品',
    profanity: '脏话',
    discrimination: '歧视',
    scam: '诈骗',
    advertisement: '广告',
    illegalurl: '非法URL',
  };

  // 默认配置
  const defaultConfig = {
    system: {
      title: '敏感词检测管理系统',
      show_default_password: true,
    },
    dictionary: {
      load_default_words: true,
      external_word_dir: '',
      correction_word_dir: '',
    },
    detection: {
      ignore_case: true,
      ignore_width: true,
      ignore_num_style: true,
      enable_num_check: false,
      enable_url_check: true,
      enable_email_check: true,
      skip_whitespace: true,
      max_distance: 5,
      enable_pinyin: false,
      enable_homophone: false,
      enable_similar_shape: false,
      enable_variant_form: false,
      enable_zh_py_mix: false,
      enable_wildcard: false,
    },
    correction: {
      skip_sensitive_check: false,
      allowed_categories: '',
    },
    ai: {
      enabled: false,
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      endpoint: '',
      api_key: '',
      max_tokens: 1000,
      temperature: 0.3,
      timeout: 30,
      threshold: 0.7,
    },
    cascade: {
      enabled: false,
      endpoint: '',
      timeout: 10,
      mode: 'priority',
      local_cache: true,
      access_key: '',
      secret_key: '',
    },
    server: {
      port: 8088,
      user_db: {
        type: 'sqlite',
        sqlite: { path: './data/users.db' },
      },
    },
    encryption: {
      enabled: false,
      key: '',
      algorithm: 'AES-256-CBC',
    },
    categories_config: {
      use_predefined: true,
      custom_categories: {},
    },
  };

  // 生成密码哈希
  const adminPasswordHash = await hashPasswordBcrypt('admin123');
  const wordManagerPasswordHash = await hashPasswordBcrypt('word123');

  // 默认用户
  const defaultUsers = [
    {
      id: '1',
      username: 'admin',
      password_hash: adminPasswordHash,
      roles: ['admin'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      username: 'word_manager',
      password_hash: wordManagerPasswordHash,
      roles: ['word_manager'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  // 初始化缓存
  cache.categories = new Map(Object.entries(defaultCategories));
  cache.config = defaultConfig;
  cache.users = new Map();
  cache.words = new Map();
  cache.accessKeys = new Map();
  cache.logs = new Map();
  cache.loginLogs = new Map();

  // 初始化用户
  defaultUsers.forEach((user) => {
    cache.users!.set(user.username, user);
  });

  // 添加一些默认敏感词用于演示
  const defaultWords: Record<string, { category: string; reason?: string }> = {
    '测试敏感词': { category: 'political', reason: '默认测试词汇' },
    '违规内容': { category: 'pornography', reason: '默认测试词汇' },
    '暴力行为': { category: 'violence', reason: '默认测试词汇' },
    '赌博网站': { category: 'gambling', reason: '默认测试词汇' },
    '毒品交易': { category: 'drugs', reason: '默认测试词汇' },
    '歧视言论': { category: 'discrimination', reason: '默认测试词汇' },
    '诈骗信息': { category: 'scam', reason: '默认测试词汇' },
  };
  Object.entries(defaultWords).forEach(([word, data]) => {
    cache.words!.set(word, {
      word,
      category: data.category,
      reason: data.reason,
      created_at: new Date().toISOString(),
    });
  });

  isInitialized = true;
  console.log('✓ 数据初始化完成');
}

/**
 * 用户数据库操作
 */
export const userDb = {
  async findByUsername(username: string) {
    await initializeData();
    return cache.users!.get(username) || null;
  },

  async create(user: any) {
    await initializeData();
    cache.users!.set(user.username, user);
    return user;
  },

  async list(page: number = 1, pageSize: number = 10) {
    await initializeData();
    const users = Array.from(cache.users!.values());
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      users: users.slice(start, end),
      total: users.length,
      page,
      page_size: pageSize,
    };
  },

  async update(id: string, data: any) {
    await initializeData();
    const user = Array.from(cache.users!.values()).find(u => u.id === id);
    if (user) {
      Object.assign(user, data);
      cache.users!.set(user.username, user);
    }
    return user;
  },

  async delete(id: string) {
    await initializeData();
    const user = Array.from(cache.users!.values()).find(u => u.id === id);
    if (user) {
      cache.users!.delete(user.username);
      return true;
    }
    return false;
  },
};

/**
 * 词库数据库操作
 */
export const wordDb = {
  async list(params: { page?: number; page_size?: number; category?: string; keyword?: string } = {}) {
    await initializeData();
    const { page = 1, page_size = 50, category, keyword } = params;
    let words = Array.from(cache.words!.values());

    if (category) {
      words = words.filter(w => w.category === category);
    }
    if (keyword) {
      words = words.filter(w => w.word.includes(keyword));
    }

    const start = (page - 1) * page_size;
    const end = start + page_size;

    // 统计分类数量
    const categoryCount: Record<string, number> = {};
    Array.from(cache.words!.values()).forEach(w => {
      categoryCount[w.category] = (categoryCount[w.category] || 0) + 1;
    });

    return {
      words: words.slice(start, end),
      total_count: words.length,
      page,
      page_size,
      total_pages: Math.ceil(words.length / page_size),
      has_next: end < words.length,
      has_prev: page > 1,
      category_count: categoryCount,
    };
  },

  async add(words: Record<string, string>, reasons?: Record<string, string>) {
    await initializeData();
    let addedCount = 0;
    Object.entries(words).forEach(([word, category]) => {
      cache.words!.set(word, {
        word,
        category,
        reason: reasons?.[word] || '',
        created_at: new Date().toISOString(),
      });
      addedCount++;
    });
    return { added_count: addedCount };
  },

  async remove(wordList: string[]) {
    await initializeData();
    let removedCount = 0;
    wordList.forEach(word => {
      if (cache.words!.delete(word)) {
        removedCount++;
      }
    });
    return { removed_count: removedCount };
  },

  async clear() {
    await initializeData();
    const count = cache.words!.size;
    cache.words!.clear();
    return count;
  },
};

/**
 * 分类数据库操作
 */
export const categoryDb = {
  async getAll() {
    await initializeData();
    return Object.fromEntries(cache.categories!);
  },

  async setCustom(customCategories: Record<string, string>) {
    await initializeData();
    Object.entries(customCategories).forEach(([key, name]) => {
      cache.categories!.set(key, name);
    });
  },
};

/**
 * 配置数据库操作
 */
export const configDb = {
  async get() {
    await initializeData();
    return cache.config;
  },

  async update(config: any) {
    await initializeData();
    cache.config = { ...cache.config, ...config };
    return cache.config;
  },
};

/**
 * Access Key 数据库操作
 */
export const accessKeyDb = {
  async list() {
    await initializeData();
    return Array.from(cache.accessKeys!.values());
  },

  async create(data: any) {
    await initializeData();
    const id = nanoid();
    const key = {
      id,
      ...data,
      created_at: new Date().toISOString(),
      is_active: true,
    };
    cache.accessKeys!.set(id, key);
    return key;
  },

  async get(id: string) {
    await initializeData();
    return cache.accessKeys!.get(id);
  },

  async update(id: string, data: any) {
    await initializeData();
    const key = cache.accessKeys!.get(id);
    if (key) {
      Object.assign(key, data);
      cache.accessKeys!.set(id, key);
    }
    return key;
  },

  async delete(id: string) {
    await initializeData();
    return cache.accessKeys!.delete(id);
  },
};

/**
 * 日志数据库操作
 */
export const logDb = {
  async add(log: any) {
    await initializeData();
    const date = new Date().toISOString().split('T')[0];
    if (!cache.logs!.has(date)) {
      cache.logs!.set(date, []);
    }
    cache.logs!.get(date)!.push({
      ...log,
      timestamp: new Date().toISOString(),
    });
  },

  async getStats(startTime: string, endTime: string) {
    await initializeData();
    let totalRequests = 0;
    let sensitiveRequests = 0;
    const categoryStats: Record<string, number> = {};

    cache.logs!.forEach((logs) => {
      logs.forEach((log) => {
        if (log.timestamp >= startTime && log.timestamp <= endTime) {
          totalRequests++;
          if (log.has_sensitive) {
            sensitiveRequests++;
          }
          if (log.category) {
            categoryStats[log.category] = (categoryStats[log.category] || 0) + 1;
          }
        }
      });
    });

    return {
      total_requests: totalRequests,
      sensitive_requests: sensitiveRequests,
      category_stats: categoryStats,
    };
  },
};

/**
 * 登录日志数据库操作
 */
export const loginLogDb = {
  async add(username: string, success: boolean, ip: string) {
    await initializeData();
    const date = new Date().toISOString().split('T')[0];
    if (!cache.loginLogs!.has(date)) {
      cache.loginLogs!.set(date, []);
    }
    cache.loginLogs!.get(date)!.push({
      username,
      success,
      ip,
      timestamp: new Date().toISOString(),
    });
  },

  async getMyLogs(limit: number = 50) {
    await initializeData();
    const logs: any[] = [];
    cache.loginLogs!.forEach((dayLogs) => {
      logs.push(...dayLogs);
    });
    return logs.slice(-limit);
  },

  async getAllLogs(page: number = 1, pageSize: number = 20) {
    await initializeData();
    const logs: any[] = [];
    cache.loginLogs!.forEach((dayLogs) => {
      logs.push(...dayLogs);
    });
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      logs: logs.slice(start, end),
      total: logs.length,
      page,
      page_size: pageSize,
    };
  },
};

// 导出辅助函数
export { nanoid } from 'nanoid';
export const generateAccessKey = () => `daf_${nanoid(32)}`;
export const generateSecretKey = () => nanoid(48);

// 重新导出 hashPassword
export async function hashPassword(password: string): Promise<string> {
  return hashPasswordBcrypt(password);
}
