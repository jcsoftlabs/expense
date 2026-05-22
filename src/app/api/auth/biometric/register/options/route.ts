import { generateRegistrationOptions } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const host = request.headers.get('host') || 'localhost';
    const rpID = host.split(':')[0];

    // Récupérer les identifiants existants pour les exclure de la réinscription
    const authenticators = await query('SELECT credential_id FROM authenticators');
    
    const options = await generateRegistrationOptions({
      rpName: 'DevFinance',
      rpID,
      userID: new TextEncoder().encode('dev-user-id-static'),
      userName: 'devuser@devfinance.com',
      userDisplayName: 'Dev User',
      excludeCredentials: authenticators.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    const response = NextResponse.json(options);
    
    // Stocker le challenge dans un cookie sécurisé temporaire (5 min)
    response.cookies.set('reg_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error in WebAuthn registration options:', error);
    return NextResponse.json({ error: 'Failed to generate registration options' }, { status: 500 });
  }
}
