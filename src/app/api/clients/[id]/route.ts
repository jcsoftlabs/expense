import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, company } = body;

    if (!name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    // Check if client exists
    const clientCheck = await query(`SELECT id FROM clients WHERE id = ?`, [id]);
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await query(
      `UPDATE clients SET name = ?, email = ?, phone = ?, company = ? WHERE id = ?`,
      [name, email || null, phone || null, company || null, id]
    );

    const [updatedClient] = await query(`SELECT * FROM clients WHERE id = ?`, [id]);
    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error('API Error in Clients PUT:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if client exists
    const clientCheck = await query(`SELECT id FROM clients WHERE id = ?`, [id]);
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Delete client
    await query(`DELETE FROM clients WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, message: 'Client deleted successfully' });
  } catch (error: any) {
    console.error('API Error in Clients DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
