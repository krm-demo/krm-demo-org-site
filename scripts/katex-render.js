// katex-render.js — renders formulas for scripts/md-to-html.py.
//   stdin:  JSON array of {tex, display}
//   stdout: JSON array of HTML strings, in the same order
// Exit code 3: the "katex" package is not installed (md-to-html.py then leaves the rendering to the browser).
// Exit code 1: a formula could not be parsed; the message names it.
let katex;
try {
  katex = require('katex');
} catch (e) {
  console.error('katex is not installed (run scripts/install-build-deps.sh)');
  process.exit(3);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const out = [];
  for (const item of JSON.parse(input)) {
    try {
      out.push(katex.renderToString(item.tex, { displayMode: item.display, throwOnError: true }));
    } catch (e) {
      console.error(e.message + '\n  in: ' + item.tex);
      process.exit(1);
    }
  }
  process.stdout.write(JSON.stringify(out));
});
