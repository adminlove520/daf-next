/**
 * AI 配置管理 API
 * GET /api/v1/config/ai - 获取 AI 配置
 * POST /api/v1/config/ai - 更新 AI 配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 认证中间件
async function authenticate(req: NextRequest, requireAdmin: boolean = false) {
  const token = extractToken(req.headers.get('authorization'));
  if (!token) {
    return { error: '未提供认证令牌', status: 401 };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: '无效的认证令牌', status: 401 };
  }

  if (requireAdmin && !payload.roles.includes('admin')) {
    return { error: '需要管理员权限', status: 403 };
  }

  return { payload };
}

// GET - 获取 AI 配置
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const config = await prisma.systemConfig.findUnique({
      where: { key: 'ai_config' },
    });

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          provider: 'openai',
          model: 'gpt-4',
          endpoint: '',
          apiKey: '',
          maxTokens: 1000,
          temperature: 0.3,
          timeout: 30,
          threshold: 0.7,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: JSON.parse(config.value),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取 AI 配置失败: ' + error.message,
    }, { status: 500 });
  }
}

// POST - 更新 AI 配置
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req, true);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const data = await req.json();

    // 验证必填字段
    if (!data.provider || !data.model) {
      return NextResponse.json({
        success: false,
        message: 'Provider 和 Model 不能为空',
      }, { status: 400 });
    }

    // 支持的 provider
    const supportedProviders = ['anthropic', 'openai'];
    if (!supportedProviders.includes(data.provider)) {
      return NextResponse.json({
        success: false,
        message: `不支持的 Provider，支持的类型: ${supportedProviders.join(', ')}`,
      }, { status: 400 });
    }

    // 根据 provider 设置默认模型
    const defaultModels = {
      anthropic: 'claude-3-5-sonnet-20241022',
      openai: 'gpt-4',
    };

    const aiConfig = {
      enabled: data.enabled !== undefined ? data.enabled : false,
      provider: data.provider,
      model: data.model || defaultModels[data.provider],
      endpoint: data.endpoint || '',
      apiKey: data.apiKey || '',
      maxTokens: data.maxTokens || 1000,
      temperature: data.temperature || 0.3,
      timeout: data.timeout || 30,
      threshold: data.threshold || 0.7,
    };

    await prisma.systemConfig.upsert({
      where: { key: 'ai_config' },
      update: { value: JSON.stringify(aiConfig) },
      create: { key: 'ai_config', value: JSON.stringify(aiConfig) },
    });

    // 同时更新主配置中的 AI 配置
    const mainConfig = await prisma.systemConfig.findUnique({
      where: { key: 'default' },
    });

    if (mainConfig) {
      const configData = JSON.parse(mainConfig.value);
      configData.ai = aiConfig;
      await prisma.systemConfig.update({
        where: { key: 'default' },
        data: { value: JSON.stringify(configData) },
      });
    }

    // 不返回 API Key 给前端（安全考虑）
    const { apiKey, ...safeConfig } = aiConfig;

    return NextResponse.json({
      success: true,
      data: safeConfig,
      message: 'AI 配置更新成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '更新 AI 配置失败: ' + error.message,
    }, { status: 500 });
  }
}
