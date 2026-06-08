/**
 * 持久化存储解决方案
 * 在 Vercel serverless 环境中使用文件系统持久化数据
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), '.data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const WORDS_FILE = join(DATA_DIR, 'words.json');
const CATEGORIES_FILE = join(DATA_DIR, 'categories.json');
const CONFIG_FILE = join(DATA_DIR, 'config.json');
const ACCESS_KEYS_FILE = join(DATA_DIR, 'access-keys.json');
const LOGS_FILE = join(DATA_DIR, 'logs.json');
const LOGIN_LOGS_FILE = join(DATA_DIR, 'login-logs.json');

// 确保数据目录存在
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// 读取 JSON 文件
async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    if (existsSync(filePath)) {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

// 写入 JSON 文件
async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await ensureDataDir();
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
}

// 存储接口
export interface Storage<T> {
  get(): Promise<T>;
  set(data: T): Promise<void>;
}

// 创建存储实例
export function createStorage<T>(filePath: string, defaultValue: T): Storage<T> {
  return {
    get: () => readJsonFile(filePath, defaultValue),
    set: (data: T) => writeJsonFile(filePath, data),
  };
}

// 预定义的存储
export const userStorage = createStorage(USERS_FILE, []);
export const wordStorage = createStorage(WORDS_FILE, {});
export const categoryStorage = createStorage(CATEGORIES_FILE, {});
export const configStorage = createStorage(CONFIG_FILE, null);
export const accessKeyStorage = createStorage(ACCESS_KEYS_FILE, {});
export const logStorage = createStorage(LOGS_FILE, {});
export const loginLogStorage = createStorage(LOGIN_LOGS_FILE, {});
