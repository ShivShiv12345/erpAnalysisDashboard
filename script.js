// ===============================================
// AIRTABLE CONFIGURATION - REPLACE WITH YOUR DETAILS
// ===============================================

/* 
🔥 AIRTABLE INTEGRATION SETUP 🔥

Replace these placeholder values with your actual Airtable credentials:

1. Get your API key from: https://airtable.com/account
2. Get your base ID from your Airtable URL: https://airtable.com/[BASE_ID]/...
3. Update table names to match your Airtable exactly

*/

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
let arLineChart = null;
let apLineChart = null;
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
        // Update AR batch filters for data table
        const arBatches = [...new Set(arData.map(item => item['Batch ID']))].filter(Boolean);
        const arTableSelect = document.getElementById('ar-table-batch-filter');
        if (arTableSelect) {
            arTableSelect.innerHTML = '<option value="all">Select All</option>';
            arBatches.forEach(batch => {
                const option = document.createElement('option');
                option.value = batch;
                option.textContent = batch;
                arTableSelect.appendChild(option);
            });
        }

        // Update AP batch filters for data table
        const apBatches = [...new Set(apData.map(item => item['Batch_ID']))].filter(Boolean);
        const apTableSelect = document.getElementById('ap-table-batch-filter');
        if (apTableSelect) {
            apTableSelect.innerHTML = '<option value="all">Select All</option>';
            apBatches.forEach(batch => {
                const option = document.createElement('option');
                option.value = batch;
                option.textContent = batch;
                apTableSelect.appendChild(option);
            });
        }

        // Update financial year filters
        const currentYear = new Date().getFullYear();
        const arYearSelect = document.getElementById('ar-financial-year');
        const apYearSelect = document.getElementById('ap-financial-year');
        
        if (arYearSelect) {
            arYearSelect.innerHTML = '<option value="all">All Years</option>';
            for (let year = currentYear - 3; year <= currentYear + 1; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `FY ${year}-${(year + 1).toString().slice(-2)}`;
                arYearSelect.appendChild(option);
            }
        }

        if (apYearSelect) {
            apYearSelect.innerHTML = '<option value="all">All Years</option>';
            for (let year = currentYear - 3; year <= currentYear + 1; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `FY ${year}-${(year + 1).toString().slice(-2)}`;
                apYearSelect.appendChild(option);
            }
        }
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
        
        const invoiceField = invoiceFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Invoice_Amount';
        const paymentField = paymentFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Payment_Amount';
        const vendorField = vendorFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Vendor_Name';

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
    // Initialize only line charts for analysis
    const arLineCtx = document.getElementById('ar-line-chart').getContext('2d');
    arLineChart = new Chart(arLineCtx, {
        type: 'line',
        data: getARTimeSeriesData(),
        options: getLineChartOptions('AR Monthly Analysis')
    });

    const apLineCtx = document.getElementById('ap-line-chart').getContext('2d');
    apLineChart = new Chart(apLineCtx, {
        type: 'line',
        data: getAPTimeSeriesData(),
        options: getLineChartOptions('AP Monthly Analysis')
    });
}

function getARTimeSeriesData(data = arData) {
    const monthlyData = {};
    
    data.forEach(item => {
        const invoiceDate = item['Invoice Date'];
        if (invoiceDate) {
            const monthKey = invoiceDate.substring(0, 7); // YYYY-MM format
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { loan: 0, invoice: 0, count: 0 };
            }
            monthlyData[monthKey].loan += parseFloat(item['Loan Amount']) || 0;
            monthlyData[monthKey].invoice += parseFloat(item['Invoice Amount']) || 0;
            monthlyData[monthKey].count += 1;
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    
    return {
        labels: sortedMonths,
        datasets: [{
            label: 'Invoice Amount',
            data: sortedMonths.map(month => monthlyData[month].invoice),
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6
        }, {
            label: 'Loan Amount',
            data: sortedMonths.map(month => monthlyData[month].loan),
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };
}

function getAPTimeSeriesData(data = apData) {
    const monthlyData = {};
    
    data.forEach(item => {
        const invoiceDate = item['Invoice_Date'];
        if (invoiceDate) {
            const monthKey = invoiceDate.substring(0, 7); // YYYY-MM format
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { payment: 0, invoice: 0, count: 0 };
            }
            
            // Try different field name variations
            const invoiceFieldVariations = ['Invoice Amount', 'InvoiceAmount', 'Amount', 'Total Amount', 'Invoice_Amount'];
            const paymentFieldVariations = ['Payment Amount', 'PaymentAmount', 'Payment', 'Early Payment Amount', 'Payment_Amount'];
            
            const invoiceField = invoiceFieldVariations.find(field => item.hasOwnProperty(field)) || 'Invoice_Amount';
            const paymentField = paymentFieldVariations.find(field => item.hasOwnProperty(field)) || 'Payment_Amount';
            
            monthlyData[monthKey].payment += parseFloat(item[paymentField]) || 0;
            monthlyData[monthKey].invoice += parseFloat(item[invoiceField]) || 0;
            monthlyData[monthKey].count += 1;
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    
    return {
        labels: sortedMonths,
        datasets: [{
            label: 'Invoice_Amount',
            data: sortedMonths.map(month => monthlyData[month].invoice),
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6
        }, {
            label: 'Payment_Amount',
            data: sortedMonths.map(month => monthlyData[month].payment),
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };
}

function getLineChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    boxWidth: 12,
                    padding: 15,
                    font: {
                        size: 11
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return formatCurrency(value);
                    },
                    font: {
                        size: 10
                    }
                }
            },
            x: {
                ticks: {
                    font: {
                        size: 10
                    }
                }
            }
        },
        elements: {
            point: {
                radius: 4,
                hoverRadius: 6
            }
        }
    };
}

// ===============================================
// FILTER FUNCTIONS
// ===============================================

// Filter functions for different sections
function filterARAnalysis() {
    const fromDate = document.getElementById('ar-from-date').value;
    const toDate = document.getElementById('ar-to-date').value;
    const financialYear = document.getElementById('ar-financial-year').value;
    
    let filteredData = arData;
    
    if (financialYear && financialYear !== 'all') {
        const yearStart = `${financialYear}-04-01`;
        const yearEnd = `${parseInt(financialYear) + 1}-03-31`;
        filteredData = arData.filter(item => {
            const invoiceDate = item['Invoice Date'];
            return invoiceDate >= yearStart && invoiceDate <= yearEnd;
        });
    } else if (fromDate && toDate) {
        filteredData = arData.filter(item => {
            const invoiceDate = item['Invoice Date'];
            return invoiceDate >= fromDate && invoiceDate <= toDate;
        });
    }
    
    // Update only line chart with filtered data
    if (arLineChart) {
        arLineChart.data = getARTimeSeriesData(filteredData);
        arLineChart.update();
    }
}

function filterAPAnalysis() {
    const fromDate = document.getElementById('ap-from-date').value;
    const toDate = document.getElementById('ap-to-date').value;
    const financialYear = document.getElementById('ap-financial-year').value;
    
    let filteredData = apData;
    
    if (financialYear && financialYear !== 'all') {
        const yearStart = `${financialYear}-04-01`;
        const yearEnd = `${parseInt(financialYear) + 1}-03-31`;
        filteredData = apData.filter(item => {
            const invoiceDate = item['Invoice_Date'];
            return invoiceDate >= yearStart && invoiceDate <= yearEnd;
        });
    } else if (fromDate && toDate) {
        filteredData = apData.filter(item => {
            const invoiceDate = item['Invoice_Date'];
            return invoiceDate >= fromDate && invoiceDate <= toDate;
        });
    }
    
    // Update only line chart with filtered data
    if (apLineChart) {
        apLineChart.data = getAPTimeSeriesData(filteredData);
        apLineChart.update();
    }
}

function filterARDataTable() {
    const selectedBatch = document.getElementById('ar-table-batch-filter').value;
    let filteredData = arData;
    
    if (selectedBatch !== 'all') {
        filteredData = arData.filter(item => item['Batch ID'] === selectedBatch);
    }
    
    updateFilteredARTable(filteredData);
}

function filterAPDataTable() {
    const selectedBatch = document.getElementById('ap-table-batch-filter').value;
    let filteredData = apData;
    
    if (selectedBatch !== 'all') {
        filteredData = apData.filter(item => item['Batch_ID'] === selectedBatch);
    }
    
    updateFilteredAPTable(filteredData);
}

function updateFilteredARTable(filteredData) {
    try {
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
        console.error('❌ Filtered AR table update error:', error);
    }
}

function updateFilteredAPTable(filteredData) {
    try {
        const tbody = document.querySelector('#ap-data-table tbody');
        tbody.innerHTML = '';

        if (!filteredData || filteredData.length === 0) {
            const row = tbody.insertRow();
            row.innerHTML = '<td colspan="6" style="text-align: center; padding: 2rem; color: var(--muted-foreground);">No data matches the filter</td>';
            return;
        }

        const sampleRecord = filteredData[0];
        const invoiceFieldVariations = ['Invoice Amount', 'InvoiceAmount', 'Amount', 'Total Amount', 'Invoice_Amount'];
        const paymentFieldVariations = ['Payment Amount', 'PaymentAmount', 'Payment', 'Early Payment Amount', 'Payment_Amount'];
        const vendorFieldVariations = ['Vendor Name', 'VendorName', 'Vendor', 'Supplier Name', 'Vendor_Name'];
        
        const invoiceField = invoiceFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Invoice Amount';
        const paymentField = paymentFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Payment Amount';
        const vendorField = vendorFieldVariations.find(field => sampleRecord.hasOwnProperty(field)) || 'Vendor Name';

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
        console.error('❌ Filtered AP table update error:', error);
    }
}

// ===============================================
// TAB SWITCHING
// ===============================================

function switchTab(tabName) {
    console.log('🔄 Switching to tab:', tabName);
    
    // Hide all tab contents
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Show selected tab and activate button
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');

    // Initialize charts for the active tab if not already done
    if (tabName === 'ar' && !arLineChart) {
        setTimeout(() => initializeCharts(), 100);
    } else if (tabName === 'ap' && !apLineChart) {
        setTimeout(() => initializeCharts(), 100);
    }
    
    // Resize charts when tab is shown
    setTimeout(() => {
        if (tabName === 'ar' && arLineChart) {
            arLineChart.resize();
        } else if (tabName === 'ap' && apLineChart) {
            apLineChart.resize();
        }
    }, 100);
    
    // Refresh data tables
    updateDataTables();
}


// ===============================================
// UTILITY FUNCTIONS
// ===============================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

function showToast(type, message) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = event.target.getAttribute('data-tooltip');
    
    document.body.appendChild(tooltip);
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
}

function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}