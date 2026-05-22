const http = require('http');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log('=== DÉBUT DU TEST DE VALIDATION MULTI-DEVISE DE BOUT EN BOUT (HTG) ===');
  const baseUrl = 'http://localhost:3000';

  try {
    // 1. Récupérer un client
    console.log('1. Récupération des clients...');
    const clientsRes = await request(`${baseUrl}/api/clients`);
    if (clientsRes.status !== 200 || !Array.isArray(clientsRes.body) || clientsRes.body.length === 0) {
      throw new Error('Aucun client trouvé ou erreur API.');
    }
    const client = clientsRes.body[0];
    console.log(`Client sélectionné : ${client.name} (${client.id})`);

    // 2. Créer un projet en HTG
    console.log('\n2. Création d\'un projet en Gourdes (HTG)...');
    const projectPayload = {
      name: 'Refonte Web E-commerce - Devise HTG',
      description: 'Développement d\'une plateforme web pour un commerçant local',
      status: 'ACTIVE',
      client_id: client.id,
      budget: 650000,
      currency: 'HTG'
    };
    const projectRes = await request(`${baseUrl}/api/projects`, { method: 'POST' }, projectPayload);
    if (projectRes.status !== 201) {
      throw new Error(`Échec de création du projet : ${JSON.stringify(projectRes.body)}`);
    }
    const project = projectRes.body;
    console.log(`Projet créé avec succès ! ID: ${project.id}, Nom: ${project.name}, Devise: ${project.currency}, Budget: ${project.budget} HTG`);

    // 3. Créer une facture (receivable) en HTG liée au projet
    console.log('\n3. Création d\'une facture (Receivable) liée au projet en HTG...');
    const invoicePayload = {
      invoice_number: `FACT-HTG-${Date.now().toString().slice(-4)}`,
      client_id: client.id,
      project_id: project.id,
      notes: 'Livrable Milestone 1 - Architecture & UI Mockup',
      amount: 200000,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      currency: 'HTG'
    };
    const invoiceRes = await request(`${baseUrl}/api/receivables`, { method: 'POST' }, invoicePayload);
    if (invoiceRes.status !== 201) {
      throw new Error(`Échec de création de la facture : ${JSON.stringify(invoiceRes.body)}`);
    }
    const invoice = invoiceRes.body;
    console.log(`Facture créée avec succès ! ID: ${invoice.id}, Description: ${invoice.description}, Montant: ${invoice.amount} HTG, Statut: ${invoice.status}`);

    // 4. Enregistrer un paiement sur cette facture (Devise automatique)
    console.log('\n4. Enregistrement d\'un paiement sur la facture...');
    const payRes = await request(`${baseUrl}/api/receivables/${invoice.id}/pay`, { method: 'POST' });
    if (payRes.status !== 200) {
      throw new Error(`Échec de paiement : ${JSON.stringify(payRes.body)}`);
    }
    console.log(`Facture marquée comme payée ! Statut de la réponse : ${payRes.status}`);
    const txnId = payRes.body.transactionId;
    console.log(`Transaction ID générée : ${txnId}`);

    // Récupérer la transaction créée
    console.log('Récupération de la transaction depuis l\'API...');
    const txnsRes = await request(`${baseUrl}/api/transactions`);
    if (txnsRes.status !== 200 || !Array.isArray(txnsRes.body)) {
      throw new Error('Impossible de récupérer la liste des transactions.');
    }
    const txn = txnsRes.body.find(t => t.id === txnId);
    if (!txn) {
      throw new Error(`La transaction avec l'ID ${txnId} n'a pas été trouvée dans le grand livre.`);
    }

    // Vérifier la devise de la transaction de paiement générée
    if (txn.currency !== 'HTG') {
      throw new Error(`ERREUR : La transaction de paiement devrait être en HTG, mais elle est en ${txn.currency}`);
    }
    console.log(`=> SUCCÈS : La devise de la transaction de paiement est bien en HTG !`);

    // 5. Récupérer le projet pour valider les calculs financiers (budget, totalRevenue, netProfit)
    console.log('\n5. Récupération des projets pour valider les métriques financières en HTG...');
    const projectsListRes = await request(`${baseUrl}/api/projects`);
    if (projectsListRes.status !== 200) {
      throw new Error('Impossible de récupérer la liste des projets.');
    }
    const updatedProject = projectsListRes.body.find(p => p.id === project.id);
    if (!updatedProject) {
      throw new Error('Le projet créé est introuvable.');
    }
    console.log(`Métriques financières calculées pour le projet :`);
    console.log(`- Devise : ${updatedProject.currency}`);
    console.log(`- Budget : ${updatedProject.budget} HTG`);
    console.log(`- Revenu encaissé : ${updatedProject.totalRevenue} HTG (Attendu: 200000 HTG)`);
    console.log(`- Dépenses : ${updatedProject.totalExpenses} HTG`);
    console.log(`- Rentabilité Nette : ${updatedProject.netProfit} HTG`);
    console.log(`- Marge bénéficiaire : ${updatedProject.profitMargin}%`);

    if (updatedProject.totalRevenue !== 200000) {
      throw new Error(`ERREUR : Le revenu encaissé du projet est de ${updatedProject.totalRevenue} au lieu de 200000`);
    }
    console.log('=> SUCCÈS : Les métriques financières du projet en HTG sont calculées correctement !');

    // 6. Consulter le Dashboard pour s'assurer que le montant est correctement attribué à la devise HTG
    console.log('\n6. Consultation du tableau de bord pour vérifier l\'isolation de la devise HTG...');
    const dashboardRes = await request(`${baseUrl}/api/dashboard`);
    if (dashboardRes.status !== 200) {
      throw new Error('Impossible de récupérer le dashboard.');
    }
    const dbSummary = dashboardRes.body.summary;
    console.log('Résumé du Dashboard :', dbSummary);
    console.log(`- Solde USD : ${JSON.stringify(dbSummary.usd)}`);
    console.log(`- Solde HTG : ${JSON.stringify(dbSummary.htg)}`);
    
    console.log('\n=== LE TEST S\'EST DÉROULÉ AVEC SUCCÈS ! LE FLUX MULTI-DEVISE DE BOUT EN BOUT EST VALIDÉ ! ===');
  } catch (err) {
    console.error('\n❌ LE TEST A ÉCHOUÉ :', err.message);
    process.exit(1);
  }
}

runTest();
