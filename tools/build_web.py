"""Inlines web/lux_data.js + web/java_ui.js into web/index.src.html -> assets/index.html
(the Activity loads the page as one string, so everything must be inline)."""
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
src = rd('web/index.src.html')
assert '/*@@INLINE@@*/' in src
html = src.replace('/*@@INLINE@@*/', rd('web/lux_data.js') + '\n' + rd('web/java_ui.js'))
open(os.path.join(root, 'assets/index.html'), 'w', encoding='utf-8').write(html)
print('assets/index.html', len(html), 'bytes')
