const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
const PORT = 3000;

// 配置代理
const PROXY_URL = 'http://127.0.0.1:10808';
const httpsAgent = new HttpsProxyAgent(PROXY_URL);

// 创建支持代理的axios实例
const axiosWithProxy = axios.create({
    httpsAgent: httpsAgent,
    proxy: false
});

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

// 交易所API配置
const EXCHANGES = {
    binance: {
        name: '币安',
        color: '#F0B90B',
        getPrice: async (symbol) => {
            try {
                const response = await axiosWithProxy.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`, {
                    timeout: 10000
                });
                return parseFloat(response.data.price);
            } catch (error) {
                console.error(`币安 ${symbol} 错误:`, error.message);
                return null;
            }
        }
    },
    okx: {
        name: 'OKX',
        color: '#000000',
        getPrice: async (symbol) => {
            try {
                const instId = `${symbol}-USDT`;
                const response = await axiosWithProxy.get(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`, {
                    timeout: 10000
                });
                return parseFloat(response.data.data[0]?.last);
            } catch (error) {
                console.error(`OKX ${symbol} 错误:`, error.message);
                return null;
            }
        }
    },
    huobi: {
        name: '火币',
        color: '#2A6EDD',
        getPrice: async (symbol) => {
            try {
                const response = await axiosWithProxy.get(`https://api.huobi.pro/market/detail/merged?symbol=${symbol.toLowerCase()}usdt`, {
                    timeout: 10000
                });
                return parseFloat(response.data.tick?.close);
            } catch (error) {
                console.error(`火币 ${symbol} 错误:`, error.message);
                return null;
            }
        }
    },
    gate: {
        name: 'Gate.io',
        color: '#00C4CC',
        getPrice: async (symbol) => {
            try {
                const response = await axiosWithProxy.get(`https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${symbol}_USDT`, {
                    timeout: 10000
                });
                return parseFloat(response.data[0]?.last);
            } catch (error) {
                console.error(`Gate.io ${symbol} 错误:`, error.message);
                return null;
            }
        }
    },
    kucoin: {
        name: 'KuCoin',
        color: '#24D7A6',
        getPrice: async (symbol) => {
            try {
                const response = await axiosWithProxy.get(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${symbol}-USDT`, {
                    timeout: 10000
                });
                return parseFloat(response.data.data?.price);
            } catch (error) {
                console.error(`KuCoin ${symbol} 错误:`, error.message);
                return null;
            }
        }
    }
};

// 获取所有价格数据
async function fetchAllPrices() {
    const priceData = {};

    for (const symbol of SYMBOLS) {
        priceData[symbol] = {
            symbol: symbol,
            exchanges: {},
            timestamp: Date.now()
        };

        // 并发获取各交易所价格
        const promises = Object.entries(EXCHANGES).map(async ([exchangeId, exchange]) => {
            try {
                const price = await exchange.getPrice(symbol);
                return { exchangeId, price };
            } catch (error) {
                console.error(`获取${exchangeId} ${symbol}价格失败:`, error.message);
                return { exchangeId, price: null };
            }
        });

        const results = await Promise.all(promises);

        results.forEach(({ exchangeId, price }) => {
            if (price !== null && !isNaN(price)) {
                priceData[symbol].exchanges[exchangeId] = {
                    price: price,
                    name: EXCHANGES[exchangeId].name,
                    color: EXCHANGES[exchangeId].color
                };
            }
        });
    }

    console.log(`成功获取 ${Object.keys(priceData).length} 个币种数据`);
    return priceData;
}

// 计算价格差异
function calculatePriceDifferences(priceData) {
    const result = {};

    for (const [symbol, data] of Object.entries(priceData)) {
        const binancePrice = data.exchanges.binance?.price;

        if (!binancePrice) continue;

        result[symbol] = {
            symbol: symbol,
            binancePrice: binancePrice,
            exchanges: {},
            timestamp: data.timestamp
        };

        for (const [exchangeId, exchangeData] of Object.entries(data.exchanges)) {
            if (exchangeId === 'binance') continue;

            const price = exchangeData.price;
            const diff = price - binancePrice;
            const diffPercent = (diff / binancePrice) * 100;

            result[symbol].exchanges[exchangeId] = {
                ...exchangeData,
                diff: diff,
                diffPercent: diffPercent,
                sign: diff >= 0 ? '+' : '-'
            };
        }
    }

    return result;
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
    console.log('开始监控加密货币价格...');

    // 立即执行一次
    try {
        console.log('正在获取初始价格数据...');
        const priceData = await fetchAllPrices();
        const diffData = calculatePriceDifferences(priceData);
        console.log(`计算价格差异完成，共 ${Object.keys(diffData).length} 个币种`);
        broadcast({
            type: 'priceUpdate',
            data: diffData,
            timestamp: Date.now()
        });
        console.log('初始数据已广播');
    } catch (error) {
        console.error('获取初始价格数据失败:', error);
    }

    // 每5秒更新一次（减少API压力）
    setInterval(async () => {
        try {
            const priceData = await fetchAllPrices();
            const diffData = calculatePriceDifferences(priceData);
            broadcast({
                type: 'priceUpdate',
                data: diffData,
                timestamp: Date.now()
            });
            console.log(`数据已更新并广播，共 ${Object.keys(diffData).length} 个币种`);
        } catch (error) {
            console.error('获取价格数据失败:', error.message);
        }
    }, 5000);
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