#!/usr/bin/env python3
"""Verify current admin sources against published command/generator modules offline."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
COMMAND = 'github.com/goliatone/go-command'
GENERATOR = 'github.com/goliatone/go-generators'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generate-only',action='store_true',help='only export/generate; do not start the fixture')
    parser.add_argument('--write', action='store_true', help='explicitly regenerate checked-in manifest and TS')
    parser.add_argument('--tsc', type=Path, default=ROOT/'pkg/client/assets/node_modules/typescript/bin/tsc')
    parser.add_argument('--record', type=Path, help='retain successful proof evidence')
    args = parser.parse_args()
    commands = []
    env = dict(os.environ, GOPROXY='off', GOSUMDB='off', GOFLAGS='-mod=readonly -buildvcs=false', GOWORK=str(ROOT/'go.work'))
    tool_env = dict(env, GOWORK='off')
    def run(argv, cwd=ROOT, environment=env):
        result = subprocess.run([str(x) for x in argv], cwd=cwd, env=environment, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        commands.append({'argv':[str(x) for x in argv], 'cwd':str(cwd), 'exitCode':result.returncode})
        if result.returncode:
            raise RuntimeError(result.stdout)
        return result.stdout
    published = json.loads(run(['go','list','-m','-json',COMMAND]))
    if published.get('Replace') or published.get('Version') != 'v0.26.0':
        raise RuntimeError('R2-A proof requires published command v0.26.0, without replacement')
    provider_dir = Path(published['Dir'])
    command_artifact=json.loads(run(['go','mod','download','-json',COMMAND+'@'+published['Version']],environment=tool_env))
    generator = json.loads(run(['go','list','-m','-json',GENERATOR],cwd=provider_dir,environment=tool_env))
    if generator.get('Replace') or generator.get('Version') != 'v0.18.0':
        raise RuntimeError('R2-A proof requires published generator v0.18.0')
    generator_artifact=json.loads(run(['go','mod','download','-json',GENERATOR+'@'+generator['Version']],cwd=provider_dir,environment=tool_env))
    with tempfile.TemporaryDirectory(prefix='rpc-admin-proof-') as scratch:
        work=Path(scratch)
        source=work/'source'; source.mkdir(); (source/'generated').mkdir()
        first=run(['go','run','./examples/rpc-contract','-export'])
        second=run(['go','run','./examples/rpc-contract','-export'])
        if first != second:
            raise RuntimeError('Go export is nondeterministic')
        manifest=source/'generated/manifest.json';manifest.write_text(first)
        cli=work/'rpc-tsgen'
        run(['go','build','-o',cli,'./cmd/rpc-tsgen'],cwd=provider_dir,environment=tool_env)
        tool=run(['go','version','-m',cli])
        contracts=source/'generated/contracts.ts'
        command=[cli,'-mode','full','-manifest',manifest,'-out',contracts]
        run(command)
        before=(contracts.read_bytes(),contracts.stat().st_mtime_ns)
        run(command+['--check'])
        if before != (contracts.read_bytes(),contracts.stat().st_mtime_ns):
            raise RuntimeError('--check mutated generated output')
        for name in ['manifest.json','contracts.ts']:
            target=HERE/'generated'/name
            if args.write:
                target.write_bytes((source/'generated'/name).read_bytes())
            elif not target.exists() or target.read_bytes() != (source/'generated'/name).read_bytes():
                raise RuntimeError('stale generated artifact: '+str(target))
        if args.generate_only:
            print("PASS: repeatable Go export and published generation/check")
            return
        # Real published client declarations; runtime uses its shipped embedded bundle.
        tsc=args.tsc.resolve()
        run(['node',tsc,'--strict','--declaration','--emitDeclarationOnly','--target','ES2020','--module','ES2020','--outDir',source/'provider',provider_dir/'client/src/rpc_client.ts'])
        run(['node',tsc,'--strict','--declaration','--target','ES2020','--module','ES2020','--outDir',source/'admin-transport',ROOT/'pkg/client/assets/src/shared/transport/http-client.ts'])
        for name in ['consumer.ts','strict.ts']:shutil.copyfile(HERE/name,source/name)
        run(['node',tsc,'--strict','--exactOptionalPropertyTypes','--noUncheckedIndexedAccess','--target','ES2020','--module','ES2020','--moduleResolution','bundler','--outDir',work/'js',source/'consumer.ts',source/'strict.ts'])
        shutil.copytree(source/'admin-transport',work/'js/admin-transport')
        shutil.copyfile(provider_dir/'data/client/rpc/index.js',work/'rpc-bundle.mjs')
        shutil.copyfile(HERE/'runtime.mjs',work/'runtime.mjs')
        (work/'package.json').write_text('{"type":"module"}\n')
        server=work/'fixture';run(['go','build','-o',server,'./examples/rpc-contract'])
        ready=work/'ready.json'
        with (work/'server.log').open('w') as log:
            process=subprocess.Popen([str(server),'-ready',str(ready)],cwd=ROOT,env=env,stdout=log,stderr=log)
            try:
                deadline=time.monotonic()+15
                while not ready.exists():
                    if process.poll() is not None or time.monotonic()>deadline:
                        raise RuntimeError('fixture failed to start: '+(work/'server.log').read_text())
                    time.sleep(0.05)
                live=json.loads(run(['node',work/'runtime.mjs',ready]))
            finally:
                process.terminate()
                try:process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill();process.wait();raise RuntimeError('fixture failed to stop')
        files=[*ROOT.glob('admin/rpc_typed_command*.go'),ROOT/'admin/rpc_transport.go',ROOT/'admin/command_bus.go',ROOT/'admin/command_registration_set.go',*ROOT.glob('quickstart/examples/rpccontract/*.go'),*HERE.glob('*'),*HERE.glob('generated/*'),ROOT/'go.mod',ROOT/'quickstart/go.mod',ROOT/'examples/go.mod']
        record={'status':'PASS','scope':'Local admin/quickstart release candidate with published R2-C/R2-G; actual protected loopback HTTP; no published R2-A claim.',
            'publishedCommand':command_artifact,'publishedGenerator':generator_artifact,'toolBuild':tool,'commands':commands,'live':live,
            'artifacts':{name:sha(source/'generated'/name) for name in ['manifest.json','contracts.ts']},
            'sourceSHA256':{str(p.relative_to(ROOT)):sha(p) for p in sorted(files) if p.is_file()},
            'go':run(['go','version']).strip(),'typescript':run(['node',tsc,'--version']).strip(),'node':run(['node','--version']).strip()}
        if args.record:
            args.record.parent.mkdir(parents=True,exist_ok=True)
            args.record.write_text(json.dumps(record,indent=2)+'\n')
        print('PASS: repeatable Go export, published emitter, non-writing check, strict positive/negative TS, shipped RPC client, browser CSRF preparation and protected HTTP ('+str(live['requests'])+' requests; lost response attempted once)')

if __name__=='__main__':main()
