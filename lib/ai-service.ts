/**
 * AI 服务 - 集成 Anthropic 和 OpenAI
 * 用于自动更新敏感词库
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

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
 * 从 AI 获取敏感词更新
 */
export async function getWordUpdatesFromAI(
  prompt: string,
  provider: 'anthropic' | 'openai',
  categories: Record<string, string>
): Promise<AIWordUpdateResult> {
  try {
    let aiResponse: string;

    if (provider === 'anthropic') {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
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

可用的分类：${Object.keys(categories).join(', ')}
`,
          },
        ],
      });

      aiResponse = message.content[0].type === 'text' ? message.content[0].text : '';
    } else {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
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
        temperature: 0.3,
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
  category: string,
  provider: 'anthropic' | 'openai' = 'openai'
): Promise<AIWordUpdateResult> {
  const prompt = `请为主题"${theme}"生成相关的敏感词列表。
所有词汇应该属于分类：${category}。
每个词汇都需要提供详细的原因说明。
请生成 10-20 个相关的敏感词。`;

  return getWordUpdatesFromAI(prompt, provider, {});
}

/**
 * 使用 AI 分析和更新现有敏感词
 */
export async function analyzeAndUpdateWords(
  text: string,
  provider: 'anthropic' | 'openai' = 'openai'
): Promise<AIWordUpdateResult> {
  const prompt = `请分析以下文本，提取其中可能包含的敏感词：
${text}

对于每个识别出的敏感词，请：
1. 确定敏感词本身
2. 分类到合适的类别（political, pornography, violence, gambling, drugs, profanity, discrimination, scam, advertisement, illegalurl）
3. 提供原因说明`;

  return getWordUpdatesFromAI(prompt, provider, {});
}
