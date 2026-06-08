/**
 * AI 服务 - 集成 Anthropic 和 OpenAI
 * 用于自动更新敏感词库
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { prisma } from './prisma';

export interface AIWordUpdate {
  word: string;
  category: string;
  reason: string;
}

export interface AIWordUpdateResult {
  success: boolean;
  added: number;
  updated: number;
  error?: string;
  words?: AIWordUpdate[];
}

/**
 * 获取 AI 配置
 */
async function getAIConfig() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'ai_config' },
  });

  if (!config) {
    return {
      enabled: false,
      provider: 'openai',
      model: 'gpt-4',
      endpoint: '',
      apiKey: '',
      maxTokens: 1000,
      temperature: 0.3,
      timeout: 30,
      threshold: 0.7,
    };
  }

  return JSON.parse(config.value);
}

/**
 * 从 AI 获取敏感词更新
 */
export async function getWordUpdatesFromAI(
  prompt: string,
  categories: Record<string, string>
): Promise<AIWordUpdateResult> {
  try {
    const config = await getAIConfig();

    if (!config.enabled || !config.apiKey) {
      return {
        success: false,
        added: 0,
        updated: 0,
        error: 'AI 功能未启用或 API Key 未配置',
      };
    }

    let aiResponse: string;

    if (config.provider === 'anthropic') {
      const anthropic = new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.endpoint || undefined,
      });

      const message = await anthropic.messages.create({
        model: config.model,
        maxTokens: config.maxTokens,
        messages: [
          {
            role: 'user',
            content: `${prompt}

请以 JSON 格式返回，格式如下：
[
  {
    "word": "敏感词",
    "category": "分类key",
    "reason": "原因说明"
  }
]

可用的分类：${Object.keys(categories).join(', ')}`,
          },
        ],
      });

      aiResponse = message.content[0].type === 'text' ? message.content[0].text : '';
    } else {
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint || undefined,
      });

      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: `你是一个敏感词分析专家。${prompt}

请以 JSON 格式返回，格式如下：
[
  {
    "word": "敏感词",
    "category": "分类key",
    "reason": "原因说明"
  }
]

可用的分类：${Object.keys(categories).join(', ')}`,
          },
        ],
        temperature: config.temperature,
      });

      aiResponse = response.choices[0].message.content || '';
    }

    // 解析 AI 响应
    const words = parseAIResponse(aiResponse);

    return {
      success: true,
      added: words.length,
      updated: 0,
      words,
    };
  } catch (error: any) {
    return {
      success: false,
      added: 0,
      updated: 0,
      error: error.message,
    };
  }
}

/**
 * 解析 AI 响应
 */
function parseAIResponse(response: string): AIWordUpdate[] {
  try {
    // 尝试提取 JSON 数组
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 使用 AI 扩展敏感词库
 */
export async function expandWordLibrary(
  theme: string,
  category: string
): Promise<AIWordUpdateResult> {
  const prompt = `请为主题"${theme}"生成相关的敏感词列表。
所有词汇应该属于分类：${category}。
每个词汇都需要提供详细的原因说明。
请生成 10-20 个相关的敏感词。`;

  // 获取分类
  const categories = await prisma.category.findMany();
  const categoryMap = Object.fromEntries(
    categories.map(c => [c.key, c.name])
  );

  return getWordUpdatesFromAI(prompt, categoryMap);
}

/**
 * 使用 AI 分析和更新现有敏感词
 */
export async function analyzeAndUpdateWords(
  text: string
): Promise<AIWordUpdateResult> {
  const prompt = `请分析以下文本，提取其中可能包含的敏感词：
${text}

对于每个识别出的敏感词，请：
1. 确定敏感词本身
2. 分类到合适的类别（political, pornography, violence, gambling, drugs, profanity, discrimination, scam, advertisement, illegalurl）
3. 提供原因说明`;

  // 获取分类
  const categories = await prisma.category.findMany();
  const categoryMap = Object.fromEntries(
    categories.map(c => [c.key, c.name])
  );

  return getWordUpdatesFromAI(prompt, categoryMap);
}

/**
 * 检查 AI 配置状态
 */
export async function checkAIConfig() {
  const config = await getAIConfig();
  return {
    enabled: config.enabled,
    configured: !!config.apiKey,
    provider: config.provider,
    model: config.model,
  };
}
