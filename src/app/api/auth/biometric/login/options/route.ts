import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const host = request.headers.get('host') || 'localhost';
    const rpID = host.split(':')[0];

    // Récupérer les authenticators enregistrés
    const authenticators = await query('SELECT credential_id, transports FROM authenticators');

    if (authenticators.length === 0) {
      return NextResponse.json({ error: 'No authenticators registered' }, { status: 400 });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: authenticators.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      })),
      userVerification: 'preferred',
    });

    const response = NextResponse.json(options);
    
    // Stocker le challenge dans un cookie sécurisé (5 min)
    response.cookies.set('login_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error in WebAuthn login options:', error);
    return NextResponse.json({ error: 'Failed to generate login options' }, { status: 500 });
  }
}
