// Connect the Netlify site to the GitHub repo for auto-deploy (CLI-equivalent flow).
// Usage: node src/netlify-site.js [--connect] [--hook]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const SITE_ID = 'b138b408-aeeb-4ab7-8d08-65f354c2b82e';
const API = 'https://api.netlify.com/api/v1';

let token = process.env.NETLIFY_AUTH_TOKEN;
const cfgCandidates = [
  path.join(os.homedir(), '.netlify', 'config.json'),
  path.join(process.env.APPDATA || '', 'netlify', 'Config', 'config.json'),
];
for (const cfgPath of cfgCandidates) {
  if (token || !fs.existsSync(cfgPath)) continue;
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    token = cfg.token || (cfg.users && Object.values(cfg.users)[0] && Object.values(cfg.users)[0].auth && Object.values(cfg.users)[0].auth.token);
  } catch (e) {
    console.error('Ignoring unparsable config at', cfgPath, e.message);
  }
}
if (!token) {
  console.error('No Netlify auth token found.');
  process.exit(1);
}

async function api(pathname, opts = {}) {
  const res = await fetch(API + pathname, {
    method: opts.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${pathname} -> ${res.status}: ${text.slice(0, 500)}`);
  return json;
}

function gh(args) {
  try {
    return execSync(`gh ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    throw new Error(`gh ${args} failed: ${(e.stderr || e.message).toString().slice(0, 400)}`);
  }
}

const REPO = 'pengyilabs/fields-of-mistria-recipes';
const DEPLOY_KEY_ID = '6aa46634b05d0234359629b7';
const GITHUB_REPO_ID = 1366611072;

async function main() {
  const site = await api(`/sites/${SITE_ID}`);
  const bs = site.build_settings || {};
  console.log('=== Current site ===');
  console.log(JSON.stringify({
    name: site.name,
    url: site.ssl_url || site.url,
    repo_path: bs.repo_path,
    provider: bs.provider,
    repo_branch: bs.repo_branch,
    cmd: bs.cmd,
    dir: bs.dir,
    deploy_key_id: bs.deploy_key_id,
  }, null, 2));

  const connected = bs.repo_path === REPO;
  console.log('GitHub connected:', connected ? 'YES' : 'NO');

  if (process.argv.includes('--connect')) {
    const force = process.argv.includes('--force');
    if (!connected || force) {
      console.log('Connecting repo...');
      const repo = {
        id: GITHUB_REPO_ID,
        provider: 'github',
        repo_path: REPO,
        repo_branch: 'main',
        allowed_branches: ['main'],
        deploy_key_id: DEPLOY_KEY_ID,
        base: '',
        dir: 'dist',
        cmd: 'npm run build:dist',
      };
      const updated = await api(`/sites/${SITE_ID}`, { method: 'PUT', body: { repo } });
      const nbs = updated.build_settings || {};
      console.log('=== After update ===');
      console.log(JSON.stringify({
        repo_path: nbs.repo_path,
        provider: nbs.provider,
        repo_branch: nbs.repo_branch,
        cmd: nbs.cmd,
        dir: nbs.dir,
        deploy_key_id: nbs.deploy_key_id,
        deploy_hook: updated.deploy_hook,
      }, null, 2));
    }
  }

  if (process.argv.includes('--hook')) {
    const fresh = await api(`/sites/${SITE_ID}`);
    const hookUrl = fresh.deploy_hook;
    console.log('deploy_hook:', hookUrl);
    const hooks = JSON.parse(gh(`api repos/${REPO}/hooks --jq '.[] | {id, url: .config.url}'`));
    const exists = hooks.some((h) => h.url === hookUrl);
    if (exists) {
      console.log('GitHub webhook already exists.');
    } else if (hookUrl) {
      console.log('Creating GitHub webhook...');
      const created = gh(`api repos/${REPO}/hooks -f name=web -f config.url=${hookUrl} -f config.content_type=json -f events[0]=push`);
      console.log('Webhook created:', created);
    } else {
      console.log('No deploy_hook on site — nothing to hook up.');
    }
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
