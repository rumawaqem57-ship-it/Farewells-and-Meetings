import json

# 读取参考世界书
with open('C:\\Users\\yyl\\.dsh\\attachments\\v1\\files\\ca\\caf5d98407d7669e8e824a7fd5f4f9291379ed41751136e4c7d6bca28a6005e2\\是好男孩吗我问你.json', 'r', encoding='utf-8') as f:
    wb = json.load(f)

# 提取所有条目
entries = []
if isinstance(wb.get('entries'), dict):
    for key, entry in wb['entries'].items():
        if isinstance(entry, dict):
            entries.append(entry)

print(f"总条目数: {len(entries)}\n")

# 查找包含 CoT 相关关键词的条目
cot_keywords = ['cot', 'CoT', 'COT', '思考', '思维链', '推理', '内心', '分析']
cot_entries = []

for entry in entries:
    comment = entry.get('comment', '')
    key_field = entry.get('key', [])
    content = entry.get('content', '')
    
    # 转换 key 为字符串
    if isinstance(key_field, list):
        key_str = ','.join(key_field)
    else:
        key_str = str(key_field)
    
    # 检查是否包含 CoT 相关关键词
    combined = f"{comment} {key_str} {content[:500]}"
    if any(kw in combined for kw in cot_keywords):
        cot_entries.append({
            'uid': entry.get('uid', 'unknown'),
            'comment': comment,
            'key': key_str[:100],
            'content': content[:800]
        })

print(f"找到 {len(cot_entries)} 个可能包含CoT的条目\n")

# 输出到文件
with open('cot_analysis.txt', 'w', encoding='utf-8') as out:
    out.write(f"找到 {len(cot_entries)} 个可能包含CoT的条目\n\n")
    
    # 显示前 5 个 CoT 条目
    for i, entry in enumerate(cot_entries[:5], 1):
        out.write(f"{'='*60}\n")
        out.write(f"[{i}] uid: {entry['uid']}\n")
        out.write(f"comment: {entry['comment']}\n")
        out.write(f"key: {entry['key']}\n")
        out.write(f"\ncontent (前800字):\n")
        out.write(entry['content'])
        out.write("\n\n")

print("分析结果已保存到 cot_analysis.txt")
