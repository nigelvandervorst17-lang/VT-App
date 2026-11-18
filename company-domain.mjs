/** UX validation only: authoritative company-domain controls live in the database. */
export const PERSONAL_EMAIL_DOMAINS=Object.freeze([
'gmail.com','googlemail.com','hotmail.com','hotmail.nl','hotmail.co.uk','outlook.com','outlook.nl','live.com','live.nl','msn.com','yahoo.com','yahoo.nl','yahoo.co.uk','ymail.com','aol.com','icloud.com','me.com','mac.com','proton.me','protonmail.com','gmx.com','gmx.de','mail.com','zoho.com','yandex.com','hey.com','fastmail.com','tutanota.com','tuta.io','qq.com','163.com'
]);
const blocked=new Set(PERSONAL_EMAIL_DOMAINS);
export function businessEmailDomain(value){
 const email=String(value??'').trim().toLowerCase();
 const match=/^[^\s@]+@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)$/.exec(email);
 if(!match)return null;
 return blocked.has(match[1])?null:match[1];
}
