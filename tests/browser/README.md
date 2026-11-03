# Browser tests

Each test opens the built app in headless Edge, works through a feature like a user would, and logs what it saw.
A test only counts as failed when it throws, so read the log when checking a new feature.

Needs Windows, Microsoft Edge and Node. They all use port 5599, so run one at a time, and build first with `npm run build`.

```powershell
# Everything (over ten minutes). Prints only failures.
powershell -ExecutionPolicy Bypass -File tests\browser\run-tests.ps1 -dist dist\Kaytia_POS_BackOffice_v1_8_0.html

# Some of them
powershell -ExecutionPolicy Bypass -File tests\browser\run-tests.ps1 -dist dist\Kaytia_POS_BackOffice_v1_8_0.html -names "hr-test,bk-test"

# One, with its full log
node tests\browser\hr-test.js dist\Kaytia_POS_BackOffice_v1_8_0.html
```

## Network sharing

```powershell
# How two tills' changes merge. Add to this whenever the merge changes.
node tests\browser\merge-check.js desktop\merge.js

# Two real copies of the program, each with a real browser. It uses temporary folders, not C:\KaytiaFlow.
npm run build:exe
node tests\browser\lan-e2e.js
```

Check that the stock line in the `lan-e2e` log reads 40 on both computers.
