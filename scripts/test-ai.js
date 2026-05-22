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
  console.log('=== DÉBUT DU TEST DE L\'AI COMMAND CENTER SÉMANTIQUE ===');
  const baseUrl = 'http://localhost:3000';

  try {
    const commandText = "j'ai realiser la mise a jour de l'application NOUMOBILE pour le client NOU pour le montant de 30 000 HTG. je ne suis pas encore payer";
    console.log(`Phrase de commande IA testée : "${commandText}"`);

    // 1. Envoyer la phrase à l'API AI
    console.log('\nEnvoi de la phrase à l\'API AI /api/ai...');
    const aiRes = await request(`${baseUrl}/api/ai`, { method: 'POST' }, { text: commandText });
    
    if (aiRes.status !== 200) {
      throw new Error(`Erreur de l'API AI : ${JSON.stringify(aiRes.body)}`);
    }

    console.log('\nRéponse de l\'AI Command Center :');
    console.log('-----------------------------------');
    console.log(aiRes.body.message);
    console.log('-----------------------------------');

    const ext = aiRes.body.extracted;
    console.log('\nEntités extraites par le moteur NLP local :');
    console.log(`- Devise : ${ext.currency} (Attendu: HTG)`);
    console.log(`- Montant : ${ext.amount} (Attendu: 30000)`);
    console.log(`- Client : ${ext.clientName} (Attendu: NOU)`);
    console.log(`- Projet : ${ext.projectName} (Attendu: NOUMOBILE)`);
    console.log(`- Payé : ${ext.isPaid} (Attendu: false)`);
    console.log(`- Notes : "${ext.notes}"`);

    if (ext.currency !== 'HTG' || ext.amount !== 30000 || ext.clientName !== 'NOU' || ext.projectName !== 'NOUMOBILE' || ext.isPaid !== false) {
      throw new Error('Les entités extraites ne correspondent pas aux attentes !');
    }
    console.log('=> SUCCÈS : L\'extraction NLP est 100% correcte !');

    // 2. Valider l'insertion dans la base de données via les APIs existantes
    console.log('\nValidation des écritures en base de données...');
    
    // Vérifier le client
    const clientsRes = await request(`${baseUrl}/api/clients`);
    const nouClient = clientsRes.body.find(c => c.name.toLowerCase() === 'nou');
    if (!nouClient) {
      throw new Error('Le client "NOU" n\'a pas été créé en base de données.');
    }
    console.log(`=> SUCCÈS : Client "NOU" trouvé en base ! (ID: ${nouClient.id})`);

    // Vérifier le projet
    const projectsRes = await request(`${baseUrl}/api/projects`);
    const nouProject = projectsRes.body.find(p => p.name === 'NOUMOBILE' && p.client_id === nouClient.id);
    if (!nouProject) {
      throw new Error('Le projet "NOUMOBILE" n\'a pas été créé ou associé en base de données.');
    }
    console.log(`=> SUCCÈS : Projet "NOUMOBILE" trouvé en base avec la devise ${nouProject.currency} !`);

    // Vérifier la facture (receivable)
    const receivablesRes = await request(`${baseUrl}/api/receivables?client_id=${nouClient.id}`);
    const invoice = receivablesRes.body.find(r => r.project_id === nouProject.id && r.status === 'PENDING');
    if (!invoice) {
      throw new Error('La facture (receivable) de type PENDING rattachée au projet "NOUMOBILE" n\'a pas été trouvée.');
    }
    console.log(`=> SUCCÈS : Facture en attente de paiement trouvée ! (Numéro: ${invoice.invoice_number}, Montant: ${invoice.amount} ${invoice.currency})`);

    // 3. Test de réconciliation sémantique de paiement (aujourd'hui NOU m'a payer les 30 000 HTG...)
    console.log('\n--- TEST DE RÉCONCILIATION DE PAIEMENT AUTOMATIQUE ---');
    const paymentCommandText = "aujourd'hui NOU m'a payer les 30 000 HTG pour l'application NOUMOBILE";
    console.log(`Phrase testée : "${paymentCommandText}"`);

    const payRes = await request(`${baseUrl}/api/ai`, { method: 'POST' }, { text: paymentCommandText });
    if (payRes.status !== 200) {
      throw new Error(`Erreur lors de la réconciliation : ${JSON.stringify(payRes.body)}`);
    }

    console.log('Réponse de l\'AI Command Center :');
    console.log('-----------------------------------');
    console.log(payRes.body.message);
    console.log('-----------------------------------');

    // Vérifier que la facture a été réconciliée et marquée PAID dans la base
    const receivablesAfterRes = await request(`${baseUrl}/api/receivables?client_id=${nouClient.id}`);
    const reconciledInvoice = receivablesAfterRes.body.find(r => r.id === invoice.id);
    if (!reconciledInvoice || reconciledInvoice.status !== 'PAID') {
      throw new Error('La facture n\'a pas été automatiquement réconciliée et marquée comme PAID !');
    }
    console.log(`=> SUCCÈS : La facture #${invoice.invoice_number} a bien été réconciliée à l'état PAID !`);

    // 4. Test d'un paiement direct sans facture (NOU m'a donnee 20 000 HTG)
    console.log('\n--- TEST DE PAIEMENT DIRECT SANS FACTURE ASSOCIEE ---');
    const directPaymentText = "NOU m'a donnee 20 000 HTG";
    console.log(`Phrase testée : "${directPaymentText}"`);

    const directPayRes = await request(`${baseUrl}/api/ai`, { method: 'POST' }, { text: directPaymentText });
    if (directPayRes.status !== 200) {
      throw new Error(`Erreur lors du paiement direct : ${JSON.stringify(directPayRes.body)}`);
    }

    console.log('Réponse de l\'AI Command Center :');
    console.log('-----------------------------------');
    console.log(directPayRes.body.message);
    console.log('-----------------------------------');

    const extDirect = directPayRes.body.extracted;
    if (extDirect.amount !== 20000 || extDirect.currency !== 'HTG' || extDirect.clientName !== 'NOU' || extDirect.isPaid !== true) {
      throw new Error('L\'extraction pour le paiement direct est incorrecte !');
    }
    console.log('=> SUCCÈS : Paiement direct de 20 000 HTG correctement extrait !');

    // Vérifier la présence de la transaction dans le grand livre
    const txnsRes = await request(`${baseUrl}/api/transactions`);
    const directTxn = txnsRes.body.find(t => t.client_id === nouClient.id && t.amount === 20000 && t.currency === 'HTG');
    if (!directTxn) {
      throw new Error('La transaction directe de 20 000 HTG n\'a pas été insérée dans la base.');
    }
    console.log(`=> SUCCÈS : La transaction directe de 20 000 HTG a bien été créée en base ! (ID: ${directTxn.id})`);

    console.log('\n=== LE TEST DE L\'AI COMMAND CENTER A RÉUSSI AVEC SUCCÈS ! ===');
  } catch (err) {
    console.error('\n❌ LE TEST A ÉCHOUÉ :', err.message);
    process.exit(1);
  }
}

runTest();
