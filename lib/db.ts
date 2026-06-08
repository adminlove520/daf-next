/**
 * Prisma 数据库接口
 * 替代原来的内存存储，提供持久化存储
 */

import { prisma } from './prisma';
import { hashPassword as hashPasswordBcrypt } from './auth';
import { nanoid } from 'nanoid';

/**
 * 用户数据库操作
 */
export const userDb = {
  async findByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
    });
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      password_hash: user.passwordHash,
      roles: JSON.parse(user.roles),
      is_active: user.isActive,
      created_at: user.createdAt.toISOString(),
    };
  },

  async create(user: any) {
    const newUser = await prisma.user.create({
      data: {
        username: user.username,
        passwordHash: user.password_hash,
        roles: JSON.stringify(user.roles),
        isActive: user.is_active,
      },
    });

    return {
      id: newUser.id,
      username: newUser.username,
      password_hash: newUser.passwordHash,
      roles: JSON.parse(newUser.roles),
      is_active: newUser.isActive,
      created_at: newUser.createdAt.toISOString(),
    };
  },

  async list(page: number = 1, pageSize: number = 10) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return {
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        password_hash: u.passwordHash,
        roles: JSON.parse(u.roles),
        is_active: u.isActive,
        created_at: u.createdAt.toISOString(),
      })),
      total,
      page,
      page_size: pageSize,
    };
  },

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.username) updateData.username = data.username;
    if (data.password_hash) updateData.passwordHash = data.password_hash;
    if (data.roles) updateData.roles = JSON.stringify(data.roles);
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return {
      id: user.id,
      username: user.username,
      password_hash: user.passwordHash,
      roles: JSON.parse(user.roles),
      is_active: user.isActive,
      created_at: user.createdAt.toISOString(),
    };
  },

  async delete(id: string) {
    try {
      await prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * 词库数据库操作
 */
export const wordDb = {
  async list(params: { page?: number; page_size?: number; category?: string; keyword?: string } = {}) {
    const { page = 1, page_size = 50, category, keyword } = params;

    const where: any = {};
    if (category) where.category = category;
    if (keyword) where.word = { contains: keyword };

    const [words, total_count] = await Promise.all([
      prisma.sensitiveWord.findMany({
        where,
        skip: (page - 1) * page_size,
        take: page_size,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sensitiveWord.count({ where }),
    ]);

    // 获取分类统计
    const allWords = await prisma.sensitiveWord.findMany();
    const categoryCount: Record<string, number> = {};
    allWords.forEach(w => {
      categoryCount[w.category] = (categoryCount[w.category] || 0) + 1;
    });

    return {
      words: words.map(w => ({
        word: w.word,
        category: w.category,
        reason: w.reason,
        created_at: w.createdAt.toISOString(),
      })),
      total_count,
      page,
      page_size,
      total_pages: Math.ceil(total_count / page_size),
      has_next: page * page_size < total_count,
      has_prev: page > 1,
      category_count: categoryCount,
    };
  },

  async add(words: Record<string, string>, reasons?: Record<string, string>) {
    let addedCount = 0;

    for (const [word, category] of Object.entries(words)) {
      try {
        await prisma.sensitiveWord.create({
          data: {
            word,
            category,
            reason: reasons?.[word] || '',
          },
        });
        addedCount++;
      } catch {
        // 词汇已存在，跳过
      }
    }

    return { added_count: addedCount };
  },

  async remove(wordList: string[]) {
    let removedCount = 0;

    for (const word of wordList) {
      try {
        await prisma.sensitiveWord.delete({
          where: { word },
        });
        removedCount++;
      } catch {
        // 词汇不存在，跳过
      }
    }

    return { removed_count: removedCount };
  },

  async clear() {
    const count = await prisma.sensitiveWord.count();
    await prisma.sensitiveWord.deleteMany({});
    return count;
  },
};

/**
 * 分类数据库操作
 */
export const categoryDb = {
  async getAll() {
    const categories = await prisma.category.findMany();
    return Object.fromEntries(categories.map(c => [c.key, c.name]));
  },

  async setCustom(customCategories: Record<string, string>) {
    for (const [key, name] of Object.entries(customCategories)) {
      await prisma.category.upsert({
        where: { key },
        update: { name },
        create: { key, name },
      });
    }
  },
};

/**
 * 配置数据库操作
 */
export const configDb = {
  async get() {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'default' },
    });

    if (!config) return null;

    return JSON.parse(config.value);
  },

  async update(config: any) {
    const current = await configDb.get();
    const mergedConfig = { ...current, ...config };

    await prisma.systemConfig.upsert({
      where: { key: 'default' },
      update: { value: JSON.stringify(mergedConfig) },
      create: { key: 'default', value: JSON.stringify(mergedConfig) },
    });

    return mergedConfig;
  },
};

/**
 * Access Key 数据库操作
 */
export const accessKeyDb = {
  async list() {
    const keys = await prisma.accessKey.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return keys.map(k => ({
      id: k.id,
      name: k.name,
      description: k.description,
      access_key: k.accessKey,
      secret_key: k.secretKey,
      permissions: JSON.parse(k.permissions),
      ip_whitelist: k.ipWhitelist ? JSON.parse(k.ipWhitelist) : [],
      rate_limit: k.rateLimit,
      expires_at: k.expiresAt?.toISOString(),
      is_active: k.isActive,
      created_at: k.createdAt.toISOString(),
    }));
  },

  async create(data: any) {
    const key = await prisma.accessKey.create({
      data: {
        name: data.name,
        description: data.description,
        accessKey: data.access_key,
        secretKey: data.secret_key,
        permissions: JSON.stringify(data.permissions),
        ipWhitelist: data.ip_whitelist ? JSON.stringify(data.ip_whitelist) : null,
        rateLimit: data.rate_limit || 1000,
        expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      },
    });

    return {
      id: key.id,
      name: key.name,
      description: key.description,
      access_key: key.accessKey,
      secret_key: key.secretKey,
      permissions: JSON.parse(key.permissions),
      ip_whitelist: key.ipWhitelist ? JSON.parse(key.ipWhitelist) : [],
      rate_limit: key.rateLimit,
      expires_at: key.expiresAt?.toISOString(),
      is_active: key.isActive,
      created_at: key.createdAt.toISOString(),
    };
  },

  async get(id: string) {
    const key = await prisma.accessKey.findUnique({
      where: { id },
    });

    if (!key) return null;

    return {
      id: key.id,
      name: key.name,
      description: key.description,
      access_key: key.accessKey,
      secret_key: key.secretKey,
      permissions: JSON.parse(key.permissions),
      ip_whitelist: key.ipWhitelist ? JSON.parse(key.ipWhitelist) : [],
      rate_limit: key.rateLimit,
      expires_at: key.expiresAt?.toISOString(),
      is_active: key.isActive,
      created_at: key.createdAt.toISOString(),
    };
  },

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.permissions) updateData.permissions = JSON.stringify(data.permissions);
    if (data.ip_whitelist) updateData.ipWhitelist = JSON.stringify(data.ip_whitelist);
    if (data.rate_limit) updateData.rateLimit = data.rate_limit;
    if (data.expires_at !== undefined) updateData.expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    const key = await prisma.accessKey.update({
      where: { id },
      data: updateData,
    });

    return {
      id: key.id,
      name: key.name,
      description: key.description,
      access_key: key.accessKey,
      secret_key: key.secretKey,
      permissions: JSON.parse(key.permissions),
      ip_whitelist: key.ipWhitelist ? JSON.parse(key.ipWhitelist) : [],
      rate_limit: key.rateLimit,
      expires_at: key.expiresAt?.toISOString(),
      is_active: key.isActive,
      created_at: key.createdAt.toISOString(),
    };
  },

  async delete(id: string) {
    try {
      await prisma.accessKey.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * 日志数据库操作
 */
export const logDb = {
  async add(log: any) {
    await prisma.detectionLog.create({
      data: {
        text: log.text,
        hasSensitive: log.has_sensitive || false,
        category: log.category,
        username: log.user,
        matchCount: log.match_count || 0,
      },
    });
  },

  async getStats(startTime: string, endTime: string) {
    const logs = await prisma.detectionLog.findMany({
      where: {
        createdAt: {
          gte: new Date(startTime),
          lte: new Date(endTime),
        },
      },
    });

    const total_requests = logs.length;
    const sensitive_requests = logs.filter(l => l.hasSensitive).length;
    const category_stats: Record<string, number> = {};

    logs.forEach(log => {
      if (log.category) {
        category_stats[log.category] = (category_stats[log.category] || 0) + 1;
      }
    });

    return {
      total_requests,
      sensitive_requests,
      category_stats,
    };
  },
};

/**
 * 登录日志数据库操作
 */
export const loginLogDb = {
  async add(username: string, success: boolean, ip: string) {
    await prisma.loginLog.create({
      data: { username, success, ip },
    });
  },

  async getMyLogs(limit: number = 50) {
    const logs = await prisma.loginLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(log => ({
      username: log.username,
      success: log.success,
      ip: log.ip,
      timestamp: log.createdAt.toISOString(),
    }));
  },

  async getAllLogs(page: number = 1, pageSize: number = 20) {
    const [logs, total] = await Promise.all([
      prisma.loginLog.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.loginLog.count(),
    ]);

    return {
      logs: logs.map(log => ({
        username: log.username,
        success: log.success,
        ip: log.ip,
        timestamp: log.createdAt.toISOString(),
      })),
      total,
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
