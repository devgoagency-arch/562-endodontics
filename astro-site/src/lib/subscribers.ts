// Guarda a los suscriptores del newsletter en el WordPress de la clínica (plugin 562-subscribers.php,
// menú "Subscribers" del administrador, con descarga en CSV).
import { postToWordPress, wordpressConfigured } from './wordpress';

export const subscribersConfigured = wordpressConfigured;

export const saveSubscriber = (email: string, source: string) => postToWordPress('subscribe', { email, source });
