window.__ModuleLoader__.load({
	id: "@genkaku/dsh-user-plugin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react3 = require("react");

// src/client/locales.ts
var MESSAGES = {
  "zh": {
    "Reconnecting to the bridge\u2026": "\u6B63\u5728\u91CD\u65B0\u8FDE\u63A5 bridge\u2026",
    "No GenKaKu user bridge on 47821\u201347826.": "47821\u201347826 \u4E0A\u6CA1\u6709 GenKaKu \u7528\u6237 bridge\u3002",
    "Bridge not reached yet.": "\u5C1A\u672A\u8FDE\u63A5\u5230 bridge\u3002",
    "Enter a price per impression.": "\u8BF7\u8F93\u5165\u6BCF\u6B21\u5C55\u793A\u7684\u4EF7\u683C\u3002",
    "Price must be between 0.0001 and 0.1 USDC per impression.": "\u4EF7\u683C\u5FC5\u987B\u5728\u6BCF\u6B21\u5C55\u793A 0.0001 \u81F3 0.1 USDC \u4E4B\u95F4\u3002",
    "Submitted and reviewed. Fund it and it goes live; the operator can block it later.": "\u5DF2\u63D0\u4EA4\u5E76\u901A\u8FC7\u5BA1\u6838\u3002\u5145\u503C\u540E\u5373\u4E0A\u7EBF\uFF1B\u8FD0\u8425\u65B9\u4E4B\u540E\u53EF\u4EE5\u5C06\u5176\u5C4F\u853D\u3002",
    "Resumed. The ad is serving again.": "\u5DF2\u6062\u590D\u3002\u5E7F\u544A\u91CD\u65B0\u5F00\u59CB\u6295\u653E\u3002",
    "Paused. No new impressions; unspent budget can be withdrawn after a day.": "\u5DF2\u6682\u505C\u3002\u4E0D\u518D\u4EA7\u751F\u65B0\u7684\u5C55\u793A\uFF1B\u672A\u4F7F\u7528\u7684\u9884\u7B97\u53EF\u5728\u4E00\u5929\u540E\u63D0\u53D6\u3002",
    "Enter a budget.": "\u8BF7\u8F93\u5165\u9884\u7B97\u3002",
    "The budget must cover at least one impression.": "\u9884\u7B97\u81F3\u5C11\u9700\u8981\u8986\u76D6\u4E00\u6B21\u5C55\u793A\u3002",
    "The campaign address was not returned.": "\u672A\u8FD4\u56DE campaign \u5730\u5740\u3002",
    "Funded. The ad starts as soon as the operator-approved listing picks it up.": "\u5DF2\u5145\u503C\u3002\u5E7F\u544A\u4F1A\u5728\u8FD0\u8425\u65B9\u6279\u51C6\u7684\u6761\u76EE\u63A5\u624B\u540E\u7ACB\u5373\u5F00\u59CB\u3002",
    "Saved. The bridge is restarting with the new worker list.": "\u5DF2\u4FDD\u5B58\u3002bridge \u6B63\u5728\u4F7F\u7528\u65B0\u7684 worker \u5217\u8868\u91CD\u542F\u3002",
    "Never share this key. Anyone who has it owns the wallet and its funds.": "\u5207\u52FF\u5206\u4EAB\u6B64\u5BC6\u94A5\u3002\u4EFB\u4F55\u6301\u6709\u5B83\u7684\u4EBA\u90FD\u62E5\u6709\u8BE5\u94B1\u5305\u53CA\u5176\u8D44\u91D1\u3002",
    "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?": "\u5BFC\u5165\u5BC6\u94A5\u4F1A\u66FF\u6362\u6B64\u914D\u7F6E\u6587\u4EF6\u7684\u7528\u6237\u94B1\u5305\u3002\u5F53\u524D\u5730\u5740\u4ECD\u4FDD\u7559\u5176\u8D44\u91D1\uFF0C\u4F46\u5C06\u4E0D\u518D\u4F7F\u7528\u3002\u662F\u5426\u7EE7\u7EED\uFF1F",
    "Wallet imported. The bridge is restarting.": "\u94B1\u5305\u5DF2\u5BFC\u5165\u3002bridge \u6B63\u5728\u91CD\u542F\u3002",
    "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.": "\u751F\u6210\u65B0\u94B1\u5305\uFF1F\u65E7\u5730\u5740\u4ECD\u4FDD\u7559\u5176 SOL \u548C USDC\uFF1B\u6B64\u914D\u7F6E\u6587\u4EF6\u5C06\u4E0D\u518D\u4F7F\u7528\u5B83\u3002",
    "New wallet generated. The bridge is restarting.": "\u5DF2\u751F\u6210\u65B0\u94B1\u5305\u3002bridge \u6B63\u5728\u91CD\u542F\u3002",
    "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.": "\u6B63\u5728\u91CD\u65B0\u626B\u63CF\u94FE\u4E0A\u76EE\u5F55\u548C seed\u3002\u626B\u63CF\u5B8C\u6210\u540E bridge \u5C06\u91CD\u542F\u3002",
    "Paired. The worker\u2019s models appear below when it is online.": "\u5DF2\u914D\u5BF9\u3002worker \u4E0A\u7EBF\u540E\uFF0C\u5176\u6A21\u578B\u4F1A\u663E\u793A\u5728\u4E0B\u65B9\u3002",
    "Forget this paired worker? You can pair it again with a fresh code.": "\u5FD8\u8BB0\u6B64\u5DF2\u914D\u5BF9\u7684 worker\uFF1F\u4F60\u53EF\u4EE5\u4F7F\u7528\u65B0\u4EE3\u7801\u91CD\u65B0\u914D\u5BF9\u3002",
    "Loading status\u2026": "\u6B63\u5728\u52A0\u8F7D\u72B6\u6001\u2026",
    "Reconnecting\u2026": "\u6B63\u5728\u91CD\u65B0\u8FDE\u63A5\u2026",
    "Wallet": "\u94B1\u5305",
    "Wallet address copied.": "\u94B1\u5305\u5730\u5740\u5DF2\u590D\u5236\u3002",
    "copy": "\u590D\u5236",
    "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.": "\u6B64\u94B1\u5305\u5728\u6B64\u96C6\u7FA4\u4E0A\u8FD8\u6CA1\u6709 SOL\u3002\u4F1A\u8BDD\u9700\u8981\u5C11\u91CF SOL \u7528\u4E8E\u79DF\u91D1\u548C\u624B\u7EED\u8D39\uFF1BUSDC \u662F\u5B83\u652F\u4ED8\u7B97\u529B\u8D39\u7528\u7684\u8D27\u5E01\u3002",
    "Open faucet (devnet)": "\u6253\u5F00\u6C34\u9F99\u5934\uFF08devnet\uFF09",
    "Minting\u2026": "\u6B63\u5728\u94F8\u9020\u2026",
    "Mint 100 test USDC": "\u94F8\u9020 100 \u6D4B\u8BD5 USDC",
    "Revealing\u2026": "\u6B63\u5728\u663E\u793A\u2026",
    "Export key": "\u5BFC\u51FA\u5BC6\u94A5",
    "Import key": "\u5BFC\u5165\u5BC6\u94A5",
    "New wallet": "\u65B0\u94B1\u5305",
    "Private key \u2014 keep it offline. Testnet only.": "\u79C1\u94A5 \u2014 \u8BF7\u79BB\u7EBF\u4FDD\u5B58\u3002\u4EC5\u9650\u6D4B\u8BD5\u7F51\u3002",
    "Private key": "\u79C1\u94A5",
    "Private key copied.": "\u79C1\u94A5\u5DF2\u590D\u5236\u3002",
    "hide": "\u9690\u85CF",
    "Paste a base58 wallet key (the format Phantom and solana-keygen show)": "\u7C98\u8D34 base58 \u94B1\u5305\u5BC6\u94A5\uFF08Phantom \u548C solana-keygen \u663E\u793A\u7684\u683C\u5F0F\uFF09",
    "Private key to import": "\u8981\u5BFC\u5165\u7684\u79C1\u94A5",
    "Importing\u2026": "\u6B63\u5728\u5BFC\u5165\u2026",
    "Import": "\u5BFC\u5165",
    "Tips": "\u6253\u8D4F",
    "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.": "\u4F7F\u7528 GenKaKu \u4E0D\u4EA7\u751F\u4EFB\u4F55\u8D39\u7528\u3002\u5982\u679C\u67D0\u4E2A worker \u5BF9\u4F60\u6709\u5E2E\u52A9 \u2014 \u5C24\u5176\u662F\u514D\u8D39 worker\uFF0C\u5B83\u6CA1\u6709\u5E7F\u544A\u6536\u5165 \u2014 \u4F60\u53EF\u4EE5\u76F4\u63A5\u5411\u5176\u53D1\u9001 USDC\u3002\u8F6C\u8D26\u4ECE\u4F60\u7684\u94B1\u5305\u8F6C\u5230\u5B83\u7684\u94B1\u5305\uFF1BGenKaKu \u4E0D\u53C2\u4E0E\uFF0C\u4E5F\u4E0D\u62BD\u53D6\u4EFB\u4F55\u5206\u6210\u3002",
    "No worker with a wallet on the board yet.": "\u7F51\u7EDC\u4E0A\u6682\u65F6\u6CA1\u6709\u5E26\u94B1\u5305\u7684 worker\u3002",
    "Each tip needs a little SOL in the wallet above for the network fee.": "\u6BCF\u6B21\u6253\u8D4F\u90FD\u9700\u8981\u4E0A\u65B9\u94B1\u5305\u4E2D\u6709\u5C11\u91CF SOL \u652F\u4ED8\u7F51\u7EDC\u624B\u7EED\u8D39\u3002",
    "Settings": "\u8BBE\u7F6E",
    "Manual workers": "\u624B\u52A8 worker",
    "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.": "\u53EF\u9009\uFF1A\u56FA\u5B9A\u5230\u6B64\u914D\u7F6E\u6587\u4EF6\u7684 multiaddr\u3002\u901A\u8FC7\u94FE\u4E0A\u76EE\u5F55\u548C seed \u7684\u53D1\u73B0\u4ECD\u4F1A\u8FD0\u884C\u3002",
    "None pinned \u2014 using discovery only.": "\u672A\u56FA\u5B9A\u4EFB\u4F55\u5730\u5740 \u2014 \u4EC5\u4F7F\u7528\u81EA\u52A8\u53D1\u73B0\u3002",
    "remove": "\u79FB\u9664",
    "Worker multiaddr": "worker multiaddr",
    "Add": "\u6DFB\u52A0",
    "Refreshing\u2026": "\u6B63\u5728\u5237\u65B0\u2026",
    "Refresh network": "\u5237\u65B0\u7F51\u7EDC",
    "Re-reads the directory and the seed now.": "\u7ACB\u5373\u91CD\u65B0\u8BFB\u53D6\u76EE\u5F55\u548C seed\u3002",
    "selected": "\u5DF2\u9009\u62E9",
    "Search a model, worker name or wallet": "\u641C\u7D22\u6A21\u578B\u3001worker \u540D\u79F0\u6216\u94B1\u5305",
    "Search models": "\u641C\u7D22\u6A21\u578B",
    "Sort models": "\u6A21\u578B\u6392\u5E8F",
    "Recommended": "\u63A8\u8350",
    "Lowest price": "\u6700\u4F4E\u4EF7\u683C",
    "Lowest latency": "\u6700\u4F4E\u5EF6\u8FDF",
    "Most sessions served": "\u670D\u52A1\u4F1A\u8BDD\u6700\u591A",
    "Model name": "\u6A21\u578B\u540D\u79F0",
    "Worker name": "worker \u540D\u79F0",
    "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.": "\u53EA\u6709\u52FE\u9009\u7684\u6A21\u578B\u4F1A\u51FA\u73B0\u5728\u804A\u5929\u6A21\u578B\u9009\u62E9\u5668\u4E2D\uFF0C\u6700\u591A\u5341\u4E2A\u3002\u52FE\u9009\u6309 worker \u548C\u6A21\u578B\u5206\u522B\u8BB0\u5F55\uFF0C\u56E0\u6B64\u4E24\u4E2A worker \u63D0\u4F9B\u7684\u540C\u4E00\u6A21\u578B\u7B97\u4E24\u4E2A\u9009\u9879\u3002",
    "Nothing offered yet. A worker lists its local Ollama models on start.": "\u6682\u65E0\u63D0\u4F9B\u7684\u6A21\u578B\u3002worker \u542F\u52A8\u65F6\u4F1A\u5217\u51FA\u5176\u672C\u5730 Ollama \u6A21\u578B\u3002",
    "No row matches that search.": "\u6CA1\u6709\u5339\u914D\u8BE5\u641C\u7D22\u7684\u884C\u3002",
    "private": "\u79C1\u6709",
    "Private workers": "\u79C1\u6709 worker",
    "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.": "\u79C1\u6709 worker \u4E0D\u5728\u76EE\u5F55\u4E2D\u3002\u7C98\u8D34\u5B83\u63D0\u4F9B\u7684\u4E00\u6B21\u6027\u4EE3\u7801\uFF1A\u914D\u5BF9\u5C06\u7ED1\u5B9A\u5230\u6B64\u94B1\u5305\uFF0C\u4E14\u8BE5\u4EE3\u7801\u4E0D\u80FD\u518D\u6B21\u4F7F\u7528\u3002",
    "Pairing code": "\u914D\u5BF9\u4EE3\u7801",
    "Pairing\u2026": "\u6B63\u5728\u914D\u5BF9\u2026",
    "Pair": "\u914D\u5BF9",
    "online": "\u5728\u7EBF",
    "offline": "\u79BB\u7EBF",
    "checking\u2026": "\u6B63\u5728\u68C0\u67E5\u2026",
    "forget": "\u5FD8\u8BB0",
    "Advertise on GenKaKu": "\u5728 GenKaKu \u6295\u653E\u5E7F\u544A",
    "refresh": "\u5237\u65B0",
    "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.": "\u4F60\u6309\u5C55\u793A\u4ED8\u8D39\uFF1A\u4E00\u6B21\u5C55\u793A\u5373 worker \u7684\u4E00\u5206\u949F\u8D5E\u52A9\u65F6\u957F\u3002\u9884\u7B97\u4E3A\u4E0A\u65B9\u94B1\u5305\u4E2D\u7684 USDC\uFF0C\u8F6C\u5165 Solana \u4E0A\u7684 campaign \u8D26\u6237\uFF0C\u53EA\u6709\u7A0B\u5E8F\u53EF\u4EE5\u4ECE\u4E2D\u652F\u4ED8\u3002\u9884\u7B97\u7528\u5C3D\u540E\u5E7F\u544A\u505C\u6B62\u3002",
    "Test mode: a zero budget still serves, and impressions are not billed.": "\u6D4B\u8BD5\u6A21\u5F0F\uFF1A\u96F6\u9884\u7B97\u4ECD\u4F1A\u6295\u653E\uFF0C\u4E14\u5C55\u793A\u4E0D\u8BA1\u8D39\u3002",
    "Category": "\u5206\u7C7B",
    "Sponsor name": "\u8D5E\u52A9\u5546\u540D\u79F0",
    "Price per impression (USDC)": "\u6BCF\u6B21\u5C55\u793A\u4EF7\u683C\uFF08USDC\uFF09",
    "Budget (USDC)": "\u9884\u7B97\uFF08USDC\uFF09",
    "Title": "\u6807\u9898",
    "Body": "\u6B63\u6587",
    "Destination URL": "\u76EE\u6807 URL",
    "Button label": "\u6309\u94AE\u6587\u5B57",
    "Learn more": "\u4E86\u89E3\u66F4\u591A",
    "Image URL": "\u56FE\u7247 URL",
    "Image alt": "\u56FE\u7247\u66FF\u4EE3\u6587\u672C",
    "Keywords": "\u5173\u952E\u8BCD",
    "Submitting\u2026": "\u6B63\u5728\u63D0\u4EA4\u2026",
    "Submit for review": "\u63D0\u4EA4\u5BA1\u6838",
    "No listings yet.": "\u6682\u65E0\u6761\u76EE\u3002",
    "Blocked by the operator": "\u5DF2\u88AB\u8FD0\u8425\u65B9\u5C4F\u853D",
    "Not accepted": "\u672A\u901A\u8FC7",
    "Reviewed \u2014 fund it to go live": "\u5DF2\u5BA1\u6838 \u2014 \u5145\u503C\u540E\u4E0A\u7EBF",
    "Budget spent \u2014 ad stopped": "\u9884\u7B97\u5DF2\u7528\u5C3D \u2014 \u5E7F\u544A\u5DF2\u505C\u6B62",
    "Live": "\u6295\u653E\u4E2D",
    "paused": "\u5DF2\u6682\u505C",
    "impression": "\u5C55\u793A",
    "not funded": "\u672A\u5145\u503C",
    "left": "\u5269\u4F59",
    "shown": "\u5DF2\u5C55\u793A",
    "clicks": "\u70B9\u51FB",
    "Funding\u2026": "\u6B63\u5728\u5145\u503C\u2026",
    "Fund and publish": "\u5145\u503C\u5E76\u53D1\u5E03",
    "Resume": "\u6062\u590D",
    "Pause": "\u6682\u505C",
    "Withdraw unused": "\u63D0\u53D6\u672A\u4F7F\u7528\u90E8\u5206",
    "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.": "\u5145\u503C\u9700\u8981\u4E0A\u65B9\u94B1\u5305\u4E2D\u6709\u5C11\u91CF SOL \u652F\u4ED8 Solana \u624B\u7EED\u8D39\u3002campaign \u5730\u5740\u5C5E\u4E8E\u4F60\u7684\u94B1\u5305\uFF1B\u5E7F\u544A\u670D\u52A1\u53EA\u80FD\u8BFB\u53D6\u5176\u4F59\u989D\u3002\u5E7F\u544A\u6682\u505C\u4E00\u5929\u540E\uFF0C\u53EF\u63D0\u53D6\u672A\u4F7F\u7528\u7684\u9884\u7B97\u3002",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest": "127.0.0.1:{value} \u4E0A\u6709\u54CD\u5E94\uFF0C\u4F46\u62D2\u7EDD\u4E86\u6B64\u7A97\u53E3\u7684\u6765\u6E90\uFF08403\uFF09\u3002\u8BF7\u66F4\u65B0\u63D2\u4EF6\uFF1Adsh plugin add @genkaku/dsh-user-plugin@latest",
    "Not accepted: {value}": "\u672A\u901A\u8FC7\uFF1A{value}",
    "Withdrew {value} USDC back to the wallet.": "\u5DF2\u5C06 {value} USDC \u63D0\u53D6\u56DE\u94B1\u5305\u3002",
    "Minted 100 test USDC (tx {value}\u2026).": "\u5DF2\u94F8\u9020 100 \u6D4B\u8BD5 USDC\uFF08\u4EA4\u6613 {value}\u2026\uFF09\u3002",
    "At most {value} models can be selected. Untick one first.": "\u6700\u591A\u53EA\u80FD\u9009\u62E9 {value} \u4E2A\u6A21\u578B\u3002\u8BF7\u5148\u53D6\u6D88\u52FE\u9009\u4E00\u4E2A\u3002",
    "{value} ticked model(s) are not on the network right now. They come back when their worker does.": "{value} \u4E2A\u5DF2\u52FE\u9009\u6A21\u578B\u76EE\u524D\u4E0D\u5728\u7F51\u7EDC\u4E0A\u3002\u5176 worker \u4E0A\u7EBF\u540E\u5373\u53EF\u6062\u590D\u3002",
    "Worker status unreachable on 47821\u201347826.": "47821\u201347826 \u4E0A\u7684 worker \u72B6\u6001\u65E0\u6CD5\u8BBF\u95EE\u3002",
    "Ollama is running.": "Ollama \u6B63\u5728\u8FD0\u884C\u3002",
    "Ollama did not start.": "Ollama \u672A\u80FD\u542F\u52A8\u3002",
    "starting": "\u6B63\u5728\u542F\u52A8",
    "Saved \u2014 your catalog is live.": "\u5DF2\u4FDD\u5B58 \u2014 \u4F60\u7684\u6A21\u578B\u76EE\u5F55\u5DF2\u751F\u6548\u3002",
    "Name saved. Users see it next to your models, and can sort and search by it.": "\u540D\u79F0\u5DF2\u4FDD\u5B58\u3002\u7528\u6237\u4F1A\u5728\u4F60\u7684\u6A21\u578B\u65C1\u770B\u5230\u5B83\uFF0C\u5E76\u53EF\u636E\u6B64\u6392\u5E8F\u548C\u641C\u7D22\u3002",
    "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?": "\u79C1\u6709\u6A21\u5F0F\u4F1A\u5C06\u6B64 worker \u4ECE\u516C\u5171\u76EE\u5F55\u548C seed \u4E2D\u79FB\u9664\u3002\u53EA\u6709\u4F7F\u7528\u4E00\u6B21\u6027\u4EE3\u7801\u4E0E\u4F60\u914D\u5BF9\u7684\u94B1\u5305\u624D\u80FD\u4F7F\u7528\u5B83\u3002\u662F\u5426\u7EE7\u7EED\uFF1F",
    "Private mode on \u2014 restarting the worker. Generate a pairing code below.": "\u79C1\u6709\u6A21\u5F0F\u5DF2\u5F00\u542F \u2014 \u6B63\u5728\u91CD\u542F worker\u3002\u8BF7\u5728\u4E0B\u65B9\u751F\u6210\u914D\u5BF9\u4EE3\u7801\u3002",
    "Public mode on \u2014 restarting the worker and rejoining the directory.": "\u516C\u5171\u6A21\u5F0F\u5DF2\u5F00\u542F \u2014 \u6B63\u5728\u91CD\u542F worker \u5E76\u91CD\u65B0\u52A0\u5165\u76EE\u5F55\u3002",
    "Copy failed \u2014 select the code and copy it manually.": "\u590D\u5236\u5931\u8D25 \u2014 \u8BF7\u9009\u4E2D\u4EE3\u7801\u5E76\u624B\u52A8\u590D\u5236\u3002",
    "Publishing enabled \u2014 restarting the worker.": "\u53D1\u5E03\u5DF2\u542F\u7528 \u2014 \u6B63\u5728\u91CD\u542F worker\u3002",
    "Publishing disabled \u2014 restarting the worker.": "\u53D1\u5E03\u5DF2\u7981\u7528 \u2014 \u6B63\u5728\u91CD\u542F worker\u3002",
    "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.": "\u5207\u52FF\u5206\u4EAB\u6B64\u5BC6\u94A5\u3002\u4EFB\u4F55\u6301\u6709\u5B83\u7684\u4EBA\u90FD\u62E5\u6709\u8BE5\u94B1\u5305\u3001\u94FE\u4E0A\u76EE\u5F55\u4E2D\u7684 worker \u8EAB\u4EFD\u53CA\u5176\u6536\u76CA\u3002",
    "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?": "\u5BFC\u5165\u5BC6\u94A5\u4F1A\u66FF\u6362\u6B64 worker \u7684\u8EAB\u4EFD\u94B1\u5305\u3002\u5F53\u524D\u5730\u5740\u4ECD\u4FDD\u7559\u5176\u8D44\u91D1\u3002\u5982\u679C\u65E7\u94B1\u5305\u5DF2\u5728\u94FE\u4E0A\u767B\u8BB0\uFF0C\u6B64\u63D2\u4EF6\u4F1A\u5148\u5C1D\u8BD5\u64A4\u56DE\u8BE5\u6761\u76EE\u3002\u662F\u5426\u7EE7\u7EED\uFF1F",
    "Wallet imported. The worker is restarting with the new identity.": "\u94B1\u5305\u5DF2\u5BFC\u5165\u3002worker \u6B63\u4EE5\u65B0\u8EAB\u4EFD\u91CD\u542F\u3002",
    "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.": "\u751F\u6210\u65B0\u7684 worker \u94B1\u5305\uFF1F\u65E7\u5730\u5740\u4ECD\u4FDD\u7559\u5176 SOL \u548C USDC\u3002\u5982\u679C\u5176\u6761\u76EE\u5DF2\u53D1\u5E03\uFF0C\u6B64\u63D2\u4EF6\u4F1A\u5148\u5C1D\u8BD5\u64A4\u56DE\uFF0C\u7136\u540E\u4EE5\u65B0\u8EAB\u4EFD\u91CD\u542F\u3002",
    "New worker wallet generated. Restarting as the new identity.": "\u5DF2\u751F\u6210\u65B0\u7684 worker \u94B1\u5305\u3002\u6B63\u4EE5\u65B0\u8EAB\u4EFD\u91CD\u542F\u3002",
    "Worker restarting\u2026": "worker \u6B63\u5728\u91CD\u542F\u2026",
    "Worker wallet": "worker \u94B1\u5305",
    "Balance": "\u4F59\u989D",
    "Tips received": "\u6536\u5230\u7684\u6253\u8D4F",
    "none yet": "\u6682\u65E0",
    "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.": "\u6B64\u94B1\u5305\u5728\u6B64\u96C6\u7FA4\u4E0A\u8FD8\u6CA1\u6709 SOL\u3002worker \u9700\u8981\u5C11\u91CF SOL \u7528\u4E8E\u79DF\u91D1\u548C\u624B\u7EED\u8D39\uFF0C\u4EE5\u53D1\u5E03\u6761\u76EE\u5E76\u8FD0\u884C\u4F1A\u8BDD\uFF1BUSDC \u662F\u5B83\u8D5A\u53D6\u7684\u8D27\u5E01\uFF0C\u800C\u4E0D\u662F\u5B83\u652F\u51FA\u7684\u3002",
    "Open faucet": "\u6253\u5F00\u6C34\u9F99\u5934",
    "Generating\u2026": "\u6B63\u5728\u751F\u6210\u2026",
    "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.": "\u6B64\u5BC6\u94A5\u662F worker \u8EAB\u4EFD\uFF1A\u5B83\u7528\u4E8E\u7B7E\u7F72\u6536\u636E\u5E76\u7ED1\u5B9A\u94FE\u4E0A\u76EE\u5F55\u6761\u76EE\u3002\u5728\u5C06\u6B64\u673A\u5668\u8FC1\u79FB\u5230\u65B0\u78C1\u76D8\u4E4B\u524D\uFF0C\u8BF7\u5148\u5907\u4EFD\u3002",
    "Checking the local Ollama service\u2026": "\u6B63\u5728\u68C0\u67E5\u672C\u5730 Ollama \u670D\u52A1\u2026",
    "Running": "\u8FD0\u884C\u4E2D",
    "Installed, not running": "\u5DF2\u5B89\u88C5\uFF0C\u672A\u8FD0\u884C",
    "Not installed": "\u672A\u5B89\u88C5",
    "models": "\u6A21\u578B",
    "Starting\u2026": "\u6B63\u5728\u542F\u52A8\u2026",
    "Start Ollama": "\u542F\u52A8 Ollama",
    "Download Ollama": "\u4E0B\u8F7D Ollama",
    "Directory": "\u76EE\u5F55",
    "Publish this worker on-chain": "\u5728\u94FE\u4E0A\u53D1\u5E03\u6B64 worker",
    "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.": "\u6B64\u673A\u5668\u6CA1\u6709\u516C\u7F51\u5730\u5740\uFF0C\u56E0\u6B64\u5728\u83B7\u5F97\u5730\u5740\u4E4B\u524D\u6B64\u5F00\u5173\u4E0D\u53EF\u7528\uFF1A\u767B\u8BB0\u5B83\u4F1A\u521B\u5EFA\u65E0\u4EBA\u53EF\u62E8\u53F7\u7684\u6761\u76EE\u3002\u540C\u4E00\u7F51\u7EDC\u4E0A\u7684\u5BF9\u7B49\u8282\u70B9\u4ECD\u53EF\u8FDE\u63A5\u3002",
    "Forced on by this profile (publishAddress), so it cannot be turned off here.": "\u6B64\u914D\u7F6E\u6587\u4EF6\u5DF2\u5F3A\u5236\u5F00\u542F\uFF08publishAddress\uFF09\uFF0C\u56E0\u6B64\u65E0\u6CD5\u5728\u6B64\u5173\u95ED\u3002",
    "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.": "\u901A\u8FC7 seed VM \u4E2D\u7EE7\u5217\u51FA\u3002\u94FE\u4E0A\u53EA\u5199\u5165\u4E2D\u7EE7\u5730\u5740\uFF1B\u4F60\u81EA\u5DF1\u7684 IP \u4E0D\u4F1A\u516C\u5F00\u3002",
    "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.": "\u5DF2\u5217\u51FA\u3002\u4F60\u7684\u516C\u7F51 IP \u4F1A\u5199\u5165\u94FE\u4E0A\u5E76\u6C38\u4E45\u53EF\u8BFB\uFF0C\u5373\u4F7F\u4F60\u4E4B\u540E\u5173\u95ED\u6B64\u529F\u80FD\u3002",
    "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.": "\u6B63\u5728\u53D1\u5E03 \u2014 \u76EE\u5F55\u5199\u5165\u5C1A\u672A\u5B8C\u6210\u3002worker \u8FD0\u884C\u671F\u95F4\u4F1A\u81EA\u52A8\u91CD\u8BD5\u3002",
    "Not listed. A public address is available, so turning this on makes you discoverable.": "\u672A\u5217\u51FA\u3002\u5DF2\u6709\u53EF\u7528\u516C\u7F51\u5730\u5740\uFF0C\u5F00\u542F\u540E\u5373\u53EF\u88AB\u4ED6\u4EBA\u53D1\u73B0\u3002",
    "Name & access": "\u540D\u79F0\u4E0E\u8BBF\u95EE",
    "Display name": "\u663E\u793A\u540D\u79F0",
    "personal name, ID or nickname": "\u4E2A\u4EBA\u540D\u79F0\u3001ID \u6216\u6635\u79F0",
    "Saving\u2026": "\u6B63\u5728\u4FDD\u5B58\u2026",
    "save": "\u4FDD\u5B58",
    "Users see this next to your models and can search and sort by it. It is not written on chain.": "\u7528\u6237\u4F1A\u5728\u4F60\u7684\u6A21\u578B\u65C1\u770B\u5230\u5B83\uFF0C\u5E76\u53EF\u636E\u6B64\u641C\u7D22\u548C\u6392\u5E8F\u3002\u5B83\u4E0D\u4F1A\u5199\u5165\u94FE\u4E0A\u3002",
    "Private": "\u79C1\u6709",
    "Public": "\u516C\u5171",
    "Private worker (pairing code required)": "\u79C1\u6709 worker\uFF08\u9700\u8981\u914D\u5BF9\u4EE3\u7801\uFF09",
    "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.": "\u79C1\u6709\uFF1A\u4E0D\u4F1A\u5411 seed \u516C\u544A\uFF0C\u94FE\u4E0A\u4E5F\u6CA1\u6709\u5730\u5740\uFF0C\u56E0\u6B64\u53EA\u6709\u4F60\u914D\u5BF9\u8FC7\u7684\u94B1\u5305\u80FD\u770B\u5230\u8FD9\u4E9B\u6A21\u578B\u3002\u4F60\u4ECD\u53EF\u6536\u8D39 \u2014 0 \u8868\u793A\u514D\u8D39\u3002",
    "Public: anyone who reads the directory or asks the seed can find these models.": "\u516C\u5171\uFF1A\u4EFB\u4F55\u8BFB\u53D6\u76EE\u5F55\u6216\u5411 seed \u67E5\u8BE2\u7684\u4EBA\u90FD\u80FD\u627E\u5230\u8FD9\u4E9B\u6A21\u578B\u3002",
    "label for this user (optional)": "\u6B64\u7528\u6237\u7684\u6807\u7B7E\uFF08\u53EF\u9009\uFF09",
    "label for this user": "\u6B64\u7528\u6237\u7684\u6807\u7B7E",
    "Generate pairing code": "\u751F\u6210\u914D\u5BF9\u4EE3\u7801",
    "Copied": "\u5DF2\u590D\u5236",
    "Copy code": "\u590D\u5236\u4EE3\u7801",
    "Shown once. Expires in 15 minutes and pairs one wallet.": "\u4EC5\u663E\u793A\u4E00\u6B21\u300215 \u5206\u949F\u540E\u8FC7\u671F\uFF0C\u4E14\u53EA\u80FD\u914D\u5BF9\u4E00\u4E2A\u94B1\u5305\u3002",
    "Unused codes": "\u672A\u4F7F\u7528\u7684\u4EE3\u7801",
    "revoke": "\u64A4\u9500",
    "Paired wallets": "\u5DF2\u914D\u5BF9\u7684\u94B1\u5305",
    "unpair": "\u53D6\u6D88\u914D\u5BF9",
    "Models offered": "\u63D0\u4F9B\u7684\u6A21\u578B",
    "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.": "\u672A\u52FE\u9009\u7684\u6A21\u578B\u4ECD\u4F1A\u4FDD\u7559\u5B89\u88C5\uFF0C\u4F46\u4E0D\u4F1A\u5BF9\u5916\u63D0\u4F9B\u3002\u4EF7\u683C\u4E3A\u6BCF\u5C0F\u65F6 USDC\uFF1B0 \u8868\u793A\u514D\u8D39\u3002",
    "No local models yet. Download one below.": "\u6682\u65E0\u672C\u5730\u6A21\u578B\u3002\u8BF7\u5728\u4E0B\u65B9\u4E0B\u8F7D\u4E00\u4E2A\u3002",
    "not for agents": "\u4E0D\u9002\u7528\u4E8E agent",
    "delete": "\u5220\u9664",
    "model to download, e.g. llama3.2:3b": "\u8981\u4E0B\u8F7D\u7684\u6A21\u578B\uFF0C\u4F8B\u5982 llama3.2:3b",
    "Model to download": "\u8981\u4E0B\u8F7D\u7684\u6A21\u578B",
    "Downloading\u2026": "\u6B63\u5728\u4E0B\u8F7D\u2026",
    "Download": "\u4E0B\u8F7D",
    "offered": "\u5DF2\u63D0\u4F9B",
    "unsaved changes": "\u672A\u4FDD\u5B58\u7684\u66F4\u6539",
    "Save catalog": "\u4FDD\u5B58\u76EE\u5F55",
    "Peer": "\u5BF9\u7B49\u8282\u70B9",
    "Connection": "\u8FDE\u63A5",
    "libp2p direct": "libp2p \u76F4\u8FDE",
    "seed VM relay": "seed VM \u4E2D\u7EE7",
    "LAN only": "\u4EC5\u5C40\u57DF\u7F51",
    "Clients reach this worker directly over libp2p.": "\u5BA2\u6237\u7AEF\u901A\u8FC7 libp2p \u76F4\u63A5\u8FDE\u63A5\u6B64 worker\u3002",
    "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.": "\u65E0\u6CD5\u4ECE\u4E92\u8054\u7F51\u76F4\u63A5\u62E8\u53F7\uFF0C\u56E0\u6B64\u6D41\u91CF\u901A\u8FC7 GenKaKu seed VM \u8F6C\u53D1\u3002\u5BA2\u6237\u7AEF\u4F1A\u5148\u5C1D\u8BD5\u76F4\u8FDE\uFF0C\u5931\u8D25\u540E\u518D\u56DE\u9000\u5230\u4E2D\u7EE7\u3002",
    "Only peers on the same network can connect. A relay appears once the seed VM is reachable.": "\u53EA\u6709\u540C\u4E00\u7F51\u7EDC\u4E0A\u7684\u5BF9\u7B49\u8282\u70B9\u53EF\u4EE5\u8FDE\u63A5\u3002seed VM \u53EF\u8FBE\u540E\u4F1A\u51FA\u73B0\u4E2D\u7EE7\u3002",
    "Active sessions": "\u6D3B\u8DC3\u4F1A\u8BDD",
    "Addresses": "\u5730\u5740",
    "Open the full dashboard": "\u6253\u5F00\u5B8C\u6574\u4EEA\u8868\u677F",
    "Ad earnings": "\u5E7F\u544A\u6536\u76CA",
    "Ready to claim": "\u53EF\u9886\u53D6",
    "In this wallet": "\u6B64\u94B1\u5305\u4E2D",
    "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.": "\u5E7F\u544A\u4E3B\u6309\u8D5E\u52A9\u5206\u949F\u4ED8\u8D39\u3002\u6BCF\u65E5\u7ED3\u7B97\u540E\uFF0C\u5F53\u5929\u7684\u5206\u949F\u6570\u4F1A\u8BB0\u5165\u6B64 worker \u7684\u94FE\u4E0A\u8D26\u6237\uFF0C\u4E4B\u540E\u53EF\u5728\u6B64\u9886\u53D6\u3002\u9886\u53D6\u662F\u4E00\u7B14 Solana \u4EA4\u6613\uFF0C\u56E0\u6B64\u9700\u8981\u4E0A\u65B9\u94B1\u5305\u4E2D\u6709\u5C11\u91CF SOL \u652F\u4ED8\u624B\u7EED\u8D39\uFF1BUSDC \u4F1A\u76F4\u63A5\u8FDB\u5165\u6B64\u94B1\u5305\u3002",
    "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.": "campaign \u53EA\u6709\u5728\u5176\u81EA\u8EAB\u4F59\u989D\u8DB3\u4EE5\u652F\u4ED8\u8FD9\u4E9B\u5206\u949F\u6570\u65F6\u624D\u4F1A\u4ED8\u6B3E\uFF1B\u4F4E\u4E8E\u8BE5 campaign \u9886\u53D6\u9608\u503C\u7684 worker \u9700\u7B49\u5F85\u7D2F\u79EF\u66F4\u591A\u540E\u518D\u9886\u53D6\u3002",
    "Claiming\u2026": "\u6B63\u5728\u9886\u53D6\u2026",
    "Claim": "\u9886\u53D6",
    "Nothing above a threshold yet.": "\u6682\u65E0\u53EF\u8FBE\u5230\u9608\u503C\u7684\u91D1\u989D\u3002",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest": "127.0.0.1:{value} \u4E0A\u6709\u54CD\u5E94\uFF0C\u4F46\u62D2\u7EDD\u4E86\u6B64\u7A97\u53E3\u7684\u6765\u6E90\uFF08403\uFF09\u3002\u8BF7\u66F4\u65B0\u63D2\u4EF6\uFF1Adsh plugin add @genkaku/dsh-worker-plugin@latest",
    "Downloaded {value}.": "\u5DF2\u4E0B\u8F7D {value}\u3002",
    "Delete {value} from this machine?": "\u4ECE\u8FD9\u53F0\u673A\u5668\u5220\u9664 {value}\uFF1F",
    "Invalid price for {value}": "{value} \u7684\u4EF7\u683C\u65E0\u6548",
    "Stop allowing {value} to use this worker?": "\u505C\u6B62\u5141\u8BB8 {value} \u4F7F\u7528\u6B64 worker\uFF1F",
    "{value} tips": "{value} \u6B21\u6253\u8D4F",
    "Price per hour for {value}": "{value} \u7684\u6BCF\u5C0F\u65F6\u4EF7\u683C",
    "Sponsored": "\u8D5E\u52A9",
    "Dismiss this placement": "\u5173\u95ED\u6B64\u5E7F\u544A\u4F4D",
    "Dismiss": "\u5173\u95ED",
    "GenKaKu User": "GenKaKu \u7528\u6237",
    "GenKaKu Worker": "GenKaKu worker",
    "GenKaKu network": "GenKaKu \u7F51\u7EDC",
    "Sessions": "\u4F1A\u8BDD",
    "Workers discovered": "\u53D1\u73B0\u7684 worker",
    "Models on the network": "\u7F51\u7EDC\u4E0A\u7684\u6A21\u578B",
    "Private worker": "\u79C1\u6709 worker",
    "Copy": "\u590D\u5236",
    "Save": "\u4FDD\u5B58",
    "Cancel": "\u53D6\u6D88",
    "Refresh": "\u5237\u65B0",
    "Language": "\u8BED\u8A00",
    "Follow DSH": "\u8DDF\u968F DSH",
    "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.": "\u8DDF\u968F DSH \u7684\u8BED\u8A00\uFF0C\u9664\u975E\u4F60\u5728\u8FD9\u91CC\u53E6\u9009\u3002DSH \u6CA1\u6709\u97E9\u6587\uFF0C\u6240\u4EE5\u8FD9\u91CC\u989D\u5916\u63D0\u4F9B\u3002",
    "GenKaKu worker": "GenKaKu worker",
    "The plugin opens its bridge on the first free port in 47821\u201347826.": "\u63D2\u4EF6\u4F1A\u5728 47821\u201347826 \u4E2D\u7B2C\u4E00\u4E2A\u53EF\u7528\u7AEF\u53E3\u4E0A\u5F00\u542F bridge\u3002",
    "free \xB7 tips optional": "\u514D\u8D39 \xB7 \u6253\u8D4F\u53EF\u9009",
    "Loading worker status\u2026": "\u6B63\u5728\u52A0\u8F7D worker \u72B6\u6001\u2026",
    "Agent access": "\u4EE3\u7406\u8BBF\u95EE",
    "Agent wallet mode": "\u4EE3\u7406\u94B1\u5305\u6A21\u5F0F",
    "Off": "\u5173\u95ED",
    "Ask owner": "\u8BE2\u95EE\u6240\u6709\u8005",
    "Capped": "\u9650\u989D\u5185\u81EA\u52A8",
    "Per request (USDC)": "\u6BCF\u7B14\u4E0A\u9650\uFF08USDC\uFF09",
    "Per day (USDC)": "\u6BCF\u65E5\u4E0A\u9650\uFF08USDC\uFF09",
    "Freeze wallet": "\u51BB\u7ED3\u94B1\u5305",
    "Frozen: owner actions still work; agent requests are refused.": "\u5DF2\u51BB\u7ED3\uFF1A\u6240\u6709\u8005\u64CD\u4F5C\u4ECD\u53EF\u7528\uFF0C\u4EE3\u7406\u8BF7\u6C42\u4F1A\u88AB\u62D2\u7EDD\u3002",
    "Pending approvals": "\u5F85\u6279\u51C6\u8BF7\u6C42",
    "Approve": "\u6279\u51C6",
    "Deny": "\u62D2\u7EDD",
    "No pending requests.": "\u6CA1\u6709\u5F85\u6279\u51C6\u7684\u8BF7\u6C42\u3002",
    "Key and identity operations are always owner-only.": "\u5BC6\u94A5\u4E0E\u8EAB\u5206\u64CD\u4F5C\u6C38\u8FDC\u53EA\u6709\u6240\u6709\u8005\u53EF\u4EE5\u6267\u884C\u3002",
    "Caps apply to tips and campaign funding; claims are not a spend.": "\u9650\u989D\u9002\u7528\u4E8E\u6253\u8D4F\u4E0E\u5E7F\u544A\u5145\u503C\uFF1B\u9886\u53D6\u4E0D\u7B97\u652F\u51FA\u3002",
    "Save limits": "\u4FDD\u5B58\u9650\u989D",
    "Enter both limits in USDC.": "\u8BF7\u8F93\u5165\u4E24\u4E2A USDC \u4E0A\u9650\u3002"
  },
  "en": {
    "Reconnecting to the bridge\u2026": "Reconnecting to the bridge\u2026",
    "No GenKaKu user bridge on 47821\u201347826.": "No GenKaKu user bridge on 47821\u201347826.",
    "Bridge not reached yet.": "Bridge not reached yet.",
    "Enter a price per impression.": "Enter a price per impression.",
    "Price must be between 0.0001 and 0.1 USDC per impression.": "Price must be between 0.0001 and 0.1 USDC per impression.",
    "Submitted and reviewed. Fund it and it goes live; the operator can block it later.": "Submitted and reviewed. Fund it and it goes live; the operator can block it later.",
    "Resumed. The ad is serving again.": "Resumed. The ad is serving again.",
    "Paused. No new impressions; unspent budget can be withdrawn after a day.": "Paused. No new impressions; unspent budget can be withdrawn after a day.",
    "Enter a budget.": "Enter a budget.",
    "The budget must cover at least one impression.": "The budget must cover at least one impression.",
    "The campaign address was not returned.": "The campaign address was not returned.",
    "Funded. The ad starts as soon as the operator-approved listing picks it up.": "Funded. The ad starts as soon as the operator-approved listing picks it up.",
    "Saved. The bridge is restarting with the new worker list.": "Saved. The bridge is restarting with the new worker list.",
    "Never share this key. Anyone who has it owns the wallet and its funds.": "Never share this key. Anyone who has it owns the wallet and its funds.",
    "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?": "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?",
    "Wallet imported. The bridge is restarting.": "Wallet imported. The bridge is restarting.",
    "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.": "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.",
    "New wallet generated. The bridge is restarting.": "New wallet generated. The bridge is restarting.",
    "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.": "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.",
    "Paired. The worker\u2019s models appear below when it is online.": "Paired. The worker\u2019s models appear below when it is online.",
    "Forget this paired worker? You can pair it again with a fresh code.": "Forget this paired worker? You can pair it again with a fresh code.",
    "Loading status\u2026": "Loading status\u2026",
    "Reconnecting\u2026": "Reconnecting\u2026",
    "Wallet": "Wallet",
    "Wallet address copied.": "Wallet address copied.",
    "copy": "copy",
    "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.": "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.",
    "Open faucet (devnet)": "Open faucet (devnet)",
    "Minting\u2026": "Minting\u2026",
    "Mint 100 test USDC": "Mint 100 test USDC",
    "Revealing\u2026": "Revealing\u2026",
    "Export key": "Export key",
    "Import key": "Import key",
    "New wallet": "New wallet",
    "Private key \u2014 keep it offline. Testnet only.": "Private key \u2014 keep it offline. Testnet only.",
    "Private key": "Private key",
    "Private key copied.": "Private key copied.",
    "hide": "hide",
    "Paste a base58 wallet key (the format Phantom and solana-keygen show)": "Paste a base58 wallet key (the format Phantom and solana-keygen show)",
    "Private key to import": "Private key to import",
    "Importing\u2026": "Importing\u2026",
    "Import": "Import",
    "Tips": "Tips",
    "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.": "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.",
    "No worker with a wallet on the board yet.": "No worker with a wallet on the board yet.",
    "Each tip needs a little SOL in the wallet above for the network fee.": "Each tip needs a little SOL in the wallet above for the network fee.",
    "Settings": "Settings",
    "Manual workers": "Manual workers",
    "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.": "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.",
    "None pinned \u2014 using discovery only.": "None pinned \u2014 using discovery only.",
    "remove": "remove",
    "Worker multiaddr": "Worker multiaddr",
    "Add": "Add",
    "Refreshing\u2026": "Refreshing\u2026",
    "Refresh network": "Refresh network",
    "Re-reads the directory and the seed now.": "Re-reads the directory and the seed now.",
    "selected": "selected",
    "Search a model, worker name or wallet": "Search a model, worker name or wallet",
    "Search models": "Search models",
    "Sort models": "Sort models",
    "Recommended": "Recommended",
    "Lowest price": "Lowest price",
    "Lowest latency": "Lowest latency",
    "Most sessions served": "Most sessions served",
    "Model name": "Model name",
    "Worker name": "Worker name",
    "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.": "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.",
    "Nothing offered yet. A worker lists its local Ollama models on start.": "Nothing offered yet. A worker lists its local Ollama models on start.",
    "No row matches that search.": "No row matches that search.",
    "private": "private",
    "Private workers": "Private workers",
    "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.": "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.",
    "Pairing code": "Pairing code",
    "Pairing\u2026": "Pairing\u2026",
    "Pair": "Pair",
    "online": "online",
    "offline": "offline",
    "checking\u2026": "checking\u2026",
    "forget": "forget",
    "Advertise on GenKaKu": "Advertise on GenKaKu",
    "refresh": "refresh",
    "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.": "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.",
    "Test mode: a zero budget still serves, and impressions are not billed.": "Test mode: a zero budget still serves, and impressions are not billed.",
    "Category": "Category",
    "Sponsor name": "Sponsor name",
    "Price per impression (USDC)": "Price per impression (USDC)",
    "Budget (USDC)": "Budget (USDC)",
    "Title": "Title",
    "Body": "Body",
    "Destination URL": "Destination URL",
    "Button label": "Button label",
    "Learn more": "Learn more",
    "Image URL": "Image URL",
    "Image alt": "Image alt",
    "Keywords": "Keywords",
    "Submitting\u2026": "Submitting\u2026",
    "Submit for review": "Submit for review",
    "No listings yet.": "No listings yet.",
    "Blocked by the operator": "Blocked by the operator",
    "Not accepted": "Not accepted",
    "Reviewed \u2014 fund it to go live": "Reviewed \u2014 fund it to go live",
    "Budget spent \u2014 ad stopped": "Budget spent \u2014 ad stopped",
    "Live": "Live",
    "paused": "paused",
    "impression": "impression",
    "not funded": "not funded",
    "left": "left",
    "shown": "shown",
    "clicks": "clicks",
    "Funding\u2026": "Funding\u2026",
    "Fund and publish": "Fund and publish",
    "Resume": "Resume",
    "Pause": "Pause",
    "Withdraw unused": "Withdraw unused",
    "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.": "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest": "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest",
    "Not accepted: {value}": "Not accepted: {value}",
    "Withdrew {value} USDC back to the wallet.": "Withdrew {value} USDC back to the wallet.",
    "Minted 100 test USDC (tx {value}\u2026).": "Minted 100 test USDC (tx {value}\u2026).",
    "At most {value} models can be selected. Untick one first.": "At most {value} models can be selected. Untick one first.",
    "{value} ticked model(s) are not on the network right now. They come back when their worker does.": "{value} ticked model(s) are not on the network right now. They come back when their worker does.",
    "Worker status unreachable on 47821\u201347826.": "Worker status unreachable on 47821\u201347826.",
    "Ollama is running.": "Ollama is running.",
    "Ollama did not start.": "Ollama did not start.",
    "starting": "starting",
    "Saved \u2014 your catalog is live.": "Saved \u2014 your catalog is live.",
    "Name saved. Users see it next to your models, and can sort and search by it.": "Name saved. Users see it next to your models, and can sort and search by it.",
    "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?": "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?",
    "Private mode on \u2014 restarting the worker. Generate a pairing code below.": "Private mode on \u2014 restarting the worker. Generate a pairing code below.",
    "Public mode on \u2014 restarting the worker and rejoining the directory.": "Public mode on \u2014 restarting the worker and rejoining the directory.",
    "Copy failed \u2014 select the code and copy it manually.": "Copy failed \u2014 select the code and copy it manually.",
    "Publishing enabled \u2014 restarting the worker.": "Publishing enabled \u2014 restarting the worker.",
    "Publishing disabled \u2014 restarting the worker.": "Publishing disabled \u2014 restarting the worker.",
    "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.": "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.",
    "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?": "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?",
    "Wallet imported. The worker is restarting with the new identity.": "Wallet imported. The worker is restarting with the new identity.",
    "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.": "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.",
    "New worker wallet generated. Restarting as the new identity.": "New worker wallet generated. Restarting as the new identity.",
    "Worker restarting\u2026": "Worker restarting\u2026",
    "Worker wallet": "Worker wallet",
    "Balance": "Balance",
    "Tips received": "Tips received",
    "none yet": "none yet",
    "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.": "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.",
    "Open faucet": "Open faucet",
    "Generating\u2026": "Generating\u2026",
    "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.": "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.",
    "Checking the local Ollama service\u2026": "Checking the local Ollama service\u2026",
    "Running": "Running",
    "Installed, not running": "Installed, not running",
    "Not installed": "Not installed",
    "models": "models",
    "Starting\u2026": "Starting\u2026",
    "Start Ollama": "Start Ollama",
    "Download Ollama": "Download Ollama",
    "Directory": "Directory",
    "Publish this worker on-chain": "Publish this worker on-chain",
    "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.": "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.",
    "Forced on by this profile (publishAddress), so it cannot be turned off here.": "Forced on by this profile (publishAddress), so it cannot be turned off here.",
    "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.": "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.",
    "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.": "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.",
    "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.": "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.",
    "Not listed. A public address is available, so turning this on makes you discoverable.": "Not listed. A public address is available, so turning this on makes you discoverable.",
    "Name & access": "Name & access",
    "Display name": "Display name",
    "personal name, ID or nickname": "personal name, ID or nickname",
    "Saving\u2026": "Saving\u2026",
    "save": "save",
    "Users see this next to your models and can search and sort by it. It is not written on chain.": "Users see this next to your models and can search and sort by it. It is not written on chain.",
    "Private": "Private",
    "Public": "Public",
    "Private worker (pairing code required)": "Private worker (pairing code required)",
    "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.": "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.",
    "Public: anyone who reads the directory or asks the seed can find these models.": "Public: anyone who reads the directory or asks the seed can find these models.",
    "label for this user (optional)": "label for this user (optional)",
    "label for this user": "label for this user",
    "Generate pairing code": "Generate pairing code",
    "Copied": "Copied",
    "Copy code": "Copy code",
    "Shown once. Expires in 15 minutes and pairs one wallet.": "Shown once. Expires in 15 minutes and pairs one wallet.",
    "Unused codes": "Unused codes",
    "revoke": "revoke",
    "Paired wallets": "Paired wallets",
    "unpair": "unpair",
    "Models offered": "Models offered",
    "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.": "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.",
    "No local models yet. Download one below.": "No local models yet. Download one below.",
    "not for agents": "not for agents",
    "delete": "delete",
    "model to download, e.g. llama3.2:3b": "model to download, e.g. llama3.2:3b",
    "Model to download": "Model to download",
    "Downloading\u2026": "Downloading\u2026",
    "Download": "Download",
    "offered": "offered",
    "unsaved changes": "unsaved changes",
    "Save catalog": "Save catalog",
    "Peer": "Peer",
    "Connection": "Connection",
    "libp2p direct": "libp2p direct",
    "seed VM relay": "seed VM relay",
    "LAN only": "LAN only",
    "Clients reach this worker directly over libp2p.": "Clients reach this worker directly over libp2p.",
    "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.": "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.",
    "Only peers on the same network can connect. A relay appears once the seed VM is reachable.": "Only peers on the same network can connect. A relay appears once the seed VM is reachable.",
    "Active sessions": "Active sessions",
    "Addresses": "Addresses",
    "Open the full dashboard": "Open the full dashboard",
    "Ad earnings": "Ad earnings",
    "Ready to claim": "Ready to claim",
    "In this wallet": "In this wallet",
    "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.": "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.",
    "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.": "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.",
    "Claiming\u2026": "Claiming\u2026",
    "Claim": "Claim",
    "Nothing above a threshold yet.": "Nothing above a threshold yet.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest": "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest",
    "Downloaded {value}.": "Downloaded {value}.",
    "Delete {value} from this machine?": "Delete {value} from this machine?",
    "Invalid price for {value}": "Invalid price for {value}",
    "Stop allowing {value} to use this worker?": "Stop allowing {value} to use this worker?",
    "{value} tips": "{value} tips",
    "Price per hour for {value}": "Price per hour for {value}",
    "Sponsored": "Sponsored",
    "Dismiss this placement": "Dismiss this placement",
    "Dismiss": "Dismiss",
    "GenKaKu User": "GenKaKu User",
    "GenKaKu Worker": "GenKaKu Worker",
    "GenKaKu network": "GenKaKu network",
    "Sessions": "Sessions",
    "Workers discovered": "Workers discovered",
    "Models on the network": "Models on the network",
    "Private worker": "Private worker",
    "Copy": "Copy",
    "Save": "Save",
    "Cancel": "Cancel",
    "Refresh": "Refresh",
    "Language": "Language",
    "Follow DSH": "Follow DSH",
    "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.": "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.",
    "GenKaKu worker": "GenKaKu worker",
    "The plugin opens its bridge on the first free port in 47821\u201347826.": "The plugin opens its bridge on the first free port in 47821\u201347826.",
    "free \xB7 tips optional": "free \xB7 tips optional",
    "Loading worker status\u2026": "Loading worker status\u2026",
    "Agent access": "Agent access",
    "Agent wallet mode": "Agent wallet mode",
    "Off": "Off",
    "Ask owner": "Ask owner",
    "Capped": "Capped",
    "Per request (USDC)": "Per request (USDC)",
    "Per day (USDC)": "Per day (USDC)",
    "Freeze wallet": "Freeze wallet",
    "Frozen: owner actions still work; agent requests are refused.": "Frozen: owner actions still work; agent requests are refused.",
    "Pending approvals": "Pending approvals",
    "Approve": "Approve",
    "Deny": "Deny",
    "No pending requests.": "No pending requests.",
    "Key and identity operations are always owner-only.": "Key and identity operations are always owner-only.",
    "Caps apply to tips and campaign funding; claims are not a spend.": "Caps apply to tips and campaign funding; claims are not a spend.",
    "Save limits": "Save limits",
    "Enter both limits in USDC.": "Enter both limits in USDC."
  },
  "ja": {
    "Reconnecting to the bridge\u2026": "bridge \u306B\u518D\u63A5\u7D9A\u3057\u3066\u3044\u307E\u3059\u2026",
    "No GenKaKu user bridge on 47821\u201347826.": "47821\u201347826 \u306B GenKaKu \u30E6\u30FC\u30B6\u30FC bridge \u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002",
    "Bridge not reached yet.": "bridge \u306B\u306F\u307E\u3060\u5230\u9054\u3057\u3066\u3044\u307E\u305B\u3093\u3002",
    "Enter a price per impression.": "\u30A4\u30F3\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3\u5358\u4FA1\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "Price must be between 0.0001 and 0.1 USDC per impression.": "\u5358\u4FA1\u306F 1 \u30A4\u30F3\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3\u3042\u305F\u308A 0.0001\u301C0.1 USDC \u306E\u7BC4\u56F2\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "Submitted and reviewed. Fund it and it goes live; the operator can block it later.": "\u9001\u4FE1\u3068\u5BE9\u67FB\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\u3002\u8CC7\u91D1\u3092\u5165\u308C\u308B\u3068\u516C\u958B\u3055\u308C\u307E\u3059\u3002\u5F8C\u304B\u3089\u904B\u55B6\u8005\u304C\u30D6\u30ED\u30C3\u30AF\u3059\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002",
    "Resumed. The ad is serving again.": "\u518D\u958B\u3057\u307E\u3057\u305F\u3002\u5E83\u544A\u306E\u914D\u4FE1\u3092\u518D\u958B\u3057\u3066\u3044\u307E\u3059\u3002",
    "Paused. No new impressions; unspent budget can be withdrawn after a day.": "\u4E00\u6642\u505C\u6B62\u3057\u307E\u3057\u305F\u3002\u65B0\u3057\u3044\u30A4\u30F3\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3\u306F\u767A\u751F\u3057\u307E\u305B\u3093\u3002\u672A\u4F7F\u7528\u306E\u4E88\u7B97\u306F 1 \u65E5\u5F8C\u306B\u5F15\u304D\u51FA\u305B\u307E\u3059\u3002",
    "Enter a budget.": "\u4E88\u7B97\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "The budget must cover at least one impression.": "\u4E88\u7B97\u306F\u6700\u4F4E 1 \u30A4\u30F3\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3\u5206\u3092\u8CC4\u3048\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002",
    "The campaign address was not returned.": "campaign \u30A2\u30C9\u30EC\u30B9\u304C\u8FD4\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
    "Funded. The ad starts as soon as the operator-approved listing picks it up.": "\u8CC7\u91D1\u3092\u5165\u308C\u307E\u3057\u305F\u3002\u904B\u55B6\u8005\u304C\u627F\u8A8D\u3057\u305F\u63B2\u8F09\u304C\u53CD\u6620\u3055\u308C\u6B21\u7B2C\u3001\u5E83\u544A\u304C\u958B\u59CB\u3055\u308C\u307E\u3059\u3002",
    "Saved. The bridge is restarting with the new worker list.": "\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u65B0\u3057\u3044 worker \u30EA\u30B9\u30C8\u3067 bridge \u3092\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002",
    "Never share this key. Anyone who has it owns the wallet and its funds.": "\u3053\u306E\u30AD\u30FC\u306F\u7D76\u5BFE\u306B\u5171\u6709\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u30AD\u30FC\u3092\u6301\u3064\u4EBA\u306F\u30A6\u30A9\u30EC\u30C3\u30C8\u3068\u305D\u306E\u8CC7\u91D1\u3092\u6240\u6709\u3067\u304D\u307E\u3059\u3002",
    "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?": "\u30AD\u30FC\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3059\u308B\u3068\u3001\u3053\u306E\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u306E\u30E6\u30FC\u30B6\u30FC\u30A6\u30A9\u30EC\u30C3\u30C8\u304C\u7F6E\u304D\u63DB\u308F\u308A\u307E\u3059\u3002\u73FE\u5728\u306E\u30A2\u30C9\u30EC\u30B9\u306F\u8CC7\u91D1\u3092\u4FDD\u6301\u3057\u305F\u307E\u307E\u4F7F\u308F\u308C\u306A\u304F\u306A\u308A\u307E\u3059\u3002\u7D9A\u884C\u3057\u307E\u3059\u304B\uFF1F",
    "Wallet imported. The bridge is restarting.": "\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F\u3002bridge \u3092\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002",
    "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.": "\u65B0\u3057\u3044\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u751F\u6210\u3057\u307E\u3059\u304B\uFF1F\u53E4\u3044\u30A2\u30C9\u30EC\u30B9\u306F SOL \u3068 USDC \u3092\u4FDD\u6301\u3057\u305F\u307E\u307E\u3001\u3053\u306E\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u3067\u306F\u4F7F\u308F\u308C\u306A\u304F\u306A\u308A\u307E\u3059\u3002",
    "New wallet generated. The bridge is restarting.": "\u65B0\u3057\u3044\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u751F\u6210\u3057\u307E\u3057\u305F\u3002bridge \u3092\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002",
    "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.": "\u30C1\u30A7\u30FC\u30F3\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3068 seed \u3092\u518D\u30B9\u30AD\u30E3\u30F3\u3057\u3066\u3044\u307E\u3059\u3002\u30B9\u30AD\u30E3\u30F3\u5B8C\u4E86\u5F8C\u306B bridge \u3092\u518D\u8D77\u52D5\u3057\u307E\u3059\u3002",
    "Paired. The worker\u2019s models appear below when it is online.": "\u30DA\u30A2\u30EA\u30F3\u30B0\u3057\u307E\u3057\u305F\u3002worker \u304C\u30AA\u30F3\u30E9\u30A4\u30F3\u306B\u306A\u308B\u3068\u3001\u305D\u306E\u30E2\u30C7\u30EB\u304C\u4E0B\u306B\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
    "Forget this paired worker? You can pair it again with a fresh code.": "\u3053\u306E\u30DA\u30A2\u30EA\u30F3\u30B0\u6E08\u307F worker \u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F\u65B0\u3057\u3044\u30B3\u30FC\u30C9\u3067\u518D\u5EA6\u30DA\u30A2\u30EA\u30F3\u30B0\u3067\u304D\u307E\u3059\u3002",
    "Loading status\u2026": "\u30B9\u30C6\u30FC\u30BF\u30B9\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026",
    "Reconnecting\u2026": "\u518D\u63A5\u7D9A\u3057\u3066\u3044\u307E\u3059\u2026",
    "Wallet": "\u30A6\u30A9\u30EC\u30C3\u30C8",
    "Wallet address copied.": "\u30A6\u30A9\u30EC\u30C3\u30C8\u30A2\u30C9\u30EC\u30B9\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F\u3002",
    "copy": "\u30B3\u30D4\u30FC",
    "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.": "\u3053\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u306F\u3053\u306E\u30AF\u30E9\u30B9\u30BF\u3067\u306E SOL \u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002\u30BB\u30C3\u30B7\u30E7\u30F3\u306B\u306F\u30EC\u30F3\u30C8\u3068\u624B\u6570\u6599\u7528\u306B\u5C11\u3057\u306E SOL \u304C\u5FC5\u8981\u3067\u3059\u3002\u8A08\u7B97\u306E\u652F\u6255\u3044\u306B\u306F USDC \u3092\u4F7F\u3044\u307E\u3059\u3002",
    "Open faucet (devnet)": "\u30D5\u30A9\u30FC\u30BB\u30C3\u30C8\u3092\u958B\u304F\uFF08devnet\uFF09",
    "Minting\u2026": "\u767A\u884C\u3057\u3066\u3044\u307E\u3059\u2026",
    "Mint 100 test USDC": "\u30C6\u30B9\u30C8\u7528 USDC \u3092 100 \u767A\u884C",
    "Revealing\u2026": "\u8868\u793A\u3057\u3066\u3044\u307E\u3059\u2026",
    "Export key": "\u30AD\u30FC\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",
    "Import key": "\u30AD\u30FC\u3092\u30A4\u30F3\u30DD\u30FC\u30C8",
    "New wallet": "\u65B0\u3057\u3044\u30A6\u30A9\u30EC\u30C3\u30C8",
    "Private key \u2014 keep it offline. Testnet only.": "\u79D8\u5BC6\u9375 \u2014 \u30AA\u30D5\u30E9\u30A4\u30F3\u3067\u4FDD\u7BA1\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30C6\u30B9\u30C8\u30CD\u30C3\u30C8\u5C02\u7528\u3067\u3059\u3002",
    "Private key": "\u79D8\u5BC6\u9375",
    "Private key copied.": "\u79D8\u5BC6\u9375\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F\u3002",
    "hide": "\u96A0\u3059",
    "Paste a base58 wallet key (the format Phantom and solana-keygen show)": "base58 \u5F62\u5F0F\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u30AD\u30FC\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\uFF08Phantom \u3084 solana-keygen \u304C\u8868\u793A\u3059\u308B\u5F62\u5F0F\uFF09",
    "Private key to import": "\u30A4\u30F3\u30DD\u30FC\u30C8\u3059\u308B\u79D8\u5BC6\u9375",
    "Importing\u2026": "\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u3066\u3044\u307E\u3059\u2026",
    "Import": "\u30A4\u30F3\u30DD\u30FC\u30C8",
    "Tips": "\u30C1\u30C3\u30D7",
    "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.": "GenKaKu \u306E\u5229\u7528\u306F\u7121\u6599\u3067\u3059\u3002worker \u304C\u5F79\u306B\u7ACB\u3063\u305F\u5834\u5408\u3001\u7279\u306B\u5E83\u544A\u53CE\u5165\u306E\u306A\u3044\u7121\u6599\u306E worker \u306B\u306F\u3001USDC \u3092\u76F4\u63A5\u9001\u308C\u307E\u3059\u3002\u9001\u91D1\u306F\u3042\u306A\u305F\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u304B\u3089\u76F8\u624B\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u3078\u884C\u308F\u308C\u3001GenKaKu \u306F\u95A2\u4E0E\u305B\u305A\u624B\u6570\u6599\u3082\u53D6\u308A\u307E\u305B\u3093\u3002",
    "No worker with a wallet on the board yet.": "\u30DC\u30FC\u30C9\u4E0A\u306B\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u6301\u3064 worker \u306F\u307E\u3060\u3044\u307E\u305B\u3093\u3002",
    "Each tip needs a little SOL in the wallet above for the network fee.": "\u30C1\u30C3\u30D7\u3054\u3068\u306B\u3001\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u624B\u6570\u6599\u7528\u306E\u5C11\u3057\u306E SOL \u304C\u4E0A\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u5FC5\u8981\u3067\u3059\u3002",
    "Settings": "\u8A2D\u5B9A",
    "Manual workers": "\u624B\u52D5 worker",
    "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.": "\u3053\u306E\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\u306B\u56FA\u5B9A\u3059\u308B\u4EFB\u610F\u306E multiaddr \u3067\u3059\u3002\u30AA\u30F3\u30C1\u30A7\u30FC\u30F3\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3068 seed \u7D4C\u7531\u306E\u691C\u51FA\u306F\u5F15\u304D\u7D9A\u304D\u5B9F\u884C\u3055\u308C\u307E\u3059\u3002",
    "None pinned \u2014 using discovery only.": "\u56FA\u5B9A\u306A\u3057 \u2014 \u691C\u51FA\u306E\u307F\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002",
    "remove": "\u524A\u9664",
    "Worker multiaddr": "worker \u306E multiaddr",
    "Add": "\u8FFD\u52A0",
    "Refreshing\u2026": "\u66F4\u65B0\u3057\u3066\u3044\u307E\u3059\u2026",
    "Refresh network": "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u3092\u66F4\u65B0",
    "Re-reads the directory and the seed now.": "\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3068 seed \u3092\u4ECA\u3059\u3050\u8AAD\u307F\u76F4\u3057\u307E\u3059\u3002",
    "selected": "\u9078\u629E\u6E08\u307F",
    "Search a model, worker name or wallet": "\u30E2\u30C7\u30EB\u3001worker \u540D\u3001\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u691C\u7D22",
    "Search models": "\u30E2\u30C7\u30EB\u3092\u691C\u7D22",
    "Sort models": "\u30E2\u30C7\u30EB\u3092\u4E26\u3079\u66FF\u3048",
    "Recommended": "\u304A\u3059\u3059\u3081",
    "Lowest price": "\u6700\u5B89\u5024",
    "Lowest latency": "\u6700\u4F4E\u30EC\u30A4\u30C6\u30F3\u30B7",
    "Most sessions served": "\u30BB\u30C3\u30B7\u30E7\u30F3\u51E6\u7406\u6570\u304C\u591A\u3044\u9806",
    "Model name": "\u30E2\u30C7\u30EB\u540D",
    "Worker name": "worker \u540D",
    "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.": "\u30C1\u30E3\u30C3\u30C8\u306E\u30E2\u30C7\u30EB\u9078\u629E\u306B\u8868\u793A\u3055\u308C\u308B\u306E\u306F\u30C1\u30A7\u30C3\u30AF\u3057\u305F\u30E2\u30C7\u30EB\u3060\u3051\u3067\u3059\uFF08\u6700\u5927 10 \u4EF6\uFF09\u3002\u30C1\u30A7\u30C3\u30AF\u306F worker \u3068\u30E2\u30C7\u30EB\u306E\u7D44\u307F\u5408\u308F\u305B\u5358\u4F4D\u306A\u306E\u3067\u30012 \u3064\u306E worker \u306E\u540C\u3058\u30E2\u30C7\u30EB\u306F 2 \u3064\u306E\u9078\u629E\u80A2\u306B\u306A\u308A\u307E\u3059\u3002",
    "Nothing offered yet. A worker lists its local Ollama models on start.": "\u63D0\u4F9B\u4E2D\u306E\u30E2\u30C7\u30EB\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002worker \u306F\u8D77\u52D5\u6642\u306B\u30ED\u30FC\u30AB\u30EB\u306E Ollama \u30E2\u30C7\u30EB\u3092\u4E00\u89A7\u306B\u767B\u9332\u3057\u307E\u3059\u3002",
    "No row matches that search.": "\u691C\u7D22\u306B\u4E00\u81F4\u3059\u308B\u884C\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
    "private": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8",
    "Private workers": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8 worker",
    "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8 worker \u306F\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u63B2\u8F09\u3055\u308C\u307E\u305B\u3093\u3002\u6E21\u3055\u308C\u305F\u30EF\u30F3\u30BF\u30A4\u30E0\u30B3\u30FC\u30C9\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002\u30DA\u30A2\u30EA\u30F3\u30B0\u306F\u3053\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u7D10\u4ED8\u304D\u3001\u30B3\u30FC\u30C9\u306F\u518D\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002",
    "Pairing code": "\u30DA\u30A2\u30EA\u30F3\u30B0\u30B3\u30FC\u30C9",
    "Pairing\u2026": "\u30DA\u30A2\u30EA\u30F3\u30B0\u3057\u3066\u3044\u307E\u3059\u2026",
    "Pair": "\u30DA\u30A2\u30EA\u30F3\u30B0",
    "online": "\u30AA\u30F3\u30E9\u30A4\u30F3",
    "offline": "\u30AA\u30D5\u30E9\u30A4\u30F3",
    "checking\u2026": "\u78BA\u8A8D\u4E2D\u2026",
    "forget": "\u524A\u9664",
    "Advertise on GenKaKu": "GenKaKu \u3067\u5E83\u544A\u3092\u51FA\u3059",
    "refresh": "\u66F4\u65B0",
    "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.": "\u30A4\u30F3\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3\u5358\u4F4D\u3067\u652F\u6255\u3044\u307E\u3059\u30021 \u30A4\u30F3\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3\u306F worker \u306E\u6642\u9593\u306E\u30B9\u30DD\u30F3\u30B5\u30FC\u30C9 1 \u5206\u3067\u3059\u3002\u4E88\u7B97\u306F\u4E0A\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u306E USDC \u304B\u3089 Solana \u306E campaign \u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u9001\u3089\u308C\u3001\u652F\u6255\u3044\u306F\u30D7\u30ED\u30B0\u30E9\u30E0\u3060\u3051\u304C\u5B9F\u884C\u3067\u304D\u307E\u3059\u3002\u4E88\u7B97\u304C\u306A\u304F\u306A\u308B\u3068\u5E83\u544A\u306F\u505C\u6B62\u3057\u307E\u3059\u3002",
    "Test mode: a zero budget still serves, and impressions are not billed.": "\u30C6\u30B9\u30C8\u30E2\u30FC\u30C9\uFF1A\u4E88\u7B97\u304C 0 \u3067\u3082\u914D\u4FE1\u3055\u308C\u3001\u30A4\u30F3\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3\u306F\u8AB2\u91D1\u3055\u308C\u307E\u305B\u3093\u3002",
    "Category": "\u30AB\u30C6\u30B4\u30EA",
    "Sponsor name": "\u30B9\u30DD\u30F3\u30B5\u30FC\u540D",
    "Price per impression (USDC)": "\u30A4\u30F3\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3\u5358\u4FA1\uFF08USDC\uFF09",
    "Budget (USDC)": "\u4E88\u7B97\uFF08USDC\uFF09",
    "Title": "\u30BF\u30A4\u30C8\u30EB",
    "Body": "\u672C\u6587",
    "Destination URL": "\u9077\u79FB\u5148 URL",
    "Button label": "\u30DC\u30BF\u30F3\u306E\u30E9\u30D9\u30EB",
    "Learn more": "\u8A73\u3057\u304F\u898B\u308B",
    "Image URL": "\u753B\u50CF URL",
    "Image alt": "\u753B\u50CF\u306E\u4EE3\u66FF\u30C6\u30AD\u30B9\u30C8",
    "Keywords": "\u30AD\u30FC\u30EF\u30FC\u30C9",
    "Submitting\u2026": "\u9001\u4FE1\u3057\u3066\u3044\u307E\u3059\u2026",
    "Submit for review": "\u5BE9\u67FB\u306B\u9001\u4FE1",
    "No listings yet.": "\u63B2\u8F09\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002",
    "Blocked by the operator": "\u904B\u55B6\u8005\u306B\u3088\u308A\u30D6\u30ED\u30C3\u30AF\u6E08\u307F",
    "Not accepted": "\u672A\u627F\u8A8D",
    "Reviewed \u2014 fund it to go live": "\u5BE9\u67FB\u6E08\u307F \u2014 \u8CC7\u91D1\u3092\u5165\u308C\u308B\u3068\u516C\u958B\u3055\u308C\u307E\u3059",
    "Budget spent \u2014 ad stopped": "\u4E88\u7B97\u3092\u4F7F\u3044\u5207\u308A\u307E\u3057\u305F \u2014 \u5E83\u544A\u505C\u6B62\u4E2D",
    "Live": "\u914D\u4FE1\u4E2D",
    "paused": "\u4E00\u6642\u505C\u6B62\u4E2D",
    "impression": "\u30A4\u30F3\u30D7\u30EC\u30C3\u30B7\u30E7\u30F3",
    "not funded": "\u672A\u5165\u91D1",
    "left": "\u6B8B\u308A",
    "shown": "\u8868\u793A\u56DE\u6570",
    "clicks": "\u30AF\u30EA\u30C3\u30AF\u6570",
    "Funding\u2026": "\u5165\u91D1\u3057\u3066\u3044\u307E\u3059\u2026",
    "Fund and publish": "\u5165\u91D1\u3057\u3066\u516C\u958B",
    "Resume": "\u518D\u958B",
    "Pause": "\u4E00\u6642\u505C\u6B62",
    "Withdraw unused": "\u672A\u4F7F\u7528\u5206\u3092\u5F15\u304D\u51FA\u3059",
    "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.": "\u5165\u91D1\u306B\u306F Solana \u306E\u624B\u6570\u6599\u7528\u306B\u3001\u4E0A\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u5C11\u3057\u306E SOL \u304C\u5FC5\u8981\u3067\u3059\u3002campaign \u30A2\u30C9\u30EC\u30B9\u306F\u3042\u306A\u305F\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u5C5E\u3057\u3001\u5E83\u544A\u30B5\u30FC\u30D3\u30B9\u306F\u6B8B\u9AD8\u3092\u8AAD\u3080\u3053\u3068\u3057\u304B\u3067\u304D\u307E\u305B\u3093\u3002\u672A\u4F7F\u7528\u306E\u4E88\u7B97\u306F\u5E83\u544A\u3092 1 \u65E5\u505C\u6B62\u3057\u305F\u5F8C\u306B\u5F15\u304D\u51FA\u305B\u307E\u3059\u3002",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest": "127.0.0.1:{value} \u3067\u4F55\u304B\u304C\u5FDC\u7B54\u3057\u3066\u3044\u307E\u3059\u304C\u3001\u3053\u306E\u30A6\u30A3\u30F3\u30C9\u30A6\u306E\u30AA\u30EA\u30B8\u30F3\u304C\u62D2\u5426\u3055\u308C\u307E\u3057\u305F\uFF08403\uFF09\u3002\u30D7\u30E9\u30B0\u30A4\u30F3\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044: dsh plugin add @genkaku/dsh-user-plugin@latest",
    "Not accepted: {value}": "\u672A\u627F\u8A8D: {value}",
    "Withdrew {value} USDC back to the wallet.": "{value} USDC \u3092\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u5F15\u304D\u51FA\u3057\u307E\u3057\u305F\u3002",
    "Minted 100 test USDC (tx {value}\u2026).": "\u30C6\u30B9\u30C8\u7528 USDC \u3092 100 \u767A\u884C\u3057\u307E\u3057\u305F\uFF08tx {value}\u2026\uFF09\u3002",
    "At most {value} models can be selected. Untick one first.": "\u9078\u629E\u3067\u304D\u308B\u30E2\u30C7\u30EB\u306F\u6700\u5927 {value} \u4EF6\u3067\u3059\u3002\u5148\u306B 1 \u3064\u30C1\u30A7\u30C3\u30AF\u3092\u5916\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "{value} ticked model(s) are not on the network right now. They come back when their worker does.": "\u30C1\u30A7\u30C3\u30AF\u6E08\u307F\u306E\u30E2\u30C7\u30EB {value} \u4EF6\u304C\u73FE\u5728\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u4E0A\u306B\u3042\u308A\u307E\u305B\u3093\u3002worker \u304C\u5FA9\u5E30\u3059\u308B\u3068\u518D\u3073\u5229\u7528\u3067\u304D\u307E\u3059\u3002",
    "Worker status unreachable on 47821\u201347826.": "47821\u201347826 \u3067 worker \u306E\u30B9\u30C6\u30FC\u30BF\u30B9\u306B\u5230\u9054\u3067\u304D\u307E\u305B\u3093\u3002",
    "Ollama is running.": "Ollama \u306F\u5B9F\u884C\u4E2D\u3067\u3059\u3002",
    "Ollama did not start.": "Ollama \u304C\u8D77\u52D5\u3057\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
    "starting": "\u8D77\u52D5\u4E2D",
    "Saved \u2014 your catalog is live.": "\u4FDD\u5B58\u3057\u307E\u3057\u305F \u2014 \u30AB\u30BF\u30ED\u30B0\u304C\u516C\u958B\u3055\u308C\u307E\u3057\u305F\u3002",
    "Name saved. Users see it next to your models, and can sort and search by it.": "\u540D\u524D\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u30E6\u30FC\u30B6\u30FC\u306B\u306F\u30E2\u30C7\u30EB\u306E\u6A2A\u306B\u8868\u793A\u3055\u308C\u3001\u4E26\u3079\u66FF\u3048\u3084\u691C\u7D22\u306B\u4F7F\u3048\u307E\u3059\u3002",
    "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8\u30E2\u30FC\u30C9\u306B\u3059\u308B\u3068\u3001\u3053\u306E worker \u306F\u516C\u958B\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3068 seed \u304B\u3089\u5916\u308C\u307E\u3059\u3002\u30EF\u30F3\u30BF\u30A4\u30E0\u30B3\u30FC\u30C9\u3067\u30DA\u30A2\u30EA\u30F3\u30B0\u3057\u305F\u30A6\u30A9\u30EC\u30C3\u30C8\u3060\u3051\u304C\u5229\u7528\u3067\u304D\u307E\u3059\u3002\u7D9A\u884C\u3057\u307E\u3059\u304B\uFF1F",
    "Private mode on \u2014 restarting the worker. Generate a pairing code below.": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F \u2014 worker \u3092\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002\u4E0B\u3067\u30DA\u30A2\u30EA\u30F3\u30B0\u30B3\u30FC\u30C9\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "Public mode on \u2014 restarting the worker and rejoining the directory.": "\u516C\u958B\u30E2\u30FC\u30C9\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F \u2014 worker \u3092\u518D\u8D77\u52D5\u3057\u3001\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306B\u518D\u53C2\u52A0\u3057\u3066\u3044\u307E\u3059\u3002",
    "Copy failed \u2014 select the code and copy it manually.": "\u30B3\u30D4\u30FC\u306B\u5931\u6557\u3057\u307E\u3057\u305F \u2014 \u30B3\u30FC\u30C9\u3092\u9078\u629E\u3057\u3066\u624B\u52D5\u3067\u30B3\u30D4\u30FC\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "Publishing enabled \u2014 restarting the worker.": "\u516C\u958B\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F \u2014 worker \u3092\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002",
    "Publishing disabled \u2014 restarting the worker.": "\u516C\u958B\u3092\u7121\u52B9\u306B\u3057\u307E\u3057\u305F \u2014 worker \u3092\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002",
    "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.": "\u3053\u306E\u30AD\u30FC\u306F\u7D76\u5BFE\u306B\u5171\u6709\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u30AD\u30FC\u3092\u6301\u3064\u4EBA\u306F\u30A6\u30A9\u30EC\u30C3\u30C8\u3001\u30C1\u30A7\u30FC\u30F3\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u4E0A\u306E worker \u306E\u8B58\u5225\u60C5\u5831\u3001\u305D\u306E\u53CE\u76CA\u3092\u6240\u6709\u3067\u304D\u307E\u3059\u3002",
    "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?": "\u30AD\u30FC\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3059\u308B\u3068\u3001\u3053\u306E worker \u306E\u8B58\u5225\u30A6\u30A9\u30EC\u30C3\u30C8\u304C\u7F6E\u304D\u63DB\u308F\u308A\u307E\u3059\u3002\u73FE\u5728\u306E\u30A2\u30C9\u30EC\u30B9\u306F\u8CC7\u91D1\u3092\u4FDD\u6301\u3057\u307E\u3059\u3002\u53E4\u3044\u30A6\u30A9\u30EC\u30C3\u30C8\u304C\u30AA\u30F3\u30C1\u30A7\u30FC\u30F3\u306B\u63B2\u8F09\u3055\u308C\u3066\u3044\u308B\u5834\u5408\u3001\u3053\u306E\u30D7\u30E9\u30B0\u30A4\u30F3\u306F\u307E\u305A\u305D\u306E\u30A8\u30F3\u30C8\u30EA\u3092\u53D6\u308A\u6D88\u305D\u3046\u3068\u3057\u307E\u3059\u3002\u7D9A\u884C\u3057\u307E\u3059\u304B\uFF1F",
    "Wallet imported. The worker is restarting with the new identity.": "\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F\u3002worker \u306F\u65B0\u3057\u3044\u8B58\u5225\u60C5\u5831\u3067\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002",
    "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.": "\u65B0\u3057\u3044 worker \u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u751F\u6210\u3057\u307E\u3059\u304B\uFF1F\u53E4\u3044\u30A2\u30C9\u30EC\u30B9\u306F SOL \u3068 USDC \u3092\u4FDD\u6301\u3057\u307E\u3059\u3002\u30A8\u30F3\u30C8\u30EA\u304C\u516C\u958B\u3055\u308C\u3066\u3044\u308B\u5834\u5408\u3001\u3053\u306E\u30D7\u30E9\u30B0\u30A4\u30F3\u306F\u307E\u305A\u305D\u308C\u3092\u53D6\u308A\u6D88\u3057\u3066\u304B\u3089\u3001\u65B0\u3057\u3044\u8B58\u5225\u60C5\u5831\u3067\u518D\u8D77\u52D5\u3057\u307E\u3059\u3002",
    "New worker wallet generated. Restarting as the new identity.": "\u65B0\u3057\u3044 worker \u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u751F\u6210\u3057\u307E\u3057\u305F\u3002\u65B0\u3057\u3044\u8B58\u5225\u60C5\u5831\u3067\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u3002",
    "Worker restarting\u2026": "worker \u3092\u518D\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u2026",
    "Worker wallet": "worker \u30A6\u30A9\u30EC\u30C3\u30C8",
    "Balance": "\u6B8B\u9AD8",
    "Tips received": "\u53D7\u3051\u53D6\u3063\u305F\u30C1\u30C3\u30D7",
    "none yet": "\u307E\u3060\u3042\u308A\u307E\u305B\u3093",
    "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.": "\u3053\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u306F\u3053\u306E\u30AF\u30E9\u30B9\u30BF\u3067\u306E SOL \u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002worker \u304C\u63B2\u8F09\u3092\u516C\u958B\u3057\u3066\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u5B9F\u884C\u3059\u308B\u306B\u306F\u3001\u30EC\u30F3\u30C8\u3068\u624B\u6570\u6599\u7528\u306B\u5C11\u3057\u306E SOL \u304C\u5FC5\u8981\u3067\u3059\u3002USDC \u306F\u7A3C\u3050\u3082\u306E\u3067\u3042\u308A\u3001\u4F7F\u3046\u3082\u306E\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
    "Open faucet": "\u30D5\u30A9\u30FC\u30BB\u30C3\u30C8\u3092\u958B\u304F",
    "Generating\u2026": "\u751F\u6210\u3057\u3066\u3044\u307E\u3059\u2026",
    "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.": "\u3053\u306E\u30AD\u30FC\u306F worker \u306E\u8B58\u5225\u60C5\u5831\u3067\u3059\u3002\u30EC\u30B7\u30FC\u30C8\u306B\u7F72\u540D\u3057\u3001\u30AA\u30F3\u30C1\u30A7\u30FC\u30F3\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u30A8\u30F3\u30C8\u30EA\u3092\u7D10\u4ED8\u3051\u307E\u3059\u3002\u3053\u306E\u30DE\u30B7\u30F3\u3092\u65B0\u3057\u3044\u30C7\u30A3\u30B9\u30AF\u306B\u79FB\u3059\u524D\u306B\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "Checking the local Ollama service\u2026": "\u30ED\u30FC\u30AB\u30EB\u306E Ollama \u30B5\u30FC\u30D3\u30B9\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026",
    "Running": "\u5B9F\u884C\u4E2D",
    "Installed, not running": "\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u6E08\u307F\u30FB\u672A\u5B9F\u884C",
    "Not installed": "\u672A\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB",
    "models": "\u30E2\u30C7\u30EB",
    "Starting\u2026": "\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059\u2026",
    "Start Ollama": "Ollama \u3092\u8D77\u52D5",
    "Download Ollama": "Ollama \u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
    "Directory": "\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA",
    "Publish this worker on-chain": "\u3053\u306E worker \u3092\u30AA\u30F3\u30C1\u30A7\u30FC\u30F3\u306B\u516C\u958B",
    "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.": "\u3053\u306E\u30DE\u30B7\u30F3\u306B\u306F\u516C\u958B\u30A2\u30C9\u30EC\u30B9\u304C\u306A\u3044\u305F\u3081\u3001\u53D6\u5F97\u3059\u308B\u307E\u3067\u3053\u306E\u30B9\u30A4\u30C3\u30C1\u306F\u30AA\u30D5\u3067\u3059\u3002\u63B2\u8F09\u3059\u308B\u3068\u3001\u8AB0\u3082\u63A5\u7D9A\u3067\u304D\u306A\u3044\u30A8\u30F3\u30C8\u30EA\u304C\u4F5C\u3089\u308C\u3066\u3057\u307E\u3044\u307E\u3059\u3002\u540C\u3058\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u4E0A\u306E\u30D4\u30A2\u306F\u5F15\u304D\u7D9A\u304D\u63A5\u7D9A\u3067\u304D\u307E\u3059\u3002",
    "Forced on by this profile (publishAddress), so it cannot be turned off here.": "\u3053\u306E\u30D7\u30ED\u30D5\u30A1\u30A4\u30EB\uFF08publishAddress\uFF09\u3067\u5F37\u5236\u6709\u52B9\u306B\u306A\u3063\u3066\u3044\u308B\u305F\u3081\u3001\u3053\u3053\u3067\u306F\u30AA\u30D5\u306B\u3067\u304D\u307E\u305B\u3093\u3002",
    "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.": "seed VM \u30EA\u30EC\u30FC\u7D4C\u7531\u3067\u63B2\u8F09\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u30AA\u30F3\u30C1\u30A7\u30FC\u30F3\u306B\u66F8\u304D\u8FBC\u307E\u308C\u308B\u306E\u306F\u30EA\u30EC\u30FC\u306E\u30A2\u30C9\u30EC\u30B9\u3060\u3051\u3067\u3001\u3042\u306A\u305F\u81EA\u8EAB\u306E IP \u306F\u516C\u958B\u3055\u308C\u307E\u305B\u3093\u3002",
    "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.": "\u63B2\u8F09\u6E08\u307F\u3067\u3059\u3002\u516C\u958B IP \u306F\u30C1\u30A7\u30FC\u30F3\u306B\u66F8\u304D\u8FBC\u307E\u308C\u3001\u3053\u306E\u8A2D\u5B9A\u3092\u30AA\u30D5\u306B\u3057\u305F\u5F8C\u3082\u6C38\u7D9A\u7684\u306B\u8AAD\u307F\u53D6\u308C\u307E\u3059\u3002",
    "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.": "\u516C\u958B\u4E2D \u2014 \u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3078\u306E\u66F8\u304D\u8FBC\u307F\u306F\u307E\u3060\u5B8C\u4E86\u3057\u3066\u3044\u307E\u305B\u3093\u3002worker \u306E\u5B9F\u884C\u4E2D\u306F\u81EA\u52D5\u7684\u306B\u518D\u8A66\u884C\u3057\u307E\u3059\u3002",
    "Not listed. A public address is available, so turning this on makes you discoverable.": "\u672A\u63B2\u8F09\u3067\u3059\u3002\u516C\u958B\u30A2\u30C9\u30EC\u30B9\u304C\u5229\u7528\u3067\u304D\u308B\u305F\u3081\u3001\u30AA\u30F3\u306B\u3059\u308B\u3068\u691C\u51FA\u53EF\u80FD\u306B\u306A\u308A\u307E\u3059\u3002",
    "Name & access": "\u540D\u524D\u3068\u30A2\u30AF\u30BB\u30B9",
    "Display name": "\u8868\u793A\u540D",
    "personal name, ID or nickname": "\u500B\u4EBA\u540D\u3001ID\u3001\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0",
    "Saving\u2026": "\u4FDD\u5B58\u3057\u3066\u3044\u307E\u3059\u2026",
    "save": "\u4FDD\u5B58",
    "Users see this next to your models and can search and sort by it. It is not written on chain.": "\u30E6\u30FC\u30B6\u30FC\u306B\u306F\u30E2\u30C7\u30EB\u306E\u6A2A\u306B\u8868\u793A\u3055\u308C\u3001\u691C\u7D22\u3084\u4E26\u3079\u66FF\u3048\u306B\u4F7F\u3048\u307E\u3059\u3002\u30AA\u30F3\u30C1\u30A7\u30FC\u30F3\u306B\u306F\u66F8\u304D\u8FBC\u307E\u308C\u307E\u305B\u3093\u3002",
    "Private": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8",
    "Public": "\u516C\u958B",
    "Private worker (pairing code required)": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8 worker\uFF08\u30DA\u30A2\u30EA\u30F3\u30B0\u30B3\u30FC\u30C9\u304C\u5FC5\u8981\uFF09",
    "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8\uFF1Aseed \u306B\u901A\u77E5\u3055\u308C\u305A\u3001\u30C1\u30A7\u30FC\u30F3\u4E0A\u306B\u3082\u30A2\u30C9\u30EC\u30B9\u304C\u306A\u3044\u305F\u3081\u3001\u30DA\u30A2\u30EA\u30F3\u30B0\u3057\u305F\u30A6\u30A9\u30EC\u30C3\u30C8\u3060\u3051\u304C\u3053\u308C\u3089\u306E\u30E2\u30C7\u30EB\u3092\u8868\u793A\u3067\u304D\u307E\u3059\u3002\u8AB2\u91D1\u306F\u53EF\u80FD\u3067\u3059 \u2014 0 \u306F\u7121\u6599\u3092\u610F\u5473\u3057\u307E\u3059\u3002",
    "Public: anyone who reads the directory or asks the seed can find these models.": "\u516C\u958B\uFF1A\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u3092\u8AAD\u3080\u304B seed \u306B\u554F\u3044\u5408\u308F\u305B\u308B\u4EBA\u306A\u3089\u8AB0\u3067\u3082\u3001\u3053\u308C\u3089\u306E\u30E2\u30C7\u30EB\u3092\u898B\u3064\u3051\u3089\u308C\u307E\u3059\u3002",
    "label for this user (optional)": "\u3053\u306E\u30E6\u30FC\u30B6\u30FC\u306E\u30E9\u30D9\u30EB\uFF08\u4EFB\u610F\uFF09",
    "label for this user": "\u3053\u306E\u30E6\u30FC\u30B6\u30FC\u306E\u30E9\u30D9\u30EB",
    "Generate pairing code": "\u30DA\u30A2\u30EA\u30F3\u30B0\u30B3\u30FC\u30C9\u3092\u751F\u6210",
    "Copied": "\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",
    "Copy code": "\u30B3\u30FC\u30C9\u3092\u30B3\u30D4\u30FC",
    "Shown once. Expires in 15 minutes and pairs one wallet.": "\u8868\u793A\u306F 1 \u56DE\u3060\u3051\u3067\u3059\u300215 \u5206\u3067\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u30011 \u3064\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u3068\u30DA\u30A2\u30EA\u30F3\u30B0\u3057\u307E\u3059\u3002",
    "Unused codes": "\u672A\u4F7F\u7528\u306E\u30B3\u30FC\u30C9",
    "revoke": "\u5931\u52B9",
    "Paired wallets": "\u30DA\u30A2\u30EA\u30F3\u30B0\u6E08\u307F\u30A6\u30A9\u30EC\u30C3\u30C8",
    "unpair": "\u30DA\u30A2\u30EA\u30F3\u30B0\u89E3\u9664",
    "Models offered": "\u63D0\u4F9B\u30E2\u30C7\u30EB",
    "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.": "\u30C1\u30A7\u30C3\u30AF\u3092\u5916\u3057\u305F\u30E2\u30C7\u30EB\u306F\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3055\u308C\u305F\u307E\u307E\u3067\u3059\u304C\u3001\u516C\u958B\u3055\u308C\u307E\u305B\u3093\u3002\u4FA1\u683C\u306F 1 \u6642\u9593\u3042\u305F\u308A\u306E USDC \u3067\u30010 \u306F\u7121\u6599\u3092\u610F\u5473\u3057\u307E\u3059\u3002",
    "No local models yet. Download one below.": "\u30ED\u30FC\u30AB\u30EB\u30E2\u30C7\u30EB\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002\u4E0B\u304B\u3089\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    "not for agents": "\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u5411\u3051\u3067\u306F\u3042\u308A\u307E\u305B\u3093",
    "delete": "\u524A\u9664",
    "model to download, e.g. llama3.2:3b": "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3059\u308B\u30E2\u30C7\u30EB\uFF08\u4F8B: llama3.2:3b\uFF09",
    "Model to download": "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3059\u308B\u30E2\u30C7\u30EB",
    "Downloading\u2026": "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u3066\u3044\u307E\u3059\u2026",
    "Download": "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
    "offered": "\u63D0\u4F9B\u4E2D",
    "unsaved changes": "\u672A\u4FDD\u5B58\u306E\u5909\u66F4",
    "Save catalog": "\u30AB\u30BF\u30ED\u30B0\u3092\u4FDD\u5B58",
    "Peer": "\u30D4\u30A2",
    "Connection": "\u63A5\u7D9A",
    "libp2p direct": "libp2p \u76F4\u63A5",
    "seed VM relay": "seed VM \u30EA\u30EC\u30FC",
    "LAN only": "LAN \u306E\u307F",
    "Clients reach this worker directly over libp2p.": "\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u306F libp2p \u7D4C\u7531\u3067\u3053\u306E worker \u306B\u76F4\u63A5\u63A5\u7D9A\u3057\u307E\u3059\u3002",
    "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.": "\u30A4\u30F3\u30BF\u30FC\u30CD\u30C3\u30C8\u304B\u3089\u76F4\u63A5\u30C0\u30A4\u30E4\u30EB\u3067\u304D\u306A\u3044\u305F\u3081\u3001\u901A\u4FE1\u306F GenKaKu \u306E seed VM \u7D4C\u7531\u3067\u8EE2\u9001\u3055\u308C\u307E\u3059\u3002\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u306F\u307E\u305A\u76F4\u63A5\u63A5\u7D9A\u3092\u8A66\u3057\u3001\u5931\u6557\u3059\u308B\u3068\u30EA\u30EC\u30FC\u306B\u5207\u308A\u66FF\u308F\u308A\u307E\u3059\u3002",
    "Only peers on the same network can connect. A relay appears once the seed VM is reachable.": "\u540C\u3058\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u4E0A\u306E\u30D4\u30A2\u3060\u3051\u304C\u63A5\u7D9A\u3067\u304D\u307E\u3059\u3002seed VM \u306B\u5230\u9054\u3067\u304D\u308B\u3088\u3046\u306B\u306A\u308B\u3068\u30EA\u30EC\u30FC\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
    "Active sessions": "\u30A2\u30AF\u30C6\u30A3\u30D6\u306A\u30BB\u30C3\u30B7\u30E7\u30F3",
    "Addresses": "\u30A2\u30C9\u30EC\u30B9",
    "Open the full dashboard": "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u5168\u4F53\u3092\u958B\u304F",
    "Ad earnings": "\u5E83\u544A\u53CE\u76CA",
    "Ready to claim": "\u8ACB\u6C42\u53EF\u80FD",
    "In this wallet": "\u3053\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u5185",
    "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.": "\u5E83\u544A\u4E3B\u306F\u30B9\u30DD\u30F3\u30B5\u30FC\u30C9 1 \u5206\u5358\u4F4D\u3067\u652F\u6255\u3044\u307E\u3059\u3002\u6BCE\u65E5\u306E\u7CBE\u7B97\u5F8C\u3001\u305D\u306E\u65E5\u306E\u5206\u6570\u304C\u30AA\u30F3\u30C1\u30A7\u30FC\u30F3\u3067\u3053\u306E worker \u306B\u8A08\u4E0A\u3055\u308C\u3001\u3053\u3053\u304B\u3089\u8ACB\u6C42\u3067\u304D\u307E\u3059\u3002\u8ACB\u6C42\u306F Solana \u30C8\u30E9\u30F3\u30B6\u30AF\u30B7\u30E7\u30F3\u306E\u305F\u3081\u3001\u624B\u6570\u6599\u7528\u306B\u4E0A\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u5C11\u3057\u306E SOL \u304C\u5FC5\u8981\u3067\u3059\u3002USDC \u306F\u3053\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u306B\u76F4\u63A5\u5165\u308A\u307E\u3059\u3002",
    "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.": "campaign \u306F\u81EA\u8EAB\u306E\u6B8B\u9AD8\u304C\u5206\u6570\u3092\u8CC4\u3048\u308B\u5834\u5408\u306B\u306E\u307F\u652F\u6255\u3044\u307E\u3059\u3002campaign \u306E\u8ACB\u6C42\u3057\u304D\u3044\u5024\u3092\u4E0B\u56DE\u308B worker \u306F\u3001\u3055\u3089\u306B\u8A08\u4E0A\u3055\u308C\u308B\u307E\u3067\u5F85\u6A5F\u3057\u307E\u3059\u3002",
    "Claiming\u2026": "\u8ACB\u6C42\u3057\u3066\u3044\u307E\u3059\u2026",
    "Claim": "\u8ACB\u6C42",
    "Nothing above a threshold yet.": "\u3057\u304D\u3044\u5024\u3092\u8D85\u3048\u305F\u3082\u306E\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest": "127.0.0.1:{value} \u3067\u4F55\u304B\u304C\u5FDC\u7B54\u3057\u3066\u3044\u307E\u3059\u304C\u3001\u3053\u306E\u30A6\u30A3\u30F3\u30C9\u30A6\u306E\u30AA\u30EA\u30B8\u30F3\u304C\u62D2\u5426\u3055\u308C\u307E\u3057\u305F\uFF08403\uFF09\u3002\u30D7\u30E9\u30B0\u30A4\u30F3\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044: dsh plugin add @genkaku/dsh-worker-plugin@latest",
    "Downloaded {value}.": "{value} \u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u307E\u3057\u305F\u3002",
    "Delete {value} from this machine?": "{value} \u3092\u3053\u306E\u30DE\u30B7\u30F3\u304B\u3089\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F",
    "Invalid price for {value}": "{value} \u306E\u4FA1\u683C\u304C\u7121\u52B9\u3067\u3059",
    "Stop allowing {value} to use this worker?": "{value} \u306B\u3088\u308B\u3053\u306E worker \u306E\u5229\u7528\u3092\u505C\u6B62\u3057\u307E\u3059\u304B\uFF1F",
    "{value} tips": "{value} \u4EF6\u306E\u30C1\u30C3\u30D7",
    "Price per hour for {value}": "{value} \u306E 1 \u6642\u9593\u3042\u305F\u308A\u306E\u4FA1\u683C",
    "Sponsored": "\u30B9\u30DD\u30F3\u30B5\u30FC\u30C9",
    "Dismiss this placement": "\u3053\u306E\u67A0\u3092\u9589\u3058\u308B",
    "Dismiss": "\u9589\u3058\u308B",
    "GenKaKu User": "GenKaKu \u30E6\u30FC\u30B6\u30FC",
    "GenKaKu Worker": "GenKaKu worker",
    "GenKaKu network": "GenKaKu \u30CD\u30C3\u30C8\u30EF\u30FC\u30AF",
    "Sessions": "\u30BB\u30C3\u30B7\u30E7\u30F3",
    "Workers discovered": "\u691C\u51FA\u3057\u305F worker",
    "Models on the network": "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u4E0A\u306E\u30E2\u30C7\u30EB",
    "Private worker": "\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8 worker",
    "Copy": "\u30B3\u30D4\u30FC",
    "Save": "\u4FDD\u5B58",
    "Cancel": "\u30AD\u30E3\u30F3\u30BB\u30EB",
    "Refresh": "\u66F4\u65B0",
    "Language": "\u8A00\u8A9E",
    "Follow DSH": "DSH \u306B\u5F93\u3046",
    "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.": "\u3053\u3053\u3067\u9078\u3070\u306A\u3044\u9650\u308A DSH \u306E\u8A00\u8A9E\u306B\u5F93\u3044\u307E\u3059\u3002DSH \u306B\u306F\u97D3\u56FD\u8A9E\u304C\u306A\u3044\u305F\u3081\u3001\u3053\u3053\u3067\u9078\u3079\u307E\u3059\u3002",
    "GenKaKu worker": "GenKaKu worker",
    "The plugin opens its bridge on the first free port in 47821\u201347826.": "\u30D7\u30E9\u30B0\u30A4\u30F3\u306F 47821\u201347826 \u306E\u6700\u521D\u306E\u7A7A\u304D\u30DD\u30FC\u30C8\u3067 bridge \u3092\u958B\u304D\u307E\u3059\u3002",
    "free \xB7 tips optional": "\u7121\u6599 \xB7 \u30C1\u30C3\u30D7\u4EFB\u610F",
    "Loading worker status\u2026": "worker \u306E\u72B6\u614B\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
    "Agent access": "\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u30A2\u30AF\u30BB\u30B9",
    "Agent wallet mode": "\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u306E\u30A6\u30A9\u30EC\u30C3\u30C8\u30E2\u30FC\u30C9",
    "Off": "\u30AA\u30D5",
    "Ask owner": "\u6240\u6709\u8005\u306B\u78BA\u8A8D",
    "Capped": "\u4E0A\u9650\u5185\u3067\u81EA\u52D5",
    "Per request (USDC)": "1 \u56DE\u306E\u4E0A\u9650\uFF08USDC\uFF09",
    "Per day (USDC)": "1 \u65E5\u306E\u4E0A\u9650\uFF08USDC\uFF09",
    "Freeze wallet": "\u30A6\u30A9\u30EC\u30C3\u30C8\u3092\u51CD\u7D50",
    "Frozen: owner actions still work; agent requests are refused.": "\u51CD\u7D50\u4E2D\uFF1A\u6240\u6709\u8005\u306E\u64CD\u4F5C\u306F\u53EF\u80FD\u3067\u3001\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u306E\u8981\u6C42\u306F\u62D2\u5426\u3055\u308C\u307E\u3059\u3002",
    "Pending approvals": "\u627F\u8A8D\u5F85\u3061",
    "Approve": "\u627F\u8A8D",
    "Deny": "\u62D2\u5426",
    "No pending requests.": "\u627F\u8A8D\u5F85\u3061\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
    "Key and identity operations are always owner-only.": "\u9375\u3068\u8EAB\u5143\u306E\u64CD\u4F5C\u306F\u5E38\u306B\u6240\u6709\u8005\u306E\u307F\u3067\u3059\u3002",
    "Caps apply to tips and campaign funding; claims are not a spend.": "\u4E0A\u9650\u306F\u30C1\u30C3\u30D7\u3068\u30AD\u30E3\u30F3\u30DA\u30FC\u30F3\u5165\u91D1\u306B\u9069\u7528\u3055\u308C\u3001\u53D7\u3051\u53D6\u308A\u306F\u652F\u51FA\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
    "Save limits": "\u4E0A\u9650\u3092\u4FDD\u5B58",
    "Enter both limits in USDC.": "\u4E21\u65B9\u306E\u4E0A\u9650\u3092 USDC \u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
  },
  "ko": {
    "Reconnecting to the bridge\u2026": "bridge\uC5D0 \uB2E4\uC2DC \uC5F0\uACB0\uD558\uB294 \uC911\u2026",
    "No GenKaKu user bridge on 47821\u201347826.": "47821\u201347826 \uD3EC\uD2B8\uC5D0 GenKaKu \uC0AC\uC6A9\uC790 bridge\uAC00 \uC5C6\uC5B4\uC694.",
    "Bridge not reached yet.": "\uC544\uC9C1 bridge\uC5D0 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694.",
    "Enter a price per impression.": "\uB178\uCD9C\uB2F9 \uAC00\uACA9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
    "Price must be between 0.0001 and 0.1 USDC per impression.": "\uAC00\uACA9\uC740 \uB178\uCD9C\uB2F9 0.0001~0.1 USDC \uC0AC\uC774\uC5EC\uC57C \uD574\uC694.",
    "Submitted and reviewed. Fund it and it goes live; the operator can block it later.": "\uC81C\uCD9C\uB418\uC5B4 \uAC80\uD1A0\uB418\uC5C8\uC5B4\uC694. \uC790\uAE08\uC744 \uB123\uC73C\uBA74 \uAC8C\uC2DC\uB418\uACE0, \uC6B4\uC601\uC790\uAC00 \uB098\uC911\uC5D0 \uCC28\uB2E8\uD560 \uC218 \uC788\uC5B4\uC694.",
    "Resumed. The ad is serving again.": "\uC7AC\uAC1C\uD588\uC5B4\uC694. \uAD11\uACE0\uAC00 \uB2E4\uC2DC \uAC8C\uC7AC\uB418\uACE0 \uC788\uC5B4\uC694.",
    "Paused. No new impressions; unspent budget can be withdrawn after a day.": "\uC77C\uC2DC\uC815\uC9C0\uD588\uC5B4\uC694. \uC0C8 \uB178\uCD9C\uC740 \uC5C6\uACE0, \uB0A8\uC740 \uC608\uC0B0\uC740 \uD558\uB8E8 \uB4A4\uC5D0 \uCD9C\uAE08\uD560 \uC218 \uC788\uC5B4\uC694.",
    "Enter a budget.": "\uC608\uC0B0\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
    "The budget must cover at least one impression.": "\uC608\uC0B0\uC740 \uCD5C\uC18C \uD55C \uBC88\uC758 \uB178\uCD9C\uC744 \uAC10\uB2F9\uD560 \uC218 \uC788\uC5B4\uC57C \uD574\uC694.",
    "The campaign address was not returned.": "campaign \uC8FC\uC18C\uAC00 \uBC18\uD658\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694.",
    "Funded. The ad starts as soon as the operator-approved listing picks it up.": "\uC790\uAE08\uC744 \uB123\uC5C8\uC5B4\uC694. \uC6B4\uC601\uC790\uAC00 \uC2B9\uC778\uD55C \uBAA9\uB85D\uC774 \uAC00\uC838\uAC00\uB294 \uC989\uC2DC \uAD11\uACE0\uAC00 \uC2DC\uC791\uB3FC\uC694.",
    "Saved. The bridge is restarting with the new worker list.": "\uC800\uC7A5\uD588\uC5B4\uC694. \uC0C8 worker \uBAA9\uB85D\uC73C\uB85C bridge\uB97C \uB2E4\uC2DC \uC2DC\uC791\uD558\uACE0 \uC788\uC5B4\uC694.",
    "Never share this key. Anyone who has it owns the wallet and its funds.": "\uC774 \uD0A4\uB294 \uC808\uB300 \uACF5\uC720\uD558\uC9C0 \uB9C8\uC138\uC694. \uD0A4\uB97C \uAC00\uC9C4 \uC0AC\uB78C\uC774 \uC9C0\uAC11\uACFC \uC790\uAE08\uC744 \uC18C\uC720\uD558\uAC8C \uB3FC\uC694.",
    "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?": "\uD0A4\uB97C \uAC00\uC838\uC624\uBA74 \uC774 \uD504\uB85C\uD544\uC758 \uC0AC\uC6A9\uC790 \uC9C0\uAC11\uC774 \uAD50\uCCB4\uB3FC\uC694. \uD604\uC7AC \uC8FC\uC18C\uB294 \uC790\uAE08\uC744 \uADF8\uB300\uB85C \uBCF4\uC720\uD558\uC9C0\uB9CC \uB354 \uC774\uC0C1 \uC0AC\uC6A9\uB418\uC9C0 \uC54A\uC544\uC694. \uACC4\uC18D\uD560\uAE4C\uC694?",
    "Wallet imported. The bridge is restarting.": "\uC9C0\uAC11\uC744 \uAC00\uC838\uC654\uC5B4\uC694. bridge\uB97C \uB2E4\uC2DC \uC2DC\uC791\uD558\uACE0 \uC788\uC5B4\uC694.",
    "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.": "\uC0C8 \uC9C0\uAC11\uC744 \uB9CC\uB4E4\uAE4C\uC694? \uAE30\uC874 \uC8FC\uC18C\uB294 SOL\uACFC USDC\uB97C \uADF8\uB300\uB85C \uBCF4\uC720\uD558\uACE0, \uC774 \uD504\uB85C\uD544\uC5D0\uC11C\uB294 \uB354 \uC774\uC0C1 \uC0AC\uC6A9\uD558\uC9C0 \uC54A\uC544\uC694.",
    "New wallet generated. The bridge is restarting.": "\uC0C8 \uC9C0\uAC11\uC744 \uB9CC\uB4E4\uC5C8\uC5B4\uC694. bridge\uB97C \uB2E4\uC2DC \uC2DC\uC791\uD558\uACE0 \uC788\uC5B4\uC694.",
    "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.": "\uCCB4\uC778 \uB514\uB809\uD130\uB9AC\uC640 seed\uB97C \uB2E4\uC2DC \uC2A4\uCE94\uD558\uACE0 \uC788\uC5B4\uC694. \uC2A4\uCE94\uC774 \uB05D\uB098\uBA74 bridge\uAC00 \uB2E4\uC2DC \uC2DC\uC791\uB3FC\uC694.",
    "Paired. The worker\u2019s models appear below when it is online.": "\uD398\uC5B4\uB9C1\uD588\uC5B4\uC694. worker\uAC00 \uC628\uB77C\uC778\uC774 \uB418\uBA74 \uBAA8\uB378\uC774 \uC544\uB798\uC5D0 \uD45C\uC2DC\uB3FC\uC694.",
    "Forget this paired worker? You can pair it again with a fresh code.": "\uC774 \uD398\uC5B4\uB9C1\uB41C worker\uB97C \uC78A\uC744\uAE4C\uC694? \uC0C8 \uCF54\uB4DC\uB85C \uB2E4\uC2DC \uD398\uC5B4\uB9C1\uD560 \uC218 \uC788\uC5B4\uC694.",
    "Loading status\u2026": "\uC0C1\uD0DC \uBD88\uB7EC\uC624\uB294 \uC911\u2026",
    "Reconnecting\u2026": "\uB2E4\uC2DC \uC5F0\uACB0\uD558\uB294 \uC911\u2026",
    "Wallet": "\uC9C0\uAC11",
    "Wallet address copied.": "\uC9C0\uAC11 \uC8FC\uC18C\uB97C \uBCF5\uC0AC\uD588\uC5B4\uC694.",
    "copy": "\uBCF5\uC0AC",
    "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.": "\uC774 \uC9C0\uAC11\uC5D0\uB294 \uC544\uC9C1 \uC774 cluster\uC5D0 SOL\uC774 \uC5C6\uC5B4\uC694. \uC138\uC158\uC744 \uC5F4\uB824\uBA74 \uB80C\uD2B8\uC640 \uC218\uC218\uB8CC\uC6A9 SOL\uC774 \uC870\uAE08 \uD544\uC694\uD558\uACE0, \uCEF4\uD4E8\uD2B8 \uBE44\uC6A9\uC740 USDC\uB85C \uC9C0\uBD88\uD574\uC694.",
    "Open faucet (devnet)": "faucet \uC5F4\uAE30 (devnet)",
    "Minting\u2026": "\uBC1C\uD589 \uC911\u2026",
    "Mint 100 test USDC": "\uD14C\uC2A4\uD2B8 USDC 100\uAC1C \uBC1C\uD589",
    "Revealing\u2026": "\uD45C\uC2DC \uC911\u2026",
    "Export key": "\uD0A4 \uB0B4\uBCF4\uB0B4\uAE30",
    "Import key": "\uD0A4 \uAC00\uC838\uC624\uAE30",
    "New wallet": "\uC0C8 \uC9C0\uAC11",
    "Private key \u2014 keep it offline. Testnet only.": "\uAC1C\uC778 \uD0A4 \u2014 \uC624\uD504\uB77C\uC778\uC5D0 \uBCF4\uAD00\uD558\uC138\uC694. \uD14C\uC2A4\uD2B8\uB137 \uC804\uC6A9\uC774\uC5D0\uC694.",
    "Private key": "\uAC1C\uC778 \uD0A4",
    "Private key copied.": "\uAC1C\uC778 \uD0A4\uB97C \uBCF5\uC0AC\uD588\uC5B4\uC694.",
    "hide": "\uC228\uAE30\uAE30",
    "Paste a base58 wallet key (the format Phantom and solana-keygen show)": "base58 \uC9C0\uAC11 \uD0A4\uB97C \uBD99\uC5EC\uB123\uC73C\uC138\uC694 (Phantom\uACFC solana-keygen\uC774 \uBCF4\uC5EC\uC8FC\uB294 \uD615\uC2DD)",
    "Private key to import": "\uAC00\uC838\uC62C \uAC1C\uC778 \uD0A4",
    "Importing\u2026": "\uAC00\uC838\uC624\uB294 \uC911\u2026",
    "Import": "\uAC00\uC838\uC624\uAE30",
    "Tips": "\uD301",
    "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.": "GenKaKu \uC0AC\uC6A9\uC740 \uBB34\uB8CC\uC608\uC694. worker\uAC00 \uC720\uC6A9\uD588\uB2E4\uBA74 \u2014 \uD2B9\uD788 \uAD11\uACE0 \uC218\uC775\uC774 \uC5C6\uB294 \uBB34\uB8CC worker\uB77C\uBA74 \u2014 USDC\uB97C \uC9C1\uC811 \uBCF4\uB0BC \uC218 \uC788\uC5B4\uC694. \uC804\uC1A1\uC740 \uB0B4 \uC9C0\uAC11\uC5D0\uC11C \uADF8 worker\uC758 \uC9C0\uAC11\uC73C\uB85C \uAC00\uBA70, GenKaKu\uB294 \uAD00\uC5EC\uD558\uC9C0 \uC54A\uACE0 \uC218\uC218\uB8CC\uB3C4 \uBC1B\uC9C0 \uC54A\uC544\uC694.",
    "No worker with a wallet on the board yet.": "\uC544\uC9C1 \uBCF4\uB4DC\uC5D0 \uC9C0\uAC11\uC774 \uC788\uB294 worker\uAC00 \uC5C6\uC5B4\uC694.",
    "Each tip needs a little SOL in the wallet above for the network fee.": "\uD301\uC744 \uBCF4\uB0BC \uB54C\uB9C8\uB2E4 \uC704 \uC9C0\uAC11\uC5D0 \uB124\uD2B8\uC6CC\uD06C \uC218\uC218\uB8CC\uC6A9 SOL\uC774 \uC870\uAE08 \uD544\uC694\uD574\uC694.",
    "Settings": "\uC124\uC815",
    "Manual workers": "\uC218\uB3D9 worker",
    "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.": "\uC774 \uD504\uB85C\uD544\uC5D0 \uACE0\uC815\uD560 multiaddr(\uC120\uD0DD). \uC628\uCCB4\uC778 \uB514\uB809\uD130\uB9AC\uC640 seed\uB97C \uD1B5\uD55C \uAC80\uC0C9\uC740 \uACC4\uC18D \uB3D9\uC791\uD574\uC694.",
    "None pinned \u2014 using discovery only.": "\uACE0\uC815\uB41C \uD56D\uBAA9 \uC5C6\uC74C \u2014 \uAC80\uC0C9\uB9CC \uC0AC\uC6A9\uD574\uC694.",
    "remove": "\uC81C\uAC70",
    "Worker multiaddr": "worker multiaddr",
    "Add": "\uCD94\uAC00",
    "Refreshing\u2026": "\uC0C8\uB85C \uACE0\uCE58\uB294 \uC911\u2026",
    "Refresh network": "\uB124\uD2B8\uC6CC\uD06C \uC0C8\uB85C \uACE0\uCE58\uAE30",
    "Re-reads the directory and the seed now.": "\uC9C0\uAE08 \uB514\uB809\uD130\uB9AC\uC640 seed\uB97C \uB2E4\uC2DC \uC77D\uC5B4\uC694.",
    "selected": "\uC120\uD0DD\uB428",
    "Search a model, worker name or wallet": "\uBAA8\uB378, worker \uC774\uB984 \uB610\uB294 \uC9C0\uAC11 \uAC80\uC0C9",
    "Search models": "\uBAA8\uB378 \uAC80\uC0C9",
    "Sort models": "\uBAA8\uB378 \uC815\uB82C",
    "Recommended": "\uCD94\uCC9C",
    "Lowest price": "\uCD5C\uC800 \uAC00\uACA9",
    "Lowest latency": "\uCD5C\uC800 \uC9C0\uC5F0",
    "Most sessions served": "\uC138\uC158 \uCC98\uB9AC \uB9CE\uC740 \uC21C",
    "Model name": "\uBAA8\uB378 \uC774\uB984",
    "Worker name": "worker \uC774\uB984",
    "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.": "\uCCB4\uD06C\uD55C \uBAA8\uB378\uB9CC \uCC44\uD305 \uBAA8\uB378 \uC120\uD0DD\uAE30\uC5D0 \uD45C\uC2DC\uB418\uBA70, \uCD5C\uB300 10\uAC1C\uAE4C\uC9C0\uC608\uC694. \uCCB4\uD06C\uB294 worker\uC640 \uBAA8\uB378 \uB2E8\uC704\uB77C\uC11C, \uB450 worker\uC758 \uAC19\uC740 \uBAA8\uB378\uC740 \uB450 \uAC1C\uC758 \uC120\uD0DD\uC9C0\uAC00 \uB3FC\uC694.",
    "Nothing offered yet. A worker lists its local Ollama models on start.": "\uC544\uC9C1 \uC81C\uACF5\uB41C \uBAA8\uB378\uC774 \uC5C6\uC5B4\uC694. worker\uB294 \uC2DC\uC791\uD560 \uB54C \uB85C\uCEEC Ollama \uBAA8\uB378\uC744 \uB4F1\uB85D\uD574\uC694.",
    "No row matches that search.": "\uAC80\uC0C9\uACFC \uC77C\uCE58\uD558\uB294 \uD56D\uBAA9\uC774 \uC5C6\uC5B4\uC694.",
    "private": "\uBE44\uACF5\uAC1C",
    "Private workers": "\uBE44\uACF5\uAC1C worker",
    "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.": "\uBE44\uACF5\uAC1C worker\uB294 \uB514\uB809\uD130\uB9AC\uC5D0 \uC5C6\uC5B4\uC694. worker\uAC00 \uC900 \uC77C\uD68C\uC6A9 \uCF54\uB4DC\uB97C \uBD99\uC5EC\uB123\uC73C\uC138\uC694. \uD398\uC5B4\uB9C1\uC740 \uC774 \uC9C0\uAC11\uC5D0 \uBB36\uC774\uACE0, \uCF54\uB4DC\uB294 \uB2E4\uC2DC \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC5B4\uC694.",
    "Pairing code": "\uD398\uC5B4\uB9C1 \uCF54\uB4DC",
    "Pairing\u2026": "\uD398\uC5B4\uB9C1 \uC911\u2026",
    "Pair": "\uD398\uC5B4\uB9C1",
    "online": "\uC628\uB77C\uC778",
    "offline": "\uC624\uD504\uB77C\uC778",
    "checking\u2026": "\uD655\uC778 \uC911\u2026",
    "forget": "\uC78A\uAE30",
    "Advertise on GenKaKu": "GenKaKu\uC5D0 \uAD11\uACE0\uD558\uAE30",
    "refresh": "\uC0C8\uB85C \uACE0\uCE68",
    "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.": "\uB178\uCD9C\uB2F9 \uBE44\uC6A9\uC744 \uC9C0\uBD88\uD574\uC694. \uB178\uCD9C 1\uD68C\uB294 worker \uC2DC\uAC04 1\uBD84\uC758 \uC2A4\uD3F0\uC11C \uAD11\uACE0\uC608\uC694. \uC608\uC0B0\uC740 \uC704 \uC9C0\uAC11\uC758 USDC\uB85C, Solana\uC758 campaign \uACC4\uC815\uC5D0 \uBCF4\uB0B4\uC9C0\uBA70 \uD504\uB85C\uADF8\uB7A8\uB9CC \uC9C0\uAE09\uD560 \uC218 \uC788\uC5B4\uC694. \uC608\uC0B0\uC774 \uC18C\uC9C4\uB418\uBA74 \uAD11\uACE0\uB294 \uBA48\uCDB0\uC694.",
    "Test mode: a zero budget still serves, and impressions are not billed.": "\uD14C\uC2A4\uD2B8 \uBAA8\uB4DC: \uC608\uC0B0\uC774 0\uC774\uC5B4\uB3C4 \uAC8C\uC7AC\uB418\uBA70, \uB178\uCD9C\uC740 \uCCAD\uAD6C\uB418\uC9C0 \uC54A\uC544\uC694.",
    "Category": "\uCE74\uD14C\uACE0\uB9AC",
    "Sponsor name": "\uC2A4\uD3F0\uC11C \uC774\uB984",
    "Price per impression (USDC)": "\uB178\uCD9C\uB2F9 \uAC00\uACA9 (USDC)",
    "Budget (USDC)": "\uC608\uC0B0 (USDC)",
    "Title": "\uC81C\uBAA9",
    "Body": "\uBCF8\uBB38",
    "Destination URL": "\uC774\uB3D9 URL",
    "Button label": "\uBC84\uD2BC \uB77C\uBCA8",
    "Learn more": "\uC790\uC138\uD788 \uBCF4\uAE30",
    "Image URL": "\uC774\uBBF8\uC9C0 URL",
    "Image alt": "\uC774\uBBF8\uC9C0 \uB300\uCCB4 \uD14D\uC2A4\uD2B8",
    "Keywords": "\uD0A4\uC6CC\uB4DC",
    "Submitting\u2026": "\uC81C\uCD9C \uC911\u2026",
    "Submit for review": "\uAC80\uD1A0 \uC694\uCCAD",
    "No listings yet.": "\uC544\uC9C1 \uAD11\uACE0\uAC00 \uC5C6\uC5B4\uC694.",
    "Blocked by the operator": "\uC6B4\uC601\uC790\uAC00 \uCC28\uB2E8\uD568",
    "Not accepted": "\uC2B9\uC778\uB418\uC9C0 \uC54A\uC74C",
    "Reviewed \u2014 fund it to go live": "\uAC80\uD1A0 \uC644\uB8CC \u2014 \uC790\uAE08\uC744 \uB123\uC73C\uBA74 \uAC8C\uC2DC\uB3FC\uC694",
    "Budget spent \u2014 ad stopped": "\uC608\uC0B0 \uC18C\uC9C4 \u2014 \uAD11\uACE0 \uC911\uC9C0\uB428",
    "Live": "\uAC8C\uC7AC \uC911",
    "paused": "\uC77C\uC2DC\uC815\uC9C0\uB428",
    "impression": "\uB178\uCD9C",
    "not funded": "\uC790\uAE08 \uBBF8\uCDA9\uC804",
    "left": "\uB0A8\uC74C",
    "shown": "\uB178\uCD9C\uB428",
    "clicks": "\uD074\uB9AD",
    "Funding\u2026": "\uC790\uAE08 \uCDA9\uC804 \uC911\u2026",
    "Fund and publish": "\uC790\uAE08 \uCDA9\uC804 \uD6C4 \uAC8C\uC2DC",
    "Resume": "\uC7AC\uAC1C",
    "Pause": "\uC77C\uC2DC\uC815\uC9C0",
    "Withdraw unused": "\uB0A8\uC740 \uC608\uC0B0 \uCD9C\uAE08",
    "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.": "\uC790\uAE08\uC744 \uB123\uC73C\uB824\uBA74 \uC704 \uC9C0\uAC11\uC5D0 Solana \uC218\uC218\uB8CC\uC6A9 SOL\uC774 \uC870\uAE08 \uD544\uC694\uD574\uC694. campaign \uC8FC\uC18C\uB294 \uB0B4 \uC9C0\uAC11 \uC18C\uC720\uC774\uACE0, ads \uC11C\uBE44\uC2A4\uB294 \uC794\uC561\uB9CC \uC77D\uC744 \uC218 \uC788\uC5B4\uC694. \uC0AC\uC6A9\uD558\uC9C0 \uC54A\uC740 \uC608\uC0B0\uC740 \uAD11\uACE0\uB97C \uD558\uB8E8 \uB3D9\uC548 \uC77C\uC2DC\uC815\uC9C0\uD55C \uB4A4 \uCD9C\uAE08\uD560 \uC218 \uC788\uC5B4\uC694.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest": "127.0.0.1:{value}\uC5D0\uC11C \uC751\uB2F5\uC774 \uC788\uC9C0\uB9CC \uC774 \uCC3D\uC758 origin\uC744 \uAC70\uBD80\uD588\uC5B4\uC694 (403). \uD50C\uB7EC\uADF8\uC778\uC744 \uC5C5\uB370\uC774\uD2B8\uD558\uC138\uC694: dsh plugin add @genkaku/dsh-user-plugin@latest",
    "Not accepted: {value}": "\uC2B9\uC778\uB418\uC9C0 \uC54A\uC74C: {value}",
    "Withdrew {value} USDC back to the wallet.": "{value} USDC\uB97C \uC9C0\uAC11\uC73C\uB85C \uCD9C\uAE08\uD588\uC5B4\uC694.",
    "Minted 100 test USDC (tx {value}\u2026).": "\uD14C\uC2A4\uD2B8 USDC 100\uAC1C\uB97C \uBC1C\uD589\uD588\uC5B4\uC694 (tx {value}\u2026).",
    "At most {value} models can be selected. Untick one first.": "\uCD5C\uB300 {value}\uAC1C \uBAA8\uB378\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC5B4\uC694. \uBA3C\uC800 \uD558\uB098\uB97C \uD574\uC81C\uD558\uC138\uC694.",
    "{value} ticked model(s) are not on the network right now. They come back when their worker does.": "\uCCB4\uD06C\uD55C \uBAA8\uB378 {value}\uAC1C\uAC00 \uC9C0\uAE08 \uB124\uD2B8\uC6CC\uD06C\uC5D0 \uC5C6\uC5B4\uC694. \uD574\uB2F9 worker\uAC00 \uB3CC\uC544\uC624\uBA74 \uB2E4\uC2DC \uB098\uD0C0\uB098\uC694.",
    "Worker status unreachable on 47821\u201347826.": "47821\u201347826 \uD3EC\uD2B8\uC5D0\uC11C worker \uC0C1\uD0DC\uC5D0 \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC5B4\uC694.",
    "Ollama is running.": "Ollama\uAC00 \uC2E4\uD589 \uC911\uC774\uC5D0\uC694.",
    "Ollama did not start.": "Ollama\uAC00 \uC2DC\uC791\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694.",
    "starting": "\uC2DC\uC791 \uC911",
    "Saved \u2014 your catalog is live.": "\uC800\uC7A5\uD588\uC5B4\uC694 \u2014 \uCE74\uD0C8\uB85C\uADF8\uAC00 \uAC8C\uC2DC\uB418\uC5C8\uC5B4\uC694.",
    "Name saved. Users see it next to your models, and can sort and search by it.": "\uC774\uB984\uC744 \uC800\uC7A5\uD588\uC5B4\uC694. \uC0AC\uC6A9\uC790\uB294 \uBAA8\uB378 \uC606\uC5D0\uC11C \uC774\uB97C \uBCF4\uACE0, \uC815\uB82C\uACFC \uAC80\uC0C9\uC5D0 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC5B4\uC694.",
    "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?": "\uBE44\uACF5\uAC1C \uBAA8\uB4DC\uB294 \uC774 worker\uB97C \uACF5\uAC1C \uB514\uB809\uD130\uB9AC\uC640 seed\uC5D0\uC11C \uC81C\uAC70\uD574\uC694. \uC77C\uD68C\uC6A9 \uCF54\uB4DC\uB85C \uD398\uC5B4\uB9C1\uD55C \uC9C0\uAC11\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC5B4\uC694. \uACC4\uC18D\uD560\uAE4C\uC694?",
    "Private mode on \u2014 restarting the worker. Generate a pairing code below.": "\uBE44\uACF5\uAC1C \uBAA8\uB4DC \uCF1C\uC9D0 \u2014 worker\uB97C \uB2E4\uC2DC \uC2DC\uC791\uD558\uACE0 \uC788\uC5B4\uC694. \uC544\uB798\uC5D0\uC11C \uD398\uC5B4\uB9C1 \uCF54\uB4DC\uB97C \uC0DD\uC131\uD558\uC138\uC694.",
    "Public mode on \u2014 restarting the worker and rejoining the directory.": "\uACF5\uAC1C \uBAA8\uB4DC \uCF1C\uC9D0 \u2014 worker\uB97C \uB2E4\uC2DC \uC2DC\uC791\uD558\uACE0 \uB514\uB809\uD130\uB9AC\uC5D0 \uB2E4\uC2DC \uCC38\uC5EC\uD558\uB294 \uC911\uC774\uC5D0\uC694.",
    "Copy failed \u2014 select the code and copy it manually.": "\uBCF5\uC0AC\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694 \u2014 \uCF54\uB4DC\uB97C \uC120\uD0DD\uD574 \uC9C1\uC811 \uBCF5\uC0AC\uD558\uC138\uC694.",
    "Publishing enabled \u2014 restarting the worker.": "\uAC8C\uC2DC\uB97C \uCF30\uC5B4\uC694 \u2014 worker\uB97C \uB2E4\uC2DC \uC2DC\uC791\uD558\uACE0 \uC788\uC5B4\uC694.",
    "Publishing disabled \u2014 restarting the worker.": "\uAC8C\uC2DC\uB97C \uAED0\uC5B4\uC694 \u2014 worker\uB97C \uB2E4\uC2DC \uC2DC\uC791\uD558\uACE0 \uC788\uC5B4\uC694.",
    "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.": "\uC774 \uD0A4\uB294 \uC808\uB300 \uACF5\uC720\uD558\uC9C0 \uB9C8\uC138\uC694. \uD0A4\uB97C \uAC00\uC9C4 \uC0AC\uB78C\uC774 \uC9C0\uAC11, \uCCB4\uC778 \uB514\uB809\uD130\uB9AC\uC758 worker \uC2E0\uC6D0, \uADF8\uB9AC\uACE0 \uC218\uC775\uC744 \uC18C\uC720\uD558\uAC8C \uB3FC\uC694.",
    "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?": "\uD0A4\uB97C \uAC00\uC838\uC624\uBA74 \uC774 worker\uC758 \uC2E0\uC6D0 \uC9C0\uAC11\uC774 \uAD50\uCCB4\uB3FC\uC694. \uD604\uC7AC \uC8FC\uC18C\uB294 \uC790\uAE08\uC744 \uADF8\uB300\uB85C \uBCF4\uC720\uD574\uC694. \uAE30\uC874 \uC9C0\uAC11\uC774 \uC628\uCCB4\uC778\uC5D0 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC73C\uBA74 \uC774 \uD50C\uB7EC\uADF8\uC778\uC774 \uBA3C\uC800 \uD574\uB2F9 \uD56D\uBAA9\uC744 \uCCA0\uD68C\uD558\uB824\uACE0 \uD574\uC694. \uACC4\uC18D\uD560\uAE4C\uC694?",
    "Wallet imported. The worker is restarting with the new identity.": "\uC9C0\uAC11\uC744 \uAC00\uC838\uC654\uC5B4\uC694. worker\uAC00 \uC0C8 \uC2E0\uC6D0\uC73C\uB85C \uB2E4\uC2DC \uC2DC\uC791\uD558\uACE0 \uC788\uC5B4\uC694.",
    "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.": "\uC0C8 worker \uC9C0\uAC11\uC744 \uB9CC\uB4E4\uAE4C\uC694? \uAE30\uC874 \uC8FC\uC18C\uB294 SOL\uACFC USDC\uB97C \uADF8\uB300\uB85C \uBCF4\uC720\uD574\uC694. \uD56D\uBAA9\uC774 \uAC8C\uC2DC\uB418\uC5B4 \uC788\uC73C\uBA74 \uC774 \uD50C\uB7EC\uADF8\uC778\uC774 \uBA3C\uC800 \uCCA0\uD68C\uB97C \uC2DC\uB3C4\uD55C \uB4A4 \uC0C8 \uC2E0\uC6D0\uC73C\uB85C \uB2E4\uC2DC \uC2DC\uC791\uD574\uC694.",
    "New worker wallet generated. Restarting as the new identity.": "\uC0C8 worker \uC9C0\uAC11\uC744 \uB9CC\uB4E4\uC5C8\uC5B4\uC694. \uC0C8 \uC2E0\uC6D0\uC73C\uB85C \uB2E4\uC2DC \uC2DC\uC791\uD558\uACE0 \uC788\uC5B4\uC694.",
    "Worker restarting\u2026": "worker \uB2E4\uC2DC \uC2DC\uC791 \uC911\u2026",
    "Worker wallet": "worker \uC9C0\uAC11",
    "Balance": "\uC794\uC561",
    "Tips received": "\uBC1B\uC740 \uD301",
    "none yet": "\uC544\uC9C1 \uC5C6\uC74C",
    "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.": "\uC774 \uC9C0\uAC11\uC5D0\uB294 \uC544\uC9C1 \uC774 cluster\uC5D0 SOL\uC774 \uC5C6\uC5B4\uC694. worker\uAC00 listing\uC744 \uAC8C\uC2DC\uD558\uACE0 \uC138\uC158\uC744 \uC6B4\uC601\uD558\uB824\uBA74 \uB80C\uD2B8\uC640 \uC218\uC218\uB8CC\uC6A9 SOL\uC774 \uC870\uAE08 \uD544\uC694\uD574\uC694. USDC\uB294 \uBC84\uB294 \uAC83\uC774\uC9C0 \uC4F0\uB294 \uAC83\uC774 \uC544\uB2C8\uC5D0\uC694.",
    "Open faucet": "faucet \uC5F4\uAE30",
    "Generating\u2026": "\uC0DD\uC131 \uC911\u2026",
    "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.": "\uC774 \uD0A4\uB294 worker \uC2E0\uC6D0\uC774\uC5D0\uC694. \uC601\uC218\uC99D\uC5D0 \uC11C\uBA85\uD558\uACE0 \uC628\uCCB4\uC778 \uB514\uB809\uD130\uB9AC \uD56D\uBAA9\uC744 \uC5F0\uACB0\uD574\uC694. \uC774 \uBA38\uC2E0\uC744 \uC0C8 \uB514\uC2A4\uD06C\uB85C \uC62E\uAE30\uAE30 \uC804\uC5D0 \uBC31\uC5C5\uD558\uC138\uC694.",
    "Checking the local Ollama service\u2026": "\uB85C\uCEEC Ollama \uC11C\uBE44\uC2A4\uB97C \uD655\uC778\uD558\uB294 \uC911\u2026",
    "Running": "\uC2E4\uD589 \uC911",
    "Installed, not running": "\uC124\uCE58\uB428, \uC2E4\uD589 \uC548 \uB428",
    "Not installed": "\uC124\uCE58 \uC548 \uB428",
    "models": "\uBAA8\uB378",
    "Starting\u2026": "\uC2DC\uC791 \uC911\u2026",
    "Start Ollama": "Ollama \uC2DC\uC791",
    "Download Ollama": "Ollama \uB2E4\uC6B4\uB85C\uB4DC",
    "Directory": "\uB514\uB809\uD130\uB9AC",
    "Publish this worker on-chain": "\uC774 worker\uB97C \uC628\uCCB4\uC778\uC5D0 \uAC8C\uC2DC",
    "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.": "\uC774 \uBA38\uC2E0\uC5D0\uB294 \uACF5\uAC1C \uC8FC\uC18C\uAC00 \uC5C6\uC5B4\uC11C, \uC8FC\uC18C\uAC00 \uC0DD\uAE38 \uB54C\uAE4C\uC9C0 \uC774 \uC2A4\uC704\uCE58\uB294 \uAEBC\uC838 \uC788\uC5B4\uC694. \uAC8C\uC2DC\uD558\uBA74 \uC544\uBB34\uB3C4 \uC811\uC18D\uD560 \uC218 \uC5C6\uB294 \uD56D\uBAA9\uC774 \uB9CC\uB4E4\uC5B4\uC9C0\uAE30 \uB54C\uBB38\uC774\uC5D0\uC694. \uAC19\uC740 \uB124\uD2B8\uC6CC\uD06C\uC758 \uD53C\uC5B4\uB294 \uC5EC\uC804\uD788 \uC5F0\uACB0\uD560 \uC218 \uC788\uC5B4\uC694.",
    "Forced on by this profile (publishAddress), so it cannot be turned off here.": "\uC774 \uD504\uB85C\uD544(publishAddress)\uC5D0\uC11C \uAC15\uC81C\uB85C \uCF1C\uC838 \uC788\uC5B4\uC11C \uC5EC\uAE30\uC11C \uB04C \uC218 \uC5C6\uC5B4\uC694.",
    "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.": "seed VM relay\uB97C \uD1B5\uD574 \uB4F1\uB85D\uB418\uC5C8\uC5B4\uC694. \uC628\uCCB4\uC778\uC5D0\uB294 relay \uC8FC\uC18C\uB9CC \uAE30\uB85D\uB418\uACE0 \uB0B4 IP\uB294 \uAC8C\uC2DC\uB418\uC9C0 \uC54A\uC544\uC694.",
    "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.": "\uB4F1\uB85D\uB418\uC5C8\uC5B4\uC694. \uACF5\uAC1C IP\uAC00 \uCCB4\uC778\uC5D0 \uAE30\uB85D\uB418\uC5B4, \uC774 \uAE30\uB2A5\uC744 \uAEBC\uB3C4 \uC601\uAD6C\uD788 \uC77D\uC744 \uC218 \uC788\uC5B4\uC694.",
    "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.": "\uAC8C\uC2DC \uC911 \u2014 \uB514\uB809\uD130\uB9AC \uAE30\uB85D\uC774 \uC544\uC9C1 \uBC18\uC601\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694. worker\uAC00 \uC2E4\uD589\uB418\uB294 \uB3D9\uC548 \uC790\uB3D9\uC73C\uB85C \uC7AC\uC2DC\uB3C4\uD574\uC694.",
    "Not listed. A public address is available, so turning this on makes you discoverable.": "\uB4F1\uB85D\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694. \uACF5\uAC1C \uC8FC\uC18C\uAC00 \uC788\uC73C\uB2C8 \uC774 \uAE30\uB2A5\uC744 \uCF1C\uBA74 \uAC80\uC0C9\uB420 \uC218 \uC788\uC5B4\uC694.",
    "Name & access": "\uC774\uB984 \uBC0F \uC811\uADFC",
    "Display name": "\uD45C\uC2DC \uC774\uB984",
    "personal name, ID or nickname": "\uAC1C\uC778 \uC774\uB984, ID \uB610\uB294 \uB2C9\uB124\uC784",
    "Saving\u2026": "\uC800\uC7A5 \uC911\u2026",
    "save": "\uC800\uC7A5",
    "Users see this next to your models and can search and sort by it. It is not written on chain.": "\uC0AC\uC6A9\uC790\uB294 \uBAA8\uB378 \uC606\uC5D0\uC11C \uC774\uB97C \uBCF4\uACE0 \uAC80\uC0C9\uACFC \uC815\uB82C\uC5D0 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC5B4\uC694. \uC628\uCCB4\uC778\uC5D0\uB294 \uAE30\uB85D\uB418\uC9C0 \uC54A\uC544\uC694.",
    "Private": "\uBE44\uACF5\uAC1C",
    "Public": "\uACF5\uAC1C",
    "Private worker (pairing code required)": "\uBE44\uACF5\uAC1C worker (\uD398\uC5B4\uB9C1 \uCF54\uB4DC \uD544\uC694)",
    "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.": "\uBE44\uACF5\uAC1C: seed\uC5D0 \uC54C\uB9AC\uC9C0 \uC54A\uACE0 \uCCB4\uC778\uC5D0 \uC8FC\uC18C\uB3C4 \uAE30\uB85D\uD558\uC9C0 \uC54A\uC544, \uD398\uC5B4\uB9C1\uD55C \uC9C0\uAC11\uB9CC \uC774 \uBAA8\uB378\uC744 \uBCFC \uC218 \uC788\uC5B4\uC694. \uACFC\uAE08\uC740 \uAC00\uB2A5\uD558\uBA70 0\uC740 \uBB34\uB8CC\uB97C \uB73B\uD574\uC694.",
    "Public: anyone who reads the directory or asks the seed can find these models.": "\uACF5\uAC1C: \uB514\uB809\uD130\uB9AC\uB97C \uC77D\uAC70\uB098 seed\uC5D0 \uC694\uCCAD\uD558\uB294 \uB204\uAD6C\uB098 \uC774 \uBAA8\uB378\uC744 \uCC3E\uC744 \uC218 \uC788\uC5B4\uC694.",
    "label for this user (optional)": "\uC774 \uC0AC\uC6A9\uC790\uC6A9 \uB77C\uBCA8 (\uC120\uD0DD)",
    "label for this user": "\uC774 \uC0AC\uC6A9\uC790\uC6A9 \uB77C\uBCA8",
    "Generate pairing code": "\uD398\uC5B4\uB9C1 \uCF54\uB4DC \uC0DD\uC131",
    "Copied": "\uBCF5\uC0AC\uB428",
    "Copy code": "\uCF54\uB4DC \uBCF5\uC0AC",
    "Shown once. Expires in 15 minutes and pairs one wallet.": "\uD55C \uBC88\uB9CC \uD45C\uC2DC\uB3FC\uC694. 15\uBD84 \uD6C4 \uB9CC\uB8CC\uB418\uBA70 \uC9C0\uAC11 \uD558\uB098\uC640 \uD398\uC5B4\uB9C1\uB3FC\uC694.",
    "Unused codes": "\uBBF8\uC0AC\uC6A9 \uCF54\uB4DC",
    "revoke": "\uD3D0\uAE30",
    "Paired wallets": "\uD398\uC5B4\uB9C1\uB41C \uC9C0\uAC11",
    "unpair": "\uD398\uC5B4\uB9C1 \uD574\uC81C",
    "Models offered": "\uC81C\uACF5 \uBAA8\uB378",
    "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.": "\uCCB4\uD06C\uD558\uC9C0 \uC54A\uC740 \uBAA8\uB378\uC740 \uC124\uCE58\uB41C \uCC44\uB85C \uB0A8\uC9C0\uB9CC \uAD11\uACE0\uB418\uC9C0 \uC54A\uC544\uC694. \uAC00\uACA9\uC740 \uC2DC\uAC04\uB2F9 USDC\uC774\uBA70 0\uC740 \uBB34\uB8CC\uC608\uC694.",
    "No local models yet. Download one below.": "\uC544\uC9C1 \uB85C\uCEEC \uBAA8\uB378\uC774 \uC5C6\uC5B4\uC694. \uC544\uB798\uC5D0\uC11C \uD558\uB098 \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC138\uC694.",
    "not for agents": "\uC5D0\uC774\uC804\uD2B8\uC6A9 \uC544\uB2D8",
    "delete": "\uC0AD\uC81C",
    "model to download, e.g. llama3.2:3b": "\uB2E4\uC6B4\uB85C\uB4DC\uD560 \uBAA8\uB378, \uC608: llama3.2:3b",
    "Model to download": "\uB2E4\uC6B4\uB85C\uB4DC\uD560 \uBAA8\uB378",
    "Downloading\u2026": "\uB2E4\uC6B4\uB85C\uB4DC \uC911\u2026",
    "Download": "\uB2E4\uC6B4\uB85C\uB4DC",
    "offered": "\uC81C\uACF5\uB428",
    "unsaved changes": "\uC800\uC7A5\uB418\uC9C0 \uC54A\uC740 \uBCC0\uACBD \uC0AC\uD56D",
    "Save catalog": "\uCE74\uD0C8\uB85C\uADF8 \uC800\uC7A5",
    "Peer": "\uD53C\uC5B4",
    "Connection": "\uC5F0\uACB0",
    "libp2p direct": "libp2p \uC9C1\uC811",
    "seed VM relay": "seed VM relay",
    "LAN only": "LAN \uC804\uC6A9",
    "Clients reach this worker directly over libp2p.": "\uD074\uB77C\uC774\uC5B8\uD2B8\uAC00 libp2p\uB97C \uD1B5\uD574 \uC774 worker\uC5D0 \uC9C1\uC811 \uC5F0\uACB0\uD574\uC694.",
    "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.": "\uC778\uD130\uB137\uC5D0\uC11C \uC9C1\uC811 \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC5B4 \uD2B8\uB798\uD53D\uC774 GenKaKu seed VM\uC744 \uAC70\uCCD0 \uC804\uB2EC\uB3FC\uC694. \uD074\uB77C\uC774\uC5B8\uD2B8\uB294 \uBA3C\uC800 \uC9C1\uC811 \uC5F0\uACB0\uC744 \uC2DC\uB3C4\uD558\uACE0, \uC2E4\uD328\uD558\uBA74 relay\uB85C \uC804\uD658\uD574\uC694.",
    "Only peers on the same network can connect. A relay appears once the seed VM is reachable.": "\uAC19\uC740 \uB124\uD2B8\uC6CC\uD06C\uC758 \uD53C\uC5B4\uB9CC \uC5F0\uACB0\uD560 \uC218 \uC788\uC5B4\uC694. seed VM\uC5D0 \uC5F0\uACB0\uB418\uBA74 relay\uAC00 \uB098\uD0C0\uB098\uC694.",
    "Active sessions": "\uD65C\uC131 \uC138\uC158",
    "Addresses": "\uC8FC\uC18C",
    "Open the full dashboard": "\uC804\uCCB4 \uB300\uC2DC\uBCF4\uB4DC \uC5F4\uAE30",
    "Ad earnings": "\uAD11\uACE0 \uC218\uC775",
    "Ready to claim": "\uC218\uB839 \uAC00\uB2A5",
    "In this wallet": "\uC774 \uC9C0\uAC11\uC5D0 \uC788\uC74C",
    "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.": "\uAD11\uACE0\uC8FC\uB294 \uC2A4\uD3F0\uC11C \uC2DC\uAC04(\uBD84)\uB2F9 \uBE44\uC6A9\uC744 \uC9C0\uBD88\uD574\uC694. \uB9E4\uC77C \uC815\uC0B0 \uD6C4 \uADF8\uB0A0\uC758 \uC2DC\uAC04\uC774 \uC774 worker\uC5D0 \uC628\uCCB4\uC778\uC73C\uB85C \uAE30\uB85D\uB418\uACE0, \uADF8\uB2E4\uC74C \uC5EC\uAE30\uC11C \uC218\uB839\uD560 \uC218 \uC788\uC5B4\uC694. \uC218\uB839\uC740 Solana \uD2B8\uB79C\uC7AD\uC158\uC774\uB77C \uC704 \uC9C0\uAC11\uC5D0 \uC218\uC218\uB8CC\uC6A9 SOL\uC774 \uC870\uAE08 \uD544\uC694\uD558\uBA70, USDC\uB294 \uC774 \uC9C0\uAC11\uC73C\uB85C \uBC14\uB85C \uB4E4\uC5B4\uC640\uC694.",
    "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.": "campaign\uC740 \uC790\uAE30 \uC794\uC561\uC774 \uD574\uB2F9 \uC2DC\uAC04\uC744 \uAC10\uB2F9\uD560 \uB54C\uB9CC \uC9C0\uAE09\uD574\uC694. campaign\uC758 \uC218\uB839 \uAE30\uC900\uC5D0 \uBABB \uBBF8\uCE58\uB294 worker\uB294 \uB354 \uC313\uC77C \uB54C\uAE4C\uC9C0 \uAE30\uB2E4\uB824\uC694.",
    "Claiming\u2026": "\uC218\uB839 \uC911\u2026",
    "Claim": "\uC218\uB839",
    "Nothing above a threshold yet.": "\uC544\uC9C1 \uAE30\uC900\uC744 \uB118\uB294 \uD56D\uBAA9\uC774 \uC5C6\uC5B4\uC694.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest": "127.0.0.1:{value}\uC5D0\uC11C \uC751\uB2F5\uC774 \uC788\uC9C0\uB9CC \uC774 \uCC3D\uC758 origin\uC744 \uAC70\uBD80\uD588\uC5B4\uC694 (403). \uD50C\uB7EC\uADF8\uC778\uC744 \uC5C5\uB370\uC774\uD2B8\uD558\uC138\uC694: dsh plugin add @genkaku/dsh-worker-plugin@latest",
    "Downloaded {value}.": "{value}\uC744(\uB97C) \uB2E4\uC6B4\uB85C\uB4DC\uD588\uC5B4\uC694.",
    "Delete {value} from this machine?": "\uC774 \uBA38\uC2E0\uC5D0\uC11C {value}\uC744(\uB97C) \uC0AD\uC81C\uD560\uAE4C\uC694?",
    "Invalid price for {value}": "{value}\uC758 \uAC00\uACA9\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC544\uC694",
    "Stop allowing {value} to use this worker?": "{value}\uC774(\uAC00) \uC774 worker\uB97C \uC0AC\uC6A9\uD558\uC9C0 \uBABB\uD558\uAC8C \uD560\uAE4C\uC694?",
    "{value} tips": "\uD301 {value}\uAC74",
    "Price per hour for {value}": "{value}\uC758 \uC2DC\uAC04\uB2F9 \uAC00\uACA9",
    "Sponsored": "\uC2A4\uD3F0\uC11C",
    "Dismiss this placement": "\uC774 \uAD11\uACE0 \uB2EB\uAE30",
    "Dismiss": "\uB2EB\uAE30",
    "GenKaKu User": "GenKaKu \uC0AC\uC6A9\uC790",
    "GenKaKu Worker": "GenKaKu worker",
    "GenKaKu network": "GenKaKu \uB124\uD2B8\uC6CC\uD06C",
    "Sessions": "\uC138\uC158",
    "Workers discovered": "\uBC1C\uACAC\uB41C worker",
    "Models on the network": "\uB124\uD2B8\uC6CC\uD06C\uC758 \uBAA8\uB378",
    "Private worker": "\uBE44\uACF5\uAC1C worker",
    "Copy": "\uBCF5\uC0AC",
    "Save": "\uC800\uC7A5",
    "Cancel": "\uCDE8\uC18C",
    "Refresh": "\uC0C8\uB85C \uACE0\uCE68",
    "Language": "\uC5B8\uC5B4",
    "Follow DSH": "DSH \uB530\uB974\uAE30",
    "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.": "\uC5EC\uAE30\uC11C \uC120\uD0DD\uD558\uC9C0 \uC54A\uC73C\uBA74 DSH \uC5B8\uC5B4\uB97C \uB530\uB985\uB2C8\uB2E4. DSH\uC5D0\uB294 \uD55C\uAD6D\uC5B4\uAC00 \uC5C6\uC5B4 \uC5EC\uAE30\uC11C \uC81C\uACF5\uD569\uB2C8\uB2E4.",
    "GenKaKu worker": "GenKaKu worker",
    "The plugin opens its bridge on the first free port in 47821\u201347826.": "\uD50C\uB7EC\uADF8\uC778\uC740 47821\u201347826 \uC911 \uCCAB \uBC88\uC9F8 \uBE48 \uD3EC\uD2B8\uC5D0\uC11C bridge\uB97C \uC5FD\uB2C8\uB2E4.",
    "free \xB7 tips optional": "\uBB34\uB8CC \xB7 \uD301 \uC120\uD0DD",
    "Loading worker status\u2026": "worker \uC0C1\uD0DC\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\u2026",
    "Agent access": "\uC5D0\uC774\uC804\uD2B8 \uC811\uADFC",
    "Agent wallet mode": "\uC5D0\uC774\uC804\uD2B8 \uC9C0\uAC11 \uBAA8\uB4DC",
    "Off": "\uAEBC\uC9D0",
    "Ask owner": "\uC18C\uC720\uC790\uC5D0\uAC8C \uD655\uC778",
    "Capped": "\uD55C\uB3C4 \uB0B4 \uC790\uB3D9",
    "Per request (USDC)": "\uC694\uCCAD\uB2F9 \uD55C\uB3C4(USDC)",
    "Per day (USDC)": "\uC77C\uC77C \uD55C\uB3C4(USDC)",
    "Freeze wallet": "\uC9C0\uAC11 \uB3D9\uACB0",
    "Frozen: owner actions still work; agent requests are refused.": "\uB3D9\uACB0\uB428: \uC18C\uC720\uC790 \uC791\uC5C5\uC740 \uAC00\uB2A5\uD558\uACE0 \uC5D0\uC774\uC804\uD2B8 \uC694\uCCAD\uC740 \uAC70\uBD80\uB429\uB2C8\uB2E4.",
    "Pending approvals": "\uC2B9\uC778 \uB300\uAE30",
    "Approve": "\uC2B9\uC778",
    "Deny": "\uAC70\uBD80",
    "No pending requests.": "\uB300\uAE30 \uC911\uC778 \uC694\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
    "Key and identity operations are always owner-only.": "\uD0A4\uC640 \uC2E0\uC6D0 \uC791\uC5C5\uC740 \uD56D\uC0C1 \uC18C\uC720\uC790\uB9CC \uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    "Caps apply to tips and campaign funding; claims are not a spend.": "\uD55C\uB3C4\uB294 \uD301\uACFC \uCEA0\uD398\uC778 \uCDA9\uC804\uC5D0 \uC801\uC6A9\uB418\uBA70, \uC218\uB839\uC740 \uC9C0\uCD9C\uC774 \uC544\uB2D9\uB2C8\uB2E4.",
    "Save limits": "\uD55C\uB3C4 \uC800\uC7A5",
    "Enter both limits in USDC.": "\uB450 \uD55C\uB3C4\uB97C USDC\uB85C \uC785\uB825\uD558\uC138\uC694."
  },
  "es": {
    "Reconnecting to the bridge\u2026": "Reconectando con el bridge\u2026",
    "No GenKaKu user bridge on 47821\u201347826.": "No hay ning\xFAn bridge de usuario de GenKaKu en 47821\u201347826.",
    "Bridge not reached yet.": "Todav\xEDa no se ha alcanzado el bridge.",
    "Enter a price per impression.": "Introduce un precio por impresi\xF3n.",
    "Price must be between 0.0001 and 0.1 USDC per impression.": "El precio debe estar entre 0.0001 y 0.1 USDC por impresi\xF3n.",
    "Submitted and reviewed. Fund it and it goes live; the operator can block it later.": "Enviado y revisado. Si lo financias, se publica; el operador puede bloquearlo m\xE1s adelante.",
    "Resumed. The ad is serving again.": "Reanudado. El anuncio vuelve a mostrarse.",
    "Paused. No new impressions; unspent budget can be withdrawn after a day.": "En pausa. No hay nuevas impresiones; el presupuesto sin gastar se puede retirar tras un d\xEDa.",
    "Enter a budget.": "Introduce un presupuesto.",
    "The budget must cover at least one impression.": "El presupuesto debe cubrir al menos una impresi\xF3n.",
    "The campaign address was not returned.": "No se devolvi\xF3 la direcci\xF3n de la campaign.",
    "Funded. The ad starts as soon as the operator-approved listing picks it up.": "Financiado. El anuncio se activa en cuanto lo recoge el listado aprobado por el operador.",
    "Saved. The bridge is restarting with the new worker list.": "Guardado. El bridge se est\xE1 reiniciando con la nueva lista de workers.",
    "Never share this key. Anyone who has it owns the wallet and its funds.": "Nunca compartas esta clave. Quien la tenga es due\xF1o de la cartera y de sus fondos.",
    "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?": "Importar una clave sustituye la cartera de usuario de este perfil. La direcci\xF3n actual conserva sus fondos y deja de usarse. \xBFContinuar?",
    "Wallet imported. The bridge is restarting.": "Cartera importada. El bridge se est\xE1 reiniciando.",
    "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.": "\xBFGenerar una cartera nueva? La direcci\xF3n anterior conserva sus SOL y USDC; este perfil deja de usarla.",
    "New wallet generated. The bridge is restarting.": "Cartera nueva generada. El bridge se est\xE1 reiniciando.",
    "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.": "Volviendo a escanear el directorio de la cadena y la seed. El bridge se reinicia cuando termina el escaneo.",
    "Paired. The worker\u2019s models appear below when it is online.": "Emparejado. Los modelos del worker aparecen abajo cuando est\xE1 online.",
    "Forget this paired worker? You can pair it again with a fresh code.": "\xBFOlvidar este worker emparejado? Puedes volver a emparejarlo con un c\xF3digo nuevo.",
    "Loading status\u2026": "Cargando estado\u2026",
    "Reconnecting\u2026": "Reconectando\u2026",
    "Wallet": "Cartera",
    "Wallet address copied.": "Direcci\xF3n de la cartera copiada.",
    "copy": "copiar",
    "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.": "Esta cartera a\xFAn no tiene SOL en este cl\xFAster. Una sesi\xF3n necesita un poco de SOL para renta y comisiones; con USDC paga el c\xF3mputo.",
    "Open faucet (devnet)": "Abrir faucet (devnet)",
    "Minting\u2026": "Acu\xF1ando\u2026",
    "Mint 100 test USDC": "Acu\xF1ar 100 USDC de prueba",
    "Revealing\u2026": "Mostrando\u2026",
    "Export key": "Exportar clave",
    "Import key": "Importar clave",
    "New wallet": "Cartera nueva",
    "Private key \u2014 keep it offline. Testnet only.": "Clave privada: mantenla offline. Solo testnet.",
    "Private key": "Clave privada",
    "Private key copied.": "Clave privada copiada.",
    "hide": "ocultar",
    "Paste a base58 wallet key (the format Phantom and solana-keygen show)": "Pega una clave de cartera en base58 (el formato que muestran Phantom y solana-keygen)",
    "Private key to import": "Clave privada que importar",
    "Importing\u2026": "Importando\u2026",
    "Import": "Importar",
    "Tips": "Propinas",
    "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.": "Usar GenKaKu no cuesta nada. Si un worker te ha resultado \xFAtil \u2014sobre todo uno gratuito, que no genera ingresos publicitarios\u2014 puedes enviarle USDC directamente. La transferencia va de tu cartera a la suya; GenKaKu no interviene y no se lleva comisi\xF3n.",
    "No worker with a wallet on the board yet.": "Todav\xEDa no hay ning\xFAn worker con cartera en el tablero.",
    "Each tip needs a little SOL in the wallet above for the network fee.": "Cada propina necesita un poco de SOL en la cartera de arriba para la comisi\xF3n de red.",
    "Settings": "Ajustes",
    "Manual workers": "Workers manuales",
    "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.": "Multiaddrs opcionales fijados a este perfil. La detecci\xF3n mediante el directorio on-chain y la seed sigue funcionando.",
    "None pinned \u2014 using discovery only.": "Ninguno fijado; solo se usa la detecci\xF3n.",
    "remove": "quitar",
    "Worker multiaddr": "Multiaddr del worker",
    "Add": "A\xF1adir",
    "Refreshing\u2026": "Actualizando\u2026",
    "Refresh network": "Actualizar red",
    "Re-reads the directory and the seed now.": "Vuelve a leer el directorio y la seed ahora.",
    "selected": "seleccionados",
    "Search a model, worker name or wallet": "Busca un modelo, un nombre de worker o una cartera",
    "Search models": "Buscar modelos",
    "Sort models": "Ordenar modelos",
    "Recommended": "Recomendado",
    "Lowest price": "Precio m\xE1s bajo",
    "Lowest latency": "Latencia m\xE1s baja",
    "Most sessions served": "M\xE1s sesiones atendidas",
    "Model name": "Nombre del modelo",
    "Worker name": "Nombre del worker",
    "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.": "Solo los modelos marcados aparecen en el selector de modelos del chat, hasta diez. La marca es por worker y modelo, as\xED que el mismo modelo de dos workers son dos opciones.",
    "Nothing offered yet. A worker lists its local Ollama models on start.": "A\xFAn no se ofrece nada. Un worker lista sus modelos Ollama locales al arrancar.",
    "No row matches that search.": "Ninguna fila coincide con esa b\xFAsqueda.",
    "private": "privado",
    "Private workers": "Workers privados",
    "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.": "Un worker privado no est\xE1 en el directorio. Pega el c\xF3digo de un solo uso que te dio: el emparejamiento queda vinculado a esta cartera y el c\xF3digo no se puede volver a usar.",
    "Pairing code": "C\xF3digo de emparejamiento",
    "Pairing\u2026": "Emparejando\u2026",
    "Pair": "Emparejar",
    "online": "online",
    "offline": "offline",
    "checking\u2026": "comprobando\u2026",
    "forget": "olvidar",
    "Advertise on GenKaKu": "An\xFAnciate en GenKaKu",
    "refresh": "actualizar",
    "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.": "Pagas por impresi\xF3n: una impresi\xF3n es un minuto patrocinado del tiempo de un worker. El presupuesto es USDC de la cartera de arriba, enviado a una cuenta de campaign en Solana de la que solo el programa puede pagar. Cuando se acaba el presupuesto, el anuncio se detiene.",
    "Test mode: a zero budget still serves, and impressions are not billed.": "Modo de prueba: con presupuesto cero el anuncio se sigue mostrando y las impresiones no se facturan.",
    "Category": "Categor\xEDa",
    "Sponsor name": "Nombre del patrocinador",
    "Price per impression (USDC)": "Precio por impresi\xF3n (USDC)",
    "Budget (USDC)": "Presupuesto (USDC)",
    "Title": "T\xEDtulo",
    "Body": "Cuerpo",
    "Destination URL": "URL de destino",
    "Button label": "Texto del bot\xF3n",
    "Learn more": "M\xE1s informaci\xF3n",
    "Image URL": "URL de la imagen",
    "Image alt": "Texto alternativo de la imagen",
    "Keywords": "Palabras clave",
    "Submitting\u2026": "Enviando\u2026",
    "Submit for review": "Enviar a revisi\xF3n",
    "No listings yet.": "A\xFAn no hay anuncios.",
    "Blocked by the operator": "Bloqueado por el operador",
    "Not accepted": "No aceptado",
    "Reviewed \u2014 fund it to go live": "Revisado: fin\xE1ncialo para publicarlo",
    "Budget spent \u2014 ad stopped": "Presupuesto agotado: anuncio detenido",
    "Live": "Activo",
    "paused": "en pausa",
    "impression": "impresi\xF3n",
    "not funded": "sin financiar",
    "left": "restante",
    "shown": "mostradas",
    "clicks": "clics",
    "Funding\u2026": "Financiando\u2026",
    "Fund and publish": "Financiar y publicar",
    "Resume": "Reanudar",
    "Pause": "Pausar",
    "Withdraw unused": "Retirar lo no usado",
    "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.": "Financiar requiere un poco de SOL en la cartera de arriba para la comisi\xF3n de Solana. La direcci\xF3n de campaign pertenece a tu cartera; el servicio de anuncios solo puede leer su saldo. El presupuesto sin gastar se puede retirar cuando el anuncio lleva un d\xEDa en pausa.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest": "Algo responde en 127.0.0.1:{value} pero rechaz\xF3 el origen de esta ventana (403). Actualiza el plugin: dsh plugin add @genkaku/dsh-user-plugin@latest",
    "Not accepted: {value}": "No aceptado: {value}",
    "Withdrew {value} USDC back to the wallet.": "Se retiraron {value} USDC a la cartera.",
    "Minted 100 test USDC (tx {value}\u2026).": "Se acu\xF1aron 100 USDC de prueba (tx {value}\u2026).",
    "At most {value} models can be selected. Untick one first.": "Se pueden seleccionar como m\xE1ximo {value} modelos. Desmarca uno primero.",
    "{value} ticked model(s) are not on the network right now. They come back when their worker does.": "{value} modelos marcados no est\xE1n en la red ahora mismo. Volver\xE1n cuando lo haga su worker.",
    "Worker status unreachable on 47821\u201347826.": "No se puede acceder al estado del worker en 47821\u201347826.",
    "Ollama is running.": "Ollama se est\xE1 ejecutando.",
    "Ollama did not start.": "Ollama no se inici\xF3.",
    "starting": "iniciando",
    "Saved \u2014 your catalog is live.": "Guardado: tu cat\xE1logo est\xE1 activo.",
    "Name saved. Users see it next to your models, and can sort and search by it.": "Nombre guardado. Los usuarios lo ven junto a tus modelos y pueden ordenar y buscar por \xE9l.",
    "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?": "El modo privado quita este worker del directorio p\xFAblico y de la seed. Solo pueden usarlo las carteras que emparejes con un c\xF3digo de un solo uso. \xBFContinuar?",
    "Private mode on \u2014 restarting the worker. Generate a pairing code below.": "Modo privado activado: reiniciando el worker. Genera un c\xF3digo de emparejamiento abajo.",
    "Public mode on \u2014 restarting the worker and rejoining the directory.": "Modo p\xFAblico activado: reiniciando el worker y volviendo a unirse al directorio.",
    "Copy failed \u2014 select the code and copy it manually.": "No se pudo copiar: selecciona el c\xF3digo y c\xF3pialo manualmente.",
    "Publishing enabled \u2014 restarting the worker.": "Publicaci\xF3n activada: reiniciando el worker.",
    "Publishing disabled \u2014 restarting the worker.": "Publicaci\xF3n desactivada: reiniciando el worker.",
    "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.": "Nunca compartas esta clave. Quien la tenga es due\xF1o de la cartera, de la identidad del worker en el directorio de la cadena y de sus ingresos.",
    "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?": "Importar una clave sustituye la cartera de identidad de este worker. La direcci\xF3n actual conserva sus fondos. Si la cartera anterior est\xE1 listada on-chain, este plugin intentar\xE1 retirar antes esa entrada. \xBFContinuar?",
    "Wallet imported. The worker is restarting with the new identity.": "Cartera importada. El worker se est\xE1 reiniciando con la nueva identidad.",
    "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.": "\xBFGenerar una cartera nueva para el worker? La direcci\xF3n anterior conserva sus SOL y USDC. Si su entrada est\xE1 publicada, este plugin intentar\xE1 retirarla primero y luego se reiniciar\xE1 con la nueva identidad.",
    "New worker wallet generated. Restarting as the new identity.": "Cartera nueva del worker generada. Reiniciando con la nueva identidad.",
    "Worker restarting\u2026": "Reiniciando el worker\u2026",
    "Worker wallet": "Cartera del worker",
    "Balance": "Saldo",
    "Tips received": "Propinas recibidas",
    "none yet": "a\xFAn ninguna",
    "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.": "Esta cartera a\xFAn no tiene SOL en este cl\xFAster. El worker necesita un poco para renta y comisiones para publicar su listado y ejecutar sesiones; el USDC es lo que gana, no lo que gasta.",
    "Open faucet": "Abrir faucet",
    "Generating\u2026": "Generando\u2026",
    "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.": "Esta clave es la identidad del worker: firma los recibos y vincula la entrada del directorio on-chain. Haz una copia de seguridad antes de mover esta m\xE1quina a otro disco.",
    "Checking the local Ollama service\u2026": "Comprobando el servicio Ollama local\u2026",
    "Running": "En ejecuci\xF3n",
    "Installed, not running": "Instalado, sin ejecutar",
    "Not installed": "No instalado",
    "models": "modelos",
    "Starting\u2026": "Iniciando\u2026",
    "Start Ollama": "Iniciar Ollama",
    "Download Ollama": "Descargar Ollama",
    "Directory": "Directorio",
    "Publish this worker on-chain": "Publicar este worker on-chain",
    "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.": "Esta m\xE1quina no tiene direcci\xF3n p\xFAblica, as\xED que este interruptor est\xE1 apagado hasta que la tenga: publicarla crear\xEDa una entrada a la que nadie podr\xEDa llamar. Los peers de la misma red s\xED pueden conectarse.",
    "Forced on by this profile (publishAddress), so it cannot be turned off here.": "Este perfil lo fuerza a activado (publishAddress), as\xED que no se puede desactivar aqu\xED.",
    "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.": "Publicado mediante el relay de la seed VM. Solo se escribe on-chain la direcci\xF3n del relay; tu propia IP no se publica.",
    "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.": "Publicado. Tu IP p\xFAblica se escribe en la cadena y queda legible para siempre, incluso despu\xE9s de que lo desactives.",
    "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.": "Publicando: la escritura en el directorio a\xFAn no se ha confirmado. Se reintenta autom\xE1ticamente mientras el worker se ejecuta.",
    "Not listed. A public address is available, so turning this on makes you discoverable.": "No publicado. Hay una direcci\xF3n p\xFAblica disponible, as\xED que activarlo te hace detectable.",
    "Name & access": "Nombre y acceso",
    "Display name": "Nombre visible",
    "personal name, ID or nickname": "nombre personal, ID o alias",
    "Saving\u2026": "Guardando\u2026",
    "save": "guardar",
    "Users see this next to your models and can search and sort by it. It is not written on chain.": "Los usuarios lo ven junto a tus modelos y pueden buscar y ordenar por \xE9l. No se escribe en la cadena.",
    "Private": "Privado",
    "Public": "P\xFAblico",
    "Private worker (pairing code required)": "Worker privado (se requiere c\xF3digo de emparejamiento)",
    "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.": "Privado: no se anuncia a la seed y no tiene direcci\xF3n en la cadena, as\xED que solo las carteras que emparejaste pueden ver estos modelos. Aun as\xED puedes cobrar: 0 significa gratis.",
    "Public: anyone who reads the directory or asks the seed can find these models.": "P\xFAblico: cualquiera que lea el directorio o consulte la seed puede encontrar estos modelos.",
    "label for this user (optional)": "etiqueta para este usuario (opcional)",
    "label for this user": "etiqueta para este usuario",
    "Generate pairing code": "Generar c\xF3digo de emparejamiento",
    "Copied": "Copiado",
    "Copy code": "Copiar c\xF3digo",
    "Shown once. Expires in 15 minutes and pairs one wallet.": "Se muestra una vez. Caduca en 15 minutos y empareja una cartera.",
    "Unused codes": "C\xF3digos sin usar",
    "revoke": "revocar",
    "Paired wallets": "Carteras emparejadas",
    "unpair": "desemparejar",
    "Models offered": "Modelos ofrecidos",
    "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.": "Los modelos sin marcar siguen instalados pero no se anuncian. El precio es USDC por hora; 0 significa gratis.",
    "No local models yet. Download one below.": "A\xFAn no hay modelos locales. Descarga uno abajo.",
    "not for agents": "no para agentes",
    "delete": "eliminar",
    "model to download, e.g. llama3.2:3b": "modelo que descargar, p. ej. llama3.2:3b",
    "Model to download": "Modelo que descargar",
    "Downloading\u2026": "Descargando\u2026",
    "Download": "Descargar",
    "offered": "ofrecido",
    "unsaved changes": "cambios sin guardar",
    "Save catalog": "Guardar cat\xE1logo",
    "Peer": "Peer",
    "Connection": "Conexi\xF3n",
    "libp2p direct": "libp2p directo",
    "seed VM relay": "relay de la seed VM",
    "LAN only": "Solo LAN",
    "Clients reach this worker directly over libp2p.": "Los clientes llegan a este worker directamente por libp2p.",
    "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.": "No es posible la conexi\xF3n directa desde internet, as\xED que el tr\xE1fico se reenv\xEDa a trav\xE9s de la seed VM de GenKaKu. Los clientes intentan primero una conexi\xF3n directa y luego recurren al relay.",
    "Only peers on the same network can connect. A relay appears once the seed VM is reachable.": "Solo pueden conectarse los peers de la misma red. El relay aparece cuando la seed VM es accesible.",
    "Active sessions": "Sesiones activas",
    "Addresses": "Direcciones",
    "Open the full dashboard": "Abrir el panel completo",
    "Ad earnings": "Ingresos por anuncios",
    "Ready to claim": "Listo para reclamar",
    "In this wallet": "En esta cartera",
    "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.": "Los anunciantes pagan por minuto patrocinado. Los minutos de cada d\xEDa se registran para este worker on-chain tras la liquidaci\xF3n diaria y luego se pueden reclamar aqu\xED. La reclamaci\xF3n es una transacci\xF3n de Solana, as\xED que necesita un poco de SOL en la cartera de arriba para la comisi\xF3n; el USDC va directo a esta cartera.",
    "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.": "Una campaign solo paga cuando su propio saldo cubre los minutos; un worker por debajo del umbral de reclamaci\xF3n de esa campaign espera a que se acumule m\xE1s.",
    "Claiming\u2026": "Reclamando\u2026",
    "Claim": "Reclamar",
    "Nothing above a threshold yet.": "Todav\xEDa nada por encima de un umbral.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest": "Algo responde en 127.0.0.1:{value} pero rechaz\xF3 el origen de esta ventana (403). Actualiza el plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest",
    "Downloaded {value}.": "Se descarg\xF3 {value}.",
    "Delete {value} from this machine?": "\xBFEliminar {value} de esta m\xE1quina?",
    "Invalid price for {value}": "Precio no v\xE1lido para {value}",
    "Stop allowing {value} to use this worker?": "\xBFDejar de permitir que {value} use este worker?",
    "{value} tips": "{value} propinas",
    "Price per hour for {value}": "Precio por hora de {value}",
    "Sponsored": "Patrocinado",
    "Dismiss this placement": "Descartar este emplazamiento",
    "Dismiss": "Descartar",
    "GenKaKu User": "Usuario de GenKaKu",
    "GenKaKu Worker": "Worker de GenKaKu",
    "GenKaKu network": "Red GenKaKu",
    "Sessions": "Sesiones",
    "Workers discovered": "Workers descubiertos",
    "Models on the network": "Modelos en la red",
    "Private worker": "Worker privado",
    "Copy": "Copiar",
    "Save": "Guardar",
    "Cancel": "Cancelar",
    "Refresh": "Actualizar",
    "Language": "Idioma",
    "Follow DSH": "Seguir DSH",
    "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.": "Sigue el idioma de DSH salvo que elijas uno aqu\xED. El coreano est\xE1 aqu\xED porque DSH no lo incluye.",
    "GenKaKu worker": "Worker de GenKaKu",
    "The plugin opens its bridge on the first free port in 47821\u201347826.": "El plugin abre su bridge en el primer puerto libre de 47821\u201347826.",
    "free \xB7 tips optional": "gratis \xB7 propinas opcionales",
    "Loading worker status\u2026": "Cargando el estado del worker\u2026",
    "Agent access": "Acceso del agente",
    "Agent wallet mode": "Modo del monedero del agente",
    "Off": "Desactivado",
    "Ask owner": "Preguntar al propietario",
    "Capped": "Autom\xE1tico con l\xEDmite",
    "Per request (USDC)": "Por solicitud (USDC)",
    "Per day (USDC)": "Por d\xEDa (USDC)",
    "Freeze wallet": "Congelar monedero",
    "Frozen: owner actions still work; agent requests are refused.": "Congelado: las acciones del propietario siguen funcionando; las del agente se rechazan.",
    "Pending approvals": "Aprobaciones pendientes",
    "Approve": "Aprobar",
    "Deny": "Rechazar",
    "No pending requests.": "No hay solicitudes pendientes.",
    "Key and identity operations are always owner-only.": "Las operaciones de clave e identidad son siempre solo del propietario.",
    "Caps apply to tips and campaign funding; claims are not a spend.": "Los l\xEDmites se aplican a propinas y financiaci\xF3n de campa\xF1as; cobrar no es un gasto.",
    "Save limits": "Guardar l\xEDmites",
    "Enter both limits in USDC.": "Introduce ambos l\xEDmites en USDC."
  },
  "fr": {
    "Reconnecting to the bridge\u2026": "Reconnexion au bridge\u2026",
    "No GenKaKu user bridge on 47821\u201347826.": "Aucun bridge utilisateur GenKaKu sur 47821\u201347826.",
    "Bridge not reached yet.": "Bridge pas encore joint.",
    "Enter a price per impression.": "Saisissez un prix par impression.",
    "Price must be between 0.0001 and 0.1 USDC per impression.": "Le prix doit \xEAtre compris entre 0,0001 et 0,1 USDC par impression.",
    "Submitted and reviewed. Fund it and it goes live; the operator can block it later.": "Soumis et valid\xE9. Financez-le pour le mettre en ligne ; l\u2019op\xE9rateur peut le bloquer ensuite.",
    "Resumed. The ad is serving again.": "Reprise. La publicit\xE9 est de nouveau diffus\xE9e.",
    "Paused. No new impressions; unspent budget can be withdrawn after a day.": "En pause. Aucune nouvelle impression ; le budget non d\xE9pens\xE9 peut \xEAtre retir\xE9 apr\xE8s un jour.",
    "Enter a budget.": "Saisissez un budget.",
    "The budget must cover at least one impression.": "Le budget doit couvrir au moins une impression.",
    "The campaign address was not returned.": "L\u2019adresse de campaign n\u2019a pas \xE9t\xE9 renvoy\xE9e.",
    "Funded. The ad starts as soon as the operator-approved listing picks it up.": "Financ\xE9. La publicit\xE9 d\xE9marre d\xE8s que l\u2019annonce approuv\xE9e par l\u2019op\xE9rateur la prend en charge.",
    "Saved. The bridge is restarting with the new worker list.": "Enregistr\xE9. Le bridge red\xE9marre avec la nouvelle liste de workers.",
    "Never share this key. Anyone who has it owns the wallet and its funds.": "Ne partagez jamais cette cl\xE9. Quiconque la poss\xE8de contr\xF4le le portefeuille et ses fonds.",
    "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?": "Importer une cl\xE9 remplace le portefeuille utilisateur de ce profil. L\u2019adresse actuelle conserve ses fonds et n\u2019est plus utilis\xE9e. Continuer ?",
    "Wallet imported. The bridge is restarting.": "Portefeuille import\xE9. Le bridge red\xE9marre.",
    "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.": "G\xE9n\xE9rer un nouveau portefeuille ? L\u2019ancienne adresse conserve ses SOL et USDC ; ce profil cesse de l\u2019utiliser.",
    "New wallet generated. The bridge is restarting.": "Nouveau portefeuille g\xE9n\xE9r\xE9. Le bridge red\xE9marre.",
    "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.": "Nouvelle analyse de l\u2019annuaire on-chain et du seed. Le bridge red\xE9marre \xE0 la fin de l\u2019analyse.",
    "Paired. The worker\u2019s models appear below when it is online.": "Appair\xE9. Les mod\xE8les du worker apparaissent ci-dessous lorsqu\u2019il est en ligne.",
    "Forget this paired worker? You can pair it again with a fresh code.": "Oublier ce worker appair\xE9 ? Vous pourrez l\u2019appairer \xE0 nouveau avec un nouveau code.",
    "Loading status\u2026": "Chargement du statut\u2026",
    "Reconnecting\u2026": "Reconnexion\u2026",
    "Wallet": "Portefeuille",
    "Wallet address copied.": "Adresse du portefeuille copi\xE9e.",
    "copy": "copier",
    "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.": "Ce portefeuille n\u2019a pas encore de SOL sur ce cluster. Une session a besoin d\u2019un peu de SOL pour le rent et les frais ; l\u2019USDC sert \xE0 payer le calcul.",
    "Open faucet (devnet)": "Ouvrir le faucet (devnet)",
    "Minting\u2026": "\xC9mission\u2026",
    "Mint 100 test USDC": "\xC9mettre 100 USDC de test",
    "Revealing\u2026": "R\xE9v\xE9lation\u2026",
    "Export key": "Exporter la cl\xE9",
    "Import key": "Importer une cl\xE9",
    "New wallet": "Nouveau portefeuille",
    "Private key \u2014 keep it offline. Testnet only.": "Cl\xE9 priv\xE9e \u2014 gardez-la hors ligne. Testnet uniquement.",
    "Private key": "Cl\xE9 priv\xE9e",
    "Private key copied.": "Cl\xE9 priv\xE9e copi\xE9e.",
    "hide": "masquer",
    "Paste a base58 wallet key (the format Phantom and solana-keygen show)": "Collez une cl\xE9 de portefeuille base58 (le format affich\xE9 par Phantom et solana-keygen)",
    "Private key to import": "Cl\xE9 priv\xE9e \xE0 importer",
    "Importing\u2026": "Importation\u2026",
    "Import": "Importer",
    "Tips": "Pourboires",
    "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.": "Utiliser GenKaKu ne co\xFBte rien. Si un worker vous a \xE9t\xE9 utile \u2014 surtout un worker gratuit, qui ne g\xE9n\xE8re aucun revenu publicitaire \u2014 vous pouvez lui envoyer des USDC directement. Le transfert va de votre portefeuille au sien ; GenKaKu n\u2019intervient pas et ne prend aucune commission.",
    "No worker with a wallet on the board yet.": "Aucun worker avec un portefeuille sur le tableau pour l\u2019instant.",
    "Each tip needs a little SOL in the wallet above for the network fee.": "Chaque pourboire n\xE9cessite un peu de SOL dans le portefeuille ci-dessus pour les frais de r\xE9seau.",
    "Settings": "Param\xE8tres",
    "Manual workers": "Workers manuels",
    "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.": "Multiaddrs facultatifs \xE9pingl\xE9s \xE0 ce profil. La d\xE9couverte via l\u2019annuaire on-chain et le seed reste active.",
    "None pinned \u2014 using discovery only.": "Aucun \xE9pingl\xE9 \u2014 d\xE9couverte uniquement.",
    "remove": "retirer",
    "Worker multiaddr": "Multiaddr du worker",
    "Add": "Ajouter",
    "Refreshing\u2026": "Actualisation\u2026",
    "Refresh network": "Actualiser le r\xE9seau",
    "Re-reads the directory and the seed now.": "Relit l\u2019annuaire et le seed maintenant.",
    "selected": "s\xE9lectionn\xE9",
    "Search a model, worker name or wallet": "Rechercher un mod\xE8le, un nom de worker ou un portefeuille",
    "Search models": "Rechercher des mod\xE8les",
    "Sort models": "Trier les mod\xE8les",
    "Recommended": "Recommand\xE9",
    "Lowest price": "Prix le plus bas",
    "Lowest latency": "Latence la plus faible",
    "Most sessions served": "Le plus de sessions servies",
    "Model name": "Nom du mod\xE8le",
    "Worker name": "Nom du worker",
    "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.": "Seuls les mod\xE8les coch\xE9s apparaissent dans le s\xE9lecteur de mod\xE8les du chat, jusqu\u2019\xE0 dix. La s\xE9lection se fait par worker et par mod\xE8le : le m\xEAme mod\xE8le chez deux workers compte pour deux choix.",
    "Nothing offered yet. A worker lists its local Ollama models on start.": "Rien n\u2019est encore propos\xE9. Un worker liste ses mod\xE8les Ollama locaux au d\xE9marrage.",
    "No row matches that search.": "Aucune ligne ne correspond \xE0 cette recherche.",
    "private": "priv\xE9",
    "Private workers": "Workers priv\xE9s",
    "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.": "Un worker priv\xE9 n\u2019appara\xEEt pas dans l\u2019annuaire. Collez le code \xE0 usage unique qu\u2019il vous a fourni : l\u2019appairage est li\xE9 \xE0 ce portefeuille et le code ne peut pas \xEAtre r\xE9utilis\xE9.",
    "Pairing code": "Code d\u2019appairage",
    "Pairing\u2026": "Appairage\u2026",
    "Pair": "Appairer",
    "online": "en ligne",
    "offline": "hors ligne",
    "checking\u2026": "v\xE9rification\u2026",
    "forget": "oublier",
    "Advertise on GenKaKu": "Annoncez sur GenKaKu",
    "refresh": "actualiser",
    "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.": "Vous payez \xE0 l\u2019impression : une impression correspond \xE0 une minute sponsoris\xE9e du temps d\u2019un worker. Le budget est en USDC depuis le portefeuille ci-dessus, envoy\xE9 vers un compte de campaign sur Solana dont seul le programme peut effectuer des paiements. Quand le budget est \xE9puis\xE9, la publicit\xE9 s\u2019arr\xEAte.",
    "Test mode: a zero budget still serves, and impressions are not billed.": "Mode test : un budget nul diffuse quand m\xEAme, et les impressions ne sont pas factur\xE9es.",
    "Category": "Cat\xE9gorie",
    "Sponsor name": "Nom du sponsor",
    "Price per impression (USDC)": "Prix par impression (USDC)",
    "Budget (USDC)": "Budget (USDC)",
    "Title": "Titre",
    "Body": "Texte",
    "Destination URL": "URL de destination",
    "Button label": "Libell\xE9 du bouton",
    "Learn more": "En savoir plus",
    "Image URL": "URL de l\u2019image",
    "Image alt": "Texte alternatif de l\u2019image",
    "Keywords": "Mots-cl\xE9s",
    "Submitting\u2026": "Envoi\u2026",
    "Submit for review": "Soumettre pour validation",
    "No listings yet.": "Aucune annonce pour l\u2019instant.",
    "Blocked by the operator": "Bloqu\xE9 par l\u2019op\xE9rateur",
    "Not accepted": "Non accept\xE9",
    "Reviewed \u2014 fund it to go live": "Valid\xE9 \u2014 financez pour mettre en ligne",
    "Budget spent \u2014 ad stopped": "Budget \xE9puis\xE9 \u2014 publicit\xE9 arr\xEAt\xE9e",
    "Live": "En ligne",
    "paused": "en pause",
    "impression": "impression",
    "not funded": "non financ\xE9",
    "left": "restant",
    "shown": "affich\xE9es",
    "clicks": "clics",
    "Funding\u2026": "Financement\u2026",
    "Fund and publish": "Financer et publier",
    "Resume": "Reprendre",
    "Pause": "Mettre en pause",
    "Withdraw unused": "Retirer l\u2019inutilis\xE9",
    "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.": "Le financement n\xE9cessite un peu de SOL dans le portefeuille ci-dessus pour les frais Solana. L\u2019adresse de campaign appartient \xE0 votre portefeuille ; le service d\u2019annonces peut seulement lire son solde. Le budget non d\xE9pens\xE9 peut \xEAtre retir\xE9 une fois la publicit\xE9 en pause depuis un jour.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest": "Quelque chose r\xE9pond sur 127.0.0.1:{value} mais a refus\xE9 l\u2019origine de cette fen\xEAtre (403). Mettez \xE0 jour le plugin : dsh plugin add @genkaku/dsh-user-plugin@latest",
    "Not accepted: {value}": "Non accept\xE9 : {value}",
    "Withdrew {value} USDC back to the wallet.": "{value} USDC retir\xE9s vers le portefeuille.",
    "Minted 100 test USDC (tx {value}\u2026).": "\xC9mission de 100 USDC de test (tx {value}\u2026).",
    "At most {value} models can be selected. Untick one first.": "{value} mod\xE8les maximum peuvent \xEAtre s\xE9lectionn\xE9s. D\xE9cochez-en un d\u2019abord.",
    "{value} ticked model(s) are not on the network right now. They come back when their worker does.": "{value} mod\xE8le(s) coch\xE9(s) ne sont pas sur le r\xE9seau pour l\u2019instant. Ils reviennent quand leur worker revient.",
    "Worker status unreachable on 47821\u201347826.": "Statut du worker inaccessible sur 47821\u201347826.",
    "Ollama is running.": "Ollama est en cours d\u2019ex\xE9cution.",
    "Ollama did not start.": "Ollama n\u2019a pas d\xE9marr\xE9.",
    "starting": "d\xE9marrage",
    "Saved \u2014 your catalog is live.": "Enregistr\xE9 \u2014 votre catalogue est en ligne.",
    "Name saved. Users see it next to your models, and can sort and search by it.": "Nom enregistr\xE9. Les utilisateurs le voient \xE0 c\xF4t\xE9 de vos mod\xE8les et peuvent trier et rechercher selon ce nom.",
    "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?": "Le mode priv\xE9 retire ce worker de l\u2019annuaire public et du seed. Seuls les portefeuilles que vous appairez avec un code \xE0 usage unique peuvent l\u2019utiliser. Continuer ?",
    "Private mode on \u2014 restarting the worker. Generate a pairing code below.": "Mode priv\xE9 activ\xE9 \u2014 red\xE9marrage du worker. G\xE9n\xE9rez un code d\u2019appairage ci-dessous.",
    "Public mode on \u2014 restarting the worker and rejoining the directory.": "Mode public activ\xE9 \u2014 red\xE9marrage du worker et r\xE9inscription dans l\u2019annuaire.",
    "Copy failed \u2014 select the code and copy it manually.": "La copie a \xE9chou\xE9 \u2014 s\xE9lectionnez le code et copiez-le manuellement.",
    "Publishing enabled \u2014 restarting the worker.": "Publication activ\xE9e \u2014 red\xE9marrage du worker.",
    "Publishing disabled \u2014 restarting the worker.": "Publication d\xE9sactiv\xE9e \u2014 red\xE9marrage du worker.",
    "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.": "Ne partagez jamais cette cl\xE9. Quiconque la poss\xE8de contr\xF4le le portefeuille, l\u2019identit\xE9 du worker dans l\u2019annuaire on-chain et ses revenus.",
    "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?": "Importer une cl\xE9 remplace le portefeuille d\u2019identit\xE9 de ce worker. L\u2019adresse actuelle conserve ses fonds. Si l\u2019ancien portefeuille est inscrit on-chain, ce plugin tentera d\u2019abord de retirer cette entr\xE9e. Continuer ?",
    "Wallet imported. The worker is restarting with the new identity.": "Portefeuille import\xE9. Le worker red\xE9marre avec la nouvelle identit\xE9.",
    "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.": "G\xE9n\xE9rer un nouveau portefeuille de worker ? L\u2019ancienne adresse conserve ses SOL et USDC. Si son entr\xE9e est publi\xE9e, ce plugin tentera d\u2019abord de la retirer, puis red\xE9marrera avec la nouvelle identit\xE9.",
    "New worker wallet generated. Restarting as the new identity.": "Nouveau portefeuille de worker g\xE9n\xE9r\xE9. Red\xE9marrage avec la nouvelle identit\xE9.",
    "Worker restarting\u2026": "Red\xE9marrage du worker\u2026",
    "Worker wallet": "Portefeuille du worker",
    "Balance": "Solde",
    "Tips received": "Pourboires re\xE7us",
    "none yet": "aucun pour l\u2019instant",
    "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.": "Ce portefeuille n\u2019a pas encore de SOL sur ce cluster. Le worker en a besoin d\u2019un peu pour le rent et les frais afin de publier son annonce et d\u2019ex\xE9cuter des sessions ; l\u2019USDC est ce qu\u2019il gagne, pas ce qu\u2019il d\xE9pense.",
    "Open faucet": "Ouvrir le faucet",
    "Generating\u2026": "G\xE9n\xE9ration\u2026",
    "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.": "Cette cl\xE9 est l\u2019identit\xE9 du worker : elle signe les re\xE7us et lie l\u2019entr\xE9e de l\u2019annuaire on-chain. Sauvegardez-la avant de d\xE9placer cette machine vers un nouveau disque.",
    "Checking the local Ollama service\u2026": "V\xE9rification du service Ollama local\u2026",
    "Running": "En cours",
    "Installed, not running": "Install\xE9, non d\xE9marr\xE9",
    "Not installed": "Non install\xE9",
    "models": "mod\xE8les",
    "Starting\u2026": "D\xE9marrage\u2026",
    "Start Ollama": "D\xE9marrer Ollama",
    "Download Ollama": "T\xE9l\xE9charger Ollama",
    "Directory": "Annuaire",
    "Publish this worker on-chain": "Publier ce worker on-chain",
    "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.": "Cette machine n\u2019a pas d\u2019adresse publique : ce r\xE9glage reste donc d\xE9sactiv\xE9 tant qu\u2019elle n\u2019en a pas, car l\u2019inscrire cr\xE9erait une entr\xE9e que personne ne peut joindre. Les pairs du m\xEAme r\xE9seau peuvent toujours se connecter.",
    "Forced on by this profile (publishAddress), so it cannot be turned off here.": "Forc\xE9 par ce profil (publishAddress) : il ne peut donc pas \xEAtre d\xE9sactiv\xE9 ici.",
    "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.": "Inscrit via le relais du seed VM. Seule l\u2019adresse du relais est \xE9crite on-chain ; votre propre IP n\u2019est pas publi\xE9e.",
    "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.": "Inscrit. Votre IP publique est \xE9crite dans la cha\xEEne et reste lisible pour toujours, m\xEAme apr\xE8s avoir d\xE9sactiv\xE9 ce r\xE9glage.",
    "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.": "Publication \u2014 l\u2019\xE9criture dans l\u2019annuaire n\u2019est pas encore confirm\xE9e. Elle est retent\xE9e automatiquement tant que le worker tourne.",
    "Not listed. A public address is available, so turning this on makes you discoverable.": "Non inscrit. Une adresse publique est disponible : activer ce r\xE9glage vous rend visible.",
    "Name & access": "Nom et acc\xE8s",
    "Display name": "Nom affich\xE9",
    "personal name, ID or nickname": "nom personnel, ID ou pseudonyme",
    "Saving\u2026": "Enregistrement\u2026",
    "save": "enregistrer",
    "Users see this next to your models and can search and sort by it. It is not written on chain.": "Les utilisateurs le voient \xE0 c\xF4t\xE9 de vos mod\xE8les et peuvent rechercher et trier selon ce nom. Il n\u2019est pas \xE9crit on-chain.",
    "Private": "Priv\xE9",
    "Public": "Public",
    "Private worker (pairing code required)": "Worker priv\xE9 (code d\u2019appairage requis)",
    "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.": "Priv\xE9 : non annonc\xE9 au seed et aucune adresse on-chain, donc seuls les portefeuilles que vous avez appair\xE9s voient ces mod\xE8les. Vous pouvez quand m\xEAme facturer \u2014 0 signifie gratuit.",
    "Public: anyone who reads the directory or asks the seed can find these models.": "Public : toute personne qui lit l\u2019annuaire ou interroge le seed peut trouver ces mod\xE8les.",
    "label for this user (optional)": "libell\xE9 pour cet utilisateur (facultatif)",
    "label for this user": "libell\xE9 pour cet utilisateur",
    "Generate pairing code": "G\xE9n\xE9rer un code d\u2019appairage",
    "Copied": "Copi\xE9",
    "Copy code": "Copier le code",
    "Shown once. Expires in 15 minutes and pairs one wallet.": "Affich\xE9 une seule fois. Expire dans 15 minutes et appaire un seul portefeuille.",
    "Unused codes": "Codes inutilis\xE9s",
    "revoke": "r\xE9voquer",
    "Paired wallets": "Portefeuilles appair\xE9s",
    "unpair": "dissocier",
    "Models offered": "Mod\xE8les propos\xE9s",
    "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.": "Les mod\xE8les non coch\xE9s restent install\xE9s mais ne sont pas annonc\xE9s. Le prix est en USDC par heure ; 0 signifie gratuit.",
    "No local models yet. Download one below.": "Aucun mod\xE8le local pour l\u2019instant. T\xE9l\xE9chargez-en un ci-dessous.",
    "not for agents": "pas pour les agents",
    "delete": "supprimer",
    "model to download, e.g. llama3.2:3b": "mod\xE8le \xE0 t\xE9l\xE9charger, par ex. llama3.2:3b",
    "Model to download": "Mod\xE8le \xE0 t\xE9l\xE9charger",
    "Downloading\u2026": "T\xE9l\xE9chargement\u2026",
    "Download": "T\xE9l\xE9charger",
    "offered": "propos\xE9",
    "unsaved changes": "modifications non enregistr\xE9es",
    "Save catalog": "Enregistrer le catalogue",
    "Peer": "Pair",
    "Connection": "Connexion",
    "libp2p direct": "libp2p direct",
    "seed VM relay": "relais seed VM",
    "LAN only": "LAN uniquement",
    "Clients reach this worker directly over libp2p.": "Les clients joignent ce worker directement via libp2p.",
    "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.": "La connexion directe n\u2019est pas possible depuis Internet : le trafic est donc relay\xE9 via le seed VM de GenKaKu. Les clients tentent d\u2019abord une connexion directe, puis basculent sur le relais.",
    "Only peers on the same network can connect. A relay appears once the seed VM is reachable.": "Seuls les pairs du m\xEAme r\xE9seau peuvent se connecter. Un relais appara\xEEt d\xE8s que le seed VM est joignable.",
    "Active sessions": "Sessions actives",
    "Addresses": "Adresses",
    "Open the full dashboard": "Ouvrir le tableau de bord complet",
    "Ad earnings": "Revenus publicitaires",
    "Ready to claim": "Pr\xEAt \xE0 r\xE9clamer",
    "In this wallet": "Dans ce portefeuille",
    "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.": "Les annonceurs paient \xE0 la minute sponsoris\xE9e. Les minutes de chaque jour sont cr\xE9dit\xE9es \xE0 ce worker on-chain apr\xE8s le r\xE8glement quotidien, puis peuvent \xEAtre r\xE9clam\xE9es ici. La r\xE9clamation est une transaction Solana : elle n\xE9cessite un peu de SOL dans le portefeuille ci-dessus pour les frais ; l\u2019USDC arrive directement dans ce portefeuille.",
    "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.": "Une campaign ne paie que si son propre solde couvre les minutes ; un worker sous le seuil de r\xE9clamation de cette campaign attend que davantage s\u2019accumule.",
    "Claiming\u2026": "R\xE9clamation\u2026",
    "Claim": "R\xE9clamer",
    "Nothing above a threshold yet.": "Rien au-dessus d\u2019un seuil pour l\u2019instant.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest": "Quelque chose r\xE9pond sur 127.0.0.1:{value} mais a refus\xE9 l\u2019origine de cette fen\xEAtre (403). Mettez \xE0 jour le plugin : dsh plugin add @genkaku/dsh-worker-plugin@latest",
    "Downloaded {value}.": "{value} t\xE9l\xE9charg\xE9.",
    "Delete {value} from this machine?": "Supprimer {value} de cette machine ?",
    "Invalid price for {value}": "Prix invalide pour {value}",
    "Stop allowing {value} to use this worker?": "Ne plus autoriser {value} \xE0 utiliser ce worker ?",
    "{value} tips": "{value} pourboires",
    "Price per hour for {value}": "Prix par heure pour {value}",
    "Sponsored": "Sponsoris\xE9",
    "Dismiss this placement": "Fermer cet encart",
    "Dismiss": "Fermer",
    "GenKaKu User": "GenKaKu User",
    "GenKaKu Worker": "GenKaKu Worker",
    "GenKaKu network": "R\xE9seau GenKaKu",
    "Sessions": "Sessions",
    "Workers discovered": "Workers d\xE9couverts",
    "Models on the network": "Mod\xE8les sur le r\xE9seau",
    "Private worker": "Worker priv\xE9",
    "Copy": "Copier",
    "Save": "Enregistrer",
    "Cancel": "Annuler",
    "Refresh": "Actualiser",
    "Language": "Langue",
    "Follow DSH": "Suivre DSH",
    "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.": "Suit la langue de DSH sauf si vous en choisissez une ici. Le cor\xE9en est propos\xE9 ici car DSH ne l\u2019inclut pas.",
    "GenKaKu worker": "Worker GenKaKu",
    "The plugin opens its bridge on the first free port in 47821\u201347826.": "Le plugin ouvre son bridge sur le premier port libre entre 47821 et 47826.",
    "free \xB7 tips optional": "gratuit \xB7 pourboires facultatifs",
    "Loading worker status\u2026": "Chargement de l\u2019\xE9tat du worker\u2026",
    "Agent access": "Acc\xE8s de l\u2019agent",
    "Agent wallet mode": "Mode du portefeuille de l\u2019agent",
    "Off": "D\xE9sactiv\xE9",
    "Ask owner": "Demander au propri\xE9taire",
    "Capped": "Automatique avec limite",
    "Per request (USDC)": "Par demande (USDC)",
    "Per day (USDC)": "Par jour (USDC)",
    "Freeze wallet": "Geler le portefeuille",
    "Frozen: owner actions still work; agent requests are refused.": "Gel\xE9 : les actions du propri\xE9taire restent possibles ; celles de l\u2019agent sont refus\xE9es.",
    "Pending approvals": "Approbations en attente",
    "Approve": "Approuver",
    "Deny": "Refuser",
    "No pending requests.": "Aucune demande en attente.",
    "Key and identity operations are always owner-only.": "Les op\xE9rations de cl\xE9 et d\u2019identit\xE9 sont toujours r\xE9serv\xE9es au propri\xE9taire.",
    "Caps apply to tips and campaign funding; claims are not a spend.": "Les limites s\u2019appliquent aux pourboires et au financement de campagnes ; un retrait n\u2019est pas une d\xE9pense.",
    "Save limits": "Enregistrer les limites",
    "Enter both limits in USDC.": "Saisissez les deux limites en USDC."
  },
  "de": {
    "Reconnecting to the bridge\u2026": "Verbindung zur Bridge wird wiederhergestellt\u2026",
    "No GenKaKu user bridge on 47821\u201347826.": "Keine GenKaKu-Nutzer-Bridge auf 47821\u201347826.",
    "Bridge not reached yet.": "Bridge noch nicht erreichbar.",
    "Enter a price per impression.": "Gib einen Preis pro Impression ein.",
    "Price must be between 0.0001 and 0.1 USDC per impression.": "Der Preis muss zwischen 0.0001 und 0.1 USDC pro Impression liegen.",
    "Submitted and reviewed. Fund it and it goes live; the operator can block it later.": "Eingereicht und gepr\xFCft. Finanziere es, dann geht es live; der Operator kann es sp\xE4ter sperren.",
    "Resumed. The ad is serving again.": "Fortgesetzt. Die Anzeige wird wieder ausgeliefert.",
    "Paused. No new impressions; unspent budget can be withdrawn after a day.": "Pausiert. Keine neuen Impressionen; nicht verbrauchtes Budget l\xE4sst sich nach einem Tag zur\xFCckziehen.",
    "Enter a budget.": "Gib ein Budget ein.",
    "The budget must cover at least one impression.": "Das Budget muss mindestens eine Impression abdecken.",
    "The campaign address was not returned.": "Die Campaign-Adresse wurde nicht zur\xFCckgegeben.",
    "Funded. The ad starts as soon as the operator-approved listing picks it up.": "Finanziert. Die Anzeige startet, sobald das vom Operator freigegebene Listing sie aufnimmt.",
    "Saved. The bridge is restarting with the new worker list.": "Gespeichert. Die Bridge startet mit der neuen Worker-Liste neu.",
    "Never share this key. Anyone who has it owns the wallet and its funds.": "Teile diesen Schl\xFCssel nie. Wer ihn hat, besitzt die Wallet und ihr Guthaben.",
    "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?": "Der Import eines Schl\xFCssels ersetzt die User-Wallet dieses Profils. Die aktuelle Adresse beh\xE4lt ihr Guthaben und wird nicht mehr verwendet. Fortfahren?",
    "Wallet imported. The bridge is restarting.": "Wallet importiert. Die Bridge startet neu.",
    "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.": "Neue Wallet erzeugen? Die alte Adresse beh\xE4lt ihre SOL und USDC; dieses Profil verwendet sie nicht mehr.",
    "New wallet generated. The bridge is restarting.": "Neue Wallet erzeugt. Die Bridge startet neu.",
    "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.": "Chain-Verzeichnis und Seed werden neu gescannt. Die Bridge startet neu, sobald der Scan fertig ist.",
    "Paired. The worker\u2019s models appear below when it is online.": "Gepairt. Die Modelle des Workers erscheinen unten, sobald er online ist.",
    "Forget this paired worker? You can pair it again with a fresh code.": "Diesen gepairten Worker vergessen? Du kannst ihn mit einem neuen Code erneut pairn.",
    "Loading status\u2026": "Status wird geladen\u2026",
    "Reconnecting\u2026": "Verbinde neu\u2026",
    "Wallet": "Wallet",
    "Wallet address copied.": "Wallet-Adresse kopiert.",
    "copy": "kopieren",
    "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.": "Diese Wallet hat auf diesem Cluster noch kein SOL. Eine Session braucht etwas SOL f\xFCr Rent und Geb\xFChren; USDC bezahlt die Rechenleistung.",
    "Open faucet (devnet)": "Faucet \xF6ffnen (devnet)",
    "Minting\u2026": "Wird gepr\xE4gt\u2026",
    "Mint 100 test USDC": "100 Test-USDC pr\xE4gen",
    "Revealing\u2026": "Wird angezeigt\u2026",
    "Export key": "Schl\xFCssel exportieren",
    "Import key": "Schl\xFCssel importieren",
    "New wallet": "Neue Wallet",
    "Private key \u2014 keep it offline. Testnet only.": "Private Key \u2014 offline aufbewahren. Nur Testnet.",
    "Private key": "Private Key",
    "Private key copied.": "Private Key kopiert.",
    "hide": "ausblenden",
    "Paste a base58 wallet key (the format Phantom and solana-keygen show)": "Base58-Wallet-Schl\xFCssel einf\xFCgen (das Format von Phantom und solana-keygen)",
    "Private key to import": "Zu importierender Private Key",
    "Importing\u2026": "Wird importiert\u2026",
    "Import": "Importieren",
    "Tips": "Tips",
    "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.": "GenKaKu zu nutzen kostet nichts. War ein Worker n\xFCtzlich \u2014 besonders ein kostenloser, der keine Werbeeinnahmen erzielt \u2014 kannst du ihm direkt USDC senden. Die \xDCberweisung geht von deiner Wallet an seine Wallet; GenKaKu ist nicht beteiligt und beh\xE4lt nichts ein.",
    "No worker with a wallet on the board yet.": "Noch kein Worker mit Wallet auf dem Board.",
    "Each tip needs a little SOL in the wallet above for the network fee.": "Jeder Tip braucht etwas SOL in der Wallet oben f\xFCr die Netzwerkgeb\xFChr.",
    "Settings": "Einstellungen",
    "Manual workers": "Manuelle Worker",
    "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.": "Optionale Multiaddrs, die an dieses Profil gebunden sind. Die Suche \xFCber das On-Chain-Verzeichnis und den Seed l\xE4uft weiter.",
    "None pinned \u2014 using discovery only.": "Keine gebunden \u2014 nur Discovery.",
    "remove": "entfernen",
    "Worker multiaddr": "Worker-Multiaddr",
    "Add": "Hinzuf\xFCgen",
    "Refreshing\u2026": "Wird aktualisiert\u2026",
    "Refresh network": "Netzwerk aktualisieren",
    "Re-reads the directory and the seed now.": "Liest Verzeichnis und Seed jetzt neu.",
    "selected": "ausgew\xE4hlt",
    "Search a model, worker name or wallet": "Modell, Worker-Name oder Wallet suchen",
    "Search models": "Modelle suchen",
    "Sort models": "Modelle sortieren",
    "Recommended": "Empfohlen",
    "Lowest price": "G\xFCnstigster Preis",
    "Lowest latency": "Niedrigste Latenz",
    "Most sessions served": "Meiste Sessions",
    "Model name": "Modellname",
    "Worker name": "Worker-Name",
    "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.": "Nur angehakte Modelle erscheinen in der Modellauswahl im Chat, bis zu zehn. Angehakt wird pro Worker und Modell, dasselbe Modell von zwei Workern ergibt also zwei Eintr\xE4ge.",
    "Nothing offered yet. A worker lists its local Ollama models on start.": "Noch nichts angeboten. Ein Worker listet seine lokalen Ollama-Modelle beim Start.",
    "No row matches that search.": "Keine Zeile passt zu dieser Suche.",
    "private": "privat",
    "Private workers": "Private Worker",
    "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.": "Ein privater Worker steht nicht im Verzeichnis. F\xFCge den Einmalcode ein, den er dir gegeben hat: das Pairing ist an diese Wallet gebunden, und der Code kann nicht erneut verwendet werden.",
    "Pairing code": "Pairing-Code",
    "Pairing\u2026": "Wird gepairt\u2026",
    "Pair": "Pairn",
    "online": "online",
    "offline": "offline",
    "checking\u2026": "wird gepr\xFCft\u2026",
    "forget": "vergessen",
    "Advertise on GenKaKu": "Auf GenKaKu werben",
    "refresh": "aktualisieren",
    "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.": "Du zahlst pro Impression: eine Impression ist eine gesponserte Minute Worker-Zeit. Das Budget ist USDC aus der Wallet oben, gesendet an ein Campaign-Konto auf Solana, aus dem nur das Programm auszahlen kann. Ist das Budget aufgebraucht, stoppt die Anzeige.",
    "Test mode: a zero budget still serves, and impressions are not billed.": "Testmodus: auch mit Budget 0 wird ausgeliefert, Impressionen werden nicht berechnet.",
    "Category": "Kategorie",
    "Sponsor name": "Sponsorname",
    "Price per impression (USDC)": "Preis pro Impression (USDC)",
    "Budget (USDC)": "Budget (USDC)",
    "Title": "Titel",
    "Body": "Text",
    "Destination URL": "Ziel-URL",
    "Button label": "Button-Beschriftung",
    "Learn more": "Mehr erfahren",
    "Image URL": "Bild-URL",
    "Image alt": "Bild-Alt-Text",
    "Keywords": "Schlagw\xF6rter",
    "Submitting\u2026": "Wird eingereicht\u2026",
    "Submit for review": "Zur Pr\xFCfung einreichen",
    "No listings yet.": "Noch keine Listings.",
    "Blocked by the operator": "Vom Operator gesperrt",
    "Not accepted": "Nicht akzeptiert",
    "Reviewed \u2014 fund it to go live": "Gepr\xFCft \u2014 finanzieren, um live zu gehen",
    "Budget spent \u2014 ad stopped": "Budget aufgebraucht \u2014 Anzeige gestoppt",
    "Live": "Live",
    "paused": "pausiert",
    "impression": "Impression",
    "not funded": "nicht finanziert",
    "left": "\xFCbrig",
    "shown": "gezeigt",
    "clicks": "Klicks",
    "Funding\u2026": "Wird finanziert\u2026",
    "Fund and publish": "Finanzieren und ver\xF6ffentlichen",
    "Resume": "Fortsetzen",
    "Pause": "Pausieren",
    "Withdraw unused": "Ungenutztes zur\xFCckziehen",
    "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.": "Finanzieren braucht etwas SOL in der Wallet oben f\xFCr die Solana-Geb\xFChr. Die Campaign-Adresse geh\xF6rt zu deiner Wallet; der Ads-Service kann nur den Kontostand lesen. Nicht verbrauchtes Budget l\xE4sst sich zur\xFCckziehen, wenn die Anzeige einen Tag pausiert war.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest": "Auf 127.0.0.1:{value} antwortet etwas, aber es lehnt den Origin dieses Fensters ab (403). Aktualisiere das Plugin: dsh plugin add @genkaku/dsh-user-plugin@latest",
    "Not accepted: {value}": "Nicht akzeptiert: {value}",
    "Withdrew {value} USDC back to the wallet.": "{value} USDC in die Wallet zur\xFCckgezogen.",
    "Minted 100 test USDC (tx {value}\u2026).": "100 Test-USDC gepr\xE4gt (tx {value}\u2026).",
    "At most {value} models can be selected. Untick one first.": "Es k\xF6nnen h\xF6chstens {value} Modelle ausgew\xE4hlt werden. Hake zuerst eines ab.",
    "{value} ticked model(s) are not on the network right now. They come back when their worker does.": "{value} angehakte Modelle sind gerade nicht im Netzwerk. Sie kommen zur\xFCck, sobald ihr Worker wieder online ist.",
    "Worker status unreachable on 47821\u201347826.": "Worker-Status auf 47821\u201347826 nicht erreichbar.",
    "Ollama is running.": "Ollama l\xE4uft.",
    "Ollama did not start.": "Ollama wurde nicht gestartet.",
    "starting": "startet",
    "Saved \u2014 your catalog is live.": "Gespeichert \u2014 dein Katalog ist live.",
    "Name saved. Users see it next to your models, and can sort and search by it.": "Name gespeichert. Nutzer sehen ihn neben deinen Modellen und k\xF6nnen danach sortieren und suchen.",
    "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?": "Der Privatmodus entfernt diesen Worker aus dem \xF6ffentlichen Verzeichnis und aus dem Seed. Nur Wallets, die du per Einmalcode pairst, k\xF6nnen ihn nutzen. Fortfahren?",
    "Private mode on \u2014 restarting the worker. Generate a pairing code below.": "Privatmodus an \u2014 Worker startet neu. Erzeuge unten einen Pairing-Code.",
    "Public mode on \u2014 restarting the worker and rejoining the directory.": "\xD6ffentlicher Modus an \u2014 Worker startet neu und tritt dem Verzeichnis wieder bei.",
    "Copy failed \u2014 select the code and copy it manually.": "Kopieren fehlgeschlagen \u2014 markiere den Code und kopiere ihn manuell.",
    "Publishing enabled \u2014 restarting the worker.": "Ver\xF6ffentlichen aktiviert \u2014 Worker startet neu.",
    "Publishing disabled \u2014 restarting the worker.": "Ver\xF6ffentlichen deaktiviert \u2014 Worker startet neu.",
    "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.": "Teile diesen Schl\xFCssel nie. Wer ihn hat, besitzt die Wallet, die Worker-Identit\xE4t im Chain-Verzeichnis und ihre Einnahmen.",
    "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?": "Der Import eines Schl\xFCssels ersetzt die Identit\xE4ts-Wallet dieses Workers. Die aktuelle Adresse beh\xE4lt ihr Guthaben. Ist die alte Wallet on-chain gelistet, versucht dieses Plugin zuerst, diesen Eintrag zur\xFCckzuziehen. Fortfahren?",
    "Wallet imported. The worker is restarting with the new identity.": "Wallet importiert. Der Worker startet mit der neuen Identit\xE4t neu.",
    "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.": "Neue Worker-Wallet erzeugen? Die alte Adresse beh\xE4lt ihre SOL und USDC. Ist ihr Eintrag ver\xF6ffentlicht, versucht dieses Plugin ihn zuerst zur\xFCckzuziehen und startet dann mit der neuen Identit\xE4t.",
    "New worker wallet generated. Restarting as the new identity.": "Neue Worker-Wallet erzeugt. Neustart mit der neuen Identit\xE4t.",
    "Worker restarting\u2026": "Worker startet neu\u2026",
    "Worker wallet": "Worker-Wallet",
    "Balance": "Guthaben",
    "Tips received": "Erhaltene Tips",
    "none yet": "noch keine",
    "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.": "Diese Wallet hat auf diesem Cluster noch kein SOL. Der Worker braucht etwas f\xFCr Rent und Geb\xFChren, um sein Listing zu ver\xF6ffentlichen und Sessions auszuf\xFChren; USDC verdient er, er gibt es nicht aus.",
    "Open faucet": "Faucet \xF6ffnen",
    "Generating\u2026": "Wird erzeugt\u2026",
    "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.": "Dieser Schl\xFCssel ist die Worker-Identit\xE4t: er signiert Belege und bindet den On-Chain-Verzeichniseintrag. Sichere ihn, bevor du diesen Rechner auf eine neue Festplatte umziehst.",
    "Checking the local Ollama service\u2026": "Lokaler Ollama-Dienst wird gepr\xFCft\u2026",
    "Running": "L\xE4uft",
    "Installed, not running": "Installiert, l\xE4uft nicht",
    "Not installed": "Nicht installiert",
    "models": "Modelle",
    "Starting\u2026": "Startet\u2026",
    "Start Ollama": "Ollama starten",
    "Download Ollama": "Ollama herunterladen",
    "Directory": "Verzeichnis",
    "Publish this worker on-chain": "Diesen Worker on-chain ver\xF6ffentlichen",
    "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.": "Dieser Rechner hat keine \xF6ffentliche Adresse, daher bleibt der Schalter aus, bis er eine hat: ein Listing w\xFCrde einen Eintrag erzeugen, den niemand erreichen kann. Peers im selben Netzwerk k\xF6nnen sich weiterhin verbinden.",
    "Forced on by this profile (publishAddress), so it cannot be turned off here.": "Von diesem Profil erzwungen (publishAddress), kann hier nicht ausgeschaltet werden.",
    "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.": "\xDCber den Seed-VM-Relay gelistet. On-chain wird nur die Relay-Adresse geschrieben; deine eigene IP wird nicht ver\xF6ffentlicht.",
    "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.": "Gelistet. Deine \xF6ffentliche IP wird on-chain geschrieben und bleibt f\xFCr immer lesbar, auch wenn du das hier ausschaltest.",
    "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.": "Wird ver\xF6ffentlicht \u2014 der Verzeichniseintrag ist noch nicht durch. Es wird automatisch erneut versucht, solange der Worker l\xE4uft.",
    "Not listed. A public address is available, so turning this on makes you discoverable.": "Nicht gelistet. Eine \xF6ffentliche Adresse ist vorhanden, daher macht dich das Einschalten auffindbar.",
    "Name & access": "Name & Zugriff",
    "Display name": "Anzeigename",
    "personal name, ID or nickname": "pers\xF6nlicher Name, ID oder Spitzname",
    "Saving\u2026": "Wird gespeichert\u2026",
    "save": "speichern",
    "Users see this next to your models and can search and sort by it. It is not written on chain.": "Nutzer sehen ihn neben deinen Modellen und k\xF6nnen danach suchen und sortieren. Er wird nicht on-chain geschrieben.",
    "Private": "Privat",
    "Public": "\xD6ffentlich",
    "Private worker (pairing code required)": "Privater Worker (Pairing-Code n\xF6tig)",
    "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.": "Privat: nicht am Seed angek\xFCndigt und keine Adresse on-chain, daher sehen nur gepairte Wallets diese Modelle. Du kannst weiterhin berechnen \u2014 0 hei\xDFt kostenlos.",
    "Public: anyone who reads the directory or asks the seed can find these models.": "\xD6ffentlich: wer das Verzeichnis liest oder den Seed fragt, findet diese Modelle.",
    "label for this user (optional)": "Bezeichnung f\xFCr diesen Nutzer (optional)",
    "label for this user": "Bezeichnung f\xFCr diesen Nutzer",
    "Generate pairing code": "Pairing-Code erzeugen",
    "Copied": "Kopiert",
    "Copy code": "Code kopieren",
    "Shown once. Expires in 15 minutes and pairs one wallet.": "Nur einmal sichtbar. L\xE4uft in 15 Minuten ab und pairt eine Wallet.",
    "Unused codes": "Ungenutzte Codes",
    "revoke": "widerrufen",
    "Paired wallets": "Gepairte Wallets",
    "unpair": "Pairing l\xF6sen",
    "Models offered": "Angebotene Modelle",
    "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.": "Nicht angehakte Modelle bleiben installiert, werden aber nicht angeboten. Preis ist USDC pro Stunde; 0 hei\xDFt kostenlos.",
    "No local models yet. Download one below.": "Noch keine lokalen Modelle. Lade unten eines herunter.",
    "not for agents": "nicht f\xFCr Agenten",
    "delete": "l\xF6schen",
    "model to download, e.g. llama3.2:3b": "Modell zum Herunterladen, z. B. llama3.2:3b",
    "Model to download": "Modell zum Herunterladen",
    "Downloading\u2026": "Wird heruntergeladen\u2026",
    "Download": "Herunterladen",
    "offered": "angeboten",
    "unsaved changes": "ungespeicherte \xC4nderungen",
    "Save catalog": "Katalog speichern",
    "Peer": "Peer",
    "Connection": "Verbindung",
    "libp2p direct": "libp2p direkt",
    "seed VM relay": "Seed-VM-Relay",
    "LAN only": "Nur LAN",
    "Clients reach this worker directly over libp2p.": "Clients erreichen diesen Worker direkt \xFCber libp2p.",
    "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.": "Direktes W\xE4hlen aus dem Internet ist nicht m\xF6glich, daher wird der Traffic \xFCber die GenKaKu Seed-VM geleitet. Clients versuchen zuerst eine direkte Verbindung und fallen dann auf den Relay zur\xFCck.",
    "Only peers on the same network can connect. A relay appears once the seed VM is reachable.": "Nur Peers im selben Netzwerk k\xF6nnen sich verbinden. Ein Relay erscheint, sobald die Seed-VM erreichbar ist.",
    "Active sessions": "Aktive Sessions",
    "Addresses": "Adressen",
    "Open the full dashboard": "Volles Dashboard \xF6ffnen",
    "Ad earnings": "Werbeeinnahmen",
    "Ready to claim": "Abholbereit",
    "In this wallet": "In dieser Wallet",
    "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.": "Werbetreibende zahlen pro gesponserter Minute. Die Minuten jedes Tages werden nach dem t\xE4glichen Settlement on-chain diesem Worker gutgeschrieben und k\xF6nnen dann hier abgeholt werden. Das Abholen ist eine Solana-Transaktion und braucht etwas SOL in der Wallet oben f\xFCr die Geb\xFChr; die USDC gehen direkt in diese Wallet.",
    "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.": "Eine Campaign zahlt nur, wenn ihr eigenes Guthaben die Minuten deckt; ein Worker unter der Claim-Schwelle dieser Campaign wartet, bis mehr aufl\xE4uft.",
    "Claiming\u2026": "Wird abgeholt\u2026",
    "Claim": "Abholen",
    "Nothing above a threshold yet.": "Noch nichts \xFCber einer Schwelle.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest": "Auf 127.0.0.1:{value} antwortet etwas, aber es lehnt den Origin dieses Fensters ab (403). Aktualisiere das Plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest",
    "Downloaded {value}.": "{value} heruntergeladen.",
    "Delete {value} from this machine?": "{value} von diesem Rechner l\xF6schen?",
    "Invalid price for {value}": "Ung\xFCltiger Preis f\xFCr {value}",
    "Stop allowing {value} to use this worker?": "{value} den Zugriff auf diesen Worker entziehen?",
    "{value} tips": "{value} Tips",
    "Price per hour for {value}": "Preis pro Stunde f\xFCr {value}",
    "Sponsored": "Gesponsert",
    "Dismiss this placement": "Diese Platzierung ausblenden",
    "Dismiss": "Ausblenden",
    "GenKaKu User": "GenKaKu User",
    "GenKaKu Worker": "GenKaKu Worker",
    "GenKaKu network": "GenKaKu-Netzwerk",
    "Sessions": "Sitzungen",
    "Workers discovered": "Gefundene Worker",
    "Models on the network": "Modelle im Netzwerk",
    "Private worker": "Privater Worker",
    "Copy": "Kopieren",
    "Save": "Speichern",
    "Cancel": "Abbrechen",
    "Refresh": "Aktualisieren",
    "Language": "Sprache",
    "Follow DSH": "DSH folgen",
    "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.": "Folgt der DSH-Sprache, au\xDFer du w\xE4hlst hier eine. Koreanisch gibt es hier, weil DSH es nicht enth\xE4lt.",
    "GenKaKu worker": "GenKaKu-Worker",
    "The plugin opens its bridge on the first free port in 47821\u201347826.": "Das Plugin \xF6ffnet seine Bridge auf dem ersten freien Port in 47821\u201347826.",
    "free \xB7 tips optional": "kostenlos \xB7 Trinkgeld optional",
    "Loading worker status\u2026": "Worker-Status wird geladen\u2026",
    "Agent access": "Agent-Zugriff",
    "Agent wallet mode": "Wallet-Modus f\xFCr Agenten",
    "Off": "Aus",
    "Ask owner": "Eigent\xFCmer fragen",
    "Capped": "Automatisch mit Limit",
    "Per request (USDC)": "Pro Anfrage (USDC)",
    "Per day (USDC)": "Pro Tag (USDC)",
    "Freeze wallet": "Wallet einfrieren",
    "Frozen: owner actions still work; agent requests are refused.": "Eingefroren: Eigent\xFCmeraktionen gehen weiter, Agentenanfragen werden abgelehnt.",
    "Pending approvals": "Offene Freigaben",
    "Approve": "Freigeben",
    "Deny": "Ablehnen",
    "No pending requests.": "Keine offenen Anfragen.",
    "Key and identity operations are always owner-only.": "Schl\xFCssel- und Identit\xE4tsvorg\xE4nge sind immer nur f\xFCr den Eigent\xFCmer.",
    "Caps apply to tips and campaign funding; claims are not a spend.": "Limits gelten f\xFCr Trinkgeld und Kampagnenfinanzierung; Abholen ist keine Ausgabe.",
    "Save limits": "Limits speichern",
    "Enter both limits in USDC.": "Gib beide Limits in USDC ein."
  },
  "ru": {
    "Reconnecting to the bridge\u2026": "\u041F\u0435\u0440\u0435\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A bridge\u2026",
    "No GenKaKu user bridge on 47821\u201347826.": "GenKaKu user bridge \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u043D\u0430 \u043F\u043E\u0440\u0442\u0430\u0445 47821\u201347826.",
    "Bridge not reached yet.": "Bridge \u0435\u0449\u0451 \u043D\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442.",
    "Enter a price per impression.": "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0446\u0435\u043D\u0443 \u0437\u0430 \u043F\u043E\u043A\u0430\u0437.",
    "Price must be between 0.0001 and 0.1 USDC per impression.": "\u0426\u0435\u043D\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u043E\u0442 0.0001 \u0434\u043E 0.1 USDC \u0437\u0430 \u043F\u043E\u043A\u0430\u0437.",
    "Submitted and reviewed. Fund it and it goes live; the operator can block it later.": "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E. \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u044E\u0434\u0436\u0435\u0442 \u2014 \u0438 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u043D\u0430\u0447\u043D\u0451\u0442 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C\u0441\u044F; \u043F\u043E\u0437\u0436\u0435 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u0441\u043C\u043E\u0436\u0435\u0442 \u0435\u0433\u043E \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C.",
    "Resumed. The ad is serving again.": "\u0412\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E. \u041E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u043D\u043E\u0432\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F.",
    "Paused. No new impressions; unspent budget can be withdrawn after a day.": "\u041F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E. \u041D\u043E\u0432\u044B\u0445 \u043F\u043E\u043A\u0430\u0437\u043E\u0432 \u043D\u0435\u0442; \u043D\u0435\u0438\u0437\u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0431\u044E\u0434\u0436\u0435\u0442 \u043C\u043E\u0436\u043D\u043E \u0432\u044B\u0432\u0435\u0441\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 \u0441\u0443\u0442\u043A\u0438.",
    "Enter a budget.": "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0431\u044E\u0434\u0436\u0435\u0442.",
    "The budget must cover at least one impression.": "\u0411\u044E\u0434\u0436\u0435\u0442\u0430 \u0434\u043E\u043B\u0436\u043D\u043E \u0445\u0432\u0430\u0442\u0430\u0442\u044C \u0445\u043E\u0442\u044F \u0431\u044B \u043D\u0430 \u043E\u0434\u0438\u043D \u043F\u043E\u043A\u0430\u0437.",
    "The campaign address was not returned.": "\u0410\u0434\u0440\u0435\u0441 campaign \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D.",
    "Funded. The ad starts as soon as the operator-approved listing picks it up.": "\u0411\u044E\u0434\u0436\u0435\u0442 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D. \u041E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0441\u044F, \u043A\u0430\u043A \u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0433\u043E \u043F\u043E\u0434\u0445\u0432\u0430\u0442\u0438\u0442 \u0440\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u0435, \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u043E\u0435 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C.",
    "Saved. The bridge is restarting with the new worker list.": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E. Bridge \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F \u0441 \u043D\u043E\u0432\u044B\u043C \u0441\u043F\u0438\u0441\u043A\u043E\u043C worker.",
    "Never share this key. Anyone who has it owns the wallet and its funds.": "\u041D\u0438\u043A\u043E\u043C\u0443 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0439\u0442\u0435 \u044D\u0442\u043E\u0442 \u043A\u043B\u044E\u0447. \u0422\u043E\u0442, \u0443 \u043A\u043E\u0433\u043E \u043E\u043D \u0435\u0441\u0442\u044C, \u0432\u043B\u0430\u0434\u0435\u0435\u0442 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u043E\u043C \u0438 \u0435\u0433\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u0430\u043C\u0438.",
    "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?": "\u0418\u043C\u043F\u043E\u0440\u0442 \u043A\u043B\u044E\u0447\u0430 \u0437\u0430\u043C\u0435\u043D\u0438\u0442 \u043A\u043E\u0448\u0435\u043B\u0451\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F. \u0421\u0440\u0435\u0434\u0441\u0442\u0432\u0430 \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F \u043D\u0430 \u0442\u0435\u043A\u0443\u0449\u0435\u043C \u0430\u0434\u0440\u0435\u0441\u0435, \u043D\u043E \u043E\u043D \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0431\u0443\u0434\u0435\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F. \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C?",
    "Wallet imported. The bridge is restarting.": "\u041A\u043E\u0448\u0435\u043B\u0451\u043A \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D. Bridge \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F.",
    "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.": "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A? SOL \u0438 USDC \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F \u043D\u0430 \u0441\u0442\u0430\u0440\u043E\u043C \u0430\u0434\u0440\u0435\u0441\u0435, \u043D\u043E \u044D\u0442\u043E\u0442 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043D\u0435\u0442 \u0435\u0433\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C.",
    "New wallet generated. The bridge is restarting.": "\u041D\u043E\u0432\u044B\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A \u0441\u043E\u0437\u0434\u0430\u043D. Bridge \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F.",
    "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.": "\u041F\u043E\u0432\u0442\u043E\u0440\u043D\u043E \u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0435\u043C \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0432 \u0441\u0435\u0442\u0438 \u0438 \u0441\u0438\u0434. Bridge \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0441\u044F.",
    "Paired. The worker\u2019s models appear below when it is online.": "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043E. \u041A\u043E\u0433\u0434\u0430 worker \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0432 \u0441\u0435\u0442\u0438, \u0435\u0433\u043E \u043C\u043E\u0434\u0435\u043B\u0438 \u043E\u0442\u043E\u0431\u0440\u0430\u0437\u044F\u0442\u0441\u044F \u043D\u0438\u0436\u0435.",
    "Forget this paired worker? You can pair it again with a fresh code.": "\u0417\u0430\u0431\u044B\u0442\u044C \u044D\u0442\u043E\u0433\u043E \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043D\u043E\u0433\u043E worker? \u0415\u0433\u043E \u043C\u043E\u0436\u043D\u043E \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430 \u0441 \u043D\u043E\u0432\u044B\u043C \u043A\u043E\u0434\u043E\u043C.",
    "Loading status\u2026": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u2026",
    "Reconnecting\u2026": "\u041F\u0435\u0440\u0435\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\u2026",
    "Wallet": "\u041A\u043E\u0448\u0435\u043B\u0451\u043A",
    "Wallet address copied.": "\u0410\u0434\u0440\u0435\u0441 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D.",
    "copy": "\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.": "\u041D\u0430 \u044D\u0442\u043E\u043C \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 SOL \u0432 \u044D\u0442\u043E\u043C \u043A\u043B\u0430\u0441\u0442\u0435\u0440\u0435. \u0414\u043B\u044F \u0441\u0435\u0441\u0441\u0438\u0438 \u043D\u0443\u0436\u043D\u043E \u043D\u0435\u043C\u043D\u043E\u0433\u043E SOL \u043D\u0430 \u0430\u0440\u0435\u043D\u0434\u0443 \u0438 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438; USDC \u2014 \u044D\u0442\u043E \u0442\u043E, \u0447\u0435\u043C \u043E\u043D\u0430 \u043F\u043B\u0430\u0442\u0438\u0442 \u0437\u0430 \u0432\u044B\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F.",
    "Open faucet (devnet)": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C faucet (devnet)",
    "Minting\u2026": "\u041D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435\u2026",
    "Mint 100 test USDC": "\u041D\u0430\u0447\u0438\u0441\u043B\u0438\u0442\u044C 100 \u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0445 USDC",
    "Revealing\u2026": "\u0420\u0430\u0441\u043A\u0440\u044B\u0442\u0438\u0435\u2026",
    "Export key": "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043A\u043B\u044E\u0447\u0430",
    "Import key": "\u0418\u043C\u043F\u043E\u0440\u0442 \u043A\u043B\u044E\u0447\u0430",
    "New wallet": "\u041D\u043E\u0432\u044B\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A",
    "Private key \u2014 keep it offline. Testnet only.": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u2014 \u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u0435\u0433\u043E \u043E\u0444\u043B\u0430\u0439\u043D. \u0422\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u0441\u0442\u043D\u0435\u0442.",
    "Private key": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447",
    "Private key copied.": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D.",
    "hide": "\u0441\u043A\u0440\u044B\u0442\u044C",
    "Paste a base58 wallet key (the format Phantom and solana-keygen show)": "\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043A\u043B\u044E\u0447 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 \u0432 base58 (\u0432 \u0442\u0430\u043A\u043E\u043C \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0435\u0433\u043E \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 Phantom \u0438 solana-keygen)",
    "Private key to import": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0434\u043B\u044F \u0438\u043C\u043F\u043E\u0440\u0442\u0430",
    "Importing\u2026": "\u0418\u043C\u043F\u043E\u0440\u0442\u2026",
    "Import": "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "Tips": "\u0427\u0430\u0435\u0432\u044B\u0435",
    "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.": "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435 GenKaKu \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0441\u0442\u043E\u0438\u0442. \u0415\u0441\u043B\u0438 worker \u043E\u043A\u0430\u0437\u0430\u043B\u0441\u044F \u043F\u043E\u043B\u0435\u0437\u0435\u043D \u2014 \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043D\u0435 \u0437\u0430\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442 \u043D\u0430 \u0440\u0435\u043A\u043B\u0430\u043C\u0435, \u2014 \u0432\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0435\u043C\u0443 USDC \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E. \u041F\u0435\u0440\u0435\u0432\u043E\u0434 \u0438\u0434\u0451\u0442 \u0441 \u0432\u0430\u0448\u0435\u0433\u043E \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 \u043D\u0430 \u0435\u0433\u043E \u043A\u043E\u0448\u0435\u043B\u0451\u043A; GenKaKu \u0432 \u043D\u0451\u043C \u043D\u0435 \u0443\u0447\u0430\u0441\u0442\u0432\u0443\u0435\u0442 \u0438 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0431\u0435\u0440\u0451\u0442.",
    "No worker with a wallet on the board yet.": "\u041D\u0430 \u0434\u043E\u0441\u043A\u0435 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E worker \u0441 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u043E\u043C.",
    "Each tip needs a little SOL in the wallet above for the network fee.": "\u0414\u043B\u044F \u043A\u0430\u0436\u0434\u044B\u0445 \u0447\u0430\u0435\u0432\u044B\u0445 \u043D\u0443\u0436\u043D\u043E \u043D\u0435\u043C\u043D\u043E\u0433\u043E SOL \u043D\u0430 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435 \u0432\u044B\u0448\u0435 \u2014 \u043D\u0430 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u044E \u0441\u0435\u0442\u0438.",
    "Settings": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
    "Manual workers": "Worker, \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
    "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.": "\u041D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 multiaddr, \u0437\u0430\u043A\u0440\u0435\u043F\u043B\u0451\u043D\u043D\u044B\u0435 \u0437\u0430 \u044D\u0442\u0438\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u043C. \u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u0438\u0435 \u0447\u0435\u0440\u0435\u0437 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0432 \u0441\u0435\u0442\u0438 \u0438 \u0441\u0438\u0434 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C.",
    "None pinned \u2014 using discovery only.": "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0437\u0430\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u043E \u2014 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u0438\u0435.",
    "remove": "\u0443\u0431\u0440\u0430\u0442\u044C",
    "Worker multiaddr": "Multiaddr worker",
    "Add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C",
    "Refreshing\u2026": "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435\u2026",
    "Refresh network": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0435\u0442\u044C",
    "Re-reads the directory and the seed now.": "\u0417\u0430\u043D\u043E\u0432\u043E \u0447\u0438\u0442\u0430\u0435\u0442 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0438 \u0441\u0438\u0434 \u043F\u0440\u044F\u043C\u043E \u0441\u0435\u0439\u0447\u0430\u0441.",
    "selected": "\u0432\u044B\u0431\u0440\u0430\u043D\u043E",
    "Search a model, worker name or wallet": "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043C\u043E\u0434\u0435\u043B\u0438, \u0438\u043C\u0435\u043D\u0438 worker \u0438\u043B\u0438 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0443",
    "Search models": "\u041F\u043E\u0438\u0441\u043A \u043C\u043E\u0434\u0435\u043B\u0435\u0439",
    "Sort models": "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0435\u0439",
    "Recommended": "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C\u044B\u0435",
    "Lowest price": "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0434\u0435\u0448\u0451\u0432\u044B\u0435",
    "Lowest latency": "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0431\u044B\u0441\u0442\u0440\u044B\u0435",
    "Most sessions served": "\u0411\u043E\u043B\u044C\u0448\u0435 \u0432\u0441\u0435\u0433\u043E \u0441\u0435\u0441\u0441\u0438\u0439",
    "Model name": "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043C\u043E\u0434\u0435\u043B\u0438",
    "Worker name": "\u0418\u043C\u044F worker",
    "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.": "\u0412 \u0432\u044B\u0431\u043E\u0440\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 \u0432 \u0447\u0430\u0442\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438, \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 \u0434\u0435\u0441\u044F\u0442\u0438. \u041E\u0442\u043C\u0435\u0442\u043A\u0430 \u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044F \u0434\u043B\u044F \u043F\u0430\u0440\u044B worker\u2013\u043C\u043E\u0434\u0435\u043B\u044C, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043E\u0434\u043D\u0430 \u0438 \u0442\u0430 \u0436\u0435 \u043C\u043E\u0434\u0435\u043B\u044C \u0443 \u0434\u0432\u0443\u0445 worker \u2014 \u044D\u0442\u043E \u0434\u0432\u0430 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430.",
    "Nothing offered yet. A worker lists its local Ollama models on start.": "\u041F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u043E. Worker \u043F\u0443\u0431\u043B\u0438\u043A\u0443\u0435\u0442 \u0441\u0432\u043E\u0438 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 Ollama \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435.",
    "No row matches that search.": "\u041F\u043E \u044D\u0442\u043E\u043C\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u0443 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E.",
    "private": "\u043F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439",
    "Private workers": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0435 worker",
    "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u043E\u0433\u043E worker \u043D\u0435\u0442 \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435. \u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043E\u0434\u043D\u043E\u0440\u0430\u0437\u043E\u0432\u044B\u0439 \u043A\u043E\u0434, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043E\u043D \u0432\u044B\u0434\u0430\u043B: \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0430 \u0437\u0430\u043A\u0440\u0435\u043F\u043B\u044F\u0435\u0442\u0441\u044F \u0437\u0430 \u044D\u0442\u0438\u043C \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u043E\u043C, \u0430 \u043A\u043E\u0434 \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E.",
    "Pairing code": "\u041A\u043E\u0434 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438",
    "Pairing\u2026": "\u041F\u0440\u0438\u0432\u044F\u0437\u043A\u0430\u2026",
    "Pair": "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u0442\u044C",
    "online": "\u0432 \u0441\u0435\u0442\u0438",
    "offline": "\u043D\u0435 \u0432 \u0441\u0435\u0442\u0438",
    "checking\u2026": "\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430\u2026",
    "forget": "\u0437\u0430\u0431\u044B\u0442\u044C",
    "Advertise on GenKaKu": "\u0420\u0435\u043A\u043B\u0430\u043C\u0430 \u043D\u0430 GenKaKu",
    "refresh": "\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
    "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.": "\u0412\u044B \u043F\u043B\u0430\u0442\u0438\u0442\u0435 \u0437\u0430 \u043F\u043E\u043A\u0430\u0437\u044B: \u043E\u0434\u0438\u043D \u043F\u043E\u043A\u0430\u0437 \u2014 \u044D\u0442\u043E \u043E\u0434\u043D\u0430 \u0441\u043F\u043E\u043D\u0441\u043E\u0440\u0441\u043A\u0430\u044F \u043C\u0438\u043D\u0443\u0442\u0430 \u0440\u0430\u0431\u043E\u0442\u044B worker. \u0411\u044E\u0434\u0436\u0435\u0442 \u2014 \u044D\u0442\u043E USDC \u0441 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 \u0432\u044B\u0448\u0435, \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u043D\u0430 \u0441\u0447\u0451\u0442 campaign \u0432 Solana, \u0441 \u043A\u043E\u0442\u043E\u0440\u043E\u0433\u043E \u0432\u044B\u043F\u043B\u0430\u0442\u044B \u043C\u043E\u0436\u0435\u0442 \u0434\u0435\u043B\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430. \u041A\u043E\u0433\u0434\u0430 \u0431\u044E\u0434\u0436\u0435\u0442 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u0441\u044F, \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0441\u044F.",
    "Test mode: a zero budget still serves, and impressions are not billed.": "\u0422\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0440\u0435\u0436\u0438\u043C: \u0441 \u043D\u0443\u043B\u0435\u0432\u044B\u043C \u0431\u044E\u0434\u0436\u0435\u0442\u043E\u043C \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F, \u0430 \u043F\u043E\u043A\u0430\u0437\u044B \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0438\u0432\u0430\u044E\u0442\u0441\u044F.",
    "Category": "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F",
    "Sponsor name": "\u0418\u043C\u044F \u0441\u043F\u043E\u043D\u0441\u043E\u0440\u0430",
    "Price per impression (USDC)": "\u0426\u0435\u043D\u0430 \u0437\u0430 \u043F\u043E\u043A\u0430\u0437 (USDC)",
    "Budget (USDC)": "\u0411\u044E\u0434\u0436\u0435\u0442 (USDC)",
    "Title": "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
    "Body": "\u0422\u0435\u043A\u0441\u0442",
    "Destination URL": "URL \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F",
    "Button label": "\u0422\u0435\u043A\u0441\u0442 \u043A\u043D\u043E\u043F\u043A\u0438",
    "Learn more": "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435",
    "Image URL": "URL \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F",
    "Image alt": "Alt-\u0442\u0435\u043A\u0441\u0442 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F",
    "Keywords": "\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430",
    "Submitting\u2026": "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430\u2026",
    "Submit for review": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443",
    "No listings yet.": "\u0420\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.",
    "Blocked by the operator": "\u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u043C",
    "Not accepted": "\u041D\u0435 \u043F\u0440\u0438\u043D\u044F\u0442\u043E",
    "Reviewed \u2014 fund it to go live": "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \u2014 \u043F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u044E\u0434\u0436\u0435\u0442 \u0434\u043B\u044F \u0437\u0430\u043F\u0443\u0441\u043A\u0430",
    "Budget spent \u2014 ad stopped": "\u0411\u044E\u0434\u0436\u0435\u0442 \u0438\u0437\u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432\u0430\u043D \u2014 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
    "Live": "\u0410\u043A\u0442\u0438\u0432\u043D\u043E",
    "paused": "\u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
    "impression": "\u043F\u043E\u043A\u0430\u0437",
    "not funded": "\u043D\u0435 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u043E",
    "left": "\u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C",
    "shown": "\u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043E",
    "clicks": "\u043A\u043B\u0438\u043A\u0438",
    "Funding\u2026": "\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435\u2026",
    "Fund and publish": "\u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0438 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C",
    "Resume": "\u0412\u043E\u0437\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
    "Pause": "\u041F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C",
    "Withdraw unused": "\u0412\u044B\u0432\u0435\u0441\u0442\u0438 \u043E\u0441\u0442\u0430\u0442\u043E\u043A",
    "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.": "\u0414\u043B\u044F \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u043D\u0443\u0436\u043D\u043E \u043D\u0435\u043C\u043D\u043E\u0433\u043E SOL \u043D\u0430 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435 \u0432\u044B\u0448\u0435 \u2014 \u043D\u0430 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u044E Solana. \u0410\u0434\u0440\u0435\u0441 campaign \u043F\u0440\u0438\u043D\u0430\u0434\u043B\u0435\u0436\u0438\u0442 \u0432\u0430\u0448\u0435\u043C\u0443 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0443; \u0441\u0435\u0440\u0432\u0438\u0441 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0439 \u043C\u043E\u0436\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0447\u0438\u0442\u0430\u0442\u044C \u0435\u0433\u043E \u0431\u0430\u043B\u0430\u043D\u0441. \u041D\u0435\u0438\u0437\u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0431\u044E\u0434\u0436\u0435\u0442 \u043C\u043E\u0436\u043D\u043E \u0432\u044B\u0432\u0435\u0441\u0442\u0438, \u043A\u043E\u0433\u0434\u0430 \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0441\u0442\u043E\u044F\u043B\u043E \u043D\u0430 \u043F\u0430\u0443\u0437\u0435 \u0441\u0443\u0442\u043A\u0438.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest": "\u041D\u0430 127.0.0.1:{value} \u0447\u0442\u043E-\u0442\u043E \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442, \u043D\u043E \u043E\u0442\u043A\u043B\u043E\u043D\u044F\u0435\u0442 origin \u044D\u0442\u043E\u0433\u043E \u043E\u043A\u043D\u0430 (403). \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u043F\u043B\u0430\u0433\u0438\u043D: dsh plugin add @genkaku/dsh-user-plugin@latest",
    "Not accepted: {value}": "\u041D\u0435 \u043F\u0440\u0438\u043D\u044F\u0442\u043E: {value}",
    "Withdrew {value} USDC back to the wallet.": "\u0412\u044B\u0432\u0435\u0434\u0435\u043D\u043E {value} USDC \u043E\u0431\u0440\u0430\u0442\u043D\u043E \u043D\u0430 \u043A\u043E\u0448\u0435\u043B\u0451\u043A.",
    "Minted 100 test USDC (tx {value}\u2026).": "\u041D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u043E 100 \u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0445 USDC (\u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044F {value}\u2026).",
    "At most {value} models can be selected. Untick one first.": "\u041C\u043E\u0436\u043D\u043E \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043D\u0435 \u0431\u043E\u043B\u0435\u0435 {value} \u043C\u043E\u0434\u0435\u043B\u0435\u0439. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043D\u0438\u043C\u0438\u0442\u0435 \u043E\u0442\u043C\u0435\u0442\u043A\u0443 \u0441 \u043E\u0434\u043D\u043E\u0439.",
    "{value} ticked model(s) are not on the network right now. They come back when their worker does.": "\u041E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0445 \u043C\u043E\u0434\u0435\u043B\u0435\u0439, \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0442 \u0432 \u0441\u0435\u0442\u0438: {value}. \u041E\u043D\u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u0432\u0435\u0440\u043D\u0451\u0442\u0441\u044F \u0438\u0445 worker.",
    "Worker status unreachable on 47821\u201347826.": "\u0421\u0442\u0430\u0442\u0443\u0441 worker \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u043D\u0430 \u043F\u043E\u0440\u0442\u0430\u0445 47821\u201347826.",
    "Ollama is running.": "Ollama \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430.",
    "Ollama did not start.": "Ollama \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u043B\u0430\u0441\u044C.",
    "starting": "\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F",
    "Saved \u2014 your catalog is live.": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u2014 \u0432\u0430\u0448 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D.",
    "Name saved. Users see it next to your models, and can sort and search by it.": "\u0418\u043C\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E. \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 \u0432\u0438\u0434\u044F\u0442 \u0435\u0433\u043E \u0440\u044F\u0434\u043E\u043C \u0441 \u0432\u0430\u0448\u0438\u043C\u0438 \u043C\u043E\u0434\u0435\u043B\u044F\u043C\u0438 \u0438 \u043C\u043E\u0433\u0443\u0442 \u043F\u043E \u043D\u0435\u043C\u0443 \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438 \u0438\u0441\u043A\u0430\u0442\u044C.",
    "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0443\u0431\u0438\u0440\u0430\u0435\u0442 \u044D\u0442\u043E\u0433\u043E worker \u0438\u0437 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430 \u0438 \u0438\u0437 \u0441\u0438\u0434\u0430. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0435\u0433\u043E \u0441\u043C\u043E\u0433\u0443\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0438, \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u043E\u0434\u043D\u043E\u0440\u0430\u0437\u043E\u0432\u043E\u043C\u0443 \u043A\u043E\u0434\u0443. \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C?",
    "Private mode on \u2014 restarting the worker. Generate a pairing code below.": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0432\u043A\u043B\u044E\u0447\u0451\u043D \u2014 worker \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F. \u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043A\u043E\u0434 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u043D\u0438\u0436\u0435.",
    "Public mode on \u2014 restarting the worker and rejoining the directory.": "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0432\u043A\u043B\u044E\u0447\u0451\u043D \u2014 worker \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F \u0438 \u0437\u0430\u043D\u043E\u0432\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0435\u0442\u0441\u044F \u043A \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0443.",
    "Copy failed \u2014 select the code and copy it manually.": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u2014 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u043A\u043E\u0434 \u0438 \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.",
    "Publishing enabled \u2014 restarting the worker.": "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u2014 worker \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F.",
    "Publishing disabled \u2014 restarting the worker.": "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u2014 worker \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F.",
    "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.": "\u041D\u0438\u043A\u043E\u043C\u0443 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0439\u0442\u0435 \u044D\u0442\u043E\u0442 \u043A\u043B\u044E\u0447. \u0422\u043E\u0442, \u0443 \u043A\u043E\u0433\u043E \u043E\u043D \u0435\u0441\u0442\u044C, \u0432\u043B\u0430\u0434\u0435\u0435\u0442 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u043E\u043C, \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u044C\u044E worker \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u0441\u0435\u0442\u0438 \u0438 \u0435\u0433\u043E \u0437\u0430\u0440\u0430\u0431\u043E\u0442\u043A\u043E\u043C.",
    "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?": "\u0418\u043C\u043F\u043E\u0440\u0442 \u043A\u043B\u044E\u0447\u0430 \u0437\u0430\u043C\u0435\u043D\u0438\u0442 \u043A\u043E\u0448\u0435\u043B\u0451\u043A \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u0438 \u044D\u0442\u043E\u0433\u043E worker. \u0421\u0440\u0435\u0434\u0441\u0442\u0432\u0430 \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F \u043D\u0430 \u0442\u0435\u043A\u0443\u0449\u0435\u043C \u0430\u0434\u0440\u0435\u0441\u0435. \u0415\u0441\u043B\u0438 \u0441\u0442\u0430\u0440\u044B\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A \u0443\u043A\u0430\u0437\u0430\u043D \u0432 \u0441\u0435\u0442\u0438, \u043F\u043B\u0430\u0433\u0438\u043D \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0435\u0442 \u043E\u0442\u043E\u0437\u0432\u0430\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043F\u0438\u0441\u044C. \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C?",
    "Wallet imported. The worker is restarting with the new identity.": "\u041A\u043E\u0448\u0435\u043B\u0451\u043A \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D. Worker \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F \u0441 \u043D\u043E\u0432\u043E\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u044C\u044E.",
    "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.": "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A worker? SOL \u0438 USDC \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F \u043D\u0430 \u0441\u0442\u0430\u0440\u043E\u043C \u0430\u0434\u0440\u0435\u0441\u0435. \u0415\u0441\u043B\u0438 \u0435\u0433\u043E \u0437\u0430\u043F\u0438\u0441\u044C \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u0430, \u043F\u043B\u0430\u0433\u0438\u043D \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0435\u0442 \u0435\u0451 \u043E\u0442\u043E\u0437\u0432\u0430\u0442\u044C, \u0430 \u0437\u0430\u0442\u0435\u043C \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0441\u044F \u0441 \u043D\u043E\u0432\u043E\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u044C\u044E.",
    "New worker wallet generated. Restarting as the new identity.": "\u041D\u043E\u0432\u044B\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A worker \u0441\u043E\u0437\u0434\u0430\u043D. \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A \u0441 \u043D\u043E\u0432\u043E\u0439 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u044C\u044E.",
    "Worker restarting\u2026": "Worker \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F\u2026",
    "Worker wallet": "\u041A\u043E\u0448\u0435\u043B\u0451\u043A worker",
    "Balance": "\u0411\u0430\u043B\u0430\u043D\u0441",
    "Tips received": "\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043E \u0447\u0430\u0435\u0432\u044B\u0445",
    "none yet": "\u043F\u043E\u043A\u0430 \u043D\u0435\u0442",
    "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.": "\u041D\u0430 \u044D\u0442\u043E\u043C \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 SOL \u0432 \u044D\u0442\u043E\u043C \u043A\u043B\u0430\u0441\u0442\u0435\u0440\u0435. Worker \u043D\u0443\u0436\u043D\u043E \u043D\u0435\u043C\u043D\u043E\u0433\u043E SOL \u043D\u0430 \u0430\u0440\u0435\u043D\u0434\u0443 \u0438 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438, \u0447\u0442\u043E\u0431\u044B \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u0440\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u0435 \u0438 \u043F\u0440\u043E\u0432\u043E\u0434\u0438\u0442\u044C \u0441\u0435\u0441\u0441\u0438\u0438; USDC \u2014 \u044D\u0442\u043E \u0442\u043E, \u0447\u0442\u043E \u043E\u043D \u0437\u0430\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442, \u0430 \u043D\u0435 \u0442\u0440\u0430\u0442\u0438\u0442.",
    "Open faucet": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C faucet",
    "Generating\u2026": "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435\u2026",
    "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.": "\u042D\u0442\u043E\u0442 \u043A\u043B\u044E\u0447 \u2014 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u044C worker: \u043E\u043D \u043F\u043E\u0434\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442 \u043A\u0432\u0438\u0442\u0430\u043D\u0446\u0438\u0438 \u0438 \u043F\u0440\u0438\u0432\u044F\u0437\u044B\u0432\u0430\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u0441\u0435\u0442\u0438. \u0421\u0434\u0435\u043B\u0430\u0439\u0442\u0435 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0443\u044E \u043A\u043E\u043F\u0438\u044E, \u043F\u0440\u0435\u0436\u0434\u0435 \u0447\u0435\u043C \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0438\u0442\u044C \u044D\u0442\u0443 \u043C\u0430\u0448\u0438\u043D\u0443 \u043D\u0430 \u043D\u043E\u0432\u044B\u0439 \u0434\u0438\u0441\u043A.",
    "Checking the local Ollama service\u2026": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0439 \u0441\u043B\u0443\u0436\u0431\u044B Ollama\u2026",
    "Running": "\u0420\u0430\u0431\u043E\u0442\u0430\u0435\u0442",
    "Installed, not running": "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430, \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430",
    "Not installed": "\u041D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430",
    "models": "\u043C\u043E\u0434\u0435\u043B\u0435\u0439",
    "Starting\u2026": "\u0417\u0430\u043F\u0443\u0441\u043A\u2026",
    "Start Ollama": "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C Ollama",
    "Download Ollama": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C Ollama",
    "Directory": "\u041A\u0430\u0442\u0430\u043B\u043E\u0433",
    "Publish this worker on-chain": "\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u043E\u0433\u043E worker \u0432 \u0441\u0435\u0442\u0438",
    "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.": "\u0423 \u044D\u0442\u043E\u0439 \u043C\u0430\u0448\u0438\u043D\u044B \u043D\u0435\u0442 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0433\u043E \u0430\u0434\u0440\u0435\u0441\u0430, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u044C \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D, \u043F\u043E\u043A\u0430 \u043E\u043D \u043D\u0435 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F: \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F \u0441\u043E\u0437\u0434\u0430\u043B\u0430 \u0431\u044B \u0437\u0430\u043F\u0438\u0441\u044C, \u043A \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u043D\u0438\u043A\u0442\u043E \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F. \u041F\u0438\u0440\u044B \u0432 \u0442\u043E\u0439 \u0436\u0435 \u0441\u0435\u0442\u0438 \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E \u043C\u043E\u0433\u0443\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0442\u044C\u0441\u044F.",
    "Forced on by this profile (publishAddress), so it cannot be turned off here.": "\u041F\u0440\u0438\u043D\u0443\u0434\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u044D\u0442\u0438\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u043C (publishAddress), \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0437\u0434\u0435\u0441\u044C \u044D\u0442\u043E \u043D\u0435 \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C.",
    "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.": "\u0420\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u043E \u0447\u0435\u0440\u0435\u0437 \u0440\u0435\u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0442\u043E\u0440 \u0441\u0438\u0434-VM. \u0412 \u0441\u0435\u0442\u0438 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u0440\u0435\u0441 \u0440\u0435\u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0442\u043E\u0440\u0430; \u0432\u0430\u0448 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 IP \u043D\u0435 \u043F\u0443\u0431\u043B\u0438\u043A\u0443\u0435\u0442\u0441\u044F.",
    "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.": "\u0420\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u043E. \u0412\u0430\u0448 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 IP \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u0432 \u0441\u0435\u0442\u044C \u0438 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u043C \u0434\u043B\u044F \u0447\u0442\u0435\u043D\u0438\u044F \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430, \u0434\u0430\u0436\u0435 \u043F\u043E\u0441\u043B\u0435 \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F.",
    "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.": "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F \u2014 \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430. \u041E\u043D\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438, \u043F\u043E\u043A\u0430 worker \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442.",
    "Not listed. A public address is available, so turning this on makes you discoverable.": "\u041D\u0435 \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E. \u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043F\u043E\u0441\u043B\u0435 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F \u0432\u0430\u0441 \u043C\u043E\u0436\u043D\u043E \u0431\u0443\u0434\u0435\u0442 \u043D\u0430\u0439\u0442\u0438.",
    "Name & access": "\u0418\u043C\u044F \u0438 \u0434\u043E\u0441\u0442\u0443\u043F",
    "Display name": "\u041E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u043C\u043E\u0435 \u0438\u043C\u044F",
    "personal name, ID or nickname": "\u043B\u0438\u0447\u043D\u043E\u0435 \u0438\u043C\u044F, ID \u0438\u043B\u0438 \u043D\u0438\u043A\u043D\u0435\u0439\u043C",
    "Saving\u2026": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u2026",
    "save": "\u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
    "Users see this next to your models and can search and sort by it. It is not written on chain.": "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 \u0432\u0438\u0434\u044F\u0442 \u044D\u0442\u043E \u0440\u044F\u0434\u043E\u043C \u0441 \u0432\u0430\u0448\u0438\u043C\u0438 \u043C\u043E\u0434\u0435\u043B\u044F\u043C\u0438 \u0438 \u043C\u043E\u0433\u0443\u0442 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u0438\u0441\u043A\u0430\u0442\u044C \u0438 \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C. \u0412 \u0441\u0435\u0442\u044C \u044D\u0442\u043E \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442\u0441\u044F.",
    "Private": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439",
    "Public": "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439",
    "Private worker (pairing code required)": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439 worker (\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043A\u043E\u0434 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438)",
    "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439: \u043D\u0435 \u043F\u0443\u0431\u043B\u0438\u043A\u0443\u0435\u0442\u0441\u044F \u0432 \u0441\u0438\u0434\u0435 \u0438 \u043D\u0435 \u0438\u043C\u0435\u0435\u0442 \u0430\u0434\u0440\u0435\u0441\u0430 \u0432 \u0441\u0435\u0442\u0438, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u044D\u0442\u0438 \u043C\u043E\u0434\u0435\u043B\u0438 \u0432\u0438\u0434\u044F\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u0432\u0430\u043C\u0438 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0438. \u0411\u0440\u0430\u0442\u044C \u043F\u043B\u0430\u0442\u0443 \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E \u043C\u043E\u0436\u043D\u043E \u2014 0 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E.",
    "Public: anyone who reads the directory or asks the seed can find these models.": "\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439: \u044D\u0442\u0438 \u043C\u043E\u0434\u0435\u043B\u0438 \u043C\u043E\u0436\u0435\u0442 \u043D\u0430\u0439\u0442\u0438 \u043B\u044E\u0431\u043E\u0439, \u043A\u0442\u043E \u0447\u0438\u0442\u0430\u0435\u0442 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0438\u043B\u0438 \u043E\u0431\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F \u043A \u0441\u0438\u0434\u0443.",
    "label for this user (optional)": "\u043C\u0435\u0442\u043A\u0430 \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)",
    "label for this user": "\u043C\u0435\u0442\u043A\u0430 \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F",
    "Generate pairing code": "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u0434 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438",
    "Copied": "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E",
    "Copy code": "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u0434",
    "Shown once. Expires in 15 minutes and pairs one wallet.": "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043E\u0434\u0438\u043D \u0440\u0430\u0437. \u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 15 \u043C\u0438\u043D\u0443\u0442 \u0438 \u043F\u0440\u0438\u0432\u044F\u0437\u044B\u0432\u0430\u0435\u0442 \u043E\u0434\u0438\u043D \u043A\u043E\u0448\u0435\u043B\u0451\u043A.",
    "Unused codes": "\u041D\u0435\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043A\u043E\u0434\u044B",
    "revoke": "\u043E\u0442\u043E\u0437\u0432\u0430\u0442\u044C",
    "Paired wallets": "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0438",
    "unpair": "\u043E\u0442\u0432\u044F\u0437\u0430\u0442\u044C",
    "Models offered": "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u043E \u043C\u043E\u0434\u0435\u043B\u0435\u0439",
    "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.": "\u041C\u043E\u0434\u0435\u043B\u0438 \u0431\u0435\u0437 \u043E\u0442\u043C\u0435\u0442\u043A\u0438 \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u043C\u0438, \u043D\u043E \u043D\u0435 \u0440\u0435\u043A\u043B\u0430\u043C\u0438\u0440\u0443\u044E\u0442\u0441\u044F. \u0426\u0435\u043D\u0430 \u2014 USDC \u0437\u0430 \u0447\u0430\u0441; 0 \u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E.",
    "No local models yet. Download one below.": "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0445 \u043C\u043E\u0434\u0435\u043B\u0435\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0421\u043A\u0430\u0447\u0430\u0439\u0442\u0435 \u043E\u0434\u043D\u0443 \u043D\u0438\u0436\u0435.",
    "not for agents": "\u043D\u0435 \u0434\u043B\u044F \u0430\u0433\u0435\u043D\u0442\u043E\u0432",
    "delete": "\u0443\u0434\u0430\u043B\u0438\u0442\u044C",
    "model to download, e.g. llama3.2:3b": "\u043C\u043E\u0434\u0435\u043B\u044C \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 llama3.2:3b",
    "Model to download": "\u041C\u043E\u0434\u0435\u043B\u044C \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438",
    "Downloading\u2026": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026",
    "Download": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C",
    "offered": "\u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u0442\u0441\u044F",
    "unsaved changes": "\u043D\u0435\u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F",
    "Save catalog": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433",
    "Peer": "\u041F\u0438\u0440",
    "Connection": "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435",
    "libp2p direct": "libp2p \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E",
    "seed VM relay": "\u0440\u0435\u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0442\u043E\u0440 \u0441\u0438\u0434-VM",
    "LAN only": "\u0442\u043E\u043B\u044C\u043A\u043E \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0435\u0442\u044C",
    "Clients reach this worker directly over libp2p.": "\u041A\u043B\u0438\u0435\u043D\u0442\u044B \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u044E\u0442\u0441\u044F \u043A \u044D\u0442\u043E\u043C\u0443 worker \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u043F\u043E libp2p.",
    "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.": "\u041F\u0440\u044F\u043C\u043E\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438\u0437 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442\u0430 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0442\u0440\u0430\u0444\u0438\u043A \u0438\u0434\u0451\u0442 \u0447\u0435\u0440\u0435\u0437 \u0441\u0438\u0434-VM GenKaKu. \u041A\u043B\u0438\u0435\u043D\u0442\u044B \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u043E\u0431\u0443\u044E\u0442 \u043F\u0440\u044F\u043C\u043E\u0435 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435, \u0437\u0430\u0442\u0435\u043C \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u044E\u0442\u0441\u044F \u043D\u0430 \u0440\u0435\u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0442\u043E\u0440.",
    "Only peers on the same network can connect. A relay appears once the seed VM is reachable.": "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0442\u044C\u0441\u044F \u043C\u043E\u0433\u0443\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0438\u0440\u044B \u0432 \u0442\u043E\u0439 \u0436\u0435 \u0441\u0435\u0442\u0438. \u0420\u0435\u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0442\u043E\u0440 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u0441\u0438\u0434-VM \u0441\u0442\u0430\u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D.",
    "Active sessions": "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u0441\u0435\u0441\u0441\u0438\u0438",
    "Addresses": "\u0410\u0434\u0440\u0435\u0441\u0430",
    "Open the full dashboard": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043E\u043B\u043D\u0443\u044E \u043F\u0430\u043D\u0435\u043B\u044C",
    "Ad earnings": "\u0414\u043E\u0445\u043E\u0434 \u043E\u0442 \u0440\u0435\u043A\u043B\u0430\u043C\u044B",
    "Ready to claim": "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043A \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044E",
    "In this wallet": "\u0412 \u044D\u0442\u043E\u043C \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435",
    "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.": "\u0420\u0435\u043A\u043B\u0430\u043C\u043E\u0434\u0430\u0442\u0435\u043B\u0438 \u043F\u043B\u0430\u0442\u044F\u0442 \u0437\u0430 \u0441\u043F\u043E\u043D\u0441\u043E\u0440\u0441\u043A\u0438\u0435 \u043C\u0438\u043D\u0443\u0442\u044B. \u041F\u043E\u0441\u043B\u0435 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0433\u043E \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u043C\u0438\u043D\u0443\u0442\u044B \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0434\u043D\u044F \u0437\u0430\u0447\u0438\u0441\u043B\u044F\u044E\u0442\u0441\u044F \u044D\u0442\u043E\u043C\u0443 worker \u0432 \u0441\u0435\u0442\u0438, \u0438 \u0438\u0445 \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0437\u0434\u0435\u0441\u044C. \u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u2014 \u044D\u0442\u043E \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044F Solana, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043D\u0443\u0436\u043D\u043E \u043D\u0435\u043C\u043D\u043E\u0433\u043E SOL \u043D\u0430 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0435 \u0432\u044B\u0448\u0435 \u0434\u043B\u044F \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438; USDC \u043F\u043E\u0441\u0442\u0443\u043F\u0430\u0435\u0442 \u043F\u0440\u044F\u043C\u043E \u043D\u0430 \u044D\u0442\u043E\u0442 \u043A\u043E\u0448\u0435\u043B\u0451\u043A.",
    "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.": "Campaign \u043F\u043B\u0430\u0442\u0438\u0442, \u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0441\u043B\u0438 \u0435\u0451 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0433\u043E \u0431\u0430\u043B\u0430\u043D\u0441\u0430 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u043D\u0430 \u043C\u0438\u043D\u0443\u0442\u044B; worker, \u043D\u0435 \u0434\u043E\u0441\u0442\u0438\u0433\u0448\u0438\u0439 \u043F\u043E\u0440\u043E\u0433\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u044D\u0442\u043E\u0439 campaign, \u0436\u0434\u0451\u0442, \u043F\u043E\u043A\u0430 \u043D\u0430\u043A\u043E\u043F\u0438\u0442\u0441\u044F \u0431\u043E\u043B\u044C\u0448\u0435.",
    "Claiming\u2026": "\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435\u2026",
    "Claim": "\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u044C",
    "Nothing above a threshold yet.": "\u041F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u043F\u043E\u0440\u043E\u0433.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest": "\u041D\u0430 127.0.0.1:{value} \u0447\u0442\u043E-\u0442\u043E \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442, \u043D\u043E \u043E\u0442\u043A\u043B\u043E\u043D\u044F\u0435\u0442 origin \u044D\u0442\u043E\u0433\u043E \u043E\u043A\u043D\u0430 (403). \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u043F\u043B\u0430\u0433\u0438\u043D: dsh plugin add @genkaku/dsh-worker-plugin@latest",
    "Downloaded {value}.": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430: {value}.",
    "Delete {value} from this machine?": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C {value} \u0441 \u044D\u0442\u043E\u0433\u043E \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0430?",
    "Invalid price for {value}": "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u0430\u044F \u0446\u0435\u043D\u0430 \u0434\u043B\u044F {value}",
    "Stop allowing {value} to use this worker?": "\u0417\u0430\u043F\u0440\u0435\u0442\u0438\u0442\u044C {value} \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u043E\u0433\u043E worker?",
    "{value} tips": "\u0427\u0430\u0435\u0432\u044B\u0435: {value}",
    "Price per hour for {value}": "\u0426\u0435\u043D\u0430 \u0437\u0430 \u0447\u0430\u0441 \u0434\u043B\u044F {value}",
    "Sponsored": "\u0421\u043F\u043E\u043D\u0441\u043E\u0440\u0441\u043A\u043E\u0435",
    "Dismiss this placement": "\u0421\u043A\u0440\u044B\u0442\u044C \u044D\u0442\u043E \u0440\u0430\u0437\u043C\u0435\u0449\u0435\u043D\u0438\u0435",
    "Dismiss": "\u0421\u043A\u0440\u044B\u0442\u044C",
    "GenKaKu User": "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C GenKaKu",
    "GenKaKu Worker": "Worker GenKaKu",
    "GenKaKu network": "\u0421\u0435\u0442\u044C GenKaKu",
    "Sessions": "\u0421\u0435\u0430\u043D\u0441\u044B",
    "Workers discovered": "\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0432\u043E\u0440\u043A\u0435\u0440\u043E\u0432",
    "Models on the network": "\u041C\u043E\u0434\u0435\u043B\u0438 \u0432 \u0441\u0435\u0442\u0438",
    "Private worker": "\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u044B\u0439 worker",
    "Copy": "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "Save": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
    "Cancel": "\u041E\u0442\u043C\u0435\u043D\u0430",
    "Refresh": "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
    "Language": "\u042F\u0437\u044B\u043A",
    "Follow DSH": "\u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C DSH",
    "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.": "\u0421\u043B\u0435\u0434\u0443\u0435\u0442 \u044F\u0437\u044B\u043A\u0443 DSH, \u0435\u0441\u043B\u0438 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u0440\u0443\u0433\u043E\u0439 \u0437\u0434\u0435\u0441\u044C. \u041A\u043E\u0440\u0435\u0439\u0441\u043A\u0438\u0439 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0437\u0434\u0435\u0441\u044C, \u043F\u043E\u0442\u043E\u043C\u0443 \u0447\u0442\u043E \u0432 DSH \u0435\u0433\u043E \u043D\u0435\u0442.",
    "GenKaKu worker": "\u0412\u043E\u0440\u043A\u0435\u0440 GenKaKu",
    "The plugin opens its bridge on the first free port in 47821\u201347826.": "\u041F\u043B\u0430\u0433\u0438\u043D \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 bridge \u043D\u0430 \u043F\u0435\u0440\u0432\u043E\u043C \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u043E\u043C \u043F\u043E\u0440\u0442\u0443 \u0438\u0437 47821\u201347826.",
    "free \xB7 tips optional": "\u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E \xB7 \u0447\u0430\u0435\u0432\u044B\u0435 \u043F\u043E \u0436\u0435\u043B\u0430\u043D\u0438\u044E",
    "Loading worker status\u2026": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F \u0432\u043E\u0440\u043A\u0435\u0440\u0430\u2026",
    "Agent access": "\u0414\u043E\u0441\u0442\u0443\u043F \u0430\u0433\u0435\u043D\u0442\u0430",
    "Agent wallet mode": "\u0420\u0435\u0436\u0438\u043C \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 \u0434\u043B\u044F \u0430\u0433\u0435\u043D\u0442\u0430",
    "Off": "\u0412\u044B\u043A\u043B.",
    "Ask owner": "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430",
    "Capped": "\u0410\u0432\u0442\u043E \u0432 \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u0445 \u043B\u0438\u043C\u0438\u0442\u0430",
    "Per request (USDC)": "\u041D\u0430 \u0437\u0430\u043F\u0440\u043E\u0441 (USDC)",
    "Per day (USDC)": "\u0412 \u0434\u0435\u043D\u044C (USDC)",
    "Freeze wallet": "\u0417\u0430\u043C\u043E\u0440\u043E\u0437\u0438\u0442\u044C \u043A\u043E\u0448\u0435\u043B\u0451\u043A",
    "Frozen: owner actions still work; agent requests are refused.": "\u0417\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D\u043E: \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442, \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u0430\u0433\u0435\u043D\u0442\u0430 \u043E\u0442\u043A\u043B\u043E\u043D\u044F\u044E\u0442\u0441\u044F.",
    "Pending approvals": "\u041E\u0436\u0438\u0434\u0430\u044E\u0442 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0438\u044F",
    "Approve": "\u041E\u0434\u043E\u0431\u0440\u0438\u0442\u044C",
    "Deny": "\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C",
    "No pending requests.": "\u041D\u0435\u0442 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432, \u043E\u0436\u0438\u0434\u0430\u044E\u0449\u0438\u0445 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u0438\u044F.",
    "Key and identity operations are always owner-only.": "\u041E\u043F\u0435\u0440\u0430\u0446\u0438\u0438 \u0441 \u043A\u043B\u044E\u0447\u0430\u043C\u0438 \u0438 \u0438\u0434\u0435\u043D\u0442\u0438\u0447\u043D\u043E\u0441\u0442\u044C\u044E \u0432\u0441\u0435\u0433\u0434\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430.",
    "Caps apply to tips and campaign funding; claims are not a spend.": "\u041B\u0438\u043C\u0438\u0442\u044B \u043E\u0442\u043D\u043E\u0441\u044F\u0442\u0441\u044F \u043A \u0447\u0430\u0435\u0432\u044B\u043C \u0438 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0439; \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u2014 \u043D\u0435 \u0440\u0430\u0441\u0445\u043E\u0434.",
    "Save limits": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043B\u0438\u043C\u0438\u0442\u044B",
    "Enter both limits in USDC.": "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043E\u0431\u0430 \u043B\u0438\u043C\u0438\u0442\u0430 \u0432 USDC."
  },
  "pt": {
    "Reconnecting to the bridge\u2026": "Reconectando \xE0 bridge\u2026",
    "No GenKaKu user bridge on 47821\u201347826.": "Nenhuma bridge de usu\xE1rio GenKaKu em 47821\u201347826.",
    "Bridge not reached yet.": "A bridge ainda n\xE3o foi alcan\xE7ada.",
    "Enter a price per impression.": "Informe um pre\xE7o por impress\xE3o.",
    "Price must be between 0.0001 and 0.1 USDC per impression.": "O pre\xE7o deve ficar entre 0.0001 e 0.1 USDC por impress\xE3o.",
    "Submitted and reviewed. Fund it and it goes live; the operator can block it later.": "Enviado e revisado. Financie e ele entra no ar; o operador pode bloque\xE1-lo depois.",
    "Resumed. The ad is serving again.": "Retomado. O an\xFAncio est\xE1 sendo exibido novamente.",
    "Paused. No new impressions; unspent budget can be withdrawn after a day.": "Pausado. Sem novas impress\xF5es; o or\xE7amento n\xE3o gasto pode ser sacado ap\xF3s um dia.",
    "Enter a budget.": "Informe um or\xE7amento.",
    "The budget must cover at least one impression.": "O or\xE7amento deve cobrir pelo menos uma impress\xE3o.",
    "The campaign address was not returned.": "O endere\xE7o da campaign n\xE3o foi retornado.",
    "Funded. The ad starts as soon as the operator-approved listing picks it up.": "Financiado. O an\xFAncio come\xE7a assim que a listagem aprovada pelo operador o assumir.",
    "Saved. The bridge is restarting with the new worker list.": "Salvo. A bridge est\xE1 reiniciando com a nova lista de workers.",
    "Never share this key. Anyone who has it owns the wallet and its funds.": "Nunca compartilhe esta chave. Quem a tiver controla a carteira e os fundos.",
    "Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?": "Importar uma chave substitui a carteira de usu\xE1rio deste perfil. O endere\xE7o atual mant\xE9m os fundos e deixa de ser usado. Continuar?",
    "Wallet imported. The bridge is restarting.": "Carteira importada. A bridge est\xE1 reiniciando.",
    "Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it.": "Gerar uma nova carteira? O endere\xE7o antigo mant\xE9m seus SOL e USDC; este perfil deixa de us\xE1-lo.",
    "New wallet generated. The bridge is restarting.": "Nova carteira gerada. A bridge est\xE1 reiniciando.",
    "Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes.": "Reexaminando o diret\xF3rio on-chain e o seed. A bridge reinicia quando a varredura terminar.",
    "Paired. The worker\u2019s models appear below when it is online.": "Pareado. Os modelos do worker aparecem abaixo quando ele estiver online.",
    "Forget this paired worker? You can pair it again with a fresh code.": "Esquecer este worker pareado? Voc\xEA pode pare\xE1-lo de novo com um novo c\xF3digo.",
    "Loading status\u2026": "Carregando status\u2026",
    "Reconnecting\u2026": "Reconectando\u2026",
    "Wallet": "Carteira",
    "Wallet address copied.": "Endere\xE7o da carteira copiado.",
    "copy": "copiar",
    "This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute.": "Esta carteira ainda n\xE3o tem SOL neste cluster. Uma sess\xE3o precisa de um pouco de SOL para aluguel e taxas; USDC \xE9 o que ela paga por computa\xE7\xE3o.",
    "Open faucet (devnet)": "Abrir faucet (devnet)",
    "Minting\u2026": "Cunhando\u2026",
    "Mint 100 test USDC": "Cunhar 100 USDC de teste",
    "Revealing\u2026": "Revelando\u2026",
    "Export key": "Exportar chave",
    "Import key": "Importar chave",
    "New wallet": "Nova carteira",
    "Private key \u2014 keep it offline. Testnet only.": "Chave privada \u2014 mantenha offline. Somente testnet.",
    "Private key": "Chave privada",
    "Private key copied.": "Chave privada copiada.",
    "hide": "ocultar",
    "Paste a base58 wallet key (the format Phantom and solana-keygen show)": "Cole uma chave de carteira base58 (o formato exibido pelo Phantom e pelo solana-keygen)",
    "Private key to import": "Chave privada para importar",
    "Importing\u2026": "Importando\u2026",
    "Import": "Importar",
    "Tips": "Gorjetas",
    "Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.": "Usar o GenKaKu n\xE3o custa nada. Se um worker foi \xFAtil \u2014 especialmente um gratuito, que n\xE3o gera receita de an\xFAncios \u2014, voc\xEA pode enviar USDC diretamente para ele. A transfer\xEAncia vai da sua carteira para a carteira dele; o GenKaKu n\xE3o participa e n\xE3o fica com nada.",
    "No worker with a wallet on the board yet.": "Ainda n\xE3o h\xE1 worker com carteira no board.",
    "Each tip needs a little SOL in the wallet above for the network fee.": "Cada gorjeta precisa de um pouco de SOL na carteira acima para a taxa de rede.",
    "Settings": "Configura\xE7\xF5es",
    "Manual workers": "Workers manuais",
    "Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.": "Multiaddrs opcionais fixados neste perfil. A descoberta pelo diret\xF3rio on-chain e pelo seed continua funcionando.",
    "None pinned \u2014 using discovery only.": "Nenhum fixado \u2014 usando apenas descoberta.",
    "remove": "remover",
    "Worker multiaddr": "Multiaddr do worker",
    "Add": "Adicionar",
    "Refreshing\u2026": "Atualizando\u2026",
    "Refresh network": "Atualizar rede",
    "Re-reads the directory and the seed now.": "Rel\xEA o diret\xF3rio e o seed agora.",
    "selected": "selecionado",
    "Search a model, worker name or wallet": "Buscar um modelo, nome de worker ou carteira",
    "Search models": "Buscar modelos",
    "Sort models": "Ordenar modelos",
    "Recommended": "Recomendados",
    "Lowest price": "Menor pre\xE7o",
    "Lowest latency": "Menor lat\xEAncia",
    "Most sessions served": "Mais sess\xF5es atendidas",
    "Model name": "Nome do modelo",
    "Worker name": "Nome do worker",
    "Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.": "Apenas modelos marcados aparecem no seletor de modelos do chat, at\xE9 dez. A marca\xE7\xE3o \xE9 por worker e modelo, ent\xE3o o mesmo modelo de dois workers s\xE3o duas op\xE7\xF5es.",
    "Nothing offered yet. A worker lists its local Ollama models on start.": "Nada oferecido ainda. Um worker lista seus modelos Ollama locais ao iniciar.",
    "No row matches that search.": "Nenhuma linha corresponde a essa busca.",
    "private": "privado",
    "Private workers": "Workers privados",
    "A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.": "Um worker privado n\xE3o est\xE1 no diret\xF3rio. Cole o c\xF3digo de uso \xFAnico que ele forneceu: o pareamento fica vinculado a esta carteira e o c\xF3digo n\xE3o pode ser usado de novo.",
    "Pairing code": "C\xF3digo de pareamento",
    "Pairing\u2026": "Pareando\u2026",
    "Pair": "Parear",
    "online": "online",
    "offline": "offline",
    "checking\u2026": "verificando\u2026",
    "forget": "esquecer",
    "Advertise on GenKaKu": "Anuncie no GenKaKu",
    "refresh": "atualizar",
    "You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.": "Voc\xEA paga por impress\xE3o: uma impress\xE3o \xE9 um minuto patrocinado do tempo de um worker. O or\xE7amento \xE9 em USDC da carteira acima, enviado para uma conta de campaign na Solana da qual s\xF3 o programa pode pagar. Quando o or\xE7amento acabar, o an\xFAncio para.",
    "Test mode: a zero budget still serves, and impressions are not billed.": "Modo de teste: um or\xE7amento zero ainda veicula, e as impress\xF5es n\xE3o s\xE3o cobradas.",
    "Category": "Categoria",
    "Sponsor name": "Nome do patrocinador",
    "Price per impression (USDC)": "Pre\xE7o por impress\xE3o (USDC)",
    "Budget (USDC)": "Or\xE7amento (USDC)",
    "Title": "T\xEDtulo",
    "Body": "Corpo",
    "Destination URL": "URL de destino",
    "Button label": "Texto do bot\xE3o",
    "Learn more": "Saiba mais",
    "Image URL": "URL da imagem",
    "Image alt": "Texto alternativo da imagem",
    "Keywords": "Palavras-chave",
    "Submitting\u2026": "Enviando\u2026",
    "Submit for review": "Enviar para revis\xE3o",
    "No listings yet.": "Ainda n\xE3o h\xE1 listagens.",
    "Blocked by the operator": "Bloqueado pelo operador",
    "Not accepted": "N\xE3o aceito",
    "Reviewed \u2014 fund it to go live": "Revisado \u2014 financie para entrar no ar",
    "Budget spent \u2014 ad stopped": "Or\xE7amento esgotado \u2014 an\xFAncio parado",
    "Live": "No ar",
    "paused": "pausado",
    "impression": "impress\xE3o",
    "not funded": "n\xE3o financiado",
    "left": "restante",
    "shown": "exibido",
    "clicks": "cliques",
    "Funding\u2026": "Financiando\u2026",
    "Fund and publish": "Financiar e publicar",
    "Resume": "Retomar",
    "Pause": "Pausar",
    "Withdraw unused": "Sacar n\xE3o usado",
    "Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.": "O financiamento precisa de um pouco de SOL na carteira acima para a taxa da Solana. O endere\xE7o da campaign pertence \xE0 sua carteira; o servi\xE7o de an\xFAncios s\xF3 pode ler o saldo. O or\xE7amento n\xE3o gasto pode ser sacado depois de o an\xFAncio ficar pausado por um dia.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest": "Algo responde em 127.0.0.1:{value}, mas recusou a origem desta janela (403). Atualize o plugin: dsh plugin add @genkaku/dsh-user-plugin@latest",
    "Not accepted: {value}": "N\xE3o aceito: {value}",
    "Withdrew {value} USDC back to the wallet.": "Sacados {value} USDC de volta para a carteira.",
    "Minted 100 test USDC (tx {value}\u2026).": "Cunhados 100 USDC de teste (tx {value}\u2026).",
    "At most {value} models can be selected. Untick one first.": "No m\xE1ximo {value} modelos podem ser selecionados. Desmarque um primeiro.",
    "{value} ticked model(s) are not on the network right now. They come back when their worker does.": "{value} modelo(s) marcado(s) n\xE3o est\xE3o na rede agora. Eles voltam quando o worker deles voltar.",
    "Worker status unreachable on 47821\u201347826.": "Status do worker inacess\xEDvel em 47821\u201347826.",
    "Ollama is running.": "O Ollama est\xE1 em execu\xE7\xE3o.",
    "Ollama did not start.": "O Ollama n\xE3o iniciou.",
    "starting": "iniciando",
    "Saved \u2014 your catalog is live.": "Salvo \u2014 seu cat\xE1logo est\xE1 no ar.",
    "Name saved. Users see it next to your models, and can sort and search by it.": "Nome salvo. Os usu\xE1rios o veem ao lado dos seus modelos e podem ordenar e buscar por ele.",
    "Private mode removes this worker from the public directory and from the seed. Only wallets you pair with a one-time code can use it. Continue?": "O modo privado remove este worker do diret\xF3rio p\xFAblico e do seed. S\xF3 carteiras que voc\xEA parear com um c\xF3digo de uso \xFAnico podem us\xE1-lo. Continuar?",
    "Private mode on \u2014 restarting the worker. Generate a pairing code below.": "Modo privado ativado \u2014 reiniciando o worker. Gere um c\xF3digo de pareamento abaixo.",
    "Public mode on \u2014 restarting the worker and rejoining the directory.": "Modo p\xFAblico ativado \u2014 reiniciando o worker e voltando ao diret\xF3rio.",
    "Copy failed \u2014 select the code and copy it manually.": "Falha ao copiar \u2014 selecione o c\xF3digo e copie manualmente.",
    "Publishing enabled \u2014 restarting the worker.": "Publica\xE7\xE3o ativada \u2014 reiniciando o worker.",
    "Publishing disabled \u2014 restarting the worker.": "Publica\xE7\xE3o desativada \u2014 reiniciando o worker.",
    "Never share this key. Anyone who has it owns the wallet, the worker identity in the chain directory, and its earnings.": "Nunca compartilhe esta chave. Quem a tiver controla a carteira, a identidade do worker no diret\xF3rio on-chain e seus ganhos.",
    "Importing a key replaces this worker's identity wallet. The current address keeps its funds. If the old wallet is listed on-chain, this plugin will try to retract that entry first. Continue?": "Importar uma chave substitui a carteira de identidade deste worker. O endere\xE7o atual mant\xE9m os fundos. Se a carteira antiga estiver listada on-chain, este plugin tentar\xE1 retrair essa entrada primeiro. Continuar?",
    "Wallet imported. The worker is restarting with the new identity.": "Carteira importada. O worker est\xE1 reiniciando com a nova identidade.",
    "Generate a fresh worker wallet? The old address keeps its SOL and USDC. If its entry is published, this plugin will try to retract it first, then restart as the new identity.": "Gerar uma nova carteira de worker? O endere\xE7o antigo mant\xE9m seus SOL e USDC. Se a entrada dele estiver publicada, este plugin tentar\xE1 retrai-la primeiro e depois reiniciar com a nova identidade.",
    "New worker wallet generated. Restarting as the new identity.": "Nova carteira de worker gerada. Reiniciando com a nova identidade.",
    "Worker restarting\u2026": "Worker reiniciando\u2026",
    "Worker wallet": "Carteira do worker",
    "Balance": "Saldo",
    "Tips received": "Gorjetas recebidas",
    "none yet": "nenhuma ainda",
    "This wallet has no SOL yet on this cluster. The worker needs a little for rent and fees to publish its listing and run sessions; USDC is what it earns, not what it spends.": "Esta carteira ainda n\xE3o tem SOL neste cluster. O worker precisa de um pouco para aluguel e taxas para publicar sua listagem e executar sess\xF5es; USDC \xE9 o que ele ganha, n\xE3o o que ele gasta.",
    "Open faucet": "Abrir faucet",
    "Generating\u2026": "Gerando\u2026",
    "This key is the worker identity: it signs receipts and binds the on-chain directory entry. Back it up before moving this machine to a new disk.": "Esta chave \xE9 a identidade do worker: ela assina recibos e vincula a entrada do diret\xF3rio on-chain. Fa\xE7a backup antes de mover esta m\xE1quina para um novo disco.",
    "Checking the local Ollama service\u2026": "Verificando o servi\xE7o Ollama local\u2026",
    "Running": "Em execu\xE7\xE3o",
    "Installed, not running": "Instalado, n\xE3o em execu\xE7\xE3o",
    "Not installed": "N\xE3o instalado",
    "models": "modelos",
    "Starting\u2026": "Iniciando\u2026",
    "Start Ollama": "Iniciar Ollama",
    "Download Ollama": "Baixar Ollama",
    "Directory": "Diret\xF3rio",
    "Publish this worker on-chain": "Publicar este worker on-chain",
    "This machine has no public address, so this switch is off until it gets one: listing it would create an entry nobody can dial. Peers on the same network can still connect.": "Esta m\xE1quina n\xE3o tem endere\xE7o p\xFAblico, ent\xE3o esta op\xE7\xE3o fica desativada at\xE9 ter um: list\xE1-la criaria uma entrada que ningu\xE9m conseguiria discar. Pares na mesma rede ainda podem se conectar.",
    "Forced on by this profile (publishAddress), so it cannot be turned off here.": "For\xE7ado por este perfil (publishAddress), ent\xE3o n\xE3o pode ser desativado aqui.",
    "Listed through the seed VM relay. Only the relay address is written on-chain; your own IP is not published.": "Listado pelo relay da seed VM. Apenas o endere\xE7o do relay \xE9 gravado on-chain; seu pr\xF3prio IP n\xE3o \xE9 publicado.",
    "Listed. Your public IP is written to the chain and stays readable forever, even after you turn this off.": "Listado. Seu IP p\xFAblico \xE9 gravado na chain e continua leg\xEDvel para sempre, mesmo depois de voc\xEA desativar isso.",
    "Publishing \u2014 the directory write has not landed yet. It retries automatically while the worker runs.": "Publicando \u2014 a grava\xE7\xE3o no diret\xF3rio ainda n\xE3o foi confirmada. Ela \xE9 repetida automaticamente enquanto o worker estiver em execu\xE7\xE3o.",
    "Not listed. A public address is available, so turning this on makes you discoverable.": "N\xE3o listado. H\xE1 um endere\xE7o p\xFAblico dispon\xEDvel, ent\xE3o ativar isso permite que voc\xEA seja descoberto.",
    "Name & access": "Nome e acesso",
    "Display name": "Nome de exibi\xE7\xE3o",
    "personal name, ID or nickname": "nome pessoal, ID ou apelido",
    "Saving\u2026": "Salvando\u2026",
    "save": "salvar",
    "Users see this next to your models and can search and sort by it. It is not written on chain.": "Os usu\xE1rios veem isso ao lado dos seus modelos e podem buscar e ordenar por isso. N\xE3o \xE9 gravado on-chain.",
    "Private": "Privado",
    "Public": "P\xFAblico",
    "Private worker (pairing code required)": "Worker privado (c\xF3digo de pareamento necess\xE1rio)",
    "Private: not announced to the seed and no address on chain, so only wallets you paired can see these models. You can still charge \u2014 0 means free.": "Privado: n\xE3o anunciado ao seed e sem endere\xE7o on-chain, ent\xE3o s\xF3 carteiras que voc\xEA pareou veem estes modelos. Voc\xEA ainda pode cobrar \u2014 0 significa gratuito.",
    "Public: anyone who reads the directory or asks the seed can find these models.": "P\xFAblico: qualquer pessoa que leia o diret\xF3rio ou consulte o seed pode encontrar estes modelos.",
    "label for this user (optional)": "r\xF3tulo para este usu\xE1rio (opcional)",
    "label for this user": "r\xF3tulo para este usu\xE1rio",
    "Generate pairing code": "Gerar c\xF3digo de pareamento",
    "Copied": "Copiado",
    "Copy code": "Copiar c\xF3digo",
    "Shown once. Expires in 15 minutes and pairs one wallet.": "Exibido uma \xFAnica vez. Expira em 15 minutos e pareia uma carteira.",
    "Unused codes": "C\xF3digos n\xE3o usados",
    "revoke": "revogar",
    "Paired wallets": "Carteiras pareadas",
    "unpair": "desparear",
    "Models offered": "Modelos oferecidos",
    "Unticked models stay installed but are not advertised. Price is USDC per hour; 0 means free.": "Modelos n\xE3o marcados continuam instalados, mas n\xE3o s\xE3o anunciados. O pre\xE7o \xE9 em USDC por hora; 0 significa gratuito.",
    "No local models yet. Download one below.": "Ainda n\xE3o h\xE1 modelos locais. Baixe um abaixo.",
    "not for agents": "n\xE3o para agentes",
    "delete": "excluir",
    "model to download, e.g. llama3.2:3b": "modelo a baixar, ex.: llama3.2:3b",
    "Model to download": "Modelo para baixar",
    "Downloading\u2026": "Baixando\u2026",
    "Download": "Baixar",
    "offered": "oferecido",
    "unsaved changes": "altera\xE7\xF5es n\xE3o salvas",
    "Save catalog": "Salvar cat\xE1logo",
    "Peer": "Par",
    "Connection": "Conex\xE3o",
    "libp2p direct": "libp2p direto",
    "seed VM relay": "relay da seed VM",
    "LAN only": "Somente LAN",
    "Clients reach this worker directly over libp2p.": "Os clientes alcan\xE7am este worker diretamente via libp2p.",
    "Direct dialing is not possible from the internet, so traffic is forwarded through the GenKaKu seed VM. Clients try a direct connection first, then fall back to the relay.": "N\xE3o \xE9 poss\xEDvel discar diretamente pela internet, ent\xE3o o tr\xE1fego \xE9 encaminhado pela seed VM do GenKaKu. Os clientes tentam uma conex\xE3o direta primeiro e depois recorrem ao relay.",
    "Only peers on the same network can connect. A relay appears once the seed VM is reachable.": "S\xF3 pares na mesma rede podem se conectar. Um relay aparece quando a seed VM estiver acess\xEDvel.",
    "Active sessions": "Sess\xF5es ativas",
    "Addresses": "Endere\xE7os",
    "Open the full dashboard": "Abrir o painel completo",
    "Ad earnings": "Ganhos com an\xFAncios",
    "Ready to claim": "Pronto para resgatar",
    "In this wallet": "Nesta carteira",
    "Advertisers pay per sponsored minute. Each day\u2019s minutes are booked to this worker on chain after the daily settlement, then they can be claimed here. The claim is a Solana transaction, so it needs a little SOL in the wallet above for the fee; the USDC goes straight into this wallet.": "Anunciantes pagam por minuto patrocinado. Os minutos de cada dia s\xE3o registrados para este worker on-chain ap\xF3s a liquida\xE7\xE3o di\xE1ria e depois podem ser resgatados aqui. O resgate \xE9 uma transa\xE7\xE3o na Solana, ent\xE3o precisa de um pouco de SOL na carteira acima para a taxa; o USDC vai direto para esta carteira.",
    "A campaign pays only when its own balance covers the minutes; a worker below that campaign\u2019s claim threshold waits until more accrues.": "Uma campaign s\xF3 paga quando o pr\xF3prio saldo cobre os minutos; um worker abaixo do limite de resgate dessa campaign espera at\xE9 acumular mais.",
    "Claiming\u2026": "Resgatando\u2026",
    "Claim": "Resgatar",
    "Nothing above a threshold yet.": "Nada acima de um limite ainda.",
    "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest": "Algo responde em 127.0.0.1:{value}, mas recusou a origem desta janela (403). Atualize o plugin: dsh plugin add @genkaku/dsh-worker-plugin@latest",
    "Downloaded {value}.": "{value} baixado.",
    "Delete {value} from this machine?": "Excluir {value} desta m\xE1quina?",
    "Invalid price for {value}": "Pre\xE7o inv\xE1lido para {value}",
    "Stop allowing {value} to use this worker?": "Parar de permitir que {value} use este worker?",
    "{value} tips": "{value} gorjetas",
    "Price per hour for {value}": "Pre\xE7o por hora de {value}",
    "Sponsored": "Patrocinado",
    "Dismiss this placement": "Dispensar este an\xFAncio",
    "Dismiss": "Dispensar",
    "GenKaKu User": "Usu\xE1rio GenKaKu",
    "GenKaKu Worker": "Worker GenKaKu",
    "GenKaKu network": "Rede GenKaKu",
    "Sessions": "Sess\xF5es",
    "Workers discovered": "Workers descobertos",
    "Models on the network": "Modelos na rede",
    "Private worker": "Worker privado",
    "Copy": "Copiar",
    "Save": "Salvar",
    "Cancel": "Cancelar",
    "Refresh": "Atualizar",
    "Language": "Idioma",
    "Follow DSH": "Seguir o DSH",
    "Follows the DSH language unless you pick one here. Korean is available here because DSH does not ship it.": "Segue o idioma do DSH, a menos que voc\xEA escolha um aqui. O coreano est\xE1 aqui porque o DSH n\xE3o o inclui.",
    "GenKaKu worker": "Worker GenKaKu",
    "The plugin opens its bridge on the first free port in 47821\u201347826.": "O plugin abre a bridge na primeira porta livre entre 47821 e 47826.",
    "free \xB7 tips optional": "gr\xE1tis \xB7 gorjetas opcionais",
    "Loading worker status\u2026": "Carregando o estado do worker\u2026",
    "Agent access": "Acesso do agente",
    "Agent wallet mode": "Modo da carteira do agente",
    "Off": "Desativado",
    "Ask owner": "Perguntar ao propriet\xE1rio",
    "Capped": "Autom\xE1tico com limite",
    "Per request (USDC)": "Por solicita\xE7\xE3o (USDC)",
    "Per day (USDC)": "Por dia (USDC)",
    "Freeze wallet": "Congelar carteira",
    "Frozen: owner actions still work; agent requests are refused.": "Congelado: a\xE7\xF5es do propriet\xE1rio continuam, pedidos do agente s\xE3o recusados.",
    "Pending approvals": "Aprova\xE7\xF5es pendentes",
    "Approve": "Aprovar",
    "Deny": "Recusar",
    "No pending requests.": "Nenhuma solicita\xE7\xE3o pendente.",
    "Key and identity operations are always owner-only.": "Opera\xE7\xF5es de chave e identidade s\xE3o sempre apenas do propriet\xE1rio.",
    "Caps apply to tips and campaign funding; claims are not a spend.": "Os limites valem para gorjetas e financiamento de campanhas; receber n\xE3o \xE9 um gasto.",
    "Save limits": "Salvar limites",
    "Enter both limits in USDC.": "Informe os dois limites em USDC."
  }
};
var LOCALE_LABELS = {
  "auto": "Follow DSH",
  "zh": "\u4E2D\u6587",
  "en": "English",
  "ja": "\u65E5\u672C\u8A9E",
  "ko": "\uD55C\uAD6D\uC5B4",
  "es": "Espa\xF1ol",
  "fr": "Fran\xE7ais",
  "de": "Deutsch",
  "ru": "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
  "pt": "Portugu\xEAs"
};

// src/client/i18n.ts
var STORAGE_KEY = "genkaku.locale";
var runtime = null;
var choice = "auto";
var listeners = /* @__PURE__ */ new Set();
function emit() {
  for (const listener of listeners) listener();
}
function installLocale(ctx) {
  if (ctx.locale == null) return;
  runtime = ctx.locale;
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored != null && (stored === "auto" || stored in MESSAGES)) choice = stored;
  } catch {
  }
  if (typeof ctx.effect === "function") {
    ctx.effect(
      () => runtime.subscribe(emit),
      "genkaku: locale changes"
    );
  } else {
    runtime.subscribe(emit);
  }
}
function localeChoice() {
  return choice;
}
function setLocaleChoice(next) {
  choice = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next);
  } catch {
  }
  emit();
}
function activeLocale() {
  if (choice !== "auto") return choice;
  return runtime?.getLocale().active ?? "en";
}
function format(text, params) {
  if (params == null) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) => params[name] == null ? whole : String(params[name]));
}
function t(key, params) {
  const locale = activeLocale();
  const dict = MESSAGES[locale] ?? MESSAGES.en;
  return format(dict[key] ?? MESSAGES.en[key] ?? key, params);
}
function subscribeLocale(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function localeOptions() {
  return ["auto", "zh", "en", "ja", "ko", "es", "fr", "de", "ru", "pt"].map((id) => ({ id, label: id === "auto" ? `${LOCALE_LABELS.auto} (${runtime?.getLocale().active ?? "en"})` : LOCALE_LABELS[id] }));
}

// src/client/useLocale.tsx
var import_react = require("react");
function useLocaleVersion() {
  const [, force] = (0, import_react.useReducer)((n) => n + 1, 0);
  (0, import_react.useEffect)(() => subscribeLocale(force), [force]);
}

// src/client/index.tsx
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/adDock.tsx
var import_react2 = require("react");

// src/client/bridgeOrigin.ts
var CANDIDATE_PORTS = [47821, 47822, 47823, 47824, 47825, 47826];
var originOf = (port) => `http://127.0.0.1:${port}`;
var known = null;
var discovering = null;
function remember(origin) {
  known = origin;
}
async function probe(origin) {
  try {
    const res = await fetch(`${origin}/genkaku/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4e3)
    });
    if (!res.ok) return false;
    const doc = await res.json();
    return doc.role === "user";
  } catch {
    return false;
  }
}
async function discoverOrigin() {
  if (known != null && await probe(known)) return known;
  if (discovering != null) return await discovering;
  discovering = (async () => {
    for (const port of CANDIDATE_PORTS) {
      const origin = originOf(port);
      if (await probe(origin)) {
        known = origin;
        return origin;
      }
    }
    return null;
  })().finally(() => {
    discovering = null;
  });
  return await discovering;
}

// src/client/adDock.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var POLL_MS = 3e3;
var DWELL_MS = 1e3;
var CARD_HEIGHT = 128;
var noChatHook = () => void 0;
function AdDock(props) {
  useLocaleVersion();
  const [ad, setAd] = (0, import_react2.useState)(null);
  const [turn, setTurn] = (0, import_react2.useState)(0);
  const [dismissed, setDismissed] = (0, import_react2.useState)(null);
  const shownTurn = (0, import_react2.useRef)(null);
  const reported = (0, import_react2.useRef)(/* @__PURE__ */ new Set());
  const rowRef = (0, import_react2.useRef)(null);
  const [dwelled, setDwelled] = (0, import_react2.useState)(false);
  const [imageBroken, setImageBroken] = (0, import_react2.useState)(false);
  const useChat = props.useChat ?? noChatHook;
  const latestTurn = useChat((snapshot) => snapshot?.navigation?.items?.().at(-1)?.turn);
  const thisTurn = props.turn?.turn;
  const isLatest = latestTurn == null ? true : thisTurn === latestTurn;
  const closed = props.turn?.end != null;
  (0, import_react2.useEffect)(() => {
    if (!isLatest || !closed) {
      setAd(null);
      return;
    }
    let cancelled = false;
    let timer = null;
    const poll = async () => {
      const origin = await discoverOrigin();
      if (origin == null || cancelled) return;
      try {
        const res = await fetch(`${origin}/genkaku/ad`, {
          cache: "no-store",
          signal: AbortSignal.timeout(4e3)
        });
        if (!res.ok) return;
        const doc = await res.json();
        if (cancelled) return;
        const next = doc.ad ?? null;
        const nextTurn = typeof doc.turn === "number" ? doc.turn : 0;
        setAd((previous) => previous?.id === next?.id ? previous : next);
        setTurn(nextTurn);
      } catch {
      }
    };
    void poll();
    timer = setInterval(() => {
      void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      if (timer != null) clearInterval(timer);
    };
  }, [isLatest, closed, thisTurn]);
  (0, import_react2.useEffect)(() => {
    if (ad == null) return;
    if (shownTurn.current === turn) return;
    shownTurn.current = turn;
    setDwelled(false);
    setImageBroken(false);
  }, [ad, turn]);
  (0, import_react2.useEffect)(() => {
    if (ad == null || dwelled) return;
    const row2 = rowRef.current;
    if (row2 == null) return;
    let visible = false;
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      if (!visible) clearTimeout(timer);
      else schedule();
    }, { threshold: [0.5] });
    let timer = null;
    const schedule = () => {
      if (timer != null) return;
      if (!document.hasFocus()) return;
      timer = setTimeout(() => {
        timer = null;
        if (document.hasFocus() && visible) setDwelled(true);
      }, DWELL_MS);
    };
    const onFocus = () => {
      schedule();
    };
    observer.observe(row2);
    window.addEventListener("focus", onFocus);
    return () => {
      observer.disconnect();
      window.removeEventListener("focus", onFocus);
      if (timer != null) clearTimeout(timer);
    };
  }, [ad, dwelled]);
  (0, import_react2.useEffect)(() => {
    if (ad == null || !dwelled) return;
    const creativeId = ad.id ?? "";
    if (creativeId === "") return;
    const key = `${creativeId}#${turn}`;
    if (reported.current.has(key)) return;
    reported.current.add(key);
    void (async () => {
      const origin = await discoverOrigin();
      if (origin == null) return;
      try {
        await fetch(`${origin}/genkaku/ad/impression`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ creativeId, category: ad.category ?? "", turnsSince: turn }),
          signal: AbortSignal.timeout(4e3)
        });
      } catch {
      }
    })();
  }, [ad, dwelled, turn]);
  if (ad == null || !isLatest || !closed) return null;
  if (dismissed === turn) return null;
  const ctaHref = ad.cta?.url ?? ad.url;
  const ctaLabel = ad.cta?.label == null || ctaHref == null ? null : ad.cta.label;
  const href = ctaHref ?? ad.url;
  const sponsor = ad.sponsor ?? "GenKaKu";
  const hasImage = ad.image?.url != null && !imageBroken;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "aside",
    {
      ref: rowRef,
      "aria-label": t("Sponsored"),
      style: {
        order: 1,
        position: "relative",
        display: "flex",
        alignItems: "stretch",
        minHeight: CARD_HEIGHT,
        height: CARD_HEIGHT,
        marginTop: 0,
        border: "1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.22))",
        borderRadius: 14,
        background: "var(--dsw-alias-bg-layer-1, rgba(127,127,127,0.06))",
        overflow: "hidden"
      },
      children: [
        !hasImage ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            style: {
              flex: "0 0 168px",
              background: "var(--dsw-alias-fill-l2, rgba(127,127,127,0.08))",
              overflow: "hidden"
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "img",
              {
                src: ad.image.url,
                alt: ad.image?.alt ?? "",
                loading: "lazy",
                onError: () => setImageBroken(true),
                style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            style: {
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: 4,
              // Head space: the strip starts at the top instead of floating the
              // copy in the middle, so the badge lines up with the picture's top.
              padding: "14px 16px 12px"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                  opacity: 0.62,
                  border: "1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.3))",
                  borderRadius: 999,
                  padding: "2px 7px",
                  whiteSpace: "nowrap"
                }, children: t("Sponsored") }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: 11.5, opacity: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: sponsor })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.35,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }, children: href == null || ctaLabel != null ? ad.title ?? "" : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "a",
                {
                  href,
                  target: "_blank",
                  rel: "sponsored noreferrer noopener",
                  style: { color: "inherit", textDecoration: "none" },
                  children: ad.title ?? ""
                }
              ) }),
              ad.body == null || ad.body === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
                fontSize: 12.5,
                lineHeight: 1.45,
                opacity: 0.72,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical"
              }, children: ad.body })
            ]
          }
        ),
        ctaLabel == null || href == null ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", alignItems: "center", flex: "0 0 auto", padding: "0 14px 0 6px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "a",
          {
            href,
            target: "_blank",
            rel: "sponsored noreferrer noopener",
            style: {
              fontSize: 12.5,
              fontWeight: 600,
              lineHeight: 1,
              padding: "9px 14px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              textDecoration: "none",
              color: "var(--dsw-alias-label-primary-foreground, #fff)",
              background: "var(--dsw-alias-state-business-primary, #3b6cf6)"
            },
            children: ctaLabel
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            "aria-label": t("Dismiss this placement"),
            title: t("Dismiss"),
            onClick: () => setDismissed(turn),
            style: {
              position: "absolute",
              top: 4,
              right: 6,
              background: "transparent",
              border: 0,
              color: "inherit",
              opacity: 0.45,
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
              padding: 2
            },
            children: "\xD7"
          }
        )
      ]
    }
  );
}

// src/client/assets/genkaku-mark-b.png
var genkaku_mark_b_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK4AAACuCAMAAACY0sbcAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAmRQTFRFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+woVAAAAMx0Uk5TAAECBAk7EwMZFwi7/+NcXergkr/yY2mjvPPwIAZg/vX3X2309tMcBR7v+ihL+f2w0csSEIT4nweZI/tvTdwi7fzijNrMMYp9C04yFathCoJP7i7fH8aDYqaAM+te5Ri+5px5VN7oId135HY5Rn6pyjQMQHqnaq84ZuEdazZs23BzbnF0s3w/z7LnEbU1Uxa3UnvBN7nEG8DXVsjCV0fJsTxDuD66QUTQFNaVUem9jewkjkKQWqxZGpElfywnKimTnXWU8Q2g0s5Kw0VIKCYGEwAADD9JREFUeJztnAlUU1cax+97LxKNoPTBCGNT2mRaY3raeEDG2GOPx2rHggsudde6DI51w43ROhXLce1UK+qxY13GDfSAU+2CgGJtZ8alnShYzehksFPSQ6MDChTRRoNZ5r4XRHnrfSGPl87J/xwl4ZF7f+/Ld7/73fvuvRj4WQlTGkCawrhyKowrp8K4ciqMK6fCuHIqjCunwrhyKowrp8K4ciqMK6fCuHLq/xwXA5jPF6y6YeVeqdVLEu6lPhIcXrocTFpZ0nAJjwrDmqTWwS21C3TE7tEGQJckXMKjwaAaqaraKlhEV1jW3SbCI+FTUnAhbSdXx/ug0y31A4k+xxLewdXNCX92rpF07xJw4dcWfzfqTpfGKPy61iEZkFGt76kfSdjWan9hlwmX8Ohvxj2oB/HVv8SuSXM5lgwVPbEf4mpAQhV4+qoEd0DHNVS88L0Oq4Sv4mp+dRmXGoJaCfcSL/4npo4E9bG1z2EX0e8dGRf39q58oLNTL/XO6k632mReQ0Xyv402+mVM3fPn0d0BGdds6XsF2qOeeq2zPxX9dRuiA+HR3Yr10kUBUmvtdQ65LFRcjfPlS/pK/2uy3mhLPBN49FW7+mPl0Gv9Si4DLyLfOyIu4UnqesFkbXmfUNXnS0OFNMqWKn1gkKXZFfxl9T2FI/bsiLiUK7TYAwoa+qXPA4xmhGfwV9CkjxfWrxSxLDTclBOpZ4Dfb1uq6IJdD8i+hoohp8FDv2ouy3T7KlpZSLhmy1DnhVYGAcBkHVBEeKW7L/TSQZZWtBRv31MYhhJqUHAx3NP3CoyRrX4J379yLK0QndMvGK85yqoHgz7TOFFQEP4m5cTIU4BhXMokv6k7rXKjcjYrrbCLFzCMS0WHqJc+NlvEP46Aa7Z0HFr6WFRoFhldOaAIi5AWfVXuMafcrDunXCv1I4DQGSPgapzjStgGoQPm0MPSzAuBJhQxXYGSvqF+eD5CdBDH1TgnXS9nGxdQJhnxw2lJ7qtxTvkUcJals4/CcsXvXRQXGmTaUX+uwBSpLxtQBCREs7TCMZFHeMrSWsfuE3cHMVysR8Vv/5KgYrsCJWinTrdQWohf8MYmFJkcbFegBDuh8XtE3UEM12zpNLkgtpbnqtE2EduFFIEoaR3QFR7vG1spvnryvVyxexfBhWFy9sGEu9wGgV9hV/uAYh9iem229BiUF1/Ndxm6w9TtYmm0CC7hmVdcy2sQ+iuc/gGaeWHMy9jHf+cAxNZOaMoVaQnCuLDHXLAXjlH4FVubfrYcybxax7wD/K5AKb5adKApjEt4Fv2ZO/A8FBlnG56PMllAeBZ79/A2AlrwXlwP2oCLe1Oijj+WmXIJ3sysHPHsGia5mTuFaalB4Oz3hc0rhAurWPqhWBWwjrkbxOcKcO9bf2LnHQzpybKRBwXntIRwoXG1BSLGhe4QWTX/j2LzZtBbRBoBrdjajG9OCHmWsHWXfsgfeFpktKnmrhfxXsw3vlgoKjxUfPWcjUJjQAFczKdZuE2wKTeLmncQHmjiXmJWHnfv21oJVRlbnQJFCeCqXSu2inouLZN10VrhFuIb8YWoV9GKrV24TqAoflzMZ9ZcEAxiLTJZJxc7cF6bwG5vyGmutJGzqF87Lfzm5cc1VOhvolmEct/FazT3O/BcdXvwrBy0G6eK6lbJ37Xx4mI+7fA8jqScU3Bc/PTXAte7OVFpYVFvHHPwmpcX12zJ3oTSzvxKqHr9y3TsJM/Vgd9/gnrjVFHL3uFNJPlwca85Cdm4gBoNCF6WUBI07/lyvrjIh6tyr3lPrBNqXUtkRBMAEf43Tf7XTRH+NzejUV2BUnIZcZsvyePBJTzQuCRSW24WGd3Af1FKQdC8y7P4cjweXLNl3buIoSfoglZ6+20e7+XGxTDvu+sk+FtwRdZnLZeEq3KvL6hUDFdfuRJbxh17OXHhOGXjKn2DMr5Ae8OMbdxzDpy4aYXv51ZKigvBVXLZGG8upztw4mqcmTulhMpgC1pqVWbKCY4rXLhaR062D7nXlEFkdOWaxZwjFC5clXtLlvCAUm6ZrAmj13LNvnHg4h1cff6VXKlUQ6MEHXHdQq4ZHQ5crWNMzTfo2Y0sSqhav4Brgo8D12xRtqFRSqiKW5TBEcvYuDA+f7AcZVwlp6C1xu3lCGVsXLNl0t8alcaFCam63sfu2bisu3oDjCTtAsUvnb1jdga7sbFw4R11xtAGwHJKDyrfWsl+bsfC1TqGXFLeF6gh5nulhSxvYOLC7GblZmWDrl+xtR3WzWV5AxPXUGGevlR5X6DzhvF7RK2rdSTN+j3CxJj8MtrG7mPlDUxctSv9sPJxgVJ8dWKXYmboxZhvfSu2okwVyi8YGza9KWJdwoNtXxpT135Q/CIjq3qdY84bM3DVrqy8OoXTm4eKqctZ7WCkOQxc3LslKzR8gcLdPIv5zI6Fm3oGOk07QvHLaEusuSaIi3tB3E8hEcYA7bxbZjKWQLXGVbvw14+HRkujQ8PWdEZoYOKCXt+FCi6pteKNjNDAxE0buSBUnAF2FNtmMPo1pu/unx8afRqlmDo4YBPGPTCPb31E+yumbvtUEdy8OaESxyhc308iuOvXhxLujikiuIfeDIXc3C8E3NBqaiK4sJt4whUygQwmDb9rjYuxuoncuaHSTcDB+x9WMBaisHCnHQ0VXNjmd00S64QPzg4VZxBPcTAf6HdZdzs0QoPJGpuZIWhdaN4lu0IlNMTUpe9wMYburLHa1GdyQsQbjLYX/sEcubNwYQYZGrjQdYnbIiNhmF6u3hAazquz9+5cwpxAZ06LEJ75+0XXe7WL4qt3HzghMi0CDBUFWHoozJFB1907jrVakYkLrw88j7oER06ZrGDfWNZ0P8f8buoZZR+q+WW07VhTIToDCb0By5utvDeQ+rJxew3XRGfPgdny0Qzlzauz78++ivBsgno4cXSa0t4LjZs7Wt3EWp/F8RhQ5d6UrbR5dfY8bCTH+iEOXBiady9WdhYS5o6HRrA9l/uJu8ZZmFGnaFeRXAazG67VTpzLL1TuYxOVHBBDUxUMQ15+AYPDmMgjypkXtrPDQ7n3pXOvdEorLBmn3NKh5DJVfir3Oj2edWQRrglFSj26JEE93rh4M+cqU95VekO75ysUHXT2Iyl8G3H5lmyaLaVH8hUJvibrktW8O8EE1u928fJt/JJTJuuoKa/xLo/mXx2Ne06ONt1tb14YP/uXBLCYm8p8259X767qVyqwB0NgI4ICvPpI68eDhbZgCO1KgcPQiceSQft1F7AuSBvoJho/b/slZ7AiSBvwjiqaN3MnSK5vD4cg42wrY2a2aXsdwDHP57mfmID8BoZ1rOz9quHbNu21BBjh/uK7JcBYI28CAU0Lcp4dmFIqciQByi5s8NfhILlOzgxCF1MGjr0CxPeYIu1xB6maUmB0yeXBerUNvOY8jkCLdOCB1gGScoYB0w2vHB5B4t2toGjJRYByXgfS6Rf4sEJQWLEK6O4Ef/4hNsoOsg1pIK0oWKdfAGo4BNQnV1uAEQR3RE+VZ35nsAsgHpyAei6OmnCCApsvh7ZGsER9W0sw4wSg8QT3XBwoQuUCSSNuHAK6jkFpdHr1fTuY3P2zi0DtRj6DSsKJWVgPOPDvnbblAfwOO7cxkSC7Us2gw6LCcn+xyAxSKoE5MAC9s89up2zjCnjoSWrvUA419+VV5fBLk3RYjcSj//xHn/Qc8Op0+CNB1SB50xUJtHSPrp7/313UD/Y0mHD9EqujTlaEEUe76rm8S1SQSKbdGAWapP7T0060sebKEfgD90k+8zCQYyv9xKplDYk9U/2/0TdEw/95GiBJXWv5HvKi/37Db9dAzmcM8JRNLIJuzWeXJyYWX374XEtPwz3+ZzRiy13oHEUlCfOoAMs1W4dWb2Afoz6Jdb9OV5r3xKGMw858wT/e/cwc4+Qf36BeGqIvBH5QXNvOMMX6/LM5Lem/nPx01BCwNupc3qPLeiLz3qKZjd8u3HrW/wu1J/5Gm84MbPORqxh4MqnG8mgMMOurpf7d2M/ans/f4n30Z33iLl5v8+mcwTkhFvf1MIBT96nyWndQhDeiCV4q8fqQzu8SVTAPtMXhP9+TSY9+UUI0Yb7gnSgLgovbDgrjyqkwrpwK48qpMK6cCuPKqTCunArjyqkwrpwK48qpMK6c+pnh/g/hAGPsi5IjggAAAABJRU5ErkJggg==";

// src/client/assets/genkaku-mark-w.png
var genkaku_mark_w_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK4AAACuCAMAAACY0sbcAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAmRQTFRFAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Pmgb1QAAAMx0Uk5TAAECBAk7EwMZFwi7/+NcXergkr/yY2mjvPPwIAZg/vX3X2309tMcBR7v+ihL+f2w0csSEIT4nweZI/tvTdwi7fzijNrMMYp9C04yFathCoJP7i7fH8aDYqaAM+te5Ri+5px5VN7oId135HY5Rn6pyjQMQHqnaq84ZuEdazZs23BzbnF0s3w/z7LnEbU1Uxa3UnvBN7nEG8DXVsjCV0fJsTxDuD66QUTQFNaVUem9jewkjkKQWqxZGpElfywnKimTnXWU8Q2g0s5Kw0VIKCYGEwAADD9JREFUeJztnAlUU1cax+97LxKNoPTBCGNT2mRaY3raeEDG2GOPx2rHggsudde6DI51w43ROhXLce1UK+qxY13GDfSAU+2CgGJtZ8alnShYzehksFPSQ6MDChTRRoNZ5r4XRHnrfSGPl87J/xwl4ZF7f+/Ld7/73fvuvRj4WQlTGkCawrhyKowrp8K4ciqMK6fCuHIqjCunwrhyKowrp8K4ciqMK6fCuHLq/xwXA5jPF6y6YeVeqdVLEu6lPhIcXrocTFpZ0nAJjwrDmqTWwS21C3TE7tEGQJckXMKjwaAaqaraKlhEV1jW3SbCI+FTUnAhbSdXx/ug0y31A4k+xxLewdXNCX92rpF07xJw4dcWfzfqTpfGKPy61iEZkFGt76kfSdjWan9hlwmX8Ohvxj2oB/HVv8SuSXM5lgwVPbEf4mpAQhV4+qoEd0DHNVS88L0Oq4Sv4mp+dRmXGoJaCfcSL/4npo4E9bG1z2EX0e8dGRf39q58oLNTL/XO6k632mReQ0Xyv402+mVM3fPn0d0BGdds6XsF2qOeeq2zPxX9dRuiA+HR3Yr10kUBUmvtdQ65LFRcjfPlS/pK/2uy3mhLPBN49FW7+mPl0Gv9Si4DLyLfOyIu4UnqesFkbXmfUNXnS0OFNMqWKn1gkKXZFfxl9T2FI/bsiLiUK7TYAwoa+qXPA4xmhGfwV9CkjxfWrxSxLDTclBOpZ4Dfb1uq6IJdD8i+hoohp8FDv2ouy3T7KlpZSLhmy1DnhVYGAcBkHVBEeKW7L/TSQZZWtBRv31MYhhJqUHAx3NP3CoyRrX4J379yLK0QndMvGK85yqoHgz7TOFFQEP4m5cTIU4BhXMokv6k7rXKjcjYrrbCLFzCMS0WHqJc+NlvEP46Aa7Z0HFr6WFRoFhldOaAIi5AWfVXuMafcrDunXCv1I4DQGSPgapzjStgGoQPm0MPSzAuBJhQxXYGSvqF+eD5CdBDH1TgnXS9nGxdQJhnxw2lJ7qtxTvkUcJals4/CcsXvXRQXGmTaUX+uwBSpLxtQBCREs7TCMZFHeMrSWsfuE3cHMVysR8Vv/5KgYrsCJWinTrdQWohf8MYmFJkcbFegBDuh8XtE3UEM12zpNLkgtpbnqtE2EduFFIEoaR3QFR7vG1spvnryvVyxexfBhWFy9sGEu9wGgV9hV/uAYh9iem229BiUF1/Ndxm6w9TtYmm0CC7hmVdcy2sQ+iuc/gGaeWHMy9jHf+cAxNZOaMoVaQnCuLDHXLAXjlH4FVubfrYcybxax7wD/K5AKb5adKApjEt4Fv2ZO/A8FBlnG56PMllAeBZ79/A2AlrwXlwP2oCLe1Oijj+WmXIJ3sysHPHsGia5mTuFaalB4Oz3hc0rhAurWPqhWBWwjrkbxOcKcO9bf2LnHQzpybKRBwXntIRwoXG1BSLGhe4QWTX/j2LzZtBbRBoBrdjajG9OCHmWsHWXfsgfeFpktKnmrhfxXsw3vlgoKjxUfPWcjUJjQAFczKdZuE2wKTeLmncQHmjiXmJWHnfv21oJVRlbnQJFCeCqXSu2inouLZN10VrhFuIb8YWoV9GKrV24TqAoflzMZ9ZcEAxiLTJZJxc7cF6bwG5vyGmutJGzqF87Lfzm5cc1VOhvolmEct/FazT3O/BcdXvwrBy0G6eK6lbJ37Xx4mI+7fA8jqScU3Bc/PTXAte7OVFpYVFvHHPwmpcX12zJ3oTSzvxKqHr9y3TsJM/Vgd9/gnrjVFHL3uFNJPlwca85Cdm4gBoNCF6WUBI07/lyvrjIh6tyr3lPrBNqXUtkRBMAEf43Tf7XTRH+NzejUV2BUnIZcZsvyePBJTzQuCRSW24WGd3Af1FKQdC8y7P4cjweXLNl3buIoSfoglZ6+20e7+XGxTDvu+sk+FtwRdZnLZeEq3KvL6hUDFdfuRJbxh17OXHhOGXjKn2DMr5Ae8OMbdxzDpy4aYXv51ZKigvBVXLZGG8upztw4mqcmTulhMpgC1pqVWbKCY4rXLhaR062D7nXlEFkdOWaxZwjFC5clXtLlvCAUm6ZrAmj13LNvnHg4h1cff6VXKlUQ6MEHXHdQq4ZHQ5crWNMzTfo2Y0sSqhav4Brgo8D12xRtqFRSqiKW5TBEcvYuDA+f7AcZVwlp6C1xu3lCGVsXLNl0t8alcaFCam63sfu2bisu3oDjCTtAsUvnb1jdga7sbFw4R11xtAGwHJKDyrfWsl+bsfC1TqGXFLeF6gh5nulhSxvYOLC7GblZmWDrl+xtR3WzWV5AxPXUGGevlR5X6DzhvF7RK2rdSTN+j3CxJj8MtrG7mPlDUxctSv9sPJxgVJ8dWKXYmboxZhvfSu2okwVyi8YGza9KWJdwoNtXxpT135Q/CIjq3qdY84bM3DVrqy8OoXTm4eKqctZ7WCkOQxc3LslKzR8gcLdPIv5zI6Fm3oGOk07QvHLaEusuSaIi3tB3E8hEcYA7bxbZjKWQLXGVbvw14+HRkujQ8PWdEZoYOKCXt+FCi6pteKNjNDAxE0buSBUnAF2FNtmMPo1pu/unx8afRqlmDo4YBPGPTCPb31E+yumbvtUEdy8OaESxyhc308iuOvXhxLujikiuIfeDIXc3C8E3NBqaiK4sJt4whUygQwmDb9rjYuxuoncuaHSTcDB+x9WMBaisHCnHQ0VXNjmd00S64QPzg4VZxBPcTAf6HdZdzs0QoPJGpuZIWhdaN4lu0IlNMTUpe9wMYburLHa1GdyQsQbjLYX/sEcubNwYQYZGrjQdYnbIiNhmF6u3hAazquz9+5cwpxAZ06LEJ75+0XXe7WL4qt3HzghMi0CDBUFWHoozJFB1907jrVakYkLrw88j7oER06ZrGDfWNZ0P8f8buoZZR+q+WW07VhTIToDCb0By5utvDeQ+rJxew3XRGfPgdny0Qzlzauz78++ivBsgno4cXSa0t4LjZs7Wt3EWp/F8RhQ5d6UrbR5dfY8bCTH+iEOXBiady9WdhYS5o6HRrA9l/uJu8ZZmFGnaFeRXAazG67VTpzLL1TuYxOVHBBDUxUMQ15+AYPDmMgjypkXtrPDQ7n3pXOvdEorLBmn3NKh5DJVfir3Oj2edWQRrglFSj26JEE93rh4M+cqU95VekO75ysUHXT2Iyl8G3H5lmyaLaVH8hUJvibrktW8O8EE1u928fJt/JJTJuuoKa/xLo/mXx2Ne06ONt1tb14YP/uXBLCYm8p8259X767qVyqwB0NgI4ICvPpI68eDhbZgCO1KgcPQiceSQft1F7AuSBvoJho/b/slZ7AiSBvwjiqaN3MnSK5vD4cg42wrY2a2aXsdwDHP57mfmID8BoZ1rOz9quHbNu21BBjh/uK7JcBYI28CAU0Lcp4dmFIqciQByi5s8NfhILlOzgxCF1MGjr0CxPeYIu1xB6maUmB0yeXBerUNvOY8jkCLdOCB1gGScoYB0w2vHB5B4t2toGjJRYByXgfS6Rf4sEJQWLEK6O4Ef/4hNsoOsg1pIK0oWKdfAGo4BNQnV1uAEQR3RE+VZ35nsAsgHpyAei6OmnCCApsvh7ZGsER9W0sw4wSg8QT3XBwoQuUCSSNuHAK6jkFpdHr1fTuY3P2zi0DtRj6DSsKJWVgPOPDvnbblAfwOO7cxkSC7Us2gw6LCcn+xyAxSKoE5MAC9s89up2zjCnjoSWrvUA419+VV5fBLk3RYjcSj//xHn/Qc8Op0+CNB1SB50xUJtHSPrp7/313UD/Y0mHD9EqujTlaEEUe76rm8S1SQSKbdGAWapP7T0060sebKEfgD90k+8zCQYyv9xKplDYk9U/2/0TdEw/95GiBJXWv5HvKi/37Db9dAzmcM8JRNLIJuzWeXJyYWX374XEtPwz3+ZzRiy13oHEUlCfOoAMs1W4dWb2Afoz6Jdb9OV5r3xKGMw858wT/e/cwc4+Qf36BeGqIvBH5QXNvOMMX6/LM5Lem/nPx01BCwNupc3qPLeiLz3qKZjd8u3HrW/wu1J/5Gm84MbPORqxh4MqnG8mgMMOurpf7d2M/ans/f4n30Z33iLl5v8+mcwTkhFvf1MIBT96nyWndQhDeiCV4q8fqQzu8SVTAPtMXhP9+TSY9+UUI0Yb7gnSgLgovbDgrjyqkwrpwK48qpMK6cCuPKqTCunArjyqkwrpwK48qpMK6c+pnh/g/hAGPsi5IjggAAAABJRU5ErkJggg==";

// src/client/index.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var PANEL_ID = "genkaku-user";
var TIP_AMOUNTS = [0.5, 1, 2];
var CANDIDATE_PORTS2 = [47821, 47822, 47823, 47824, 47825, 47826];
var originOf2 = (port) => `http://127.0.0.1:${port}`;
async function listening(port) {
  try {
    await fetch(`${originOf2(port)}/genkaku/status`, {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(1500)
    });
    return true;
  } catch {
    return false;
  }
}
var inject = ["slots", "locale"];
function Icon({ size = 16 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { display: "inline-flex", width: size, height: size }, "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: `
        .genkaku-mark-b { display: inline !important; }
        .genkaku-mark-w { display: none !important; }
        body[data-ds-dark-theme] .genkaku-mark-b { display: none !important; }
        body[data-ds-dark-theme] .genkaku-mark-w { display: inline !important; }
      ` }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "img",
      {
        src: genkaku_mark_b_default,
        alt: "",
        width: size,
        height: size,
        className: "genkaku-mark-b",
        style: { width: size, height: size }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "img",
      {
        src: genkaku_mark_w_default,
        alt: "",
        width: size,
        height: size,
        className: "genkaku-mark-w",
        style: { width: size, height: size }
      }
    )
  ] });
}
var row = { display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" };
var dim = { opacity: 0.6 };
var box = {
  border: "1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12))",
  borderRadius: 10,
  padding: 12,
  marginTop: 12
};
var caption = { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6, marginBottom: 6 };
function useScrollThumb() {
  const [node, setNode] = (0, import_react3.useState)(null);
  const nodeRef = (0, import_react3.useRef)(null);
  const [thumb, setThumb] = (0, import_react3.useState)(null);
  const attach = (0, import_react3.useCallback)((next) => {
    nodeRef.current = next;
    setNode(next);
  }, []);
  const update = (0, import_react3.useCallback)(() => {
    const el = nodeRef.current;
    if (el == null) return;
    const ratio = el.scrollHeight > el.clientHeight + 1 ? el.clientHeight / el.scrollHeight : 1;
    setThumb(ratio >= 1 ? null : { top: el.scrollTop / el.scrollHeight * 100, height: Math.max(ratio * 100, 8) });
  }, []);
  (0, import_react3.useEffect)(() => {
    if (node == null) return;
    update();
    node.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(node);
    const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(update);
    mo?.observe(node, { childList: true, subtree: true });
    return () => {
      node.removeEventListener("scroll", update);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [node, update]);
  const jump = (0, import_react3.useCallback)((event) => {
    const el = nodeRef.current;
    const rail = event.currentTarget;
    if (el == null || rail == null) return;
    const rect = rail.getBoundingClientRect();
    if (rect.height <= 0) return;
    el.scrollTop = Math.max(0, (event.clientY - rect.top) / rect.height) * el.scrollHeight;
  }, []);
  return { attach, thumb, update, jump };
}
var microOf = (usdc) => {
  const value = Number(usdc);
  if (!Number.isFinite(value) || value <= 0) return null;
  return BigInt(Math.round(value * 1e6));
};
var usdcOf = (micro) => {
  try {
    const value = Number(BigInt(micro ?? "0")) / 1e6;
    return value.toFixed(value < 0.01 ? 4 : 2);
  } catch {
    return "0";
  }
};
function Page() {
  useLocaleVersion();
  const [status, setStatus] = (0, import_react3.useState)(null);
  const [error, setError] = (0, import_react3.useState)(null);
  const [notice, setNotice] = (0, import_react3.useState)(null);
  const [busy, setBusy] = (0, import_react3.useState)(null);
  const [newWorker, setNewWorker] = (0, import_react3.useState)("");
  const [exported, setExported] = (0, import_react3.useState)(null);
  const [importText, setImportText] = (0, import_react3.useState)("");
  const [showImport, setShowImport] = (0, import_react3.useState)(false);
  const [search, setSearch] = (0, import_react3.useState)("");
  const [pairText, setPairText] = (0, import_react3.useState)("");
  const [ads, setAds] = (0, import_react3.useState)(null);
  const [adCategories, setAdCategories] = (0, import_react3.useState)([]);
  const [adForm, setAdForm] = (0, import_react3.useState)({
    category: "",
    sponsor: "",
    title: "",
    body: "",
    url: "",
    ctaLabel: "",
    keywords: "",
    imageUrl: "",
    imageAlt: "",
    priceUsdc: "0.005",
    budgetUsdc: "1"
  });
  const [adNotice, setAdNotice] = (0, import_react3.useState)(null);
  const [adBusy, setAdBusy] = (0, import_react3.useState)(null);
  const [walletPolicy, setWalletPolicy] = (0, import_react3.useState)(null);
  const [capPerTx, setCapPerTx] = (0, import_react3.useState)("");
  const [capDaily, setCapDaily] = (0, import_react3.useState)("");
  const originRef = (0, import_react3.useRef)(null);
  const haveStatus = (0, import_react3.useRef)(false);
  const models = useScrollThumb();
  const load = (0, import_react3.useCallback)(async () => {
    const known2 = originRef.current;
    const ports = known2 == null ? [...CANDIDATE_PORTS2] : [Number(new URL(known2).port), ...CANDIDATE_PORTS2.filter((port) => originOf2(port) !== known2)];
    for (const port of ports) {
      try {
        const res = await fetch(`${originOf2(port)}/genkaku/status`, {
          cache: "no-store",
          // A cold bridge (libp2p dialing the seed, first RPC reads) can take a
          // moment. Giving up at 2.5 s turned a slow status into "no bridge",
          // which sent people looking for a process that was running all along.
          signal: AbortSignal.timeout(6e3)
        });
        if (!res.ok) continue;
        const doc = await res.json();
        if (doc.role !== "user") continue;
        originRef.current = originOf2(port);
        remember(originOf2(port));
        haveStatus.current = true;
        setStatus(doc);
        setError(null);
        return;
      } catch {
      }
    }
    if (haveStatus.current) {
      setError(t("Reconnecting to the bridge\u2026"));
      return;
    }
    for (const port of CANDIDATE_PORTS2) {
      if (await listening(port)) {
        setError(t(
          "Something answers on 127.0.0.1:{value} but refused this window's origin (403). Update the plugin: dsh plugin add @genkaku/dsh-user-plugin@latest",
          { value: port }
        ));
        return;
      }
    }
    setError(t("No GenKaKu user bridge on 47821\u201347826."));
  }, []);
  (0, import_react3.useEffect)(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 5e3);
    return () => clearInterval(timer);
  }, [load]);
  const post = (0, import_react3.useCallback)(async (path, body) => {
    const origin = originRef.current;
    if (origin == null) throw new Error(t("Bridge not reached yet."));
    const res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const doc = await res.json().catch(() => null);
    if (!res.ok) throw new Error(doc?.error?.message ?? `HTTP ${res.status}`);
    return doc ?? {};
  }, []);
  const get = (0, import_react3.useCallback)(async (path) => {
    const origin = originRef.current;
    if (origin == null) throw new Error(t("Bridge not reached yet."));
    const res = await fetch(`${origin}${path}`, { cache: "no-store" });
    const doc = await res.json().catch(() => null);
    if (!res.ok) throw new Error(doc?.error?.message ?? `HTTP ${res.status}`);
    return doc ?? {};
  }, [t]);
  const loadWalletPolicy = (0, import_react3.useCallback)(async () => {
    try {
      const doc = await get("/genkaku/wallet/policy");
      const view = doc;
      setWalletPolicy(view);
      setCapPerTx((Number(view.perTxMicro ?? "0") / 1e6).toString());
      setCapDaily((Number(view.dailyMicro ?? "0") / 1e6).toString());
    } catch {
    }
  }, [get]);
  (0, import_react3.useEffect)(() => {
    void loadWalletPolicy();
    const timer = setInterval(() => {
      void loadWalletPolicy();
    }, 5e3);
    return () => clearInterval(timer);
  }, [loadWalletPolicy]);
  const saveWalletPolicy = (0, import_react3.useCallback)(async (patch) => {
    try {
      const doc = await post("/genkaku/wallet/policy", patch);
      setWalletPolicy(doc);
    } catch (error2) {
      setNotice(error2 instanceof Error ? error2.message : String(error2));
    }
  }, [post]);
  const decideApproval = (0, import_react3.useCallback)(async (id, approve) => {
    try {
      const doc = await post(approve ? "/genkaku/wallet/approve" : "/genkaku/wallet/deny", { id });
      setWalletPolicy(doc.policy);
    } catch (error2) {
      setNotice(error2 instanceof Error ? error2.message : String(error2));
    }
  }, [post]);
  const loadAds = (0, import_react3.useCallback)(async () => {
    try {
      const [mine, catalog] = await Promise.all([
        get("/genkaku/ads/mine"),
        get("/genkaku/ads/categories").catch(() => ({ categories: [] }))
      ]);
      setAds({
        testMode: mine.testMode === true,
        listings: Array.isArray(mine.listings) ? mine.listings : []
      });
      const categories = Array.isArray(catalog.categories) ? catalog.categories : [];
      setAdCategories(categories);
      setAdForm((form) => form.category === "" && categories.length > 0 ? { ...form, category: categories[0] } : form);
    } catch {
    }
  }, [get]);
  const createListing = (0, import_react3.useCallback)(async () => {
    setAdBusy("create");
    setAdNotice(null);
    try {
      const priceMicro = microOf(adForm.priceUsdc);
      if (priceMicro == null) throw new Error(t("Enter a price per impression."));
      if (priceMicro < 100n || priceMicro > 100000n) {
        throw new Error(t("Price must be between 0.0001 and 0.1 USDC per impression."));
      }
      const doc = await post("/genkaku/ads/listing", {
        category: adForm.category,
        sponsor: adForm.sponsor,
        title: adForm.title,
        body: adForm.body,
        url: adForm.url,
        ctaLabel: adForm.ctaLabel,
        keywords: adForm.keywords,
        imageUrl: adForm.imageUrl,
        imageAlt: adForm.imageAlt,
        priceMicro: priceMicro.toString()
      });
      const review = doc.review;
      if (review?.verdict === "ok") {
        setAdNotice(t("Submitted and reviewed. Fund it and it goes live; the operator can block it later."));
      } else {
        setAdNotice(t("Not accepted: {value}", {
          value: (review?.reasons ?? []).join(" \xB7 ") || review?.verdict || "review failed"
        }));
      }
      setAdForm((form) => ({ ...form, title: "", body: "", url: "", ctaLabel: "", imageUrl: "", imageAlt: "", keywords: "" }));
      await loadAds();
    } catch (error2) {
      setAdNotice(error2 instanceof Error ? error2.message : String(error2));
    } finally {
      setAdBusy(null);
    }
  }, [adForm, loadAds, post, t]);
  const pauseListing = (0, import_react3.useCallback)(async (listing) => {
    if (listing.campaign == null) return;
    setAdBusy(`pause:${listing.id}`);
    setAdNotice(null);
    try {
      await post("/genkaku/ads/pause", {
        id: listing.id,
        campaign: listing.campaign,
        paused: listing.paused !== true
      });
      setAdNotice(listing.paused === true ? t("Resumed. The ad is serving again.") : t("Paused. No new impressions; unspent budget can be withdrawn after a day."));
      await loadAds();
    } catch (error2) {
      setAdNotice(error2 instanceof Error ? error2.message : String(error2));
    } finally {
      setAdBusy(null);
    }
  }, [loadAds, post, t]);
  const withdrawListing = (0, import_react3.useCallback)(async (listing) => {
    if (listing.campaign == null) return;
    setAdBusy(`withdraw:${listing.id}`);
    setAdNotice(null);
    try {
      const done = await post("/genkaku/ads/withdraw", { campaign: listing.campaign });
      const amount = typeof done.amount === "string" ? usdcOf(done.amount) : "0";
      setAdNotice(t("Withdrew {value} USDC back to the wallet.", { value: amount }));
      await loadAds();
    } catch (error2) {
      setAdNotice(error2 instanceof Error ? error2.message : String(error2));
    } finally {
      setAdBusy(null);
    }
  }, [loadAds, post, t]);
  const fundListing = (0, import_react3.useCallback)(async (listing) => {
    setAdBusy(`fund:${listing.id}`);
    setAdNotice(null);
    try {
      const price2 = BigInt(listing.priceMicro);
      const budget = microOf(adForm.budgetUsdc);
      if (budget == null) throw new Error(t("Enter a budget."));
      if (budget < price2) throw new Error(t("The budget must cover at least one impression."));
      const { index } = await get("/genkaku/ads/index");
      const funded = await post("/genkaku/ads/fund", {
        index,
        priceMicro: price2.toString(),
        budgetMicro: budget.toString(),
        // 0.05 USDC, as agreed for 0.4. The advertiser cannot change it from
        // here; the operator can raise it on chain if they want.
        minClaimMicro: "50000"
      });
      const campaign = typeof funded.campaign === "string" ? funded.campaign : "";
      if (campaign === "") throw new Error(t("The campaign address was not returned."));
      await post("/genkaku/ads/attach", { id: listing.id, campaign });
      setAdNotice(t("Funded. The ad starts as soon as the operator-approved listing picks it up."));
      await loadAds();
    } catch (error2) {
      setAdNotice(error2 instanceof Error ? error2.message : String(error2));
    } finally {
      setAdBusy(null);
    }
  }, [adForm.budgetUsdc, get, loadAds, post, t]);
  (0, import_react3.useEffect)(() => {
    if (status != null) void loadAds();
  }, [status?.wallet, loadAds]);
  const saveWorkers = (0, import_react3.useCallback)(async (next) => {
    setBusy("workers");
    setNotice(null);
    try {
      await post("/genkaku/settings", { workers: next });
      setNotice(t("Saved. The bridge is restarting with the new worker list."));
      setTimeout(() => {
        void load();
      }, 2500);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  const sendTipTo = (0, import_react3.useCallback)(async (worker, usdc2) => {
    setBusy(`tip:${worker}`);
    setNotice(null);
    try {
      const doc = await post("/genkaku/tip", { worker, micro: String(Math.round(usdc2 * 1e6)) });
      const signature = typeof doc.signature === "string" ? doc.signature : "";
      setNotice(t(
        `Tipped ${usdc2} USDC. ${signature === "" ? "" : `Transaction ${signature}`}`,
        `\u5DF2\u6253\u8CDE ${usdc2} USDC\u3002${signature === "" ? "" : `\u4EA4\u6613 ${signature}`}`
      ));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [post, t]);
  const exportKey = (0, import_react3.useCallback)(async () => {
    setBusy("export");
    setNotice(null);
    try {
      const doc = await post("/genkaku/wallet/export", { confirm: true });
      setExported(typeof doc.privateKey === "string" ? doc.privateKey : null);
      setNotice(t("Never share this key. Anyone who has it owns the wallet and its funds."));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [post]);
  const importKey = (0, import_react3.useCallback)(async () => {
    if (!window.confirm(t("Importing a key replaces this profile's user wallet. The current address keeps its funds and is no longer used. Continue?"))) return;
    setBusy("import");
    setNotice(null);
    try {
      await post("/genkaku/wallet/import", { privateKey: importText.trim() });
      setImportText("");
      setShowImport(false);
      setNotice(t("Wallet imported. The bridge is restarting."));
      setTimeout(() => {
        void load();
      }, 3e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [importText, load, post]);
  const rotateKey = (0, import_react3.useCallback)(async () => {
    if (!window.confirm(t("Generate a fresh wallet? The old address keeps its SOL and USDC; this profile stops using it."))) return;
    setBusy("rotate");
    setNotice(null);
    try {
      await post("/genkaku/wallet/new", {});
      setExported(null);
      setNotice(t("New wallet generated. The bridge is restarting."));
      setTimeout(() => {
        void load();
      }, 3e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  const refreshNetwork = (0, import_react3.useCallback)(async () => {
    setBusy("refresh");
    setNotice(null);
    try {
      await post("/genkaku/settings", { refresh: true });
      setNotice(t("Re-scanning the chain directory and the seed. The bridge restarts when the scan finishes."));
      setTimeout(() => {
        void load();
      }, 4e3);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  const savePrefs = (0, import_react3.useCallback)(async (patch) => {
    setBusy("prefs");
    setNotice(null);
    try {
      await post("/genkaku/settings", patch);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  const toggleModel = (0, import_react3.useCallback)((key) => {
    if (status == null) return;
    const current = status.selected ?? [];
    const max = status.maxSelected ?? 10;
    if (current.includes(key)) {
      void savePrefs({ selected: current.filter((item) => item !== key) });
      return;
    }
    if (current.length >= max) {
      setNotice(t("At most {value} models can be selected. Untick one first.", { value: max }));
      return;
    }
    void savePrefs({ selected: [...current, key] });
  }, [savePrefs, status]);
  const pairWorker = (0, import_react3.useCallback)(async () => {
    const token = pairText.trim();
    if (token === "") return;
    setBusy("pair");
    setNotice(null);
    try {
      await post("/genkaku/pair", { token });
      setPairText("");
      setNotice(t("Paired. The worker\u2019s models appear below when it is online."));
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, pairText, post]);
  const unpairWorker = (0, import_react3.useCallback)(async (wallet) => {
    if (!window.confirm(t("Forget this paired worker? You can pair it again with a fresh code."))) return;
    setBusy(`unpair:${wallet}`);
    setNotice(null);
    try {
      await post("/genkaku/unpair", { wallet });
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [load, post]);
  if (error != null && status == null) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { padding: 16 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { style: { margin: 0 }, children: t("GenKaKu network") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: { ...dim, marginTop: 8 }, children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: { ...dim, fontSize: 12 }, children: t("The plugin opens its bridge on the first free port in 47821\u201347826.") })
    ] });
  }
  if (status == null) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { padding: 16, ...dim }, children: t("Loading status\u2026") });
  const offers = status.offers ?? [];
  const price = (micro) => {
    const n = Number(micro);
    if (!Number.isFinite(n)) return "\u2014";
    return n === 0 ? "free" : `${(n / 1e6).toFixed(2)} USDC`;
  };
  const sol = (lamports) => {
    const n = Number(lamports);
    return Number.isFinite(n) ? `${(n / 1e9).toFixed(4)} SOL` : "\u2014";
  };
  const usdc = (micro) => {
    const n = Number(micro);
    return Number.isFinite(n) ? `${(n / 1e6).toFixed(2)} USDC` : "\u2014";
  };
  const noGas = (() => {
    try {
      return BigInt(status.balances?.sol ?? "0") === 0n;
    } catch {
      return true;
    }
  })();
  const short = (addr) => addr == null || addr.length < 12 ? addr ?? "\u2014" : `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
  const wallets = new Set(offers.map((o) => o.offer?.workerWallet).filter((w) => typeof w === "string" && w !== ""));
  const workerCount = wallets.size > 0 ? wallets.size : (status.workers ?? []).length;
  const maxSelected = status.maxSelected ?? 10;
  const selected = status.selected ?? [];
  const selectedSet = new Set(selected);
  const query = search.trim().toLowerCase();
  const visible = query === "" ? offers : offers.filter((entry) => {
    const offer = entry.offer ?? {};
    return `${entry.workerLabel ?? offer.workerName ?? ""} ${offer.model ?? ""} ${offer.workerWallet ?? ""}`.toLowerCase().includes(query);
  });
  const stale = selected.filter((key) => !offers.some((entry) => entry.key === key)).length;
  const privatePeers = status.privatePeers ?? [];
  const tipWorkers = (() => {
    const byWallet = /* @__PURE__ */ new Map();
    for (const entry of offers) {
      const wallet = entry.offer?.workerWallet;
      if (wallet == null || wallet === "") continue;
      const row2 = byWallet.get(wallet) ?? {
        wallet,
        name: entry.workerLabel ?? entry.offer?.workerName ?? short(wallet),
        models: []
      };
      const model = entry.offer?.model;
      if (model != null && model !== "" && !row2.models.includes(model)) row2.models.push(model);
      byWallet.set(wallet, row2);
    }
    return [...byWallet.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8);
  })();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: {
    // Same reason as the worker panel: the host column clips, so the panel
    // has to own the scroll or its last cards cannot be reached.
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    flex: "1 1 auto",
    minHeight: 0,
    height: "100%",
    overflowY: "auto",
    overscrollBehavior: "contain",
    padding: 16,
    paddingBottom: 32,
    maxWidth: 760
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: `
        .gk-net-wrap { position: relative; padding-right: 12px; }
        .gk-net-models { max-height: min(320px, 38vh); overflow-y: auto; scrollbar-width: none; }
        .gk-net-models::-webkit-scrollbar { display: none; }
        .gk-net-rail { position: absolute; top: 2px; bottom: 2px; right: 2px; width: 8px; border-radius: 4px; background: rgba(127,137,153,.16); cursor: pointer; }
        .gk-net-thumb { position: absolute; left: 0; width: 8px; min-height: 16px; border-radius: 4px; background: rgba(127,137,153,.7); }
        .gk-net-rail:hover .gk-net-thumb { background: rgba(127,137,153,.9); }
        .gk-net-row { display: grid; grid-template-columns: 20px minmax(0, 1fr) 92px 116px; gap: 10px; align-items: center; padding: 7px 0; border-top: 0.5px solid rgba(127,137,153,.18); }
        .gk-net-row:first-child { border-top: none; }
        .gk-select { background: transparent; color: inherit; border: 1px solid rgba(127,137,153,.35); border-radius: 6px; padding: 4px 6px; font: inherit; font-size: 12px; }
      ` }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { style: { margin: 0 }, children: t("GenKaKu network") }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...dim, marginTop: 4 }, children: [
      "user \xB7 ",
      status.env ?? "solana-devnet"
    ] }),
    error != null && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...box, fontSize: 13 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { ...dim }, children: t("Reconnecting\u2026") }),
      " (",
      error,
      ")"
    ] }),
    notice != null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...box, fontSize: 13 }, children: notice }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: box, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: dim, children: t("Wallet") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { title: status.wallet, children: short(status.wallet) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: () => {
                if (status.wallet != null && navigator.clipboard != null) {
                  void navigator.clipboard.writeText(status.wallet);
                  setNotice(t("Wallet address copied."));
                }
              },
              children: t("copy")
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: dim, children: t("Balance") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
          sol(status.balances?.sol),
          " \xB7 ",
          usdc(status.balances?.usdc)
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: dim, children: t("Sessions") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("free \xB7 tips optional") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: dim, children: t("Workers discovered") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: workerCount })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: dim, children: t("Models offered") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: offers.length })
      ] }),
      noGas && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...dim, fontSize: 12, marginTop: 8 }, children: [
        t("This wallet has no SOL yet on this cluster. A session needs a little SOL for rent and fees; USDC is what it pays for compute."),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { href: "https://faucet.solana.com", target: "_blank", rel: "noreferrer", children: t("Open faucet (devnet)") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy !== null, onClick: () => {
          void exportKey();
        }, children: busy === "export" ? t("Revealing\u2026") : t("Export key") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy !== null, onClick: () => setShowImport((v) => !v), children: t("Import key") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy !== null, onClick: () => {
          void rotateKey();
        }, children: t("New wallet") })
      ] }),
      walletPolicy != null && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { marginTop: 14, borderTop: "1px solid rgba(127,137,153,.18)", paddingTop: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: caption, children: t("Agent access") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: row, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: dim, children: t("Agent wallet mode") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "select",
            {
              className: "gk-select",
              value: walletPolicy.mode,
              "aria-label": t("Agent wallet mode"),
              onChange: (e) => {
                void saveWalletPolicy({ mode: e.target.value });
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "off", children: t("Off") }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "ask", children: t("Ask owner") }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "capped", children: t("Capped") })
              ]
            }
          )
        ] }),
        walletPolicy.mode === "capped" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginTop: 6, alignItems: "end" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12 }, children: [
            t("Per request (USDC)"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: capPerTx, onChange: (e) => setCapPerTx(e.target.value) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12 }, children: [
            t("Per day (USDC)"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: capDaily, onChange: (e) => setCapDaily(e.target.value) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              variant: "outline",
              size: "sm",
              onClick: () => {
                const per = microOf(capPerTx);
                const day = microOf(capDaily);
                if (per == null || day == null) {
                  setNotice(t("Enter both limits in USDC."));
                  return;
                }
                void saveWalletPolicy({ perTxMicro: per.toString(), dailyMicro: day.toString() });
              },
              children: t("Save limits")
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...row, marginTop: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, ...dim }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                type: "checkbox",
                checked: walletPolicy.frozen,
                onChange: (e) => {
                  void saveWalletPolicy({ frozen: e.target.checked });
                }
              }
            ),
            t("Freeze wallet")
          ] }),
          walletPolicy.frozen && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { fontSize: 11, color: "#ff8b9a" }, children: t("Frozen: owner actions still work; agent requests are refused.") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...dim, fontSize: 11, marginTop: 6 }, children: [
          t("Key and identity operations are always owner-only."),
          " ",
          t("Caps apply to tips and campaign funding; claims are not a spend.")
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...caption, marginTop: 10 }, children: t("Pending approvals") }),
        walletPolicy.pending.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12 }, children: t("No pending requests.") }) : walletPolicy.pending.map((request) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...row, alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { minWidth: 0, fontSize: 12 }, children: [
            request.summary,
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { ...dim, fontSize: 11 }, children: [
              " \xB7 ",
              new Date(request.expiresAt).toLocaleTimeString()
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { display: "inline-flex", gap: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", size: "sm", onClick: () => {
              void decideApproval(request.id, true);
            }, children: t("Approve") }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", onClick: () => {
              void decideApproval(request.id, false);
            }, children: t("Deny") })
          ] })
        ] }, request.id))
      ] }),
      exported != null && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { marginTop: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 4 }, children: t("Private key \u2014 keep it offline. Testnet only.") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { readOnly: true, value: exported, onFocus: (e) => e.currentTarget.select(), "aria-label": t("Private key") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: () => {
                if (navigator.clipboard != null) {
                  void navigator.clipboard.writeText(exported);
                  setNotice(t("Private key copied."));
                }
              },
              children: t("copy")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", onClick: () => setExported(null), children: t("hide") })
        ] })
      ] }),
      showImport && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { marginTop: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 4 }, children: t("Paste a base58 wallet key (the format Phantom and solana-keygen show)") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            import_dsh_client_ui_primitives.Input,
            {
              value: importText,
              placeholder: "base58",
              onChange: (e) => setImportText(e.target.value),
              "aria-label": t("Private key to import")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            import_dsh_client_ui_primitives.Button,
            {
              variant: "primary",
              size: "sm",
              disabled: busy !== null || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(importText.trim()),
              onClick: () => {
                void importKey();
              },
              children: busy === "import" ? t("Importing\u2026") : t("Import")
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: box, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: caption, children: t("Tips") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 8 }, children: t("Using GenKaKu costs nothing. If a worker was useful \u2014 especially a free one, which earns no advertising revenue \u2014 you can send it USDC directly. The transfer goes from your wallet to its wallet; GenKaKu is not involved and takes no cut.") }),
      tipWorkers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12 }, children: t("No worker with a wallet on the board yet.") }) : tipWorkers.map((worker) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...row, gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
          worker.name,
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { ...dim, fontSize: 11 }, children: [
            " \xB7 ",
            worker.models.join(", ")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { display: "inline-flex", gap: 6 }, children: TIP_AMOUNTS.map((amount) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            variant: "outline",
            size: "sm",
            disabled: busy !== null,
            onClick: () => {
              void sendTipTo(worker.wallet, amount);
            },
            children: busy === `tip:${worker.wallet}` ? "\u2026" : `${amount} USDC`
          },
          amount
        )) })
      ] }, worker.wallet)),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 11, marginTop: 8 }, children: t("Each tip needs a little SOL in the wallet above for the network fee.") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: box, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: caption, children: t("Settings") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: dim, children: t("Language") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "select",
          {
            className: "gk-select",
            value: localeChoice(),
            "aria-label": t("Language"),
            onChange: (e) => setLocaleChoice(e.target.value),
            children: localeOptions().map((option) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: option.id, children: option.label }, option.id))
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...caption, marginTop: 16 }, children: t("Manual workers") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 6 }, children: t("Optional multiaddrs pinned to this profile. Discovery through the on-chain directory and the seed still runs.") }),
      (status.manualWorkers ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12 }, children: t("None pinned \u2014 using discovery only.") }) : (status.manualWorkers ?? []).map((addr) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...row, gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { style: { fontSize: 12, wordBreak: "break-all" }, children: addr }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            variant: "ghost",
            size: "sm",
            disabled: busy === "workers",
            onClick: () => {
              void saveWorkers((status.manualWorkers ?? []).filter((w) => w !== addr));
            },
            children: t("remove")
          }
        )
      ] }, addr)),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", gap: 8, marginTop: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_dsh_client_ui_primitives.Input,
          {
            value: newWorker,
            placeholder: "/ip4/1.2.3.4/tcp/4001/p2p/12D3Koo\u2026",
            "aria-label": t("Worker multiaddr"),
            onChange: (e) => setNewWorker(e.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            variant: "outline",
            size: "sm",
            disabled: busy === "workers" || !newWorker.trim().startsWith("/"),
            onClick: () => {
              const addr = newWorker.trim();
              if (!addr.startsWith("/")) return;
              void saveWorkers([...status.manualWorkers ?? [], addr]).then(() => setNewWorker(""));
            },
            children: t("Add")
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...row, marginTop: 14 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", disabled: busy === "refresh", onClick: () => {
          void refreshNetwork();
        }, children: busy === "refresh" ? t("Refreshing\u2026") : t("Refresh network") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { ...dim, fontSize: 12 }, children: t("Re-reads the directory and the seed now.") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: box, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }, children: t("Models on the network") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { ...dim, fontSize: 12 }, children: [
          selected.length,
          "/",
          maxSelected,
          " ",
          t("selected")
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", gap: 8, margin: "8px 0" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_dsh_client_ui_primitives.Input,
          {
            value: search,
            placeholder: t("Search a model, worker name or wallet"),
            "aria-label": t("Search models"),
            onChange: (e) => setSearch(e.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "select",
          {
            className: "gk-select",
            value: status.sort ?? "recommended",
            "aria-label": t("Sort models"),
            disabled: busy === "prefs",
            onChange: (e) => {
              void savePrefs({ sort: e.target.value });
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "recommended", children: t("Recommended") }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "pricePerHour", children: t("Lowest price") }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "latencyMs", children: t("Lowest latency") }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "sessionsServed", children: t("Most sessions served") }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "model", children: t("Model name") }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "workerName", children: t("Worker name") })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 6 }, children: t("Only ticked models appear in the chat model picker, up to ten. Ticking is per worker and model, so the same model from two workers is two choices.") }),
      stale > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 6 }, children: t("{value} ticked model(s) are not on the network right now. They come back when their worker does.", { value: stale }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "gk-net-wrap", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "gk-net-models", ref: models.attach, onScroll: models.update, children: visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: { ...dim, marginBottom: 0 }, children: offers.length === 0 ? t("Nothing offered yet. A worker lists its local Ollama models on start.") : t("No row matches that search.") }) : visible.map((entry, i) => {
          const offer = entry.offer ?? {};
          const key = entry.key ?? `${entry.addr ?? ""}|${offer.model ?? i}`;
          const transport = entry.addr == null ? null : status.transports?.[entry.addr];
          const workerLabel = entry.workerLabel ?? offer.workerName ?? "\u2014";
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "gk-net-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                type: "checkbox",
                checked: selectedSet.has(key),
                "aria-label": `${workerLabel} \xB7 ${offer.model ?? ""}`,
                disabled: busy === "prefs",
                onChange: () => {
                  toggleModel(key);
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
              offer.model ?? "model name missing",
              offer.tier === "chat" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { ...dim, fontSize: 11, marginLeft: 8 }, children: "not for agents" }) : offer.tier != null ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { ...dim, fontSize: 11, marginLeft: 8 }, children: offer.tier }) : null,
              entry.visibility === "private" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { ...dim, fontSize: 11, marginLeft: 8 }, children: [
                "\xB7 ",
                t("private")
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { ...dim, textAlign: "right", fontSize: 12 }, children: workerLabel }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { textAlign: "right", fontSize: 12 }, children: [
              price(offer.pricePerHour),
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: dim, children: transport === "relay" ? "\xB7 via seed VM" : transport === "direct" ? "\xB7 direct" : "" })
            ] })
          ] }, key);
        }) }),
        models.thumb != null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "gk-net-rail", "aria-hidden": "true", onPointerDown: (e) => models.jump(e), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "gk-net-thumb", style: { top: `${models.thumb.top}%`, height: `${models.thumb.height}%` } }) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: box, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }, children: t("Private workers") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, margin: "6px 0 8px" }, children: t("A private worker is not on the directory. Paste the one-time code it gave you: the pairing is bound to this wallet, and the code cannot be used again.") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_dsh_client_ui_primitives.Input,
          {
            value: pairText,
            placeholder: "genkaku1.\u2026",
            "aria-label": t("Pairing code"),
            onChange: (e) => setPairText(e.target.value)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            variant: "primary",
            size: "sm",
            disabled: busy === "pair" || pairText.trim() === "",
            onClick: () => {
              void pairWorker();
            },
            children: busy === "pair" ? t("Pairing\u2026") : t("Pair")
          }
        )
      ] }),
      privatePeers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { marginTop: 10 }, children: privatePeers.map((peer) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...row, alignItems: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { display: "inline-flex", alignItems: "center", minWidth: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: {
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 8,
            marginRight: 8,
            background: peer.online === true ? "#34a853" : peer.online === false ? "rgba(127,137,153,.6)" : "transparent",
            border: peer.online === null ? "1px dashed rgba(127,137,153,.6)" : "none"
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
            peer.label ?? short(peer.wallet),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { ...dim, fontSize: 12 }, children: [
              " \xB7 ",
              peer.online === true ? t("online") : peer.online === false ? t("offline") : t("checking\u2026")
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_dsh_client_ui_primitives.Button,
          {
            variant: "ghost",
            size: "sm",
            disabled: busy === `unpair:${peer.wallet}`,
            onClick: () => {
              void unpairWorker(peer.wallet);
            },
            children: t("forget")
          }
        )
      ] }, peer.wallet)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: box, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...caption, display: "flex", justifyContent: "space-between", alignItems: "baseline" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("Advertise on GenKaKu") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", disabled: adBusy !== null, onClick: () => {
          void loadAds();
        }, children: t("refresh") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 12, marginBottom: 8 }, children: t("You pay per impression: one impression is one sponsored minute of a worker\u2019s time. The budget is USDC from the wallet above, sent to a campaign account on Solana that only the program can pay out of. When the budget is gone the ad stops.") }),
      ads?.testMode === true && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 12, color: "#e8b04b", marginBottom: 8 }, children: t("Test mode: a zero budget still serves, and impressions are not billed.") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
          t("Category"),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "select",
            {
              className: "gk-select",
              value: adForm.category,
              onChange: (e) => setAdForm({ ...adForm, category: e.target.value }),
              children: adCategories.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "", children: "\u2014" }) : adCategories.map((c) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: c, children: c }, c))
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
          t("Sponsor name"),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.sponsor, onChange: (e) => setAdForm({ ...adForm, sponsor: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
          t("Price per impression (USDC)"),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.priceUsdc, onChange: (e) => setAdForm({ ...adForm, priceUsdc: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
          t("Budget (USDC)"),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.budgetUsdc, onChange: (e) => setAdForm({ ...adForm, budgetUsdc: e.target.value }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "grid", gap: 6, marginTop: 6 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
          t("Title"),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.title, onChange: (e) => setAdForm({ ...adForm, title: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
          t("Body"),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.body, onChange: (e) => setAdForm({ ...adForm, body: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
            t("Destination URL"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.url, placeholder: "https://", onChange: (e) => setAdForm({ ...adForm, url: e.target.value }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
            t("Button label"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.ctaLabel, placeholder: t("Learn more"), onChange: (e) => setAdForm({ ...adForm, ctaLabel: e.target.value }) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
            t("Image URL"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.imageUrl, placeholder: "https://", onChange: (e) => setAdForm({ ...adForm, imageUrl: e.target.value }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
            t("Image alt"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.imageAlt, onChange: (e) => setAdForm({ ...adForm, imageAlt: e.target.value }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { style: { display: "grid", gap: 4, fontSize: 12, alignContent: "start" }, children: [
            t("Keywords"),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.Input, { value: adForm.keywords, placeholder: "typescript, refactor", onChange: (e) => setAdForm({ ...adForm, keywords: e.target.value }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...row, justifyContent: "flex-end", marginTop: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_dsh_client_ui_primitives.Button,
        {
          variant: "primary",
          size: "sm",
          disabled: adBusy !== null || adForm.category === "" || adForm.title.trim() === "" || adForm.keywords.trim() === "",
          onClick: () => {
            void createListing();
          },
          children: adBusy === "create" ? t("Submitting\u2026") : t("Submit for review")
        }
      ) }),
      adNotice != null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: 12, marginTop: 8, whiteSpace: "pre-wrap" }, children: adNotice }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { marginTop: 14, fontSize: 12 }, children: (ads?.listings ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: dim, children: t("No listings yet.") }) : (ads?.listings ?? []).map((listing) => {
        const rejected = listing.review == null || listing.review.verdict !== "ok";
        const blocked = listing.blocked === true;
        const unfunded = !rejected && !blocked && listing.campaign == null;
        const spent = !rejected && !blocked && listing.campaign != null && listing.spent === true;
        const label = blocked ? t("Blocked by the operator") : rejected ? t("Not accepted") : unfunded ? t("Reviewed \u2014 fund it to go live") : spent ? t("Budget spent \u2014 ad stopped") : t("Live");
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...row, alignItems: "center", borderTop: "1px solid rgba(127,137,153,.18)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { minWidth: 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: listing.title }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { ...dim, fontSize: 11 }, children: [
              listing.paused === true ? `\u23F8 ${t("paused")} \xB7 ` : "",
              usdcOf(listing.priceMicro),
              " USDC / ",
              t("impression"),
              " \xB7 ",
              listing.campaign == null ? t("not funded") : `${t("left")} ${usdcOf(listing.remainingMicro)} USDC`,
              listing.impressions > 0 ? ` \xB7 ${listing.impressions} ${t("shown")}` : "",
              listing.clicks > 0 ? ` \xB7 ${listing.clicks} ${t("clicks")}` : ""
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { display: "block", fontSize: 11, color: spent || rejected || blocked ? "#ff8b9a" : void 0, opacity: spent || rejected || blocked ? 1 : 0.7 }, children: [
              label,
              rejected && listing.review?.reasons != null && listing.review.reasons.length > 0 ? ` \u2014 ${listing.review.reasons.join(" \xB7 ")}` : ""
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { display: "inline-flex", gap: 6, flex: "0 0 auto" }, children: [
            unfunded && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_dsh_client_ui_primitives.Button,
              {
                variant: "outline",
                size: "sm",
                disabled: adBusy !== null,
                onClick: () => {
                  void fundListing(listing);
                },
                children: adBusy === `fund:${listing.id}` ? t("Funding\u2026") : t("Fund and publish")
              }
            ),
            listing.campaign != null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_dsh_client_ui_primitives.Button,
              {
                variant: "ghost",
                size: "sm",
                disabled: adBusy !== null || listing.blocked === true,
                onClick: () => {
                  void pauseListing(listing);
                },
                children: adBusy === `pause:${listing.id}` ? "\u2026" : listing.paused === true ? t("Resume") : t("Pause")
              }
            ),
            listing.campaign != null && listing.paused === true && Number(listing.withdrawableMicro ?? "0") > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_dsh_client_ui_primitives.Button,
              {
                variant: "outline",
                size: "sm",
                disabled: adBusy !== null,
                onClick: () => {
                  void withdrawListing(listing);
                },
                children: adBusy === `withdraw:${listing.id}` ? "\u2026" : t("Withdraw unused")
              }
            )
          ] })
        ] }, listing.id);
      }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...dim, fontSize: 11, marginTop: 8 }, children: t("Funding needs a little SOL in the wallet above for the Solana fee. The campaign address belongs to your wallet; the ads service can only read its balance. Unspent budget can be withdrawn after the ad is paused for a day.") })
    ] })
  ] });
}
function apply(ctx) {
  try {
    installLocale(ctx);
  } catch (error) {
    console.error("genkaku i18n:", error);
  }
  ctx.effect(() => ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: PANEL_ID
  }, Page)), "genkaku-user: panel page");
  ctx.effect(() => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: PANEL_ID,
    order: 41,
    label: () => "GenKaKu User"
  }, Icon)), "genkaku-user: panel entry");
  ctx.effect(() => ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
    name: "conversation.chat.turnTail",
    id: "genkaku-sponsored",
    order: 20
  }, AdDock)), "genkaku-user: sponsored card");
}

		return module.exports;
	}
});
