
const AIRTABLE_CONFIG = {
    API_KEY: 'patcpUIfwD7dO31yP.d4f977687c0a13f9ababa4f5c96954c68bd07d09a9e3eb6a1391acb7f2f2375b',
    BASE_ID: 'appkUal6c4oanOR4X',
    TABLES: {
        AR_IMPORT: 'AR Import',
        AR_CRM: 'AR CRM',
        AP_IMPORT: 'AP Import',
        AP_CRM: 'AP CRM'
    }
};

// Airtable API base URL
const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}`;

// ===============================================
// GLOBAL VARIABLES
// ===============================================
let arData = [];
let apData = [];
// Chart instances
let arBarChart = null;
let arPieChart = null;
let arLineChart = null;
let apBarChart = null;
let apDoughnutChart = null;
let apLineChart = null;
let arChartType = 'bar';
let apChartType = 'bar';
let selectedFiles = {
    ar: null,
    ap: null
};

// ===============================================
// INITIALIZATION
// ===============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ERP Dashboard Initialized');
    initializeTooltips();
    loadInitialData();
});

// ===============================================
// AIRTABLE API FUNCTIONS
// ===============================================

// 🔥 AIRTABLE DATA FETCHING - MODIFY AS NEEDED
async function fetchAirtableData(tableName) {
    try {
        if (AIRTABLE_CONFIG.API_KEY.includes('YOUR_AIRTABLE_API_KEY_HERE')) {
            throw new Error('Airtable API key not configured. Please update AIRTABLE_CONFIG.');
        }

        console.log(`🔍 Fetching data from table: ${tableName}`);
        const url = `${AIRTABLE_BASE_URL}/${encodeURIComponent(tableName)}`;
        console.log(`🌐 Request URL: ${url}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📡 Response status for ${tableName}:`, response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Airtable API Error for ${tableName}:`, errorText);
            throw new Error(`Airtable API Error for ${tableName}: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`📊 Raw data from ${tableName}:`, data);
        
        if (!data.records || data.records.length === 0) {
            console.warn(`⚠️ No records found in ${tableName}`);
            return [];
        }

        const processedData = data.records.map(record => ({
            id: record.id,
            ...record.fields
        }));

        console.log(`✅ Processed ${processedData.length} records from ${tableName}`);
        return processedData;
    } catch (error) {
        console.error(`❌ Airtable fetch error for ${tableName}:`, error);
        showToast('error', `Failed to fetch data from ${tableName}: ${error.message}`);
        return [];
    }
}

// 🔥 AIRTABLE DATA UPLOAD - MODIFY AS NEEDED
async function uploadToAirtable(tableName, records) {
    try {
        if (AIRTABLE_CONFIG.API_KEY.includes('YOUR_AIRTABLE_API_KEY_HERE')) {
            throw new Error('Airtable API key not configured. Please update AIRTABLE_CONFIG.');
        }

        // Split records into batches of 10 (Airtable limit)
        const batches = [];
        for (let i = 0; i < records.length; i += 10) {
            batches.push(records.slice(i, i + 10));
        }

        let totalUploaded = 0;

        for (const batch of batches) {
            const response = await fetch(`${AIRTABLE_BASE_URL}/${tableName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    records: batch.map(record => ({ fields: record }))
                })
            });

            if (!response.ok) {
                throw new Error(`Airtable upload failed: ${response.status} - ${response.statusText}`);
            }

            const result = await response.json();
            totalUploaded += result.records.length;
        }

        showToast('success', `✅ Successfully uploaded ${totalUploaded} records to ${tableName}!`);
        return true;
    } catch (error) {
        console.error('❌ Airtable upload error:', error);
        showToast('error', `Failed to upload to ${tableName}: ${error.message}`);
        return false;
    }
}

// ===============================================
// DATA LOADING AND PROCESSING
// ===============================================

async function loadInitialData() {
    try {
        showToast('info', '📊 Loading dashboard data...');
        
        // 🔥 LOAD DATA FROM AIRTABLE
        console.log('📡 Fetching AR CRM data...');
        arData = await fetchAirtableData(AIRTABLE_CONFIG.TABLES.AR_CRM);
        console.log('✅ AR CRM data loaded:', arData.length, 'records');
        
        console.log('📡 Fetching AP CRM data...');
        apData = await fetchAirtableData(AIRTABLE_CONFIG.TABLES.AP_CRM);
        console.log('✅ AP CRM data loaded:', apData.length, 'records');
        
        // Validate AP CRM data structure
        if (apData.length > 0) {
            console.log('📊 AP CRM sample record:', apData[0]);
            console.log('📊 AP CRM fields available:', Object.keys(apData[0]));
        } else {
            console.warn('⚠️ No AP CRM data found in table:', AIRTABLE_CONFIG.TABLES.AP_CRM);
            showToast('warning', 'No AP CRM data found. Please check table name and data.');
        }

        // Update UI with loaded data
        updateARMetrics();
        updateAPMetrics();
        updateBatchFilters();
        updateDataTables();
        initializeCharts();
        
        showToast('success', '✅ Dashboard data loaded successfully!');
    } catch (error) {
        console.error('❌ Data loading error:', error);
        showToast('error', `Failed to load dashboard data: ${error.message}`);
        
        // Load sample data as fallback
        loadSampleData();
    }
}

// Sample data for demonstration (when Airtable is not configured)

// ===============================================
// UI UPDATE FUNCTIONS
// ===============================================

function updateARMetrics() {
    try {
        const totalLoan = arData.reduce((sum, item) => sum + (parseFloat(item['Loan Amount']) || 0), 0);
        const totalInvoice = arData.reduce((sum, item) => sum + (parseFloat(item['Invoice Amount']) || 0), 0);
        const eligibleCount = arData.filter(item => item['Eligibility Status'] === 'Eligible').length;

        document.getElementById('ar-total-loan').textContent = formatCurrency(totalLoan);
        document.getElementById('ar-total-invoice').textContent = formatCurrency(totalInvoice);
        document.getElementById('ar-eligible-count').textContent = eligibleCount;
    } catch (error) {
        console.error('❌ AR metrics update error:', error);
        showToast('error', 'Failed to update AR metrics');
    }
}

function updateAPMetrics() {
    try {
        console.log('📊 Updating AP metrics with data:', apData);
        
        if (!apData || apData.length === 0) {
            console.warn('⚠️ No AP data available for metrics calculation');
            document.getElementById('ap-total-invoice').textContent = '$0';
            document.getElementById('ap-total-payment').textContent = '$0';
            document.getElementById('ap-discount-amount').textContent = '$0';
            document.getElementById('ap-invoice-count').textContent = '0';
            return;
        }

        // Check field names in first record
        const sampleRecord = apData[0];
        console.log('📋 AP CRM fields available:', Object.keys(sampleRecord));
        
        // Try different possible field name variations for Invoice Amount
        const invoiceFieldVariations = ['Invoice Amount', 'InvoiceAmount', 'Amount', 'Total Amount', 'Invoice_Amount'];
        const paymentFieldVariations = ['Payment Amount', 'PaymentAmount', 'Payment', 'Early Payment Amount', 'Payment_Amount'];
        
        let invoiceField = invoiceFieldVariations.find(field => sampleRecord.hasOwnProperty(field));
        let paymentField = paymentFieldVariations.find(field => sampleRecord.hasOwnProperty(field));
        
        console.log('💰 Using invoice field:', invoiceField);
        console.log('💰 Using payment field:', paymentField);
        
        const totalInvoice = apData.reduce((sum, item) => {
            const value = parseFloat(item[invoiceField]) || 0;
            return sum + value;
        }, 0);
        
        const totalPayment = apData.reduce((sum, item) => {
            const value = parseFloat(item[paymentField]) || 0;
            return sum + value;
        }, 0);
        
        const totalDiscount = totalInvoice - totalPayment;
        const invoiceCount = apData.length;

        console.log('📊 AP Metrics calculated:', {
            totalInvoice,
            totalPayment,
            totalDiscount,
            invoiceCount
        });

        document.getElementById('ap-total-invoice').textContent = formatCurrency(totalInvoice);
        document.getElementById('ap-total-payment').textContent = formatCurrency(totalPayment);
        document.getElementById('ap-discount-amount').textContent = formatCurrency(totalDiscount);
        document.getElementById('ap-invoice-count').textContent = invoiceCount;
    } catch (error) {
        console.error('❌ AP metrics update error:', error);
        showToast('error', 'Failed to update AP metrics: ' + error.message);
    }
}

function updateBatchFilters() {
    try {
        // Update AR batch filter
        const arBatches = [...new Set(arData.map(item => item['Batch ID']))].filter(Boolean);
        const arSelect = document.getElementById('ar-batch-filter');
        arSelect.innerHTML = '<option value="all">Select All</option>';
        arBatches.forEach(batch => {
            const option = document.createElement('option');
            option.value = batch;
            option.textContent = batch;
            arSelect.appendChild(option);
        });

        // Update AP batch filter
        const apBatches = [...new Set(apData.map(item => item['Batch_ID']))].filter(Boolean);
        const apSelect = document.getElementById('ap-batch-filter');
        apSelect.innerHTML = '<option value="all">Select All</option>';
        apBatches.forEach(batch => {
            const option = document.createElement('option');
            option.value = batch;
            option.textContent = batch;
            apSelect.appendChild(option);
        });
    } catch (error) {
        console.error('❌ Batch filter update error:', error);
        showToast('error', 'Failed to update batch filters');
    }
}

function updateDataTables() {
    updateARTable();
    updateAPTable();
}

function updateARTable() {
    try {
        const tbody = document.querySelector('#ar-data-table tbody');
        tbody.innerHTML = '';

        arData.forEach(item => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item['Batch ID'] || '-'}</td>
                <td>${item['Customer Name'] || '-'}</td>
                <td>${item['Invoice Number'] || '-'}</td>
                <td>${formatCurrency(item['Invoice Amount'] || 0)}</td>
                <td>${formatCurrency(item['Loan Amount'] || 0)}</td>
                <td><span class="status-badge ${item['Eligibility Status'] === 'Eligible' ? 'eligible' : 'not-eligible'}">${item['Eligibility Status'] || 'Pending'}</span></td>
            `;
        });
    } catch (error) {
        console.error('❌ AR table update error:', error);
        showToast('error', 'Failed to update AR table');
    }
}

function updateAPTable() {
    try {
        const tbody = document.querySelector('#ap-data-table tbody');
        tbody.innerHTML = '';

        if (!apData || apData.length === 0) {
            const row = tbody.insertRow();
            row.innerHTML = '<td colspan="6" style="text-align: center; padding: 2rem; color: var(--muted-foreground);">No AP data available</td>';
            return;
        }

        // Get field mappings from the first record
        const sampleRecord = apData[0];
        const invoiceFieldVariations = ['Invoice Amount', 'InvoiceAmount', 'Amount', 'Total Amount', 'Invoice_Amount'];
        const paymentFieldVariations = ['Payment Amount', 'PaymentAmount', 'Payment', 'Early Payment Amount', 'Payment_Amount'];
        const vendorFieldVariations = ['Vendor Name', 'VendorName', 'Vendor', 'Supplier Name', 'Vendor_Name'];
        
        const invoiceField = invoiceFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Invoice Amount';
        const paymentField = paymentFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Payment Amount';
        const vendorField = vendorFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Vendor Name';

        apData.forEach(item => {
            const invoiceAmount = parseFloat(item[invoiceField]) || 0;
            const paymentAmount = parseFloat(item[paymentField]) || 0;
            const discount = invoiceAmount - paymentAmount;
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item['Batch_ID'] || '-'}</td>
                <td>${item[vendorField] || '-'}</td>
                <td>${item['Invoice_Number'] || '-'}</td>
                <td>${formatCurrency(invoiceAmount)}</td>
                <td>${formatCurrency(paymentAmount)}</td>
                <td>${formatCurrency(discount)}</td>
            `;
        });
    } catch (error) {
        console.error('❌ AP table update error:', error);
        showToast('error', 'Failed to update AP table');
    }
}

// ===============================================
// CHART FUNCTIONS
// ===============================================

function initializeCharts() {
    createAllCharts();
}

function createAllCharts() {
    // Initialize AR charts
    // const arBarCtx = document.getElementById('ar-bar-chart').getContext('2d');
    // arBarChart = new Chart(arBarCtx, {
    //     type: 'bar',
    //     data: getARChartData(),
    //     options: getChartOptions('AR Bar Analysis')
    // });
    
    // const arPieCtx = document.getElementById('ar-pie-chart').getContext('2d');
    // arPieChart = new Chart(arPieCtx, {
    //     type: 'pie',
    //     data: getARChartData(),
    //     options: getPieChartOptions('AR Pie Analysis')
    // });
    
    const arLineCtx = document.getElementById('ar-line-chart').getContext('2d');
    arLineChart = new Chart(arLineCtx, {
        type: 'line',
        data: getARChartData(),
        options: getLineChartOptions('AR Line Analysis')
    });

    // Initialize AP charts
    // const apBarCtx = document.getElementById('ap-bar-chart').getContext('2d');
    // apBarChart = new Chart(apBarCtx, {
    //     type: 'bar',
    //     data: getAPChartData(),
    //     options: getChartOptions('AP Bar Analysis')
    // });
    
    // const apDoughnutCtx = document.getElementById('ap-doughnut-chart').getContext('2d');
    // apDoughnutChart = new Chart(apDoughnutCtx, {
    //     type: 'doughnut',
    //     data: getAPChartData(),
    //     options: getPieChartOptions('AP Doughnut Analysis')
    // });
    
    const apLineCtx = document.getElementById('ap-line-chart').getContext('2d');
    apLineChart = new Chart(apLineCtx, {
        type: 'line',
        data: getAPChartData(),
        options: getLineChartOptions('AP Line Analysis')
    });
}

// Get AR chart data with filtering support
function getARChartData() {
    const selectedBatch = document.getElementById('ar-batch-filter')?.value;
    let dataToUse = arData;
    
    // Apply batch filter if selected
    if (selectedBatch && selectedBatch !== 'all') {
        dataToUse = arData.filter(item => item['Batch ID'] === selectedBatch);
    }
    
    const batchData = {};
    dataToUse.forEach(item => {
        const batch = item['Batch ID'] || 'Unknown';
        if (!batchData[batch]) {
            batchData[batch] = { invoiceAmount: 0, loanAmount: 0, count: 0 };
        }
        batchData[batch].invoiceAmount += parseFloat(item['Invoice Amount']) || 0;
        batchData[batch].loanAmount += parseFloat(item['Loan Amount']) || 0;
        batchData[batch].count += 1;
    });

    const labels = Object.keys(batchData);
    const invoiceAmounts = labels.map(label => batchData[label].invoiceAmount);
    const loanAmounts = labels.map(label => batchData[label].loanAmount);

    return {
        labels: labels,
        datasets: [
            {
                label: 'Invoice Amount',
                data: invoiceAmounts,
                backgroundColor: 'hsla(221, 83%, 53%, 0.8)',
                borderColor: 'hsl(221, 83%, 53%)',
                borderWidth: 1
            },
            {
                label: 'Loan Amount',
                data: loanAmounts,
                backgroundColor: 'hsla(142, 76%, 36%, 0.8)',
                borderColor: 'hsl(142, 76%, 36%)',
                borderWidth: 1
            }
        ]
    };
}

// Get AP chart data with filtering support
function getAPChartData() {
    const selectedBatch = document.getElementById('ap-batch-filter')?.value;
    let dataToUse = apData;
    
    // Apply batch filter if selected
    if (selectedBatch && selectedBatch !== 'all') {
        dataToUse = apData.filter(item => item['Batch_ID'] === selectedBatch);
    }
    
    if (!dataToUse || dataToUse.length === 0) {
        return {
            labels: ['No Data'],
            datasets: [{
                label: 'No Data Available',
                data: [0],
                backgroundColor: 'hsla(220, 13%, 91%, 0.8)',
                borderColor: 'hsl(220, 13%, 91%)',
                borderWidth: 1
            }]
        };
    }

    // Get field mappings dynamically
    const sampleRecord = dataToUse[0];
    const invoiceFieldVariations = ['Invoice Amount', 'InvoiceAmount', 'Amount', 'Total Amount', 'Invoice_Amount'];
    const paymentFieldVariations = ['Payment Amount', 'PaymentAmount', 'Payment', 'Early Payment Amount', 'Payment_Amount'];
    
    const invoiceField = invoiceFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Invoice Amount';
    const paymentField = paymentFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Payment Amount';
    
    const batchData = {};
    dataToUse.forEach(item => {
        const batch = item['Batch_ID'] || 'Unknown';
        if (!batchData[batch]) {
            batchData[batch] = { invoiceAmount: 0, paymentAmount: 0, discountAmount: 0, count: 0 };
        }
        const invoiceAmt = parseFloat(item[invoiceField]) || 0;
        const paymentAmt = parseFloat(item[paymentField]) || 0;
        
        batchData[batch].invoiceAmount += invoiceAmt;
        batchData[batch].paymentAmount += paymentAmt;
        batchData[batch].discountAmount += (invoiceAmt - paymentAmt);
        batchData[batch].count += 1;
    });

    const labels = Object.keys(batchData);
    const invoiceAmounts = labels.map(label => batchData[label].invoiceAmount);
    const paymentAmounts = labels.map(label => batchData[label].paymentAmount);
    const discountAmounts = labels.map(label => batchData[label].discountAmount);

    return {
        labels: labels,
        datasets: [
            {
                label: 'Invoice_Amount',
                data: invoiceAmounts,
                backgroundColor: 'hsla(221, 83%, 53%, 0.8)',
                borderColor: 'hsl(221, 83%, 53%)',
                borderWidth: 1
            },
            {
                label: 'Payment_Amount',
                data: paymentAmounts,
                backgroundColor: 'hsla(142, 76%, 36%, 0.8)',
                borderColor: 'hsl(142, 76%, 36%)',
                borderWidth: 1
            },
            {
                label: 'Discount_Amount',
                data: discountAmounts,
                backgroundColor: 'hsla(38, 92%, 50%, 0.8)',
                borderColor: 'hsl(38, 92%, 50%)',
                borderWidth: 1
            }
        ]
    };
}

// Chart options
function getChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title,
                font: { size: 16, weight: 'bold' }
            },
            legend: {
                position: 'bottom'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return '$' + value.toLocaleString();
                    }
                }
            }
        }
    };
}

function getPieChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title,
                font: { size: 16, weight: 'bold' }
            },
            legend: {
                position: 'bottom'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.label + ': $' + context.parsed.toLocaleString();
                    }
                }
            }
        }
    };
}

function getLineChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title,
                font: { size: 16, weight: 'bold' }
            },
            legend: {
                position: 'bottom'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return '$' + value.toLocaleString();
                    }
                }
            }
        },
        elements: {
            line: {
                tension: 0.4
            }
        }
    };
}

// Update all charts
function updateAllCharts() {
    // Update AR charts
    if (arBarChart) {
        arBarChart.data = getARChartData();
        arBarChart.update();
    }
    if (arPieChart) {
        arPieChart.data = getARChartData();
        arPieChart.update();
    }
    if (arLineChart) {
        arLineChart.data = getARChartData();
        arLineChart.update();
    }
    
    // Update AP charts
    if (apBarChart) {
        apBarChart.data = getAPChartData();
        apBarChart.update();
    }
    if (apDoughnutChart) {
        apDoughnutChart.data = getAPChartData();
        apDoughnutChart.update();
    }
    if (apLineChart) {
        apLineChart.data = getAPChartData();
        apLineChart.update();
    }
}

// ===============================================
// TAB SWITCHING
// ===============================================

function switchTab(tabName) {
    try {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        event.target.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Refresh charts when switching tabs
        setTimeout(() => {
            updateAllCharts();
        }, 100);
    } catch (error) {
        console.error('❌ Tab switching error:', error);
        showToast('error', 'Failed to switch tabs');
    }
}

// ===============================================
// FILTERING FUNCTIONS
// ===============================================

function filterARData() {
    try {
        const selectedBatch = document.getElementById('ar-batch-filter').value;
        let filteredData = arData;

        if (selectedBatch !== 'all') {
            filteredData = arData.filter(item => item['Batch ID'] === selectedBatch);
        }

        // Update metrics with filtered data
        const totalLoan = filteredData.reduce((sum, item) => sum + (parseFloat(item['Loan Amount']) || 0), 0);
        const totalInvoice = filteredData.reduce((sum, item) => sum + (parseFloat(item['Invoice Amount']) || 0), 0);
        const eligibleCount = filteredData.filter(item => item['Eligibility Status'] === 'Eligible').length;

        document.getElementById('ar-total-loan').textContent = formatCurrency(totalLoan);
        document.getElementById('ar-total-invoice').textContent = formatCurrency(totalInvoice);
        document.getElementById('ar-eligible-count').textContent = eligibleCount;

        // Update charts when filtering
        updateAllCharts();
        const tbody = document.querySelector('#ar-data-table tbody');
        tbody.innerHTML = '';
        filteredData.forEach(item => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item['Batch ID'] || '-'}</td>
                <td>${item['Customer Name'] || '-'}</td>
                <td>${item['Invoice Number'] || '-'}</td>
                <td>${formatCurrency(item['Invoice Amount'] || 0)}</td>
                <td>${formatCurrency(item['Loan Amount'] || 0)}</td>
                <td><span class="status-badge ${item['Eligibility Status'] === 'Eligible' ? 'eligible' : 'not-eligible'}">${item['Eligibility Status'] || 'Pending'}</span></td>
            `;
        });
    } catch (error) {
        console.error('❌ AR filtering error:', error);
        showToast('error', 'Failed to filter AR data');
    }
}

function filterAPData() {
    try {
        const selectedBatch = document.getElementById('ap-batch-filter').value;
        let filteredData = apData;

        if (selectedBatch !== 'all') {
            filteredData = apData.filter(item => item['Batch_ID'] === selectedBatch);
        }

        if (!filteredData || filteredData.length === 0) {
            document.getElementById('ap-total-invoice').textContent = '$0';
            document.getElementById('ap-total-payment').textContent = '$0';
            document.getElementById('ap-discount-amount').textContent = '$0';
            document.getElementById('ap-invoice-count').textContent = '0';
            updateAllCharts();
            return;
        }

        // Get field mappings dynamically
        const sampleRecord = filteredData[0];
        const invoiceFieldVariations = ['Invoice_Amount'];
        const paymentFieldVariations = ['Payment_Amount'];
        const vendorFieldVariations = ['Vendor_Name'];
        
        const invoiceField = invoiceFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Invoice_Amount';
        const paymentField = paymentFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Payment_Amount';
        const vendorField = vendorFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Vendor_Name';

        // Update metrics with filtered data
        const totalInvoice = filteredData.reduce((sum, item) => sum + (parseFloat(item[invoiceField]) || 0), 0);
        const totalPayment = filteredData.reduce((sum, item) => sum + (parseFloat(item[paymentField]) || 0), 0);
        const totalDiscount = totalInvoice - totalPayment;
        const invoiceCount = filteredData.length;

        document.getElementById('ap-total-invoice').textContent = formatCurrency(totalInvoice);
        document.getElementById('ap-total-payment').textContent = formatCurrency(totalPayment);
        document.getElementById('ap-discount-amount').textContent = formatCurrency(totalDiscount);
        document.getElementById('ap-invoice-count').textContent = invoiceCount;

        // Update charts when filtering
        updateAllCharts();
        const tbody = document.querySelector('#ap-data-table tbody');
        tbody.innerHTML = '';
        filteredData.forEach(item => {
            const invoiceAmount = parseFloat(item[invoiceField]) || 0;
            const paymentAmount = parseFloat(item[paymentField]) || 0;
            const discount = invoiceAmount - paymentAmount;
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item['Batch_ID'] || '-'}</td>
                <td>${item[vendorField] || '-'}</td>
                <td>${item['Invoice_Number'] || '-'}</td>
                <td>${formatCurrency(invoiceAmount)}</td>
                <td>${formatCurrency(paymentAmount)}</td>
                <td>${formatCurrency(discount)}</td>
            `;
        });
    } catch (error) {
        console.error('❌ AP filtering error:', error);
        showToast('error', 'Failed to filter AP data');
    }
}

// ===============================================
// FILE HANDLING FUNCTIONS
// ===============================================

function handleFileSelect(type) {
    try {
        const fileInput = document.getElementById(`${type}-file-input`);
        const file = fileInput.files[0];
        const uploadArea = fileInput.parentElement;

        if (file) {
            // Validate file type
            const validTypes = ['.xlsx', '.xls', '.csv'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!validTypes.includes(fileExtension)) {
                showToast('error', 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files only.');
                fileInput.value = '';
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                showToast('error', 'File too large. Please upload files smaller than 10MB.');
                fileInput.value = '';
                return;
            }

            selectedFiles[type] = file;
            uploadArea.classList.add('has-file');
            uploadArea.querySelector('p').textContent = `Selected: ${file.name}`;
            uploadArea.querySelector('i').className = 'fas fa-file-check';
            
            showToast('success', `File "${file.name}" selected successfully!`);
        } else {
            selectedFiles[type] = null;
            uploadArea.classList.remove('has-file');
            uploadArea.querySelector('p').textContent = 'Click to upload Excel/CSV file';
            uploadArea.querySelector('i').className = 'fas fa-cloud-upload-alt';
        }
    } catch (error) {
        console.error('❌ File selection error:', error);
        showToast('error', 'Error selecting file');
    }
}

// 🔥 FILE UPLOAD FUNCTION - INTEGRATE WITH YOUR AIRTABLE
async function uploadFile(type) {
    try {
        const file = selectedFiles[type];
        if (!file) {
            showToast('warning', 'Please select a file first');
            return;
        }

        const uploadBtn = document.querySelector(`#${type}-tab .upload-btn`);
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        // Read and parse file
        const fileData = await readFile(file);
        const parsedData = parseFileData(fileData, type);

        if (!parsedData || parsedData.length === 0) {
            throw new Error('No valid data found in file');
        }

        // Validate data structure
        const validationResult = validateUploadData(parsedData, type);
        if (!validationResult.isValid) {
            throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
        }

        // 🔥 UPLOAD TO AIRTABLE
        const tableName = type === 'ar' ? AIRTABLE_CONFIG.TABLES.AR_IMPORT : AIRTABLE_CONFIG.TABLES.AP_IMPORT;
        const success = await uploadToAirtable(tableName, parsedData);

        if (success) {
            // Reset file selection
            selectedFiles[type] = null;
            document.getElementById(`${type}-file-input`).value = '';
            const uploadArea = document.querySelector(`#${type}-tab .file-upload-area`);
            uploadArea.classList.remove('has-file');
            uploadArea.querySelector('p').textContent = 'Click to upload Excel/CSV file';
            uploadArea.querySelector('i').className = 'fas fa-cloud-upload-alt';

            // Show success message
            showThankYouMessage(type);
            
            // Refresh data
            setTimeout(() => {
                loadInitialData();
            }, 2000);
        }

    } catch (error) {
        console.error('❌ File upload error:', error);
        showToast('error', `Upload failed: ${error.message}`);
    } finally {
        // Reset button
        const uploadBtn = document.querySelector(`#${type}-tab .upload-btn`);
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = 'Upload to System';
    }
}

// File reading utility
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Parse CSV/Excel data with enhanced field mapping for Airtable
function parseFileData(data, type) {
    try {
        console.log('🔍 Parsing file data for type:', type);
        
        // Handle CSV parsing with better delimiter detection
        const lines = data.trim().split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('File must contain at least a header row and one data row');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
        console.log('📋 Detected headers:', headers);
        
        // Define required fields for each type based on Airtable structure
        const expectedHeaders = type === 'ar' 
            ? ['Batch ID', 'Customer Name', 'Customer Email', 'Invoice Number', 'Invoice Date', 'Invoice Amount', 'Due Date']
            : ['Batch_ID', 'Vendor_ID', 'Vendor_Name', 'Vendor_Email', 'Invoice_Number', 'Invoice_Date', 'Invoice_Amount', 'Due_Date'];

        // Check for required headers
        const missingHeaders = expectedHeaders.filter(header => 
            !headers.some(h => h.toLowerCase().includes(header.toLowerCase()) || 
                              header.toLowerCase().includes(h.toLowerCase()))
        );
        
        if (missingHeaders.length > 0) {
            console.error('❌ Missing headers:', missingHeaders);
            console.log('📋 Available headers:', headers);
            throw new Error(`Missing required columns: ${missingHeaders.join(', ')}\nAvailable columns: ${headers.join(', ')}`);
        }

        const parsedData = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines
            
            // Better CSV parsing that handles commas in quoted values
            const values = parseCSVLine(lines[i]);
            const record = {};
            
            headers.forEach((header, index) => {
                const value = values[index] ? values[index].trim() : '';
                record[header] = value;
            });
            
            // Convert and validate data types
            try {
                if (record['Invoice Amount']) {
                    const amount = parseFloat(record['Invoice Amount'].replace(/[,$]/g, ''));
                    record['Invoice Amount'] = isNaN(amount) ? 0 : amount;
                }
                
                // Validate and format date fields for Airtable
                if (record['Invoice Date']) {
                    record['Invoice Date'] = formatDateForAirtable(record['Invoice Date']);
                }
                if (record['Due Date']) {
                    record['Due Date'] = formatDateForAirtable(record['Due Date']);
                }
                
            } catch (err) {
                console.warn(`⚠️ Data conversion warning for row ${i + 1}:`, err.message);
            }
            
            // Only add records with required fields
            if (record['Batch ID'] && record['Invoice Number']) {
                parsedData.push(record);
            } else {
                console.warn(`⚠️ Skipping row ${i + 1}: Missing required fields (Batch ID or Invoice Number)`);
            }
        }

        console.log('✅ Successfully parsed', parsedData.length, 'records');
        return parsedData;
        
    } catch (error) {
        console.error('❌ File parsing error:', error);
        throw error;
    }
}

// Helper function to parse CSV line with quoted values
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current); // Add the last field
    return result;
}

// Format date for Airtable compatibility
function formatDateForAirtable(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
        }
        
        // Return in YYYY-MM-DD format (Airtable preferred)
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.warn('Date formatting warning:', error.message, 'for date:', dateString);
        return dateString; // Return original if can't format
    }
}

// Validate upload data with enhanced checks
function validateUploadData(data, type) {
    const errors = [];
    
    console.log('🔍 Validating', data.length, 'records for', type.toUpperCase());
    
    data.forEach((record, index) => {
        const rowNum = index + 2; // Add 2 because index starts at 0 and we skip header
        
        // Check required fields
        
        
        // Type-specific validations
        if (type === 'ar') {
            if (!record['Customer Name'] || record['Customer Name'].trim() === '') {
                errors.push(`Row ${rowNum}: Missing Customer Name`);
            }
            if (record['Customer Email'] && !isValidEmail(record['Customer Email'])) {
                errors.push(`Row ${rowNum}: Invalid Customer Email format`);
            }
                if (record['Invoice Date'] && !isValidDate(record['Invoice Date'])) {
            errors.push(`Row ${rowNum}: Invalid Invoice Date format (use YYYY-MM-DD, MM/DD/YYYY, or similar)`);
        }
        if (!record['Batch ID'] || record['Batch ID'].trim() === '') {
            errors.push(`Row ${rowNum}: Missing Batch ID`);
        }
        
        if (!record['Invoice Number'] || record['Invoice Number'].trim() === '') {
            errors.push(`Row ${rowNum}: Missing Invoice Number`);
        }
        
        if (!record['Invoice Amount'] || isNaN(parseFloat(record['Invoice Amount']))) {
            errors.push(`Row ${rowNum}: Invalid or missing Invoice Amount`);
        }
        
        if (record['Due Date'] && !isValidDate(record['Due Date'])) {
            errors.push(`Row ${rowNum}: Invalid Due Date format (use YYYY-MM-DD, MM/DD/YYYY, or similar)`);
        }
        } else if (type === 'ap') {
            if (!record['Vendor_Name'] || record['Vendor_Name'].trim() === '') {
                errors.push(`Row ${rowNum}: Missing Vendor Name`);
            }
            if (!record['Vendor_ID'] || record['Vendor_ID'].trim() === '') {
                errors.push(`Row ${rowNum}: Missing Vendor ID`);
            }
            if (record['Vendor_Email'] && !isValidEmail(record['Vendor_Email'])) {
                errors.push(`Row ${rowNum}: Invalid Vendor Email format`);
            }
            if (record['Invoice_Date'] && !isValidDate(record['Invoice_Date'])) {
            errors.push(`Row ${rowNum}: Invalid Invoice Date format (use YYYY-MM-DD, MM/DD/YYYY, or similar)`);
        }
         if (!record['Batch_ID'] || record['Batch_ID'].trim() === '') {
            errors.push(`Row ${rowNum}: Missing Batch_ID`);
        }
        
        if (!record['Invoice_Number'] || record['Invoice_Number'].trim() === '') {
            errors.push(`Row ${rowNum}: Missing Invoice_Number`);
        }
        
        if (!record['Invoice_Amount'] || isNaN(parseFloat(record['Invoice_Amount']))) {
            errors.push(`Row ${rowNum}: Invalid or missing Invoice_Amount`);
        }
        
        if (record['Due_Date'] && !isValidDate(record['Due_Date'])) {
            errors.push(`Row ${rowNum}: Invalid Due Date format (use YYYY-MM-DD, MM/DD/YYYY, or similar)`);
        }
        }
        
        // Date validation
        if (record['Invoice Date'] && !isValidDate(record['Invoice Date'])) {
            errors.push(`Row ${rowNum}: Invalid Invoice Date format (use YYYY-MM-DD, MM/DD/YYYY, or similar)`);
        }
        
        if (record['Due Date'] && !isValidDate(record['Due Date'])) {
            errors.push(`Row ${rowNum}: Invalid Due Date format (use YYYY-MM-DD, MM/DD/YYYY, or similar)`);
        }
         
    });
    
    // Limit error display to first 10 errors to avoid overwhelming the user
    const displayErrors = errors.slice(0, 10);
    if (errors.length > 10) {
        displayErrors.push(`... and ${errors.length - 10} more errors`);
    }
    
    return {
        isValid: errors.length === 0,
        errors: displayErrors
    };
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.trim() !== '';
}

// ===============================================
// SAMPLE FILE DOWNLOAD
// ===============================================

function downloadSample(type) {
    try {
        let csvContent = '';
        
        if (type === 'ar') {
            csvContent = `Batch ID,Customer Name,Customer email,Invoice Number,Invoice Date,Invoice Amount,Due Date
AR001,ABC Corporation,contact@abc.com,INV-2024-001,2024-01-15,25000.00,2024-02-15
AR001,XYZ Ltd,info@xyz.com,INV-2024-002,2024-01-20,18500.50,2024-02-20
AR002,Tech Solutions Inc,admin@techsol.com,INV-2024-003,2024-01-25,32000.00,2024-02-25`;
        } else {
            csvContent = `Batch ID,Vendor ID,Vendor Name,Vendor email,Invoice Number,Invoice Date,Invoice Amount,Due Date
AP001,V001,Supplier Corp,billing@supplier.com,BILL-2024-001,2024-01-10,15000.00,2024-02-10
AP001,V002,Service Provider Ltd,accounts@service.com,BILL-2024-002,2024-01-12,22500.75,2024-02-12
AP002,V003,Equipment Rental Inc,finance@equipment.com,BILL-2024-003,2024-01-15,8750.25,2024-02-15`;
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const filename = `${type.toUpperCase()}_Sample_Template.csv`;
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        showToast('success', `Sample ${type.toUpperCase()} template downloaded!`);
    } catch (error) {
        console.error('❌ Sample download error:', error);
        showToast('error', 'Failed to download sample template');
    }
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) return '$0';
    return '$' + Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// ===============================================
// TOAST NOTIFICATION SYSTEM
// ===============================================

function showToast(type, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function showThankYouMessage(type) {
    const typeText = type.toUpperCase();
    showToast('success', `🎉 Thank you! Your ${typeText} data has been uploaded successfully and is being processed.`);
}

// ===============================================
// TOOLTIP SYSTEM
// ===============================================

function initializeTooltips() {
    const tooltip = document.getElementById('tooltip');
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const text = e.target.getAttribute('data-tooltip');
            tooltip.textContent = text;
            tooltip.classList.add('show');
            
            // Position tooltip
            const rect = e.target.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });
    });
}