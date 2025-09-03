document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    const investmentAmountEl = document.getElementById('investmentAmount');
    const exchangeRateEl = document.getElementById('exchangeRate');
    const hkdRateEl = document.getElementById('hkdRate');
    const usBondRateEl = document.getElementById('usBondRate');
    const exchangeCostEl = document.getElementById('exchangeCost');
    const usBondFeeEl = document.getElementById('usBondFee');

    const outputSection = document.getElementById('outputSection');
    const resultTextEl = document.getElementById('resultText');
    const calculationStepsEl = document.getElementById('calculationSteps');
    const chartCanvas = document.getElementById('returnChart');

    let returnChart = null;

    const LERS_WEAK_SIDE_GUARANTEE = 7.75; // Strong-side for HKD

    calculateBtn.addEventListener('click', () => {
        // 1. Get and parse input values
        const investmentAmount = parseFloat(investmentAmountEl.value);
        const currentExchangeRate = parseFloat(exchangeRateEl.value);
        const hkdRate = parseFloat(hkdRateEl.value) / 100;
        const usBondRate = parseFloat(usBondRateEl.value) / 100;
        const exchangeCostVal = parseFloat(exchangeCostEl.value);
        const exchangeCostType = document.getElementById('exchangeCostType').value;
        const usBondFeeVal = parseFloat(usBondFeeEl.value);
        const usBondFeeType = document.getElementById('usBondFeeType').value;


        // 2. Input validation
        if (isNaN(investmentAmount) || isNaN(currentExchangeRate) || isNaN(hkdRate) || isNaN(usBondRate) || isNaN(exchangeCostVal) || isNaN(usBondFeeVal) || investmentAmount <= 0) {
            alert('請輸入所有有效的數字。投資金額必須大於零。');
            return;
        }

        // 3. Calculation
        // Calculate worst-case exchange fluctuation based on LERS
        // This is the risk that HKD strengthens to 7.75 when converting back.
        const exchangeFluctuation = (LERS_WEAK_SIDE_GUARANTEE / currentExchangeRate) - 1;

        // Calculate one-time costs based on input type (amount or percent)
        let roundTripExchangeCost;
        let exchangeCostFormula;
        if (exchangeCostType === 'amount') {
            roundTripExchangeCost = exchangeCostVal;
            exchangeCostFormula = `${roundTripExchangeCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD (固定金額)`;
        } else { // percent
            const exchangeCostPercent = exchangeCostVal / 100;
            roundTripExchangeCost = investmentAmount * (1 - Math.pow(1 - exchangeCostPercent, 2));
            exchangeCostFormula = `${investmentAmount.toLocaleString()} * [1 - (1 - ${exchangeCostVal}%)^2] = ${roundTripExchangeCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD`;
        }

        let usBondFeeCost;
        let usBondFeeFormula;
        if (usBondFeeType === 'amount') {
            usBondFeeCost = usBondFeeVal;
            usBondFeeFormula = `${usBondFeeCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD (固定金額)`;
        } else { // percent
            const usBondFeePercent = usBondFeeVal / 100;
            usBondFeeCost = investmentAmount * usBondFeePercent;
            usBondFeeFormula = `${investmentAmount.toLocaleString()} * ${usBondFeeVal}% = ${usBondFeeCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD`;
        }
        
        const totalOneTimeCost = roundTripExchangeCost + usBondFeeCost;
        
        // Calculate effective annual return rate for US bonds in HKD, considering risk
        const effectiveUsRateInHkd = (1 + usBondRate) * (1 + exchangeFluctuation) - 1;
        
        const annualHkdReturn = investmentAmount * hkdRate;
        // Annual US net return includes interest, currency fluctuation, and exchange costs
        const annualUsNetReturnInHkd = (investmentAmount * effectiveUsRateInHkd) - totalOneTimeCost;


        let resultMessage = '';
        calculationStepsEl.innerHTML = ''; // Clear previous steps

        const stepsHtml = `
            <h3>計算步驟 (以一年期為例)</h3>
            <p>1. 港元定期年收益:</p>
            <p>${investmentAmount.toLocaleString()} * ${hkdRate * 100}% = ${annualHkdReturn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD</p>
            <p>2. 根據聯繫匯率計算最差情況下的匯率變動 (港元升值至7.75):</p>
            <p>變動率 = (7.75 / ${currentExchangeRate}) - 1 = ~${(exchangeFluctuation * 100).toFixed(4)}%</p>
            <p>3. 美債投資的綜合年回報率 (已計入匯率風險):</p>
            <p>[(1 + ${usBondRate * 100}%) * (1 + ${(exchangeFluctuation * 100).toFixed(4)}%) - 1] = ~${(effectiveUsRateInHkd * 100).toFixed(4)}%</p>
            <p>4. 計算總一次性成本 (來回匯率成本 + 美債手續費):</p>
            <p>匯率成本: ${exchangeCostFormula}</p>
            <p>美債手續費: ${usBondFeeFormula}</p>
            <p>總成本: ${totalOneTimeCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD</p>
            <p>5. 美債投資的淨年收益 (扣除所有成本):</p>
            <p>(${investmentAmount.toLocaleString()} * ${effectiveUsRateInHkd.toLocaleString()}) - ${totalOneTimeCost.toLocaleString()} = ${annualUsNetReturnInHkd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD</p>
        `;
        
        calculationStepsEl.innerHTML = stepsHtml;

        // 判斷美債的有效年利率是否高於港元定期利率
        if (effectiveUsRateInHkd <= hkdRate) {
            // 如果美債利率較低或相等，它永遠不會趕上港元定期（因為還有額外的匯率成本）
            resultMessage = '即使不考慮匯率成本，美債的有效年回報率也已低於或等於港元定期。';
        } else {
            // 計算收益打和點（break-even point）
            // I * effectiveUsRateInHkd * t - totalOneTimeCost = I * hkdRate * t
            // t * (I * effectiveUsRateInHkd - I * hkdRate) = totalOneTimeCost
            // t = totalOneTimeCost / (I * (effectiveUsRateInHkd - hkdRate))
            const breakEvenTimeYears = totalOneTimeCost / (investmentAmount * (effectiveUsRateInHkd - hkdRate));

            if (breakEvenTimeYears <= 0) {
                // 如果打和點小於或等於零，表示美債從一開始就更有利
                resultMessage = '即使考慮所有匯率成本和風險，美債的收益率依然從一開始就高於港元定期。';
            } else {
                const breakEvenDays = Math.ceil(breakEvenTimeYears * 365);
                const years = Math.floor(breakEvenDays / 365);
                const remainingDays = breakEvenDays % 365;
                
                let timeString = '';
                if (years > 0) {
                    timeString += `${years} 年 `;
                }
                if (remainingDays > 0) {
                    timeString += `${remainingDays} 天`;
                }

                resultMessage = `投資期限需要大約 <strong>${timeString.trim()}</strong>，美債的總收益才會開始高於港元定期存款。`;
            }
        }

        resultTextEl.innerHTML = resultMessage;
        outputSection.style.display = 'block';

        // 4. Generate Chart
        updateChart(investmentAmount, hkdRate, usBondRate, exchangeFluctuation, totalOneTimeCost);
    });

    function updateChart(investment, hkdRate, usBondRate, exFluctuation, totalOneTimeCost) {
        const maxMonths = 24; // 2 years
        const labels = Array.from({ length: maxMonths + 1 }, (_, i) => {
             if (i === 0) return '起點';
             if (i % 12 === 0) return `${i/12} 年`;
             if (i > 12) return `1年${i%12}個月`;
             return `${i}個月`;
        });
        
        const hkdData = Array.from({ length: maxMonths + 1 }, (_, i) => {
            const t = i / 12; // time in years
            return investment * hkdRate * t;
        });
        
        // A linear model for the chart
        const effectiveUsRateInHkd = (1 + usBondRate) * (1 + exFluctuation) - 1;
        const usBondDataLinear = Array.from({ length: maxMonths + 1 }, (_, i) => {
            const t = i / 12; // time in years
            const totalReturn = investment * effectiveUsRateInHkd * t;
            const netReturn = totalReturn - totalOneTimeCost;
            return i === 0 ? 0 : (netReturn > 0 ? netReturn : 0);
        });


        if (returnChart) {
            returnChart.destroy();
        }

        const ctx = chartCanvas.getContext('2d');
        returnChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '港元定期總收益 (HKD)',
                        data: hkdData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: '美債總淨收益 (HKD)',
                        data: usBondDataLinear,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '投資總收益比較 (已考慮聯繫匯率風險)',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '投資時長'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '總收益 (HKD)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }
});
