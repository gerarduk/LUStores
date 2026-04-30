# Reports Page Enhancements

## Recent Additions

### 1. Bulk Selection & Mark as Paid
- **Feature**: Checkbox-based bulk selection for marking multiple sales as paid at once
- **Implementation**:
  - Added `selectedSales` state to track selected sale IDs
  - Added `bulkMarkAsPaidMutation` to handle batch operations
  - Added `toggleSaleSelection` and `toggleSelectAll` helper functions
  - Visual feedback with blue highlighting for selected items
  - Bulk action toolbar showing selection count
- **Benefits**: 
  - Reduces time to mark multiple sales as paid
  - Batch operations are more efficient than individual calls
  - Select-all checkbox per charge code for quick selection

---

## Suggested Visualizations & Features

### 1. **Payment Status Dashboard** ⭐⭐⭐ (HIGH PRIORITY)
- **Visual**: Donut/Pie chart showing Paid vs Unpaid split
- **Data**: Count and value of paid/unpaid sales
- **API Required**: Already available (isPaid field)
- **Benefits**: Quick overview of outstanding payments
- **Suggested Location**: Top of sales summary section

```
Example:
  Paid: 45 sales / £15,234
  Unpaid: 12 sales / £4,567
```

### 2. **Sales Trend Graph** ⭐⭐⭐ (HIGH PRIORITY)
- **Visual**: Line chart showing daily/weekly/monthly sales trend
- **Data**: Sales amount over time from `salesOverTime` (already calculated)
- **Library**: Could use Recharts (already in dependencies)
- **Benefits**: Identify patterns, seasonal trends
- **Suggested Location**: Below department summary

### 3. **Top Performing Items by Revenue** ⭐⭐ (MEDIUM PRIORITY)
- **Visual**: Horizontal bar chart
- **Data**: Top 10 items by total revenue
- **API Required**: `/api/sales/analytics/most-sold-items` endpoint (just created)
- **Benefits**: Identify best sellers, revenue drivers
- **Enhancement**: Color-code by category

### 4. **Category Performance Breakdown** ⭐⭐ (MEDIUM PRIORITY)
- **Visual**: Pie/Donut chart or bar chart
- **Data**: Group top items by category, show revenue per category
- **API Required**: Combine categoryStats with sales data
- **Benefits**: Understand category contribution to revenue

### 5. **Payment Terms Analysis** ⭐⭐ (MEDIUM PRIORITY)
- **Visual**: Timeline/calendar heatmap
- **Data**: Days to payment (createdAt vs markAsPaid date)
- **Benefits**: Identify slow-paying departments
- **Suggested Location**: Separate "Payment Analytics" tab

### 6. **Department Performance Scorecard** ⭐⭐ (MEDIUM PRIORITY)
- **Visual**: Table with sortable columns
- **Metrics**:
  - Total Sales Count & Amount
  - Average Sale Value
  - Payment Rate (% of sales paid)
  - Average Payment Time
  - Most Ordered Item
- **Benefits**: Comprehensive departmental analysis

### 7. **Inventory Impact Report** ⭐ (LOW-MEDIUM PRIORITY)
- **Visual**: Stock level before/after sales period
- **Data**: Link sales items to inventory changes
- **Benefits**: Understand inventory turnover
- **Enhancement**: Flag items needing reorder

### 8. **Customer/Charge Code Analysis** ⭐⭐ (MEDIUM PRIORITY)
- **Visual**: Top 10 customers by volume, with growth indicators
- **Data**: Already available through `salesReport.data.departmentSummary`
- **Enhancements**:
  - Add sparkline showing trend
  - Add customer contact info
  - Flag high-value customers

### 9. **Export & Report Generation** ⭐⭐ (MEDIUM PRIORITY)
- **Features**:
  - PDF report generation (daily/weekly/monthly)
  - Email delivery option
  - Scheduled reports
  - Custom date range exports
- **Library**: Use existing pdf-parse or add library like `pdfkit`

### 10. **Comparative Analysis** ⭐ (LOW PRIORITY)
- **Feature**: Compare two time periods side-by-side
- **Metrics**: Growth rate, variance percentage
- **Use Case**: Month-over-month or year-over-year analysis

### 11. **Forecasting/Targets** ⭐ (LOW PRIORITY)
- **Visual**: Budget vs Actual visualization
- **Data**: Compare sales to target goals (if targets exist)
- **Benefits**: Track KPI achievement

### 12. **Real-time Alerts** ⭐⭐ (MEDIUM PRIORITY)
- **Features**:
  - Alert when high-value sale is unpaid (>£1000?)
  - Alert when department exceeds monthly budget
  - Alert when item stock drops below minimum
- **Implementation**: Toast notifications or banner alerts

---

## Technical Notes

### Dependencies Already Available:
- `recharts`: Charts and visualizations
- `date-fns`: Date manipulation
- `xlsx`: Excel export

### Backend Endpoints Ready:
- `GET /api/dashboard/stats` - Overall statistics
- `GET /api/dashboard/category-stats` - Category breakdown
- `GET /api/sales/reports` - Detailed sales data
- `GET /api/sales/analytics/most-sold-items` - Top items analysis
- `GET /api/stock-movements` - Stock change history

### Data Already Calculated:
- `topItemsByValue` - Items by revenue
- `itemsByChargeCode` - Items grouped by charge code
- `itemAnalysis` - Detailed item metrics
- `salesOverTime` - Daily sales trend

---

## Implementation Priority

1. **Phase 1 (Week 1)**: Payment Status Dashboard, Sales Trend Graph
2. **Phase 2 (Week 2)**: Top Items Chart, Department Performance Scorecard
3. **Phase 3 (Week 3)**: Category Analysis, Export Features
4. **Phase 4**: Forecasting, Real-time Alerts

---

## Component Structure Suggestion

```
<Reports>
  ├── <DashboardSummary> (stats cards)
  ├── <PaymentStatusChart> (pie chart: paid vs unpaid)
  ├── <SalesTrendChart> (line chart: daily trend)
  ├── <TopItemsChart> (bar chart: revenue)
  ├── <DepartmentAnalysis> (table: scorecard)
  ├── <CategoryBreakdown> (pie/donut)
  └── <SalesListingView> (existing with bulk selection)
```

---

## Current Page Features
- ✅ Bulk selection for mark as paid
- ✅ Sales grouped by charge code
- ✅ Item aggregation by charge code
- ✅ Top items by value
- ✅ Sales over time calculation
- ✅ Department summary
- ✅ Most sold items endpoint
- ✅ Expiring charge codes endpoint

## Next Steps
1. Deploy current version with bulk selection
2. Get user feedback on most useful visualization
3. Implement Phase 1 visualizations based on feedback
4. Add real-time alerts
5. Implement export features
