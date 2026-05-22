import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import crypto from 'crypto';

const SALT = 'devfinance-secure-salt-2026';

function hashPin(pin: string): string {
  return crypto.createHmac('sha256', SALT).update(pin).digest('hex');
}

export async function GET() {
  try {
    const [settings] = await query('SELECT * FROM app_settings WHERE id = 1');
    const authenticators = await query('SELECT COUNT(*) as count FROM authenticators');
    
    const cookieStore = await cookies();
    const isUnlocked = cookieStore.get('app_session_unlocked')?.value === 'true';

    // Sécurité active si un code PIN est configuré
    const securityActive = !!(settings?.pin_hash);

    return NextResponse.json({
      hasPin: securityActive,
      biometricEnabled: !!(settings?.biometric_enabled),
      hasPasskeys: authenticators[0].count > 0,
      isUnlocked: !securityActive || isUnlocked, // Si pas de code PIN, l'app est considérée comme déverrouillée
    });
  } catch (error: any) {
    console.error('Error in Biometric security settings GET:', error);
    return NextResponse.json({ error: 'Failed to retrieve security settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    const cookieStore = await cookies();

    // 1. Déverrouillage par Code PIN
    if (action === 'verify') {
      const { pin } = body;
      if (!pin || pin.length !== 4) {
        return NextResponse.json({ error: 'Format du code PIN invalide' }, { status: 400 });
      }

      const [settings] = await query('SELECT pin_hash FROM app_settings WHERE id = 1');
      if (!settings || !settings.pin_hash) {
        return NextResponse.json({ error: 'Aucun code PIN configuré' }, { status: 400 });
      }

      const hash = hashPin(pin);
      if (hash === settings.pin_hash) {
        const response = NextResponse.json({ success: true });
        // Enregistrer la session déverrouillée dans les cookies
        response.cookies.set('app_session_unlocked', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        return response;
      } else {
        return NextResponse.json({ error: 'Code PIN incorrect' }, { status: 401 });
      }
    }

    // 2. Enregistrement d'un Code PIN (Inscription)
    if (action === 'register') {
      const { pin } = body;
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ error: 'Le code PIN doit comporter 4 chiffres' }, { status: 400 });
      }

      const hash = hashPin(pin);
      await query('UPDATE app_settings SET pin_hash = ? WHERE id = 1', [hash]);

      // Déverrouiller la session immédiatement après l'enregistrement
      const response = NextResponse.json({ success: true });
      response.cookies.set('app_session_unlocked', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      return response;
    }

    // 3. Basculer l'activation biométrique
    if (action === 'toggle_biometric') {
      const { enabled } = body;
      await query('UPDATE app_settings SET biometric_enabled = ? WHERE id = 1', [enabled ? 1 : 0]);
      return NextResponse.json({ success: true, biometricEnabled: enabled });
    }

    // 4. Désactiver complètement la sécurité
    if (action === 'disable_lock') {
      // Nettoyer la configuration et désactiver la biométrie
      await query('UPDATE app_settings SET pin_hash = NULL, biometric_enabled = 0 WHERE id = 1');
      await query('DELETE FROM authenticators'); // Supprimer tous les passkeys associés

      const response = NextResponse.json({ success: true });
      response.cookies.delete('app_session_unlocked');
      return response;
    }

    // 5. Verrouiller manuellement (Déconnexion de session)
    if (action === 'lock') {
      const response = NextResponse.json({ success: true });
      response.cookies.delete('app_session_unlocked');
      return response;
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in Biometric security settings POST:', error);
    return NextResponse.json({ error: error.message || 'Action échouée' }, { status: 500 });
  }
}
