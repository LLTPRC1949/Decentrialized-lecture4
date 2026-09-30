/* global ethers */
"use strict";
const $ = id => document.getElementById(id);
const ABI = ["function register(bytes32 fileHash)", "function recordedAt(address registrant, bytes32 fileHash) view returns (uint256)"];
let provider, signer, wallet = "", fingerprint = "", busy = false, selection = 0;
let contractAddress = window.PROOFMARK_CONFIG?.contractAddress || "";
try { contractAddress = contractAddress || localStorage.getItem("proofmark-contract") || ""; } catch {}
$("contract").value = contractAddress;
function message(text, kind = "info") { $("status").textContent = text; $("status").dataset.kind = kind; }
function refresh() {
  const configured = /^0x[0-9a-fA-F]{40}$/.test(contractAddress);
  $("setup").textContent = configured ? "Live Sepolia mode · transactions require wallet confirmation." : "Contract not configured. File hashing works; on-chain actions need setup below.";
  $("register").disabled = busy || !fingerprint || !wallet || !configured;
  $("verify").disabled = busy || !fingerprint || !wallet || !configured;
  $("deploy").disabled = busy || !wallet;
  for (const id of ["connect", "save", "file", "sample", "contract", "registrant"]) $(id).disabled = busy;
}
function failure(e) {
  const text = e?.code === 4001 || e?.code === "ACTION_REJECTED" ? "Request cancelled in your wallet. No confirmed registration was recorded by this action." : e?.shortMessage || e?.reason || e?.message || String(e);
  message(text, "error");
}
async function run(action) { if (busy) return; busy = true; refresh(); try { await action(); } catch (e) { failure(e); } finally { busy = false; refresh(); } }
async function hashFile(file) {
  const token = ++selection; fingerprint = ""; $("hash").value = ""; $("transaction").hidden = true; refresh();
  if (!file) { $("filename").textContent = "No file selected"; return; }
  $("filename").textContent = file.name + " · " + (file.size / 1024).toFixed(1) + " KB";
  try {
    if (file.size > 25 * 1024 * 1024) throw new Error("Choose a file smaller than 25 MB.");
    if (!crypto.subtle) throw new Error("Open this app over HTTPS or localhost to calculate file fingerprints.");
    message("Calculating fingerprint on this device…");
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    if (token !== selection) return;
    fingerprint = "0x" + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    $("hash").value = fingerprint;
    message("Fingerprint ready. Your file has not been uploaded. Connect your wallet to register or verify it.");
  } catch (e) { if (token === selection) failure(e); }
  refresh();
}
async function contract() {
  if (!window.ethers) throw new Error("Wallet library did not load. Check your connection and reload.");
  if (!window.ethereum) throw new Error("Open this page inside your mobile wallet browser, or install a browser wallet on desktop.");
  const chain = await window.ethereum.request({ method: "eth_chainId" });
  if (Number(chain) !== 11155111) throw new Error("Switch your wallet to Ethereum Sepolia, then connect again.");
  if (!ethers.isAddress(contractAddress)) throw new Error("Enter a valid deployed contract address in Contract setup.");
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner(); wallet = await signer.getAddress();
  if (await provider.getCode(contractAddress) === "0x") throw new Error("No contract found at this address on Sepolia.");
  return new ethers.Contract(contractAddress, ABI, signer);
}
$("file").addEventListener("change", e => hashFile(e.target.files[0]));
$("sample").onclick = () => { $("file").value = ""; hashFile(new File(["ProofMark sample document — version 1\n"], "proofmark-sample.txt", { type: "text/plain" })); };
$("save").onclick = () => {
  const value = $("contract").value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(value) || /^0x0{40}$/.test(value)) { $("contract-status").textContent = "Enter a valid, nonzero 0x contract address."; return; }
  contractAddress = value;
  try { localStorage.setItem("proofmark-contract", value); } catch {}
  $("contract-status").textContent = "Address selected for this browser. On-chain actions will check that a contract exists.";
  $("transaction").hidden = true; refresh();
};
$("connect").onclick = () => run(async () => {
  if (!window.ethers) throw new Error("Wallet library did not load. Check your connection and reload.");
  if (!window.ethereum) throw new Error("No wallet found. On your phone, open this URL in your wallet app’s browser. On desktop, use a browser with a wallet extension.");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  if (Number(await window.ethereum.request({ method: "eth_chainId" })) !== 11155111) {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
  }
  provider = new ethers.BrowserProvider(window.ethereum); signer = await provider.getSigner(); wallet = await signer.getAddress();
  $("account").textContent = "Connected: " + wallet; $("registrant").value = wallet;
  message("Wallet connected to Sepolia. Select your file, then register or verify.", "success");
});
$("register").onclick = () => run(async () => {
  const hash = fingerprint; $("transaction").hidden = true;
  const c = await contract();
  if (await c.recordedAt(wallet, hash) !== 0n) throw new Error("This wallet already registered this file. Use Verify selected file.");
  message("Confirm the registration transaction in your wallet. Only the fingerprint will be sent.");
  const tx = await c.register(hash);
  $("transaction").href = "https://sepolia.etherscan.io/tx/" + tx.hash; $("transaction").hidden = false;
  message("Transaction submitted. Waiting for a block confirmation…");
  const receipt = await tx.wait(1, 120000);
  if (!receipt || receipt.status !== 1) throw new Error("Transaction was not confirmed successfully. Check the transaction link before retrying.");
  $("registrant").value = wallet;
  message("Registered on Sepolia. Block " + receipt.blockNumber + ". Use Verify selected file to read its timestamp.", "success");
});
$("verify").onclick = () => run(async () => {
  const hash = fingerprint; const address = $("registrant").value.trim(); $("transaction").hidden = true;
  if (!window.ethers || !ethers.isAddress(address)) throw new Error("Enter the wallet address that registered this file.");
  message("Reading the Sepolia contract…"); const c = await contract();
  const time = await c.recordedAt(address, hash);
  if (time === 0n) message("No matching record for this file and wallet in this contract. Check the wallet and contract, or register the file. This alone does not prove that a file was modified.");
  else message("Matching record found.\nRecorded: " + new Date(Number(time) * 1000).toLocaleString() + "\nRegistrant: " + address, "success");
});
function resetWallet() { wallet = ""; signer = null; provider = null; $("account").textContent = "Wallet or network changed. Connect again."; message("Wallet state changed. Reconnect before your next action."); refresh(); }
$("deploy").onclick = () => run(async () => {
  if (Number(await window.ethereum.request({ method: "eth_chainId" })) !== 11155111) throw new Error("Switch to Sepolia and connect again.");
  const response = await fetch("ProofMark.json");
  if (!response.ok) throw new Error("Contract artifact could not be loaded.");
  const artifact = await response.json();
  provider = new ethers.BrowserProvider(window.ethereum); signer = await provider.getSigner();
  message("Confirm the new contract deployment in your wallet. This uses Sepolia test ETH.");
  const deployed = await new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer).deploy();
  const tx = deployed.deploymentTransaction();
  $("transaction").href = "https://sepolia.etherscan.io/tx/" + tx.hash; $("transaction").hidden = false;
  message("Contract deployment submitted. Waiting for confirmation…");
  const receipt = await tx.wait(1, 120000);
  if (!receipt || receipt.status !== 1) throw new Error("Deployment not confirmed. Check the transaction link.");
  contractAddress = await deployed.getAddress(); $("contract").value = contractAddress;
  try { localStorage.setItem("proofmark-contract", contractAddress); } catch {}
  $("contract-status").textContent = "Deployed: " + contractAddress + ". Copy this address to public/config.js for all visitors.";
  message("Contract deployed on Sepolia. You can now register a file.", "success");
});
if (window.ethereum?.on) { window.ethereum.on("accountsChanged", resetWallet); window.ethereum.on("chainChanged", resetWallet); }
refresh();
