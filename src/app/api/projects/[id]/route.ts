import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, client_id, budget } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Check if project exists
    const projectCheck = await query(`SELECT id FROM projects WHERE id = ?`, [id]);
    if (projectCheck.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectBudget = budget ? parseFloat(budget) : 0.00;

    await query(
      `UPDATE projects SET name = ?, description = ?, status = ?, client_id = ?, budget = ? WHERE id = ?`,
      [name, description || null, status || 'ACTIVE', client_id || null, projectBudget, id]
    );

    const [updatedProject] = await query(`SELECT * FROM projects WHERE id = ?`, [id]);
    return NextResponse.json(updatedProject);
  } catch (error: any) {
    console.error('API Error in Projects PUT:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if project exists
    const projectCheck = await query(`SELECT id FROM projects WHERE id = ?`, [id]);
    if (projectCheck.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete project
    await query(`DELETE FROM projects WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('API Error in Projects DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
