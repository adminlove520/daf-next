/**
 * AI 扩展敏感词库 API
 * POST /api/v1/ai/words/expand
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { expandWordLibrary, getWordUpdatesFromAI } from '@/lib/ai-service';

export async function POST(req: NextRequest) {
  try {
    // 验证权限
    const token = extractToken(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({
        success: false,
        message: '未提供认证令牌',
      }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        message: '无效的认证令牌',
      }, { status: 401 });
    }

    if (!payload.roles.includes('admin') && !payload.roles.includes('word_manager')) {
      return NextResponse.json({
        success: false,
        message: '需要管理员或词库管理员权限',
      }, { status: 403 });
    }

    const { theme, category, provider = 'openai', prompt, customCategories } = await req.json();

    // 获取分类
    const categories = await prisma.category.findMany();
    const categoryMap = Object.fromEntries(
      categories.map(c => [c.key, c.name])
    );

    let result;
    if (prompt) {
      // 自定义提示词
      result = await getWordUpdatesFromAI(prompt, provider, customCategories || categoryMap);
    } else if (theme && category) {
      // 使用主题扩展
      result = await expandWordLibrary(theme, category, provider);
    } else {
      return NextResponse.json({
        success: false,
        message: '请提供 theme 和 category，或提供自定义 prompt',
      }, { status: 400 });
    }

    if (!result.success) {
      // 记录失败历史
      await prisma.wordUpdateHistory.create({
        data: {
          provider,
          model: provider === 'anthropic' ? 'claude-3-5-sonnet' : 'gpt-4',
          prompt: prompt || `扩展主题：${theme}, 分类：${category}`,
          addedWords: 0,
          updatedWords: 0,
          status: 'error',
          errorMessage: result.error,
        },
      });

      return NextResponse.json({
        success: false,
        message: 'AI 获取失败',
        error: result.error,
      }, { status: 500 });
    }

    // 添加新词汇到数据库
    let addedCount = 0;
    if (result.words) {
      for (const wordData of result.words) {
        try {
          await prisma.sensitiveWord.upsert({
            where: { word: wordData.word },
            update: {
              category: wordData.category,
              reason: wordData.reason,
            },
            create: {
              word: wordData.word,
              category: wordData.category,
              reason: wordData.reason,
            },
          });
          addedCount++;
        } catch {
          // 跳过重复或无效的词汇
        }
      }
    }

    // 记录成功历史
    await prisma.wordUpdateHistory.create({
      data: {
        provider,
        model: provider === 'anthropic' ? 'claude-3-5-sonnet' : 'gpt-4',
        prompt: prompt || `扩展主题：${theme}, 分类：${category}`,
        addedWords: addedCount,
        updatedWords: 0,
        status: 'success',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        added: addedCount,
        total: result.words?.length || 0,
        words: result.words,
      },
      message: `成功添加 ${addedCount} 个敏感词`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '扩展敏感词库失败: ' + error.message,
    }, { status: 500 });
  }
}
