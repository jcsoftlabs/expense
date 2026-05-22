import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  try {
    // Returns projects with client details and financial performance metrics filtered by project currency
    const projects = await query(`
      SELECT 
        p.*,
        c.name as clientName,
        c.company as clientCompany,
        COALESCE((
          SELECT SUM(amount) 
          FROM transactions t 
          WHERE t.project_id = p.id AND t.type = 'INCOME' AND t.currency = p.currency
        ), 0.00) as totalRevenue,
        COALESCE((
          SELECT SUM(amount) 
          FROM transactions t 
          WHERE t.project_id = p.id AND t.type = 'EXPENSE' AND t.currency = p.currency
        ), 0.00) as totalExpenses
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      ORDER BY p.name ASC
    `);

    // Cast properties
    const formattedProjects = projects.map((proj: any) => {
      const revenue = parseFloat(proj.totalRevenue || 0);
      const expenses = parseFloat(proj.totalExpenses || 0);
      return {
        ...proj,
        budget: parseFloat(proj.budget || 0),
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: revenue - expenses,
        profitMargin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0
      };
    });

    return NextResponse.json(formattedProjects);
  } catch (error: any) {
    console.error('API Error in Projects GET:', error);
    return NextResponse.json({ error: 'Failed to retrieve projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, status, client_id, budget, currency, created_at } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const projectStatus = status || 'ACTIVE';
    const projectBudget = budget ? parseFloat(budget) : 0.00;
    const projectCurrency = currency || 'USD';

    if (created_at) {
      await query(
        `INSERT INTO projects (id, name, description, status, client_id, budget, currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, description || null, projectStatus, client_id || null, projectBudget, projectCurrency, created_at]
      );
    } else {
      await query(
        `INSERT INTO projects (id, name, description, status, client_id, budget, currency) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, name, description || null, projectStatus, client_id || null, projectBudget, projectCurrency]
      );
    }

    const [newProject] = await query(`SELECT * FROM projects WHERE id = ?`, [id]);
    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error('API Error in Projects POST:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
