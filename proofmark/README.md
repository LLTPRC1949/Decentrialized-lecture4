# ProofMark — 区块链文件存证 DApp

本项目针对图片中的要求制作：新的 DApp、用 ChatGPT 协助、部署到 Render、支持手机。
“不能用老师的示例”需要你确认：若老师的示例也是文件存证，需要换主题。

## 当前状态

代码已提供，尚未部署到你的 Render 账号或 Sepolia。没有填写虚构的合约地址或交易记录。
只打开页面、计算指纹不代表已经完成链上部署。请完成下面两部分再提交链接。

## 1. 部署网页到 Render

1. 解压项目。把本目录的内容上传到一个 GitHub 仓库，保留 public、contracts 文件夹结构。仓库根目录应直接看到 render.yaml 和 README.md。
2. 登录 https://dashboard.render.com ，选择 New → Static Site，连接该仓库。
3. 配置：
   - Name：proofmark 或自己选择的名称。
   - Branch：仓库使用的分支，通常是 main。
   - Root Directory：留空（如果项目放在仓库子目录，则填写对应子目录）。
   - Build Command：`echo "Static files ready"`
   - Publish Directory：`public`
4. 创建并等待部署完成，复制 Render 实际生成的 `https://…onrender.com` 地址。不要把示例地址当作实际地址。
5. 可用 render.yaml 通过 Blueprint 部署；手动 Static Site 配置更直观。

## 2. 部署智能合约并配置全站

1. 使用一个支持 Ethereum 的钱包，切换到 Sepolia 测试网络，准备少量 Sepolia 测试 ETH。请使用测试币，不需要主网真 ETH。
2. 电脑：在安装钱包扩展的浏览器里打开 Render 页面。手机：在钱包 App 的内置浏览器打开同一地址。
3. 点击 Connect wallet，确认连接/切换测试网。
4. 展开 Contract setup，点击 Deploy a new contract on Sepolia，在钱包里确认部署交易。
5. 等待成功，复制显示的合约地址。
6. 在 GitHub 编辑 `public/config.js`，把地址填入 `contractAddress: "0x你的实际地址"`。保留 chainId 为 11155111。
7. 等待 Render 自动重新部署（或手动部署最新提交）。这样老师打开时会使用同一个合约，不需要他重新部署。

备用方式：在 https://remix.ethereum.org 创建 ProofMark.sol，复制 contracts/ProofMark.sol，使用 Solidity 0.8.30 编译；Deploy & Run 选择 Injected Provider，确认钱包在 Sepolia 后 Deploy，再将地址填入 config.js。不要使用 Remix VM 地址填到 Sepolia 页面。

## 3. 提交前演示

1. 连接钱包，点击 Try a sample file 或选择自己的非敏感文件。
2. 页面生成 SHA-256 指纹。文件内容仅在本地浏览器处理。
3. 点击 Register fingerprint on chain，确认测试网交易，等待确认。
4. 点击 Verify selected file，显示链上登记时间和登记钱包。
5. 再选择相同文件会找到同一记录；修改文件内容后重新选择，会产生不同指纹，查询不到原记录。
6. 重复登记会被阻止。查询同一文件但输入不同钱包，也可能无记录。
7. 用手机打开同一 Render URL，检查布局，并用钱包内置浏览器测试连接。

推荐截图：手机页面、成功登记后的区块号、查询成功时间、Etherscan 交易页。截图应来自实际运行，不要将本地测试当作链上交易。

## 课堂说明（英文）

My DApp is ProofMark, a blockchain-based file fingerprint registry. It computes a SHA-256 fingerprint locally and records it with the user's wallet address and a block timestamp on Ethereum Sepolia. Users can later select the same file and verify the record. The original file is never uploaded. The frontend is hosted on Render and supports mobile wallet browsers. I used ChatGPT to help design and implement the frontend and smart contract.

## 原理和限制

- Render 托管 HTML/CSS/JavaScript；浏览器通过钱包访问 Ethereum；合约保存记录。
- `recordedAt[钱包地址][文件指纹]` 返回首次登记的区块时间。不同钱包可以登记相同指纹。
- 存证只能说明某钱包登记了某指纹，不证明作者身份、版权或真实创建时间，也不提供文件备份。
- 文件名不参与计算；内容相同但文件名不同，指纹相同。
- 记录公开可查询；不保存原文不等于绝对保密，知道候选文件的人可以计算指纹比对。
- 测试网用于课堂演示，不适合永久存档。区块时间不等于精确可信的现实创建时间。
- 普通手机浏览器可计算指纹；链上操作需注入钱包提供者的浏览器。本项目未集成 WalletConnect。
- ethers 库随项目本地提供，无需前端从第三方 CDN 加载。

## 文件结构

- public/index.html、style.css、app.js：页面、样式、逻辑。
- public/config.js：部署后填入的公共合约地址（不是私钥）。
- public/ProofMark.json：与源码对应的编译产物，用于页面内部署。
- public/vendor/：ethers 依赖及许可证。
- contracts/ProofMark.sol：无管理员、不可升级、不收款的智能合约。
- render.yaml：Render Static Site 配置。
- tests/contract.cjs：本地 EVM 测试；TEST-RESULTS.md：本次测试结果。

## 本地运行

在项目目录执行 `python3 -m http.server 8080 --directory public`，打开 http://localhost:8080 。不建议直接双击 HTML。

合约测试（可选）：`npm install --no-save ethers@6.16.0 solc@0.8.30 ganache@7.9.2` 后运行 `node tests/contract.cjs`。

参考文档：https://render.com/docs/static-sites 、https://docs.ethers.org/v6/ 。
