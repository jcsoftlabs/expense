import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credential } = body;

    const host = request.headers.get('host') || 'localhost';
    const rpID = host.split(':')[0];
    
    const protocol = process.env.NODE_ENV === 'production' || host.includes('vercel.app') ? 'https' : 'http';
    const expectedOrigin = `${protocol}://${host}`;

    // Récupérer le challenge
    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get('login_challenge')?.value;

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Login challenge not found or expired' }, { status: 400 });
    }

    // Récupérer le Passkey en base de données
    const [authenticator] = await query('SELECT * FROM authenticators WHERE credential_id = ?', [credential.id]);

    if (!authenticator) {
      return NextResponse.json({ error: 'Passkey not found in database' }, { status: 400 });
    }

    const credentialPublicKey = Buffer.from(authenticator.public_key, 'base64');

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.credential_id,
        publicKey: credentialPublicKey,
        counter: authenticator.counter,
        transports: authenticator.transports ? JSON.parse(authenticator.transports) : undefined,
      },
    });

    if (verification.verified) {
      // Mettre à jour le compteur de signatures
      await query('UPDATE authenticators SET counter = ? WHERE credential_id = ?', [
        verification.authenticationInfo.newCounter,
        credential.id,
      ]);

      const response = NextResponse.json({ verified: true });
      
      // Stocker la session déverrouillée dans un cookie sécurisé
      response.cookies.set('app_session_unlocked', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      response.cookies.delete('login_challenge');
      return response;
    } else {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in WebAuthn login verification:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify login' }, { status: 500 });
  }
}
