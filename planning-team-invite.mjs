/* Share one-time invites using user's own mail client; no secret Auth Admin
 * keys and no claim that mail was sent until the user presses Send. */
import {buildPlanningInviteLink} from './planning-invite.mjs';
export function buildPlanningTeamInvite({email,token,origin,path,companyName='NDT Radiography Pro'}){
 const clean=String(email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))throw Error('Geen geldig e-mailadres.');
 const link=buildPlanningInviteLink(origin,path,token);
 const subject='Uitnodiging NDT Radiography Pro · '+companyName;
 const body='Je bent uitgenodigd voor '+companyName+
  ' in NDT Radiography Pro.\n\n1. Open deze eenmalige link:\n'+link+
  '\n\n2. Log in met dit e-mailadres: '+clean+
  '\n3. Heb je nog geen account? Registreer eerst en bevestig je e-mail.\n\n'+
  'De link is 7 dagen geldig, werkt één keer en is alleen voor dit e-mailadres. Deel hem niet verder.';
 return {email:clean,link,mailto:'mailto:'+encodeURIComponent(clean)+'?subject='+
  encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};
}
