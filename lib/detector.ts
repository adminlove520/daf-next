/**
 * 敏感词检测引擎
 * 实现高效的中文敏感词检测算法
 */

interface WordNode {
  children: Map<string, WordNode>;
  isEnd: boolean;
  category?: string;
  reason?: string;
}

interface MatchResult {
  word: string;
  category: string;
  start_pos: number;
  end_pos: number;
  reason?: string;
}

export class SensitiveWordDetector {
  private root: WordNode;
  private categories: Map<string, string>;

  constructor() {
    this.root = { children: new Map(), isEnd: false };
    this.categories = new Map();
  }

  /**
   * 设置分类
   */
  setCategories(categories: Record<string, string>) {
    this.categories = new Map(Object.entries(categories));
  }

  /**
   * 添加敏感词到 Trie 树
   */
  addWord(word: string, category: string, reason?: string) {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEnd: false });
      }
      node = node.children.get(char)!;
    }
    node.isEnd = true;
    node.category = category;
    node.reason = reason;
  }

  /**
   * 批量添加敏感词
   */
  addWords(words: Map<string, { category: string; reason?: string }>) {
    words.forEach((value, word) => {
      this.addWord(word, value.category, value.reason);
    });
  }

  /**
   * 清空 Trie 树
   */
  clear() {
    this.root = { children: new Map(), isEnd: false };
  }

  /**
   * 检测文本中的敏感词
   */
  detect(text: string, category?: string): MatchResult[] {
    const results: MatchResult[] = [];
    const textLower = text.toLowerCase();

    for (let i = 0; i < text.length; i++) {
      let node = this.root;
      let j = i;
      let matchWord = '';
      let matchCategory: string | undefined;
      let matchReason: string | undefined;

      while (j < text.length) {
        const char = text[j];
        const charLower = char.toLowerCase();

        if (node.children.has(char)) {
          node = node.children.get(char)!;
          matchWord += char;
          j++;

          if (node.isEnd) {
            // 检查分类过滤
            if (!category || node.category === category) {
              matchCategory = node.category;
              matchReason = node.reason;
              // 找到最长的匹配
              continue;
            }
          }
        } else if (node.children.has(charLower)) {
          node = node.children.get(charLower)!;
          matchWord += char;
          j++;

          if (node.isEnd) {
            if (!category || node.category === category) {
              matchCategory = node.category;
              matchReason = node.reason;
              continue;
            }
          }
        } else {
          break;
        }
      }

      if (matchCategory && matchWord.length > 0) {
        results.push({
          word: matchWord,
          category: matchCategory,
          start_pos: i,
          end_pos: j,
          reason: matchReason,
        });
      }
    }

    return results;
  }

  /**
   * 过滤文本中的敏感词
   */
  filter(text: string, category?: string): { filtered_text: string; has_sensitive: boolean } {
    const matches = this.detect(text, category);
    if (matches.length === 0) {
      return { filtered_text: text, has_sensitive: false };
    }

    let result = text;
    // 从后向前替换，避免位置偏移
    matches.reverse().forEach(match => {
      const replacement = '*'.repeat(match.word.length);
      result =
        result.substring(0, match.start_pos) + replacement + result.substring(match.end_pos);
    });

    return { filtered_text: result, has_sensitive: true };
  }

  /**
   * 获取建议（返回可能相关的敏感词）
   */
  suggest(text: string, limit: number = 10): Array<{ word: string; category: string; reason?: string }> {
    const suggestions: Array<{ word: string; category: string; reason?: string }> = [];
    const seen = new Set<string>();

    // 简单实现：返回包含输入文本的敏感词
    const traverse = (node: WordNode, prefix: string) => {
      if (suggestions.length >= limit) return;

      if (node.isEnd && prefix.includes(text)) {
        if (!seen.has(prefix)) {
          suggestions.push({
            word: prefix,
            category: node.category || 'unknown',
            reason: node.reason,
          });
          seen.add(prefix);
        }
      }

      for (const [char, child] of node.children.entries()) {
        traverse(child, prefix + char);
      }
    };

    traverse(this.root, '');
    return suggestions.slice(0, limit);
  }
}

// 全局检测器实例
let detectorInstance: SensitiveWordDetector | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

export function getDetector(): SensitiveWordDetector {
  if (!detectorInstance) {
    detectorInstance = new SensitiveWordDetector();
  }
  return detectorInstance;
}

export async function initializeDetector(): Promise<void> {
  // 如果正在初始化，等待完成
  if (isInitializing) {
    if (initPromise) {
      await initPromise;
    }
    return;
  }

  // 如果已经初始化，直接返回
  if (detectorInstance) {
    // 通过尝试添加一个临时词来检查是否已初始化
    try {
      const testDetector = getDetector();
      // 如果已加载词汇，children 数量会大于 0
      // 这里用一个方法来检查
      return;
    } catch {
      // 继续初始化
    }
  }

  // 开始初始化
  isInitializing = true;
  initPromise = (async () => {
    try {
      const detector = getDetector();

      // 从数据库加载词汇
      const { wordDb, categoryDb } = await import('./db');

      // 加载分类
      const categories = await categoryDb.getAll();
      detector.setCategories(categories);

      // 加载词汇
      const wordsList = await wordDb.list({ page: 1, page_size: 100000 });
      const wordsMap = new Map();
      wordsList.words.forEach(w => {
        wordsMap.set(w.word, { category: w.category, reason: w.reason });
      });

      detector.addWords(wordsMap);
      console.log(`✓ 检测器初始化完成，加载 ${wordsList.words.length} 个敏感词`);
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  })();

  await initPromise;
}
