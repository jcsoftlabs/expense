import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseAICommand } from '@/lib/aiParser';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Le texte de la commande est requis.' }, { status: 400 });
    }

    // 1. Parser la commande textuelle avec le moteur NLP local
    const extracted = parseAICommand(text);

    if (!extracted.amount) {
      return NextResponse.json({
        success: false,
        message: "Désolé, je n'ai pas pu détecter le montant dans votre phrase. Pouvez-vous le préciser ? (Exemple : 30 000 HTG ou 150 USD)"
      });
    }

    let clientId: string | null = null;
    let projectId: string | null = null;
    let logs: string[] = [];

    // 2. Gestion du Client (Recherche ou Création)
    if (extracted.clientName) {
      const searchClient = await query(
        `SELECT id, name FROM clients WHERE LOWER(name) = ? OR LOWER(name) LIKE ?`,
        [extracted.clientName.toLowerCase(), `%${extracted.clientName.toLowerCase()}%`]
      );

      if (searchClient.length > 0) {
        clientId = searchClient[0].id;
        extracted.clientName = searchClient[0].name; // Conserver le nom officiel
        logs.push(`Client existant identifié : **${extracted.clientName}**`);
      } else {
        clientId = crypto.randomUUID();
        await query(
          `INSERT INTO clients (id, name, company) VALUES (?, ?, ?)`,
          [clientId, extracted.clientName, extracted.clientName]
        );
        logs.push(`Nouveau client créé : **${extracted.clientName}**`);
      }
    }

    // 3. Gestion du Projet (Recherche ou Création)
    if (extracted.projectName && clientId) {
      const searchProject = await query(
        `SELECT id, name FROM projects WHERE client_id = ? AND (LOWER(name) = ? OR LOWER(name) LIKE ?)`,
        [clientId, extracted.projectName.toLowerCase(), `%${extracted.projectName.toLowerCase()}%`]
      );

      if (searchProject.length > 0) {
        projectId = searchProject[0].id;
        extracted.projectName = searchProject[0].name;
        logs.push(`Projet existant identifié : **${extracted.projectName}**`);
      } else {
        projectId = crypto.randomUUID();
        // Création du projet lié au client avec le budget initial égal au montant de la facture
        await query(
          `INSERT INTO projects (id, name, description, status, client_id, budget, currency) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?)`,
          [
            projectId, 
            extracted.projectName, 
            `Projet créé automatiquement par l'AI Command Center : ${extracted.notes}`,
            clientId, 
            extracted.amount, 
            extracted.currency
          ]
        );
        logs.push(`Nouveau projet créé : **${extracted.projectName}** (${extracted.currency})`);
      }
    }

    const currencySymbol = extracted.currency === 'USD' ? '$' : ' HTG';
    const formattedAmount = `${extracted.amount.toLocaleString('fr-FR')}${currencySymbol}`;

    // 4. Exécution de l'Action Financière
    if (extracted.action === 'CREATE_INVOICE') {
      // Création d'un Receivable (Facture en attente de paiement)
      const invoiceId = crypto.randomUUID();
      const invoiceNumber = `FACT-AI-${Date.now().toString().slice(-4)}`;
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0]; // +14 jours par défaut

      await query(
        `INSERT INTO receivables (id, invoice_number, amount, issue_date, due_date, status, client_id, project_id, notes, currency) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
        [
          invoiceId,
          invoiceNumber,
          extracted.amount,
          issueDate,
          dueDate,
          clientId || null,
          projectId || null,
          extracted.notes,
          extracted.currency
        ]
      );

      logs.push(`Facture **#${invoiceNumber}** générée en attente de paiement (**${formattedAmount}**).`);
    } else if (extracted.action === 'CREATE_INCOME' && clientId) {
      // Recherche d'une facture en attente (receivable PENDING) à réconcilier
      let matchingInvoice = null;
      if (projectId) {
        const matchingInvoices = await query(
          `SELECT * FROM receivables WHERE client_id = ? AND project_id = ? AND amount = ? AND currency = ? AND status = 'PENDING' LIMIT 1`,
          [clientId, projectId, extracted.amount, extracted.currency]
        );
        if (matchingInvoices.length > 0) {
          matchingInvoice = matchingInvoices[0];
        }
      }
      
      if (!matchingInvoice) {
        // Recherche plus large sans le projet au cas où
        const matchingInvoices = await query(
          `SELECT * FROM receivables WHERE client_id = ? AND amount = ? AND currency = ? AND status = 'PENDING' LIMIT 1`,
          [clientId, extracted.amount, extracted.currency]
        );
        if (matchingInvoices.length > 0) {
          matchingInvoice = matchingInvoices[0];
        }
      }

      if (matchingInvoice) {
        // Réconciliation trouvée !
        const todayStr = new Date().toISOString().split('T')[0];
        
        // 1. Marquer la facture comme payée
        await query(
          `UPDATE receivables SET status = 'PAID' WHERE id = ?`,
          [matchingInvoice.id]
        );

        // 2. Insérer la transaction correspondante
        const txnId = crypto.randomUUID();
        const txnDescription = `Paiement reçu pour la Facture #${matchingInvoice.invoice_number} (Réconciliation Automatique AI)`;
        const txnCategory = 'Freelance Dev';

        await query(
          `INSERT INTO transactions (id, type, amount, date, category, description, project_id, client_id, currency) VALUES (?, 'INCOME', ?, ?, ?, ?, ?, ?, ?)`,
          [
            txnId,
            extracted.amount,
            todayStr,
            txnCategory,
            txnDescription,
            matchingInvoice.project_id || projectId || null,
            clientId,
            extracted.currency
          ]
        );

        logs.push(`Facture existante **#${matchingInvoice.invoice_number}** identifiée et marquée comme **PAYÉE** (Réconciliation automatique).`);
      } else {
        // Pas de facture correspondante -> transaction directe de revenu
        const txnId = crypto.randomUUID();
        const todayStr = new Date().toISOString().split('T')[0];
        const category = 'Freelance Dev';

        await query(
          `INSERT INTO transactions (id, type, amount, date, category, description, project_id, client_id, currency) VALUES (?, 'INCOME', ?, ?, ?, ?, ?, ?, ?)`,
          [
            txnId,
            extracted.amount,
            todayStr,
            category,
            extracted.notes,
            projectId || null,
            clientId || null,
            extracted.currency
          ]
        );

        logs.push(`Revenu direct enregistré avec succès dans votre journal (**${formattedAmount}**).`);
      }
    } else {
      // Création d'une Transaction Directe de type Dépense ou autre (Revenu sans client)
      const txnId = crypto.randomUUID();
      const todayStr = new Date().toISOString().split('T')[0];
      const category = extracted.action === 'CREATE_EXPENSE' ? 'Autre' : 'Freelance Dev';

      await query(
        `INSERT INTO transactions (id, type, amount, date, category, description, project_id, client_id, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txnId,
          extracted.action === 'CREATE_EXPENSE' ? 'EXPENSE' : 'INCOME',
          extracted.amount,
          todayStr,
          category,
          extracted.notes,
          projectId || null,
          clientId || null,
          extracted.currency
        ]
      );

      const typeLabel = extracted.action === 'CREATE_EXPENSE' ? 'Dépense directe' : 'Revenu direct';
      logs.push(`${typeLabel} enregistré avec succès dans votre journal (**${formattedAmount}**).`);
    }

    // 5. Formulation de la réponse chaleureuse
    const friendlyMessage = `Excellent ! J'ai traité votre phrase et effectué les actions comptables suivantes :\n\n` + 
      logs.map(log => `• ${log}`).join('\n') + 
      `\n\nVotre tableau de bord a été mis à jour instantanément.`;

    return NextResponse.json({
      success: true,
      message: friendlyMessage,
      extracted
    }, { status: 200 });

  } catch (error: any) {
    console.error('API Error in AI Command Center POST:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue lors de l\'analyse par l\'IA.' }, { status: 500 });
  }
}
