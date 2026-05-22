import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Net Balance (Income vs Expenses) by Currency
    const transactions = await query(`
      SELECT 
        currency,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as totalIncome,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as totalExpenses
      FROM transactions
      GROUP BY currency
    `);
    
    let totalIncomeUSD = 0, totalExpensesUSD = 0;
    let totalIncomeHTG = 0, totalExpensesHTG = 0;
    
    transactions.forEach((row: any) => {
      if (row.currency === 'HTG') {
        totalIncomeHTG = parseFloat(row.totalIncome || 0);
        totalExpensesHTG = parseFloat(row.totalExpenses || 0);
      } else {
        totalIncomeUSD = parseFloat(row.totalIncome || 0);
        totalExpensesUSD = parseFloat(row.totalExpenses || 0);
      }
    });

    const netBalanceUSD = totalIncomeUSD - totalExpensesUSD;
    const netBalanceHTG = totalIncomeHTG - totalExpensesHTG;

    // 2. Accounts Receivable (Unpaid Invoices) by Currency
    const receivables = await query(`
      SELECT 
        currency,
        SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END) as totalPending,
        SUM(CASE WHEN status = 'OVERDUE' THEN amount ELSE 0 END) as totalOverdue,
        SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) as totalPaid
      FROM receivables
      GROUP BY currency
    `);
    
    let outstandingPendingUSD = 0, outstandingOverdueUSD = 0, outstandingPaidUSD = 0;
    let outstandingPendingHTG = 0, outstandingOverdueHTG = 0, outstandingPaidHTG = 0;
    
    receivables.forEach((row: any) => {
      if (row.currency === 'HTG') {
        outstandingPendingHTG = parseFloat(row.totalPending || 0);
        outstandingOverdueHTG = parseFloat(row.totalOverdue || 0);
        outstandingPaidHTG = parseFloat(row.totalPaid || 0);
      } else {
        outstandingPendingUSD = parseFloat(row.totalPending || 0);
        outstandingOverdueUSD = parseFloat(row.totalOverdue || 0);
        outstandingPaidUSD = parseFloat(row.totalPaid || 0);
      }
    });
    
    const totalOutstandingUSD = outstandingPendingUSD + outstandingOverdueUSD;
    const totalOutstandingHTG = outstandingPendingHTG + outstandingOverdueHTG;

    // 3. Project counts
    const projects = await query(`
      SELECT 
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as activeCount,
        COUNT(*) as totalCount
      FROM projects
    `);
    const activeProjects = parseInt(projects[0]?.activeCount || 0);
    const totalProjects = parseInt(projects[0]?.totalCount || 0);

    // 4. Clients count
    const clientsCountRes = await query(`SELECT COUNT(*) as count FROM clients`);
    const totalClients = parseInt(clientsCountRes[0]?.count || 0);

    // 5. Recent transactions (ledger feed)
    const recentTransactions = await query(`
      SELECT t.*, p.name as projectName, c.name as clientName
      FROM transactions t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN clients c ON t.client_id = c.id
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 6
    `);

    // 6. Monthly Cash Flow (income vs expenses per month per currency)
    const cashFlowRaw = await query(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        currency,
        SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expenses
      FROM transactions
      GROUP BY DATE_FORMAT(date, '%Y-%m'), currency
      ORDER BY month ASC
      LIMIT 24
    `);

    const usdFlowMap = new Map();
    const htgFlowMap = new Map();
    
    cashFlowRaw.forEach((row: any) => {
      const point = {
        month: row.month,
        income: parseFloat(row.income || 0),
        expenses: parseFloat(row.expenses || 0)
      };
      if (row.currency === 'HTG') {
        htgFlowMap.set(row.month, point);
      } else {
        usdFlowMap.set(row.month, point);
      }
    });
    
    const allMonths = Array.from(new Set(cashFlowRaw.map((d: any) => d.month))).sort();
    
    const cashFlowDataUSD = allMonths.map(month => usdFlowMap.get(month) || { month, income: 0, expenses: 0 });
    const cashFlowDataHTG = allMonths.map(month => htgFlowMap.get(month) || { month, income: 0, expenses: 0 });

    // 7. Expenses by Category per Currency
    const categoryRaw = await query(`
      SELECT category, currency, SUM(amount) as value
      FROM transactions
      WHERE type = 'EXPENSE'
      GROUP BY category, currency
      ORDER BY value DESC
    `);
    
    const categoryDataUSD = categoryRaw.filter((r: any) => r.currency !== 'HTG').map((r: any) => ({ category: r.category, value: parseFloat(r.value || 0) }));
    const categoryDataHTG = categoryRaw.filter((r: any) => r.currency === 'HTG').map((r: any) => ({ category: r.category, value: parseFloat(r.value || 0) }));

    // 8. Upcoming Receivables (Unpaid & sorting by due date)
    const upcomingReceivables = await query(`
      SELECT r.*, c.name as clientName, p.name as projectName
      FROM receivables r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN projects p ON r.project_id = p.id
      WHERE r.status != 'PAID'
      ORDER BY r.due_date ASC
      LIMIT 5
    `);

    const upcomingFormatted = upcomingReceivables.map((r: any) => ({
      ...r,
      amount: parseFloat(r.amount || 0)
    }));

    return NextResponse.json({
      summary: {
        usd: {
          totalIncome: totalIncomeUSD,
          totalExpenses: totalExpensesUSD,
          netBalance: netBalanceUSD,
          outstandingPending: outstandingPendingUSD,
          outstandingOverdue: outstandingOverdueUSD,
          totalOutstanding: totalOutstandingUSD,
          outstandingPaid: outstandingPaidUSD,
        },
        htg: {
          totalIncome: totalIncomeHTG,
          totalExpenses: totalExpensesHTG,
          netBalance: netBalanceHTG,
          outstandingPending: outstandingPendingHTG,
          outstandingOverdue: outstandingOverdueHTG,
          totalOutstanding: totalOutstandingHTG,
          outstandingPaid: outstandingPaidHTG,
        },
        activeProjects,
        totalProjects,
        totalClients,
      },
      recentTransactions: recentTransactions.map((t: any) => ({ ...t, amount: parseFloat(t.amount || 0) })),
      cashFlowDataUSD,
      cashFlowDataHTG,
      categoryDataUSD,
      categoryDataHTG,
      upcomingReceivables: upcomingFormatted,
    });
  } catch (error: any) {
    console.error('API Error in Dashboard GET:', error);
    return NextResponse.json({ error: 'Failed to retrieve dashboard metrics' }, { status: 500 });
  }
}
