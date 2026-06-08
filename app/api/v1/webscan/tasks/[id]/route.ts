/**
 * WebScan 任务详细操作 API
 * GET /api/v1/webscan/tasks/:id - 获取任务详情
 * DELETE /api/v1/webscan/tasks/:id - 删除任务
 * POST /api/v1/webscan/tasks/:id/start - 启动任务
 * POST /api/v1/webscan/tasks/:id/cancel - 取消任务
 * GET /api/v1/webscan/tasks/:id/progress - 获取进度
 * GET /api/v1/webscan/tasks/:id/report - 获取报告
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken } from '@/lib/auth';
import { getTask, deleteTask, updateTask } from '@/lib/webscan';

// 认证中间件
async function authenticate(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  if (!token) {
    return { error: '未提供认证令牌', status: 401 };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: '无效的认证令牌', status: 401 };
  }

  return { payload };
}

// 获取任务
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const task = getTask(id);
    if (!task) {
      return NextResponse.json({ success: false, message: '任务不存在' }, { status: 404 });
    }

    // 检查是否是 progress 或 report 子路径
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart === 'progress') {
      return NextResponse.json({
        success: true,
        data: {
          task_id: task.id,
          status: task.status,
          progress: task.progress,
        },
      });
    }

    if (lastPart === 'report') {
      const report = {
        task_id: task.id,
        target_url: task.config.target_url || '',
        start_time: task.start_time || '',
        end_time: task.end_time || '',
        duration: task.end_time && task.start_time
          ? new Date(task.end_time).getTime() - new Date(task.start_time).getTime()
          : 0,
        total_pages: 0,
        total_errors: 0,
        total_links: 0,
        total_resources: 0,
        pages: [],
        summary: {
          by_type: {},
          by_severity: {},
          top_errors: [],
        },
        sensitive_summary: {
          total_words: 0,
          by_category: {},
          by_page: {},
          top_words: [],
        },
      };

      // 如果有结果，添加到报告中
      if (task.result) {
        Object.assign(report, task.result);
      }

      return NextResponse.json({ success: true, data: report });
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '获取任务失败: ' + error.message,
    }, { status: 500 });
  }
}

// 删除任务
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const success = deleteTask(id);
    if (!success) {
      return NextResponse.json({ success: false, message: '任务不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '任务删除成功' });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '删除任务失败: ' + error.message,
    }, { status: 500 });
  }
}

// 处理 POST 操作 (start/cancel)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const task = getTask(id);
    if (!task) {
      return NextResponse.json({ success: false, message: '任务不存在' }, { status: 404 });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart === 'start') {
      if (task.status !== 'pending' && task.status !== 'failed') {
        return NextResponse.json({
          success: false,
          message: '任务状态不允许启动',
        }, { status: 400 });
      }

      updateTask(id, {
        status: 'running',
        start_time: new Date().toISOString(),
        progress: 0,
      });

      return NextResponse.json({ success: true, message: '扫描任务已启动' });
    }

    if (lastPart === 'cancel') {
      if (task.status !== 'running' && task.status !== 'pending') {
        return NextResponse.json({
          success: false,
          message: '任务状态不允许取消',
        }, { status: 400 });
      }

      updateTask(id, {
        status: 'cancelled',
        end_time: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, message: '扫描任务已取消' });
    }

    return NextResponse.json({ success: false, message: '无效的操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: '操作失败: ' + error.message,
    }, { status: 500 });
  }
}
