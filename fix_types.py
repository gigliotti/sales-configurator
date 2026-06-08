import re

filepath = r"c:\Users\camet\Dropbox\5_diseno\Herno\3d_sales\sales-configurator\src\__tests__\e2e.test.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace single character arguments c, w, p in arrow functions to have : any type annotation
# e.g., "c =>" to "(c: any) =>"
content = re.sub(r'\b(c|w|p) =>', r'(\1: any) =>', content)

# Also fix the proxy target parameters
content = content.replace('get(target, prop)', 'get(_target, prop)')
content = content.replace('set(target, prop, value)', 'set(_target, prop, value)')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed types in e2e.test.ts successfully!")
