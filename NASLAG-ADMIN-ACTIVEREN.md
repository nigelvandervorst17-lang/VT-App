# NDT Radiography Pro — beheerder voor privé-Naslag

De originele Andrex/Yxlon/SMART-afbeeldingen en lasdetailschetsen zijn uit de huidige publieke GitHub-branch verwijderd. De calculator en zijn achtergronddatasets blijven ongewijzigd.

## Eerste beheerder activeren

1. Open https://supabase.com/dashboard/project/olugdgrlfyrdyxclphlu/auth/users
2. Maak onder Authentication → Users een account met jouw eigen e-mailadres en sterk wachtwoord, als dat nog niet bestaat. Bevestig je e-mailadres.
3. Open https://supabase.com/dashboard/project/olugdgrlfyrdyxclphlu/sql/new
4. Vervang hieronder uitsluitend JE_EIGEN_EMAIL@BEDRIJF.NL door jouw eigen e-mailadres en voer het SQL-statement uit:

```sql
insert into private.ndt_naslag_admins(user_id)
select id from auth.users
where lower(email) = lower('JE_EIGEN_EMAIL@BEDRIJF.NL')
and email_confirmed_at is not null
on conflict (user_id) do nothing;
```

Controleer de toegekende accounts:

```sql
select u.email, a.granted_at
from private.ndt_naslag_admins a
join auth.users u on u.id=a.user_id;
```

5. Log in op https://nigelvandervorst17-lang.github.io/VT-App/ met hetzelfde account, open Naslag. De app vraagt live toestemming aan de server; een proefaccount kan geen afbeeldingen krijgen.

## Afbeeldingen opnieuw privé uploaden

Open Naslag als beheerder. De optie Bestanden privé uploaden laat je de oorspronkelijke tien WEBP-bestanden selecteren. Deze worden met je persoonlijke Supabase-sessie rechtstreeks opgeslagen in de private bucket ndt-admin-naslag, map visuals/. De bestanden worden niet opnieuw in GitHub gepubliceerd.

Als je ze niet meer lokaal hebt, kun je ze uit de oude openbare Git-commit 6794b4f2290e76ff85f558a832427d0829171f99 herstellen met git show, bijvoorbeeld:

```bash
git clone https://github.com/nigelvandervorst17-lang/VT-App.git
git -C VT-App show 6794b4f2290e76ff85f558a832427d0829171f99:smart-225b.webp > smart-225b.webp
```

Herhaal dit voor: smart-225-d7.webp, smart-200pc-d7.webp, smart-160-d7.webp, smart-200-d7.webp, smart-200pc-new-d7.webp, smart-225-yxlon-d7.webp, smart-300hp-d7.webp, smart-300pc-d7.webp en weld-details.webp.

## Kritieke beperking van openbare Git-historie

Verwijderen uit de actieve branch wist GEEN oude Git-commits, forks, caches of bestaande downloads. De bestanden zijn historisch nog te vinden en kunnen niet met zekerheid worden teruggeroepen. Voor een repository zonder deze oude bestanden is een nieuwe, schone GitHub-repository plus de nieuwe Pages-publicatie nodig. Deze migratie vereist aparte controle zodat de werkende calculator niet uitvalt.

## Beheerderstoegang intrekken

```sql
delete from private.ndt_naslag_admins
where user_id in (select id from auth.users where lower(email)=lower('ACCOUNT@BEDRIJF.NL'));
```

Opnieuw laden of uitloggen sluit de privénaslag. De server kijkt uitsluitend naar persoonlijke admin-toekenning, niet naar het lokale proefvlaggetje of de bedrijfsrol.
