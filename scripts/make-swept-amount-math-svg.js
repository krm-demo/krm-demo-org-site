#!/usr/bin/env node
// Draws site/projects/swept-amount-math/swept-amount-math.svg — the static picture of the "Balances Equilibrium" widget (cash sweep math)
// (its size XS and the fallback without JavaScript) — with the widget's own code, so the two never drift apart.
// No dependencies. Run by hand after changing the widget; the result is committed.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'site', 'projects', 'swept-amount-math');
const sam = require(path.join(dir, 'swept-amount-math.js'));
const out = path.join(dir, 'swept-amount-math.svg');
fs.writeFileSync(out, sam.staticSvg());
console.log('wrote ' + path.relative(process.cwd(), out));
