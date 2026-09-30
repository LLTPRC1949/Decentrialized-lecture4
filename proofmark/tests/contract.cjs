const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const solc = require('solc');
const ganache = require('ganache');
const {ethers} = require('ethers');
(async () => {
  const root = path.resolve(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'contracts/ProofMark.sol'), 'utf8');
  const output = JSON.parse(solc.compile(JSON.stringify({language:'Solidity', sources:{'ProofMark.sol':{content:source}}, settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));
  const errors = (output.errors || []).filter(e => e.severity === 'error');
  assert.equal(errors.length,0,JSON.stringify(errors));
  const a = output.contracts['ProofMark.sol'].ProofMark;
  fs.writeFileSync(path.join(root,'public/ProofMark.json'),JSON.stringify({compiler:solc.version(),abi:a.abi,bytecode:'0x'+a.evm.bytecode.object},null,2));
  const rpc = ganache.provider({logging:{quiet:true},wallet:{totalAccounts:2}});
  try {
    const provider = new ethers.BrowserProvider(rpc);
    const s1 = await provider.getSigner(0), s2 = await provider.getSigner(1);
    const c = await new ethers.ContractFactory(a.abi,'0x'+a.evm.bytecode.object,s1).deploy(); await c.waitForDeployment();
    const h1 = ethers.sha256(ethers.toUtf8Bytes('sample v1')), h2=ethers.sha256(ethers.toUtf8Bytes('sample v2'));
    assert.equal(await c.recordedAt(s1.address,h1),0n);
    const receipt=await (await c.register(h1)).wait();
    const time=await c.recordedAt(s1.address,h1); assert.ok(time>0n);
    assert.equal(time,BigInt((await provider.getBlock(receipt.blockNumber)).timestamp));
    assert.equal(c.interface.parseLog(receipt.logs[0]).args.fileHash,h1);
    await assert.rejects(c.register.staticCall(h1));
    await assert.rejects(c.register.staticCall(ethers.ZeroHash));
    assert.equal(await c.recordedAt(s1.address,h2),0n);
    assert.equal(await c.recordedAt(s2.address,h1),0n);
    await (await c.connect(s2).register(h1)).wait(); assert.ok(await c.recordedAt(s2.address,h1)>0n);
    assert.equal(await c.recordedAt(s1.address,h1),time);
    console.log('PASS: compile, deploy, missing record, register, timestamp, event, duplicate rejection, zero rejection, changed content, wallet isolation, independent registration, original timestamp preserved.');
  } finally { await rpc.disconnect(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
