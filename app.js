// Trading Journal Application Logic

// Global state
let trades = JSON.parse(localStorage.getItem('trades')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    startingCapital: 10000,
    currency: 'USD',
    theme: 'dark',
    dateFormat: 'MM/DD/YYYY'
};

let currentMonth = new Date();

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadCalendar(); // Calendar is now the default page
    applySettings();
});

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchSection(sectionName) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific content
        switch(sectionName) {
            case 'calendar':
                loadCalendar();
                break;
            case 'trades':
                loadAllTrades();
                break;
            case 'performance':
                loadPerformance();
                break;
            case 'analytics':
                loadAnalytics();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    }
}

// Dashboard Overview (kept for compatibility)
function loadDashboard() {
    calculateStats();
    loadRecentTrades();
    initCharts();
}

// Performance Section (new main stats page)
function loadPerformance() {
    calculatePerformanceStats();
    loadRecentTrades();
    initCharts();
}

function calculatePerformanceStats() {
    const timeframe = document.getElementById('perfTimeframe')?.value || 'month';
    const filteredTrades = filterTradesByTimeframe(trades, timeframe);
    
    // Calculate total P&L
    const totalPnL = filteredTrades.reduce((sum, trade) => sum + calculatePnL(trade), 0);
    
    // Calculate win rate
    const wins = filteredTrades.filter(trade => calculatePnL(trade) > 0).length;
    const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length * 100).toFixed(1) : 0;
    
    // Calculate average RR
    const avgRR = calculateAvgRR(filteredTrades);
    
    // Calculate profit factor
    const winningTrades = filteredTrades.filter(trade => calculatePnL(trade) > 0);
    const losingTrades = filteredTrades.filter(trade => calculatePnL(trade) < 0);
    
    const totalWins = winningTrades.reduce((sum, t) => sum + calculatePnL(t), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + calculatePnL(t), 0));
    
    const profitFactor = totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : '0.00';
    
    // Update DOM
    updateElement('totalPnL', formatCurrency(totalPnL));
    updateElement('pnlChange', `${totalPnL >= 0 ? '+' : ''}${((totalPnL / settings.startingCapital) * 100).toFixed(1)}%`);
    updateElement('winRate', `${winRate}%`);
    updateElement('winRateChange', `${wins}/${filteredTrades.length} trades`);
    updateElement('perfAvgRR', avgRR);
    updateElement('profitFactor', `PF: ${profitFactor}`);
    updateElement('totalTrades', filteredTrades.length);
    updateElement('tradesChange', `+${filteredTrades.length} this period`);
    
    // Update stat change classes
    const pnlChangeEl = document.getElementById('pnlChange');
    if (pnlChangeEl) {
        pnlChangeEl.className = 'stat-change ' + (totalPnL >= 0 ? 'positive' : 'negative');
    }
}

function calculateStats() {
    const timeframe = document.getElementById('timeframe')?.value || 'month';
    const filteredTrades = filterTradesByTimeframe(trades, timeframe);
    
    // Calculate total P&L
    const totalPnL = filteredTrades.reduce((sum, trade) => sum + calculatePnL(trade), 0);
    
    // Calculate win rate
    const wins = filteredTrades.filter(trade => calculatePnL(trade) > 0).length;
    const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length * 100).toFixed(1) : 0;
    
    // Calculate average win/loss
    const winningTrades = filteredTrades.filter(trade => calculatePnL(trade) > 0);
    const losingTrades = filteredTrades.filter(trade => calculatePnL(trade) < 0);
    
    const avgWin = winningTrades.length > 0 
        ? winningTrades.reduce((sum, t) => sum + calculatePnL(t), 0) / winningTrades.length 
        : 0;
    const avgLoss = losingTrades.length > 0 
        ? Math.abs(losingTrades.reduce((sum, t) => sum + calculatePnL(t), 0) / losingTrades.length)
        : 0;
    
    const profitFactor = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '0.00';
    
    // Update DOM
    updateElement('totalPnL', formatCurrency(totalPnL));
    updateElement('pnlChange', `${totalPnL >= 0 ? '+' : ''}${((totalPnL / settings.startingCapital) * 100).toFixed(1)}%`);
    updateElement('winRate', `${winRate}%`);
    updateElement('winRateChange', `${wins}/${filteredTrades.length} trades`);
    updateElement('avgWinLoss', formatCurrency(avgWin - avgLoss));
    updateElement('profitFactor', `PF: ${profitFactor}`);
    updateElement('totalTrades', filteredTrades.length);
    updateElement('tradesChange', `+${filteredTrades.length} this period`);
    
    // Update stat change classes
    const pnlChangeEl = document.getElementById('pnlChange');
    if (pnlChangeEl) {
        pnlChangeEl.className = 'stat-change ' + (totalPnL >= 0 ? 'positive' : 'negative');
    }
}

function filterTradesByTimeframe(trades, timeframe) {
    const now = new Date();
    
    return trades.filter(trade => {
        const tradeDate = new Date(trade.entryDate);
        
        switch(timeframe) {
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return tradeDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
                return tradeDate >= monthAgo;
            case 'year':
                const yearAgo = new Date(now.getFullYear(), 0, 1);
                return tradeDate >= yearAgo;
            case 'all':
            default:
                return true;
        }
    });
}

function calculatePnL(trade) {
    const entryPrice = parseFloat(trade.entryPrice);
    const exitPrice = parseFloat(trade.exitPrice);
    const quantity = parseFloat(trade.quantity);
    
    if (trade.type === 'long') {
        return (exitPrice - entryPrice) * quantity;
    } else {
        return (entryPrice - exitPrice) * quantity;
    }
}

function calculatePnLPercentage(trade) {
    const pnl = calculatePnL(trade);
    const entryPrice = parseFloat(trade.entryPrice);
    const quantity = parseFloat(trade.quantity);
    const cost = entryPrice * quantity;
    
    return ((pnl / cost) * 100).toFixed(2);
}

function calculateRR(trade) {
    // Calculate Risk/Reward ratio
    if (!trade.stopLoss || !trade.takeProfit) {
        // Calculate actual RR from entry and exit
        const pnl = calculatePnL(trade);
        const entryPrice = parseFloat(trade.entryPrice);
        const exitPrice = parseFloat(trade.exitPrice);
        
        if (trade.type === 'long') {
            const reward = Math.abs(exitPrice - entryPrice);
            const risk = Math.abs(entryPrice - (entryPrice * 0.98)); // Assume 2% risk if no SL
            return risk > 0 ? (reward / risk).toFixed(2) : '0.00';
        } else {
            const reward = Math.abs(entryPrice - exitPrice);
            const risk = Math.abs((entryPrice * 1.02) - entryPrice); // Assume 2% risk if no SL
            return risk > 0 ? (reward / risk).toFixed(2) : '0.00';
        }
    }
    
    const entryPrice = parseFloat(trade.entryPrice);
    const stopLoss = parseFloat(trade.stopLoss);
    const takeProfit = parseFloat(trade.takeProfit);
    
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    
    return risk > 0 ? (reward / risk).toFixed(2) : '0.00';
}

function calculateAvgRR(tradesList) {
    if (tradesList.length === 0) return '0.00';
    
    const totalRR = tradesList.reduce((sum, trade) => {
        return sum + parseFloat(calculateRR(trade));
    }, 0);
    
    return (totalRR / tradesList.length).toFixed(2);
}

function loadRecentTrades() {
    const tbody = document.getElementById('recentTradesBody');
    if (!tbody) return;
    
    if (trades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No trades yet. Add your first trade to get started!</td></tr>';
        return;
    }
    
    const recentTrades = trades.slice(-5).reverse();
    
    tbody.innerHTML = recentTrades.map(trade => {
        const pnl = calculatePnL(trade);
        const pnlPercent = calculatePnLPercentage(trade);
        const rr = calculateRR(trade);
        
        return `
            <tr>
                <td>${formatDate(trade.tradeDate || trade.entryDate)}</td>
                <td><strong>${trade.symbol}</strong></td>
                <td><span class="trade-type-${trade.type}">${trade.type.toUpperCase()}</span></td>
                <td>${formatCurrency(trade.entryPrice)}</td>
                <td>${formatCurrency(trade.exitPrice)}</td>
                <td class="${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">${formatCurrency(pnl)}</td>
                <td class="${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">${pnlPercent}%</td>
                <td><strong>${rr}</strong></td>
            </tr>
        `;
    }).join('');
}

// All Trades Section
function loadAllTrades() {
    const tbody = document.getElementById('allTradesBody');
    if (!tbody) return;
    
    if (trades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-state">No trades found. Start by adding your first trade!</td></tr>';
        return;
    }
    
    const filteredTrades = applyFilters(trades);
    
    tbody.innerHTML = filteredTrades.reverse().map((trade, index) => {
        const pnl = calculatePnL(trade);
        const pnlPercent = calculatePnLPercentage(trade);
        const rr = calculateRR(trade);
        
        return `
            <tr>
                <td>${formatDate(trade.tradeDate || trade.entryDate)}</td>
                <td><strong>${trade.symbol}</strong></td>
                <td><span class="trade-type-${trade.type}">${trade.type.toUpperCase()}</span></td>
                <td>${formatCurrency(trade.entryPrice)}</td>
                <td>${formatCurrency(trade.exitPrice)}</td>
                <td>${trade.quantity}</td>
                <td class="${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">${formatCurrency(pnl)}</td>
                <td class="${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">${pnlPercent}%</td>
                <td><strong>${rr}</strong></td>
                <td>${trade.strategy || '-'}</td>
                <td>
                    <button class="action-btn" onclick="viewTrade(${trades.indexOf(trade)})">View</button>
                    <button class="action-btn delete" onclick="deleteTrade(${trades.indexOf(trade)})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function applyFilters(trades) {
    const searchTerm = document.getElementById('searchTrades')?.value.toLowerCase() || '';
    const filterType = document.getElementById('filterType')?.value || 'all';
    const filterOutcome = document.getElementById('filterOutcome')?.value || 'all';
    
    return trades.filter(trade => {
        const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm) || 
                            (trade.strategy && trade.strategy.toLowerCase().includes(searchTerm));
        const matchesType = filterType === 'all' || trade.type === filterType;
        const pnl = calculatePnL(trade);
        const matchesOutcome = filterOutcome === 'all' || 
                             (filterOutcome === 'win' && pnl > 0) ||
                             (filterOutcome === 'loss' && pnl < 0);
        
        return matchesSearch && matchesType && matchesOutcome;
    });
}

// Add event listeners for filters
setTimeout(() => {
    const searchInput = document.getElementById('searchTrades');
    const filterType = document.getElementById('filterType');
    const filterOutcome = document.getElementById('filterOutcome');
    
    if (searchInput) searchInput.addEventListener('input', loadAllTrades);
    if (filterType) filterType.addEventListener('change', loadAllTrades);
    if (filterOutcome) filterOutcome.addEventListener('change', loadAllTrades);
}, 100);

function viewTrade(index) {
    const trade = trades[index];
    if (!trade) return;
    
    showToast(`Trade Details: ${trade.symbol} - P&L: ${formatCurrency(calculatePnL(trade))}`, 'success');
}

function deleteTrade(index) {
    if (confirm('Are you sure you want to delete this trade?')) {
        trades.splice(index, 1);
        saveTrades();
        loadAllTrades();
        loadDashboard();
        showToast('Trade deleted successfully', 'success');
    }
}

// Add Trade Form
function handleTradeSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const trade = {
        symbol: formData.get('symbol').toUpperCase(),
        type: formData.get('type'),
        tradeDate: formData.get('tradeDate'),
        entryDate: formData.get('tradeDate'), // Keep for compatibility
        exitDate: formData.get('tradeDate'), // Keep for compatibility
        entryPrice: formData.get('entryPrice'),
        exitPrice: formData.get('exitPrice'),
        quantity: formData.get('quantity'),
        stopLoss: formData.get('stopLoss') || null,
        takeProfit: formData.get('takeProfit') || null,
        strategy: formData.get('strategy'),
        tags: formData.get('tags'),
        notes: formData.get('notes'),
        createdAt: new Date().toISOString()
    };
    
    trades.push(trade);
    saveTrades();
    
    form.reset();
    showToast('Trade added successfully!', 'success');
    
    // Switch to calendar view
    setTimeout(() => {
        switchSection('calendar');
        document.querySelector('[data-section="calendar"]').classList.add('active');
        document.querySelector('[data-section="add-trade"]').classList.remove('active');
    }, 1000);
}

// Calendar
function loadCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('currentMonth');
    
    if (!grid) return;
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    if (monthLabel) {
        monthLabel.textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    // Calculate month stats
    const monthTrades = trades.filter(trade => {
        const tradeDate = new Date(trade.tradeDate || trade.entryDate);
        return tradeDate.getMonth() === month && tradeDate.getFullYear() === year;
    });
    
    const monthPnL = monthTrades.reduce((sum, trade) => sum + calculatePnL(trade), 0);
    const wins = monthTrades.filter(trade => calculatePnL(trade) > 0).length;
    const winRate = monthTrades.length > 0 ? (wins / monthTrades.length * 100).toFixed(1) : 0;
    const avgRR = calculateAvgRR(monthTrades);
    const tradingDaysSet = new Set(monthTrades.map(t => new Date(t.tradeDate || t.entryDate).getDate()));
    const tradingDays = tradingDaysSet.size;
    
    // Update stats
    updateElement('monthPnL', formatCurrency(monthPnL));
    updateElement('monthPnlPercent', `${monthPnL >= 0 ? '+' : ''}${((monthPnL / settings.startingCapital) * 100).toFixed(1)}%`);
    updateElement('calendarWinRate', `${winRate}%`);
    updateElement('calendarWins', `${wins} wins`);
    updateElement('avgRR', avgRR);
    updateElement('tradingDays', tradingDays);
    updateElement('monthTrades', `${monthTrades.length} trades`);
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    grid.innerHTML = '';
    
    // Add day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const header = document.createElement('div');
        header.style.textAlign = 'center';
        header.style.fontWeight = '600';
        header.style.padding = '10px';
        header.style.color = 'var(--text-secondary)';
        header.textContent = day;
        grid.appendChild(header);
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }
    
    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayTrades = trades.filter(trade => {
            const tradeDate = new Date(trade.tradeDate || trade.entryDate);
            return tradeDate.getDate() === day && 
                   tradeDate.getMonth() === month && 
                   tradeDate.getFullYear() === year;
        });
        
        const dayPnL = dayTrades.reduce((sum, trade) => sum + calculatePnL(trade), 0);
        
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (dayTrades.length > 0) {
            dayEl.classList.add(dayPnL >= 0 ? 'profit' : 'loss');
        }
        
        dayEl.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            ${dayTrades.length > 0 ? `<div class="calendar-day-pnl">${formatCurrency(dayPnL)}</div>` : ''}
        `;
        
        grid.appendChild(dayEl);
    }
}

function previousMonth() {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    loadCalendar();
}

function nextMonth() {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    loadCalendar();
}

// Analytics
function loadAnalytics() {
    calculateAdvancedMetrics();
    initAnalyticsCharts();
}

function calculateAdvancedMetrics() {
    if (trades.length === 0) return;
    
    // Sharpe Ratio (simplified)
    const returns = trades.map(trade => calculatePnLPercentage(trade));
    const avgReturn = returns.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sq, n) => sq + Math.pow(parseFloat(n) - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev).toFixed(2) : '0.00';
    
    // Max Drawdown
    let peak = settings.startingCapital;
    let maxDrawdown = 0;
    let runningCapital = settings.startingCapital;
    
    trades.forEach(trade => {
        runningCapital += calculatePnL(trade);
        if (runningCapital > peak) peak = runningCapital;
        const drawdown = ((peak - runningCapital) / peak) * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    // Average holding time
    const holdingTimes = trades.map(trade => {
        const entry = new Date(trade.entryDate);
        const exit = new Date(trade.exitDate);
        return (exit - entry) / (1000 * 60 * 60); // hours
    });
    const avgHoldingTime = holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length;
    
    // Best and worst trades
    const pnls = trades.map(trade => calculatePnL(trade));
    const bestTrade = Math.max(...pnls);
    const worstTrade = Math.min(...pnls);
    
    // Win/Loss streaks
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;
    
    trades.forEach((trade, index) => {
        const pnl = calculatePnL(trade);
        
        if (pnl > 0) {
            tempWinStreak++;
            tempLossStreak = 0;
            if (index === trades.length - 1) currentStreak = tempWinStreak;
            if (tempWinStreak > longestWinStreak) longestWinStreak = tempWinStreak;
        } else {
            tempLossStreak++;
            tempWinStreak = 0;
            if (index === trades.length - 1) currentStreak = -tempLossStreak;
            if (tempLossStreak > longestLossStreak) longestLossStreak = tempLossStreak;
        }
    });
    
    // Average RR
    const avgRR = calculateAvgRR(trades);
    
    // Update DOM
    updateElement('sharpeRatio', sharpeRatio);
    updateElement('maxDrawdown', maxDrawdown.toFixed(2) + '%');
    updateElement('avgHoldingTime', Math.round(avgHoldingTime) + 'h');
    updateElement('bestTrade', formatCurrency(bestTrade));
    updateElement('worstTrade', formatCurrency(worstTrade));
    updateElement('analyticsAvgRR', avgRR);
    updateElement('currentStreak', currentStreak > 0 ? `+${currentStreak} W` : `${currentStreak} L`);
    updateElement('longestWinStreak', longestWinStreak);
    updateElement('longestLossStreak', longestLossStreak);
}

// Charts (using simple canvas drawing since we're not including Chart.js)
function initCharts() {
    drawEquityCurve();
    drawDistributionChart();
}

function drawEquityCurve() {
    const canvas = document.getElementById('equityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    if (trades.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data to display', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Calculate equity curve
    let equity = [settings.startingCapital];
    trades.forEach(trade => {
        equity.push(equity[equity.length - 1] + calculatePnL(trade));
    });
    
    const maxEquity = Math.max(...equity);
    const minEquity = Math.min(...equity);
    const range = maxEquity - minEquity || 1;
    
    // Draw line
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    equity.forEach((value, index) => {
        const x = (index / (equity.length - 1)) * canvas.width;
        const y = canvas.height - ((value - minEquity) / range) * canvas.height * 0.9 - canvas.height * 0.05;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw starting line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const startY = canvas.height - ((settings.startingCapital - minEquity) / range) * canvas.height * 0.9 - canvas.height * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(canvas.width, startY);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawDistributionChart() {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    if (trades.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data to display', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const wins = trades.filter(t => calculatePnL(t) > 0).length;
    const losses = trades.length - wins;
    
    const total = wins + losses;
    const winPercent = wins / total;
    const lossPercent = losses / total;
    
    // Draw bars
    const barWidth = canvas.width * 0.3;
    const spacing = canvas.width * 0.1;
    
    // Wins bar
    ctx.fillStyle = '#10b981';
    const winHeight = winPercent * canvas.height * 0.8;
    ctx.fillRect(spacing, canvas.height - winHeight - 40, barWidth, winHeight);
    
    // Losses bar
    ctx.fillStyle = '#ef4444';
    const lossHeight = lossPercent * canvas.height * 0.8;
    ctx.fillRect(spacing * 2 + barWidth, canvas.height - lossHeight - 40, barWidth, lossHeight);
    
    // Labels
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${wins}`, spacing + barWidth / 2, canvas.height - winHeight - 50);
    ctx.fillText(`${losses}`, spacing * 2 + barWidth * 1.5, canvas.height - lossHeight - 50);
    
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Wins', spacing + barWidth / 2, canvas.height - 15);
    ctx.fillText('Losses', spacing * 2 + barWidth * 1.5, canvas.height - 15);
}

function initAnalyticsCharts() {
    drawStrategyChart();
    drawTimeAnalysisChart();
}

function drawStrategyChart() {
    const canvas = document.getElementById('strategyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Strategy breakdown', canvas.width / 2, canvas.height / 2);
}

function drawTimeAnalysisChart() {
    const canvas = document.getElementById('timeAnalysisChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time analysis', canvas.width / 2, canvas.height / 2);
}

// Settings
function loadSettings() {
    document.getElementById('startingCapital').value = settings.startingCapital;
    document.getElementById('currency').value = settings.currency;
    document.getElementById('theme').value = settings.theme;
    document.getElementById('dateFormat').value = settings.dateFormat;
}

function applySettings() {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
    
    // Apply theme
    changeTheme(settings.theme);
}

function changeTheme(theme) {
    // For now, we only have dark mode, but this can be extended
    settings.theme = theme;
    saveSettings();
}

// Data Management
function exportTrades() {
    if (trades.length === 0) {
        showToast('No trades to export', 'error');
        return;
    }
    
    const csv = ['Date,Symbol,Type,Entry,Exit,Quantity,P&L,P&L%,Strategy,Notes'];
    
    trades.forEach(trade => {
        const pnl = calculatePnL(trade);
        const pnlPercent = calculatePnLPercentage(trade);
        
        csv.push([
            trade.entryDate,
            trade.symbol,
            trade.type,
            trade.entryPrice,
            trade.exitPrice,
            trade.quantity,
            pnl,
            pnlPercent,
            trade.strategy || '',
            `"${trade.notes || ''}"`
        ].join(','));
    });
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast('Trades exported successfully', 'success');
}

function exportAllData() {
    const data = {
        trades,
        settings,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradepro-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    showToast('Data exported successfully', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                trades = data.trades || [];
                settings = data.settings || settings;
                
                saveTrades();
                saveSettings();
                
                loadDashboard();
                showToast('Data imported successfully', 'success');
            } catch (error) {
                showToast('Invalid file format', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function clearAllData() {
    if (confirm('Are you sure you want to delete all trades? This action cannot be undone.')) {
        if (confirm('Really delete everything? This is your last chance!')) {
            trades = [];
            localStorage.removeItem('trades');
            loadDashboard();
            loadAllTrades();
            showToast('All data cleared', 'success');
        }
    }
}

// Utility Functions
function saveTrades() {
    localStorage.setItem('trades', JSON.stringify(trades));
}

function saveSettings() {
    localStorage.setItem('settings', JSON.stringify(settings));
}

function formatCurrency(amount) {
    const symbol = settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : '¥';
    return symbol + parseFloat(amount).toFixed(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add event listener for settings changes
setTimeout(() => {
    const inputs = ['startingCapital', 'currency', 'dateFormat'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', (e) => {
                settings[id] = e.target.value;
                saveSettings();
                loadDashboard();
                showToast('Settings updated', 'success');
            });
        }
    });
    
    const timeframeSelect = document.getElementById('timeframe');
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', loadDashboard);
    }
    
    const perfTimeframeSelect = document.getElementById('perfTimeframe');
    if (perfTimeframeSelect) {
        perfTimeframeSelect.addEventListener('change', loadPerformance);
    }
}, 100);
