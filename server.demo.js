const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = 3000;

// 静态文件服务
app.use(express.static('public'));

// HTTP服务器
const server = app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

// WebSocket服务器
const wss = new WebSocket.Server({ server });

// 主流币种列表（按市值前50）
const SYMBOLS = [
    'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'MATIC', 'LTC',
    'SHIB', 'TRX', 'AVAX', 'LINK', 'ATOM', 'UNI', 'ETC', 'XLM', 'BCH', 'FIL',
    'LDO', 'APT', 'ARB', 'OP', 'NEAR', 'ICP', 'VET', 'HBAR', 'QNT', 'AAVE',
    'GRT', 'ALGO', 'FTM', 'SAND', 'MANA', 'AXS', 'EGLD', 'XTZ', 'THETA', 'EOS',
    'FLOW', 'CHZ', 'SNX', 'MKR', 'RUNE', 'CRV', 'KAVA', 'COMP', 'YFI', 'ZEC'
];

// 交易所配置
const EXCHANGES = {
    binance: { name: '币安', color: '#F0B90B' },
    okx: { name: 'OKX', color: '#000000' },
    huobi: { name: '火币', color: '#2A6EDD' },
    gate: { name: 'Gate.io', color: '#00C4CC' },
    kucoin: { name: 'KuCoin', color: '#24D7A6' }
};

// 模拟基准价格（接近真实价格）
const BASE_PRICES = {
    'BTC': 67500, 'ETH': 3450, 'BNB': 580, 'XRP': 0.52, 'ADA': 0.45,
    'DOGE': 0.125, 'SOL': 145, 'DOT': 7.2, 'MATIC': 0.72, 'LTC': 85,
    'SHIB': 0.0000245, 'TRX': 0.125, 'AVAX': 35, 'LINK': 14.5, 'ATOM': 9.2,
    'UNI': 7.8, 'ETC': 26, 'XLM': 0.115, 'BCH': 480, 'FIL': 5.8,
    'LDO': 2.45, 'APT': 9.8, 'ARB': 1.15, 'OP': 2.35, 'NEAR': 7.2,
    'ICP': 12.5, 'VET': 0.035, 'HBAR': 0.11, 'QNT': 92, 'AAVE': 95,
    'GRT': 0.28, 'ALGO': 0.18, 'FTM': 0.72, 'SAND': 0.42, 'MANA': 0.38,
    'AXS': 7.5, 'EGLD': 52, 'XTZ': 0.85, 'THETA': 2.15, 'EOS': 0.62,
    'FLOW': 0.78, 'CHZ': 0.085, 'SNX': 2.85, 'MKR': 2850, 'RUNE': 4.8,
    'CRV': 0.35, 'KAVA': 0.48, 'COMP': 52, 'YFI': 6800, 'ZEC': 28
};

// 生成模拟价格数据
function generateMockPrices() {
    const priceData = {};

    for (const symbol of SYMBOLS) {
        const basePrice = BASE_PRICES[symbol] || 10;

        // 币安价格（基准）
        const binancePrice = basePrice * (1 + (Math.random() - 0.5) * 0.002);

        priceData[symbol] = {
            symbol: symbol,
            binancePrice: binancePrice,
            exchanges: {},
            timestamp: Date.now()
        };

        // 其他交易所价格（相对于币安有差异）
        for (const [exchangeId, exchange] of Object.entries(EXCHANGES)) {
            if (exchangeId === 'binance') continue;

            // 生成 -0.5% 到 +0.5% 的价格差异
            const diffPercent = (Math.random() - 0.5) * 0.01;
            const price = binancePrice * (1 + diffPercent);
            const diff = price - binancePrice;
            const diffPercentValue = (diff / binancePrice) * 100;

            priceData[symbol].exchanges[exchangeId] = {
                price: price,
                name: exchange.name,
                color: exchange.color,
                diff: diff,
                diffPercent: diffPercentValue,
                sign: diff >= 0 ? '+' : '-'
            };
        }
    }

    return priceData;
}

// 广播数据给所有客户端
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// 定时获取价格并广播
async function startPriceMonitor() {
    console.log('开始监控加密货币价格（模拟数据模式）...');

    // 立即执行一次
    const priceData = generateMockPrices();
    broadcast({
        type: 'priceUpdate',
        data: priceData,
        timestamp: Date.now()
    });
    console.log(`已生成 ${Object.keys(priceData).length} 个币种的模拟数据`);

    // 每秒更新一次
    setInterval(() => {
        const priceData = generateMockPrices();
        broadcast({
            type: 'priceUpdate',
            data: priceData,
            timestamp: Date.now()
        });
    }, 1000);
}

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('新客户端连接');

    ws.on('close', () => {
        console.log('客户端断开连接');
    });
});

// 启动监控
startPriceMonitor();