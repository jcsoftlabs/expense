import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential } = body;

    const host = request.headers.get('host') || 'localhost';
    const rpID = host.split(':')[0];
    
    // Déterminer le protocole et l'origine attendus
    const protocol = process.env.NODE_ENV === 'production' || host.includes('vercel.app') ? 'https' : 'http';
    const expectedOrigin = `${protocol}://${host}`;

    // Récupérer le challenge depuis les cookies
    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get('reg_challenge')?.value;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Registration challenge not found or expired' }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

      // Base64 encoding de la clé publique
      const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64');
      const transportsStr = JSON.stringify(credential.transports || []);

      // Vérifier s'il est déjà existant
      const existing = await query('SELECT * FROM authenticators WHERE credential_id = ?', [credentialID]);
      if (existing.length === 0) {
        await query(
          'INSERT INTO authenticators (credential_id, public_key, counter, transports) VALUES (?, ?, ?, ?)',
          [credentialID, publicKeyBase64, counter, transportsStr]
        );
      }

      // Activer automatiquement le verrouillage biométrique
      await query('UPDATE app_settings SET biometric_enabled = 1 WHERE id = 1');

      const response = NextResponse.json({ verified: true });
      
      // Supprimer le challenge temporaire
      response.cookies.delete('reg_challenge');
      return response;
    } else {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in WebAuthn registration verification:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify registration' }, { status: 500 });
  }
}
