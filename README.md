# 加密货币交易所价格监控系统

实时监听主流加密货币交易所价格差异的系统，以币安为基准显示其他交易所的价格差异。

## 功能特点

- ✅ 实时监控前50种主流加密货币
- ✅ 支持多个主流交易所（币安、OKX、火币、Gate.io、KuCoin）
- ✅ 以币安价格为基准，显示其他交易所价格差异
- ✅ 用颜色区分价格差异（红色=更高，绿色=更低）
- ✅ 每秒自动更新数据
- ✅ 支持搜索和排序功能
- ✅ 响应式设计，支持移动端

## 技术栈

- **后端**: Node.js + Express + WebSocket
- **前端**: HTML + CSS + JavaScript
- **数据源**: 各交易所公开API

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
```

### 3. 访问应用

打开浏览器访问: http://localhost:3000

## 项目结构

```
btc3/
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── README.md          # 说明文档
└── public/
    └── index.html     # 前端页面
```

## 价格差异说明

- **红色 (+)**: 该交易所价格高于币安
- **绿色 (-)**: 该交易所价格低于币安
- **显示格式**: `+$0.1234 (+0.56%)`

## 支持的交易所

1. **币安 (Binance)** - 基准价格
2. **OKX** - 黑色
3. **火币 (Huobi)** - 蓝色
4. **Gate.io** - 青色
5. **KuCoin** - 绿色

## 监控币种

系统监控前50种主流加密货币，包括:
BTC, ETH, BNB, XRP, ADA, DOGE, SOL, DOT, MATIC, LTC, SHIB, TRX, AVAX, LINK, ATOM, UNI, ETC, XLM, BCH, FIL, LDO, APT, ARB, OP, NEAR, ICP, VET, HBAR, QNT, AAVE, GRT, ALGO, FTM, SAND, MANA, AXS, EGLD, XTZ, THETA, EOS, FLOW, CHZ, SNX, MKR, RUNE, CRV, KAVA, COMP, YFI, ZEC

## 注意事项

- 各交易所API可能有访问频率限制
- 部分币种在某些交易所可能不存在交易对
- 网络延迟可能影响数据更新速度
- 价格数据仅供参考，不构成投资建议

## 开发说明

如需添加新的交易所，在 `server.js` 的 `EXCHANGES` 对象中添加相应配置即可。

## 许可证

MIT