# **Development Plan: Finish the CRA to Vite Migration (Issue 4\)**

**Owner:** Deepesh Katudia  
**Pipeline contact:** Sahana Balaji  
**Branch:** chore/frontend-cra-to-vite (last commit 75388650, Sept 7\)  
**Date:** September 24, 2026  
**Severity:** P1. The branch is close to done, but merging it as-is would take the production site down.

## **Summary**

Deepesh's migration work is solid. It takes the frontend from 47 audit findings to 5, with zero high or critical, and keeps full test parity. His own write-up (documentation/frontend-cra-to-vite-migration.md) is thorough and stays the reference for the migration itself.  
The branch was cut on August 23\. main has moved since then. PR \#208 (environment separation) merged, and it changed how the frontend reads its production URLs. Vite cannot handle the new pattern. The fix is small and has already been tested against a trial merge of the branch into current main. Four other pieces of work also need to land around it: Thrishma's frontend audit branch, the Node 24 pin, Sahana's CD pipeline, and one smoke test in that pipeline.

## **Note on method**

Every finding below comes from a trial merge of chore/frontend-cra-to-vite into main as of September 24 (cb499441). I resolved the conflicts, ran npm ci, built with all five REACT\_APP\_\* variables set, and inspected the compiled bundle. I then applied the fix, rebuilt, and ran the full Jest suite. Docker was not available, so the Docker build itself is still unverified. Deepesh's write-up flagged the same gap.

## **Confirmed findings**

### **1\. The production bundle crashes on load (critical)**

\#208's environment.prod.js reads required URLs through a dynamic lookup, process.env\[name\]. In a production build, Vite replaces a bare process.env with an empty object. The compiled bundle contains:  
``var P=e=>{let t={}[e];if(!t)throw Error(`Missing required production environment variable: ${e}`)...}``  
The lookup always returns nothing. The app throws as soon as it loads, even when Docker passed every variable correctly. Visitors get a blank page. The error message is also misleading, because it says a variable is missing when it isn't.  
None of the current checks catch it:

> * vite build succeeds.  
> * All Jest tests pass, because Jest runs in Node, where process.env is real.  
> * The Dockerfile healthcheck passes, because serve still returns HTTP 200 for index.html.  
> * Sahana's curl \--fail smoke test passes for the same reason.

**Correction to earlier advice:** I previously suggested a check that fails if the bundle contains the string process.env. That check would not catch this bug. Vite already removed the string, and the broken bundle contains none. The checks in Phases 3 and 6 look for the injected values instead.

### **2\. Two merge conflicts, and the obvious resolution is wrong**

ActivitiesModal.tsx and LeaderboardModal.tsx conflict. Each side changed one line of the same import block:

> * The Vite branch converted the SVG imports to import X from "...svg?react".  
> * main (\#208) changed the environment import from environments/environment to environments.

Taking the Vite side wholesale brings back the hardcoded-dev import that \#208 fixed. Keep both changes: Vite's ?react SVG imports, plus main's environments path. After resolving, no ReactComponent as SVG imports and no environments/environment imports remain in src/. Both were checked by grep.

### **3\. Docker: the Node version sits on Vite's floor**

Vite 8 requires Node ^20.19.0 or \>=22.12.0. The Node 18 Dockerfile on main cannot build it. The branch pins node:20.19.0-alpine, which reached end-of-life in April 2026 and sits exactly on Vite's minimum. The team is standardizing on Node 24 (Sweksha's pin). Other checks:

> * The ARG/ENV REACT\_APP\_\* lines from \#208 merge cleanly into the branch's Dockerfile.  
> * The lockfile already includes the Alpine (musl) native binaries Vite needs (@rolldown/binding-linux-x64-musl, lightningcss-linux-x64-musl).  
> * Output stays in build/, so the runtime stage (serve \-s build, port 3000\) is unchanged.  
> * The Dockerfile uses npm install instead of npm ci, so image builds can drift from the lockfile.

### **4\. Pre-existing: password reset calls localhost in production**

reset-password.tsx (line 18\) and set-password.tsx (line 40\) read process.env.REACT\_APP\_API\_URL. Nothing sets that variable: not CI, the Dockerfile, deploy.yml, or tag\_build\_containers.sh. The production bundle therefore falls back to http://localhost:8000 for both calls. The same was true under CRA, so Vite didn't cause it. Confirm on the live site. Both files call {base}/user/..., the same shape as environment.urls.middlewareURL everywhere else, so the fix is a one-line swap in each file.

### **5\. Other branches touch the same files**

> * Thrishma's chore/npm-audit-fix-frontend merges cleanly onto main alone. Once it merges, the Vite branch will conflict with it on package.json and package-lock.json. Her change worth keeping is socket.io-client ^4.8.3.  
> * Sahana's sahana/208-azure-cicd doesn't touch any frontend file. Her deploy.yml builds ./react-ystemandchess with the same build-arg names, so it needs no changes for Vite apart from the smoke test in Phase 6\.

## **Fix phases**

### **Phase 0: Prerequisites (not Deepesh's work, but they gate the merge)**

> 1. Thrishma's chore/npm-audit-fix-frontend merges to main.  
> 2. Sweksha's Node 24 pin merges to main.  
> 3. Sahana's CD pipeline merges, so the Vite change ships through it as a normal PR.

Deepesh can do Phases 1 through 5 in parallel with these. Only the final merge waits.

### **Phase 1: Rebase onto main**

> 1. Rebase (or merge main into) chore/frontend-cra-to-vite.  
> 2. Resolve the two .tsx conflicts as described in Finding 2\. Keep ?react SVG imports and the environments path.  
> 3. If Thrishma's branch has merged, take main's package.json, re-apply the Vite dependency changes, and run npm install to regenerate the lockfile. Keep socket.io-client ^4.8.3.  
> 4. Grep src/ for ReactComponent as and for environments/environment". Both should return nothing.

### **Phase 2: Fix how the environment variables reach the bundle**

Tested: after this change, all five values appear in the compiled bundle, a missing required URL still fails fast (the behavior \#208 intended), and Jest passes 30 of 30 suites and 155 of 155 tests.  
**src/environments/environment.prod.js**: pass each value by its literal name, so Vite can replace it.  
`// Each variable is referenced by its full literal name (process.env.REACT_APP_X)`  
``// because Vite's `define` can only replace static references, never a dynamic``  
`// process.env[name] lookup. vite.config.mts lists every one of them.`  
`const requiredProductionEnv = (name, value) => {`  
        `if (process.env.NODE_ENV === 'production' && !value) {`  
                ``throw new Error(`Missing required production environment variable: ${name}`);``  
        `}`  
        `return value || '';`  
`};`

`middlewareURL: requiredProductionEnv('REACT_APP_MIDDLEWARE_URL', process.env.REACT_APP_MIDDLEWARE_URL),`  
`stockfishServerURL: requiredProductionEnv('REACT_APP_STOCKFISH_SERVER_URL', process.env.REACT_APP_STOCKFISH_SERVER_URL),`  
`chessServerURL: requiredProductionEnv('REACT_APP_CHESS_SERVER_URL', process.env.REACT_APP_CHESS_SERVER_URL),`  
**vite.config.mts**: add all five variables to define, next to the existing two.  
`define: {`  
  `...Object.fromEntries(`  
    `[`  
      `'REACT_APP_MIDDLEWARE_URL',`  
      `'REACT_APP_STOCKFISH_SERVER_URL',`  
      `'REACT_APP_CHESS_SERVER_URL',`  
      `'REACT_APP_CHESS_CLIENT_URL',`  
      `'REACT_APP_AGORA_APP_ID',`  
    ``].map((name) => [`process.env.${name}`, JSON.stringify(process.env[name] ?? '')])``  
  `),`  
  `'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL ?? ''),`  
  `'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),`  
`},`  
Also update the comment at the top of environment.prod.js. It still says Create React App injects the variables.

### **Phase 3: Add a build guard in CI**

Add this to the "Build react-ystemandchess" step in ci.yml, so it runs with the same env block as the build:  
`run: |`  
  `npm run build --if-present`  
  `# Fails if the production URLs didn't reach the bundle (the Vite blank-page bug).`  
  `grep -q "$REACT_APP_MIDDLEWARE_URL" build/assets/index-*.js`  
Dependabot PRs can't read repo secrets, so they build with the fallback URLs in ci.yml. The guard still works, because it checks whatever value the build actually used.

### **Phase 4: Update the Dockerfile and verify it**

> 1. Change both FROM lines to node:24-alpine. If Sweksha's pin has already merged, keep her lines when rebasing.  
> 2. Change RUN npm install to RUN npm ci in the build stage.  
> 3. Build locally with every build arg set, the way deploy.yml will:  
>    `docker build \`  
>      `--build-arg REACT_APP_MIDDLEWARE_URL=https://ystemandchess.com/middleware \`  
>      `--build-arg REACT_APP_STOCKFISH_SERVER_URL=https://ystemandchess.com/stockfishserver \`  
>      `--build-arg REACT_APP_CHESS_SERVER_URL=https://ystemandchess.com/chessserver \`  
>      `--build-arg REACT_APP_CHESS_CLIENT_URL=https://ystemandchess.com/chessclient \`  
>      `--build-arg REACT_APP_AGORA_APP_ID=test \`  
>      `-t ystemandchess:vite-test react-ystemandchess`  
>    `docker run --rm -p 3000:3000 ystemandchess:vite-test`  
> 4. Open http://localhost:3000 in a browser. Confirm the page renders and the console has no "Missing required production environment variable" error. An HTTP 200 alone doesn't prove anything here.

### **Phase 5 (recommended, separate commit): Fix the password-reset base URL**

In reset-password.tsx and set-password.tsx, replace process.env.REACT\_APP\_API\_URL || 'http://localhost:8000' with environment.urls.middlewareURL, imported from environments. Then remove REACT\_APP\_API\_URL from define. Neither test file asserts on the URL, so the tests should keep passing. Test a real reset email end to end after deploy. Keep this change in its own commit, so it can be reverted separately if the endpoint behaves differently than expected.

### **Phase 6: Pipeline smoke test (Sahana, coordinated in the next section)**

Add a step to deploy.yml after "Smoke test frontend." It checks that the deployed bundle contains the real middleware URL:  
`- name: Smoke test frontend bundle`  
  `env:`  
    `FRONTEND_URL: https://ystem-frontend.proudglacier-1911e147.westus2.azurecontainerapps.io`  
    `EXPECTED_MIDDLEWARE_URL: ${{ secrets.MIDDLEWARE_URL }}`  
  `run: |`  
    `js=$(curl --fail -s "$FRONTEND_URL/" | grep -o 'src="/assets/index-[^"]*\.js"' | head -1 | cut -d'"' -f2)`  
    `test -n "$js"`  
    `curl --fail -s "$FRONTEND_URL$js" | grep -q "$EXPECTED_MIDDLEWARE_URL"`  
The script-tag pattern matches the Vite build output (\<script type="module" crossorigin src="/assets/index-XXXX.js"\>). CRA used /static/js/, so add this step in the same release as Vite, or it will fail against the current CRA frontend.

### **Phase 7: Open the PR**

No PR exists for this branch yet. Open one against main. List the reviewers on the PR itself. Sahana should approve the Dockerfile and pipeline pieces. Link Deepesh's migration doc and this plan in the description.

## **Communication plan for Sahana's pipeline**

| When | Who tells whom | What |
| :---- | :---- | :---- |
| Now | Devin to Sahana and Deepesh | Vite ships after CD merges. No changes to deploy.yml build args or contexts are needed. One smoke test gets added with the Vite release. |
| When the Phase 4 Docker build passes locally | Deepesh to Sahana | Share the image result and base image (node:24-alpine). Confirm the output folder is still build/ on port 3000\. |
| When the Vite PR opens | Deepesh to Sahana | Request her review. Include the Phase 6 smoke test as a separate commit on her branch or a follow-up PR, timed to merge with Vite. |
| First deploy through CD | Sahana to the team | Report the smoke test result. Check the live site in a browser, not just the curl status. |
| If the deploy fails | Sahana to Deepesh | Roll back by redeploying the previous commit SHA image (az containerapp update \--image ...:\<previous-sha\>). Every image is tagged by SHA, so no rebuild is needed. |

**Draft Discord message (Devin to Sahana and Deepesh):**  
@Sahana @Deepesh Vite coordination.  
**Deepesh:** the Vite branch needs a few updates before it can merge. \#208 changed how prod URLs are read, and Vite turns that into a blank page (build, tests, and healthcheck all still pass). The fix is tested and written up in the dev plan, along with the two .tsx conflicts, the Node 24 Dockerfile, and npm ci. Please run a real docker build and open it in a browser before opening the PR.  
**Sahana:** no changes to your build args, contexts, or tags. Vite still outputs to build/ on port 3000\. One ask: a bundle smoke test that checks the deployed JS contains the middleware URL. It's in the plan. It has to ship with the Vite release, because the asset path changes from CRA's.  
**Order:** Thrishma's frontend branch, then the Node 24 pin, then CD merges, then Vite plus the smoke test.

## **Sequencing**

| Step | Owner | Depends on |
| :---- | :---- | :---- |
| Phase 0.1: merge chore/npm-audit-fix-frontend | Thrishma | Nothing |
| Phase 0.2: Node 24 pin | Sweksha | Nothing |
| Phases 1 to 5 | Deepesh | Nothing to start. Phase 1 is easier after 0.1. |
| Phase 0.3: CD pipeline merges | Sahana | GHCR permissions, Node 24 pin |
| Phase 6: bundle smoke test | Sahana | Ships with Phase 7 |
| Phase 7: Vite PR merges | Deepesh | Phases 0.1 to 0.3 and 1 to 6 |
| Issue 11 help (with Noah) | Deepesh | After Vite merges |

## **Verification checklist**

> 1. No ReactComponent as or environments/environment" imports remain in src/.  
> 2. npm test passes all 30 suites (155 tests as of the trial merge, before any Phase 5 changes).  
> 3. vite build passes, and the Phase 3 guard finds the middleware URL in the bundle.  
> 4. npm audit for react-ystemandchess shows no high or critical findings.  
> 5. A local docker build on node:24-alpine succeeds, and the container renders in a real browser with no console errors.  
> 6. After deploy, the Phase 6 smoke test passes, and the live site renders in a browser.  
> 7. If Phase 5 shipped, a real password-reset email arrives and its link works.

## **Out of scope (tracked in Deepesh's migration doc)**

Re-adding ESLint to the build, deleting the six unreachable server-side files under src/ (which clears the last three moderate findings), upgrading react-router to v7, and splitting the 1.66 MB main bundle. Chessclient is handled separately, by removing CRA rather than migrating it.

## **Risk if this slips**

The frontend stays on CRA, which causes most of the frontend's major-only audit findings and cannot be patched in place. The branch also keeps drifting from main, and every week adds conflicts. The bigger risk is merging it too fast. Build, tests, healthcheck, and the current smoke test would all pass while production shows a blank page. Phases 2, 3, and 6 exist to close that gap.