/**
 * AI 扩展敏感词库 API
 * POST /api/v1/ai/words/expand
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { expandWordLibrary, getWordUpdatesFromAI, checkAIConfig } from '@/lib/ai-service';

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

    // 检查 AI 配置
    const aiStatus = await checkAIConfig();
    if (!aiStatus.configured) {
      return NextResponse.json({
        success: false,
        message: 'AI 功能未配置，请先在系统配置中设置 AI Provider 和 API Key',
        data: aiStatus,
      }, { status: 400 });
    }

    if (!aiStatus.enabled) {
      return NextResponse.json({
        success: false,
        message: 'AI 功能未启用',
        data: aiStatus,
      }, { status: 400 });
    }

    const { theme, category, prompt, customCategories } = await req.json();

    // 获取分类
    const categories = await prisma.category.findMany();
    const categoryMap = Object.fromEntries(
      categories.map(c => [c.key, c.name])
    );

    let result;
    if (prompt) {
      // 自定义提示词
      result = await getWordUpdatesFromAI(prompt, customCategories || categoryMap);
    } else if (theme && category) {
      // 使用主题扩展
      result = await expandWordLibrary(theme, category);
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
          provider: aiStatus.provider,
          model: aiStatus.model,
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
        provider: aiStatus.provider,
        model: aiStatus.model,
        prompt: prompt || `扩展主题：${theme}, 分类：${category}`,
        addedWords: addedCount,
        updatedWords: 0,
        status: 'success',
      },
    });

    // 重新初始化检测器
    try {
      const { initializeDetector } = await import('@/lib/detector');
      await initializeDetector();
    } catch (detectorError) {
      console.error('重新初始化检测器失败:', detectorError);
    }

    return NextResponse.json({
      success: true,
      data: {
        added: addedCount,
        total: result.words?.length || 0,
        words: result.words?.slice(0, 10), // 只返回前 10 个作为示例
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
