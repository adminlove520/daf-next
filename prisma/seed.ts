/**
 * 数据库种子文件
 * 初始化默认数据
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始种子数据...');

  // 默认分类
  const categories = [
    { key: 'pornography', name: '色情' },
    { key: 'political', name: '政治' },
    { key: 'violence', name: '暴力' },
    { key: 'gambling', name: '赌博' },
    { key: 'drugs', name: '毒品' },
    { key: 'profanity', name: '脏话' },
    { key: 'discrimination', name: '歧视' },
    { key: 'scam', name: '诈骗' },
    { key: 'advertisement', name: '广告' },
    { key: 'illegalurl', name: '非法URL' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { key: category.key },
      update: { name: category.name },
      create: category,
    });
  }

  // 生成密码哈希
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const wordManagerPasswordHash = await bcrypt.hash('word123', 10);

  // 默认用户
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      roles: JSON.stringify(['admin']),
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'word_manager' },
    update: {},
    create: {
      username: 'word_manager',
      passwordHash: wordManagerPasswordHash,
      roles: JSON.stringify(['word_manager']),
      isActive: true,
    },
  });

  // 默认敏感词
  const defaultWords = [
    { word: '测试敏感词', category: 'political', reason: '默认测试词汇' },
    { word: '违规内容', category: 'pornography', reason: '默认测试词汇' },
    { word: '暴力行为', category: 'violence', reason: '默认测试词汇' },
    { word: '赌博网站', category: 'gambling', reason: '默认测试词汇' },
    { word: '毒品交易', category: 'drugs', reason: '默认测试词汇' },
    { word: '歧视言论', category: 'discrimination', reason: '默认测试词汇' },
    { word: '诈骗信息', category: 'scam', reason: '默认测试词汇' },
  ];

  for (const wordData of defaultWords) {
    await prisma.sensitiveWord.upsert({
      where: { word: wordData.word },
      update: { category: wordData.category, reason: wordData.reason },
      create: wordData,
    });
  }

  // 默认系统配置
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

  await prisma.systemConfig.upsert({
    where: { key: 'default' },
    update: { value: JSON.stringify(defaultConfig) },
    create: { key: 'default', value: JSON.stringify(defaultConfig) },
  });

  console.log('种子数据完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
